/**
 * User Engagement Tracking API
 * POST /api/analytics/user-engagement - Track user engagement metrics
 * GET /api/analytics/user-engagement - Get user engagement analytics
 * 
 * OPTIMIZED: POST forwards to CF Analytics Worker to avoid duplicate D1 writes.
 * GET still reads from D1 (reads are cheap).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/app/lib/db/adapter';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Forward to CF Analytics Worker - it handles D1 writes with batching
    // This avoids duplicate writes and reduces D1 operations
    const CF_ANALYTICS_URL = process.env.NEXT_PUBLIC_CF_ANALYTICS_WORKER_URL || 'https://flyx-analytics.vynx.workers.dev';
    
    try {
      await fetch(`${CF_ANALYTICS_URL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-IPCountry': request.headers.get('CF-IPCountry') || '',
          'User-Agent': request.headers.get('User-Agent') || '',
        },
        body: JSON.stringify({
          userId: data.userId,
          sessionId: data.sessionId,
          activityType: 'browsing',
          pageViews: data.pageViews ? [{ path: '/', timestamp: Date.now() }] : undefined,
        }),
      });
    } catch (e) {
      console.warn('[user-engagement] CF Worker forward failed:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track user engagement:', error);
    // Don't fail analytics requests
    return NextResponse.json({ success: true });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '100');
    const sortBy = searchParams.get('sortBy') || 'last_visit';

    const adapter = getAdapter();

    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Get user engagement data - try user_engagement first, fallback to user_activity
    let users: any[] = [];
    const orderColumn = sortBy === 'engagement' ? 'engagement_score' : 
                        sortBy === 'visits' ? 'total_visits' : 
                        sortBy === 'watch_time' ? 'total_watch_time' : 'last_visit';
    
    // SQLite (D1) queries
    const userEngagementResult = await adapter.query(`
      SELECT 
        user_id,
        first_visit,
        last_visit,
        total_visits,
        total_page_views,
        total_time_on_site,
        total_watch_time,
        total_content_watched,
        ROUND(avg_session_duration, 0) as avg_session_duration,
        ROUND(avg_pages_per_session, 1) as avg_pages_per_session,
        favorite_content_type,
        preferred_quality,
        device_types,
        countries,
        bounce_count,
        return_visits,
        engagement_score
      FROM user_engagement
      WHERE last_visit > ?
      ORDER BY ${orderColumn} DESC
      LIMIT ?
    `, [startTime, limit]);
    
    users = userEngagementResult.data || [];
    
    // Fallback to user_activity if user_engagement is empty
    if (users.length === 0) {
      const userActivityResult = await adapter.query(`
        SELECT 
          user_id,
          first_seen as first_visit,
          last_seen as last_visit,
          total_sessions as total_visits,
          total_sessions as total_page_views,
          total_watch_time as total_time_on_site,
          total_watch_time,
          0 as total_content_watched,
          ROUND(COALESCE(CAST(total_watch_time AS FLOAT) / MAX(total_sessions, 1), 0), 0) as avg_session_duration,
          1.0 as avg_pages_per_session,
          NULL as favorite_content_type,
          NULL as preferred_quality,
          device_type as device_types,
          country as countries,
          0 as bounce_count,
          CASE WHEN total_sessions > 1 THEN total_sessions - 1 ELSE 0 END as return_visits,
          MIN(100, MAX(0, total_sessions * 10 + COALESCE(total_watch_time / 60, 0))) as engagement_score
        FROM user_activity
        WHERE last_seen > ?
        ORDER BY last_seen DESC
        LIMIT ?
      `, [startTime, limit]);
      
      users = userActivityResult.data || [];
    }

    // Get aggregate stats - use user_activity as fallback
    let aggregateStats;
    const aggregateResult = await adapter.query(`
      SELECT 
        COUNT(*) as total_users,
        AVG(total_visits) as avg_visits_per_user,
        AVG(total_page_views) as avg_pages_per_user,
        AVG(total_time_on_site) as avg_time_per_user,
        AVG(engagement_score) as avg_engagement_score,
        CAST(SUM(CASE WHEN total_visits > 1 THEN 1 ELSE 0 END) AS FLOAT) / MAX(COUNT(*), 1) * 100 as return_rate,
        CAST(SUM(bounce_count) AS FLOAT) / MAX(SUM(total_visits), 1) * 100 as overall_bounce_rate
      FROM user_engagement
      WHERE last_visit > ?
    `, [startTime]);
    
    aggregateStats = (aggregateResult.data && aggregateResult.data[0]) || {};
    
    // Fallback to user_activity
    if (!aggregateStats || !(aggregateStats as any).total_users || parseInt(String((aggregateStats as any).total_users)) === 0) {
      const fallbackResult = await adapter.query(`
        SELECT 
          COUNT(*) as total_users,
          AVG(total_sessions) as avg_visits_per_user,
          AVG(total_sessions) as avg_pages_per_user,
          AVG(total_watch_time) as avg_time_per_user,
          50 as avg_engagement_score,
          CAST(SUM(CASE WHEN total_sessions > 1 THEN 1 ELSE 0 END) AS FLOAT) / MAX(COUNT(*), 1) * 100 as return_rate,
          0 as overall_bounce_rate
        FROM user_activity
        WHERE last_seen > ?
      `, [startTime]);
      
      aggregateStats = (fallbackResult.data && fallbackResult.data[0]) || {};
    }

    // Get engagement distribution
    const engagementResult = await adapter.query(`
      SELECT 
        CASE 
          WHEN engagement_score >= 80 THEN 'highly_engaged'
          WHEN engagement_score >= 50 THEN 'engaged'
          WHEN engagement_score >= 20 THEN 'casual'
          ELSE 'new'
        END as segment,
        COUNT(*) as count
      FROM user_engagement
      WHERE last_visit > ?
      GROUP BY segment
      ORDER BY count DESC
    `, [startTime]);
    
    const engagementDistribution = engagementResult.data || [];

    // Get visit frequency distribution
    const visitFrequencyResult = await adapter.query(`
      SELECT 
        CASE 
          WHEN total_visits >= 20 THEN '20+'
          WHEN total_visits >= 10 THEN '10-19'
          WHEN total_visits >= 5 THEN '5-9'
          WHEN total_visits >= 2 THEN '2-4'
          ELSE '1'
        END as visits_range,
        COUNT(*) as count
      FROM user_engagement
      WHERE last_visit > ?
      GROUP BY visits_range
      ORDER BY count DESC
    `, [startTime]);
    
    const visitFrequency = visitFrequencyResult.data || [];

    // Helper to validate timestamps - must be after Jan 1, 2020 and not in the future
    const isValidTimestamp = (ts: number): boolean => {
      if (!ts || ts <= 0 || isNaN(ts)) return false;
      const now = Date.now();
      const minValidDate = new Date('2020-01-01').getTime(); // 1577836800000
      return ts >= minValidDate && ts <= now + 3600000;
    };

    // Normalize timestamp (handle seconds vs milliseconds)
    const normalizeTimestamp = (ts: any): number => {
      if (!ts) return 0;
      const num = typeof ts === 'string' ? parseInt(ts, 10) : Number(ts);
      if (isNaN(num) || num <= 0) return 0;
      // If timestamp looks like seconds (before year 2001 in ms), convert to ms
      if (num < 1000000000000) return num * 1000;
      return num;
    };

    // Filter and validate user data
    const validUsers = users
      .map((u: any) => {
        const firstVisit = normalizeTimestamp(u.first_visit);
        const lastVisit = normalizeTimestamp(u.last_visit);
        return {
          ...u,
          first_visit: isValidTimestamp(firstVisit) ? firstVisit : 0,
          last_visit: isValidTimestamp(lastVisit) ? lastVisit : 0,
          total_visits: Math.max(0, parseInt(u.total_visits) || 0),
          total_page_views: Math.max(0, parseInt(u.total_page_views) || 0),
          total_time_on_site: Math.max(0, parseInt(u.total_time_on_site) || 0),
          avg_session_duration: Math.max(0, parseFloat(u.avg_session_duration) || 0),
          engagement_score: Math.min(100, Math.max(0, parseInt(u.engagement_score) || 0)),
        };
      })
      .filter((u: any) => u.user_id && (u.first_visit > 0 || u.last_visit > 0));

    return NextResponse.json({
      success: true,
      users: validUsers,
      aggregateStats: aggregateStats || {},
      engagementDistribution,
      visitFrequency,
      period: { days, startTime }
    });
  } catch (error) {
    console.error('Failed to get user engagement:', error);
    return NextResponse.json(
      { error: 'Failed to get user engagement' },
      { status: 500 }
    );
  }
}
