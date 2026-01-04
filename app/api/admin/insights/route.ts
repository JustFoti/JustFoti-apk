/**
 * Admin Insights API
 * GET /api/admin/insights - Get detailed insights data for visualizations
 * MIGRATED: Uses D1 database adapter for Cloudflare compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/db/adapter';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    const adapter = getAdapter();
    const now = Date.now();
    let startTime: number;
    
    switch (range) {
      case '24h':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case '30d':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case '7d':
      default:
        startTime = now - 7 * 24 * 60 * 60 * 1000;
    }

    // 1. HOURLY ACTIVITY PATTERN
    let hourlyActivity: Array<{ hour: number; users: number; sessions: number; pageViews: number }> = [];
    try {
      const hourlyResult = await adapter.query<{ hour: number; users: number }>(
        `SELECT 
           CAST(strftime('%H', datetime(last_seen / 1000, 'unixepoch')) AS INTEGER) as hour,
           COUNT(DISTINCT user_id) as users
         FROM user_activity
         WHERE last_seen >= ? AND last_seen <= ?
         GROUP BY hour
         ORDER BY hour`,
        [startTime, now]
      );
      
      hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
        const data = (hourlyResult.data || []).find((r) => parseInt(String(r.hour)) === hour);
        return {
          hour,
          users: parseInt(String(data?.users)) || 0,
          sessions: 0,
          pageViews: 0,
        };
      });

      const sessionResult = await adapter.query<{ hour: number; sessions: number }>(
        `SELECT 
           CAST(strftime('%H', datetime(started_at / 1000, 'unixepoch')) AS INTEGER) as hour,
           COUNT(*) as sessions
         FROM watch_sessions
         WHERE started_at >= ? AND started_at <= ?
         GROUP BY hour`,
        [startTime, now]
      );
      (sessionResult.data || []).forEach((r) => {
        const hour = parseInt(String(r.hour));
        if (hourlyActivity[hour]) {
          hourlyActivity[hour].sessions = parseInt(String(r.sessions)) || 0;
        }
      });
    } catch (e) {
      console.error('Error fetching hourly activity:', e);
    }

    // 2. DAILY USER TREND
    let dailyTrend: Array<{ date: string; users: number; newUsers: number; sessions: number }> = [];
    try {
      const dailyResult = await adapter.query<{ date: string; users: number }>(
        `SELECT 
           DATE(last_seen / 1000, 'unixepoch') as date,
           COUNT(DISTINCT user_id) as users
         FROM user_activity
         WHERE last_seen >= ? AND last_seen <= ?
         GROUP BY date
         ORDER BY date`,
        [startTime, now]
      );

      const newUsersResult = await adapter.query<{ date: string; new_users: number }>(
        `SELECT 
           DATE(first_seen / 1000, 'unixepoch') as date,
           COUNT(DISTINCT user_id) as new_users
         FROM user_activity
         WHERE first_seen >= ? AND first_seen <= ?
         GROUP BY date`,
        [startTime, now]
      );
      const newUsersMap = new Map((newUsersResult.data || []).map((r) => [r.date, parseInt(String(r.new_users)) || 0]));

      const sessionsResult = await adapter.query<{ date: string; sessions: number }>(
        `SELECT 
           DATE(started_at / 1000, 'unixepoch') as date,
           COUNT(*) as sessions
         FROM watch_sessions
         WHERE started_at >= ? AND started_at <= ?
         GROUP BY date`,
        [startTime, now]
      );
      const sessionsMap = new Map((sessionsResult.data || []).map((r) => [r.date, parseInt(String(r.sessions)) || 0]));

      dailyTrend = (dailyResult.data || []).map((r) => ({
        date: r.date,
        users: parseInt(String(r.users)) || 0,
        newUsers: newUsersMap.get(r.date) || 0,
        sessions: sessionsMap.get(r.date) || 0,
      }));
    } catch (e) {
      console.error('Error fetching daily trend:', e);
    }

    // 3. TRAFFIC SOURCES / REFERRERS
    let referrers: Array<{ referrer: string; count: number }> = [];
    try {
      const referrerResult = await adapter.query<{ referrer: string; count: number }>(
        `SELECT 
           COALESCE(
             CASE 
               WHEN referrer_domain IS NULL OR referrer_domain = '' THEN 'Direct'
               WHEN referrer_domain LIKE '%google%' THEN 'Google'
               WHEN referrer_domain LIKE '%reddit%' THEN 'Reddit'
               WHEN referrer_domain LIKE '%twitter%' OR referrer_domain LIKE '%x.com%' THEN 'Twitter'
               WHEN referrer_domain LIKE '%facebook%' THEN 'Facebook'
               WHEN referrer_domain LIKE '%discord%' THEN 'Discord'
               WHEN referrer_domain LIKE '%youtube%' THEN 'YouTube'
               ELSE 'Other'
             END,
             'Direct'
           ) as referrer,
           SUM(hit_count) as count
         FROM referrer_stats
         WHERE last_hit >= ?
         GROUP BY referrer
         ORDER BY count DESC`,
        [startTime]
      );
      
      referrers = (referrerResult.data || []).map((r) => ({
        referrer: r.referrer || 'Direct',
        count: parseInt(String(r.count)) || 0,
      }));
    } catch (e) {
      console.error('Error fetching referrers:', e);
      referrers = [{ referrer: 'Direct', count: 0 }];
    }

    return NextResponse.json({
      success: true,
      hourlyActivity,
      dailyTrend,
      referrers,
      range,
      timestamp: now,
    });

  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
