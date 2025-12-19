/**
 * Admin Analytics API
 * GET /api/admin/analytics - Get analytics data for admin dashboard
 * 
 * OPTIMIZED: Uses parallel queries and in-memory caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDB, getDB } from '@/lib/db/neon-connection';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { isValidCountryCode, getCountryName } from '@/app/lib/utils/geolocation';

// In-memory cache for analytics data
interface CachedAnalytics {
  data: any;
  timestamp: number;
  period: string;
}

let analyticsCache: CachedAnalytics | null = null;
const CACHE_TTL = 30000; // 30 seconds cache - balances freshness with performance

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const now = Date.now();
    
    // Check cache - use cached data if same period and still valid
    const cacheKey = startDate && endDate ? `${startDate}-${endDate}` : period;
    if (analyticsCache && 
        analyticsCache.period === cacheKey && 
        (now - analyticsCache.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        ...analyticsCache.data,
        cached: true,
        cacheAge: now - analyticsCache.timestamp,
      });
    }

    // Calculate date range
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      if (endDate.length === 10) {
        end.setHours(23, 59, 59, 999);
      }
    } else {
      end = new Date();
      switch (period) {
        case 'day':
          start = new Date(now - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          start = new Date(now - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(now - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          start = new Date(now - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now - 7 * 24 * 60 * 60 * 1000);
      }
    }

    const startTimestamp = start.getTime();
    const endTimestamp = end.getTime();

    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    const isNeon = db.isUsingNeon();

    // Run ALL queries in parallel for maximum performance
    const [
      overviewRaw,
      dailyMetricsRaw,
      contentPerformanceRaw,
      geographicRaw,
      deviceBreakdownRaw,
      peakHoursRaw,
      advancedMetricsRaw,
    ] = await Promise.all([
      // 1. Overview Statistics
      adapter.query(
        isNeon
          ? `SELECT 
              COUNT(*) as "totalViews",
              COALESCE(SUM(total_watch_time), 0) / 60 as "totalWatchTime",
              COUNT(DISTINCT session_id) as "uniqueSessions",
              COUNT(DISTINCT user_id) as "uniqueUsers"
            FROM watch_sessions
            WHERE started_at BETWEEN $1 AND $2`
          : `SELECT 
              COUNT(*) as totalViews,
              COALESCE(SUM(total_watch_time), 0) / 60 as totalWatchTime,
              COUNT(DISTINCT session_id) as uniqueSessions,
              COUNT(DISTINCT user_id) as uniqueUsers
            FROM watch_sessions
            WHERE started_at BETWEEN ? AND ?`,
        [startTimestamp, endTimestamp]
      ),

      // 2. Daily Metrics
      adapter.query(
        isNeon
          ? `SELECT 
              TO_CHAR(TO_TIMESTAMP(started_at / 1000), 'YYYY-MM-DD') as date,
              COUNT(*) as views,
              COALESCE(SUM(total_watch_time), 0) / 60 as "watchTime",
              COUNT(DISTINCT session_id) as sessions
            FROM watch_sessions
            WHERE started_at BETWEEN $1 AND $2
            GROUP BY TO_CHAR(TO_TIMESTAMP(started_at / 1000), 'YYYY-MM-DD')
            ORDER BY date ASC`
          : `SELECT 
              DATE(started_at / 1000, 'unixepoch') as date,
              COUNT(*) as views,
              COALESCE(SUM(total_watch_time), 0) / 60 as watchTime,
              COUNT(DISTINCT session_id) as sessions
            FROM watch_sessions
            WHERE started_at BETWEEN ? AND ?
            GROUP BY DATE(started_at / 1000, 'unixepoch')
            ORDER BY date ASC`,
        [startTimestamp, endTimestamp]
      ),

      // 3. Content Performance
      adapter.query(
        isNeon
          ? `SELECT 
              content_id as "contentId",
              MAX(content_title) as "contentTitle",
              MAX(content_type) as "contentType",
              COUNT(*) as views,
              COALESCE(SUM(total_watch_time), 0) / 60 as "totalWatchTime",
              AVG(CASE WHEN completion_percentage >= 0 AND completion_percentage <= 100 THEN completion_percentage ELSE NULL END) as "avgCompletion",
              COUNT(DISTINCT user_id) as "uniqueViewers"
            FROM watch_sessions
            WHERE started_at BETWEEN $1 AND $2
            GROUP BY content_id
            ORDER BY views DESC
            LIMIT 20`
          : `SELECT 
              content_id as contentId,
              MAX(content_title) as contentTitle,
              MAX(content_type) as contentType,
              COUNT(*) as views,
              COALESCE(SUM(total_watch_time), 0) / 60 as totalWatchTime,
              AVG(CASE WHEN completion_percentage >= 0 AND completion_percentage <= 100 THEN completion_percentage ELSE NULL END) as avgCompletion,
              COUNT(DISTINCT user_id) as uniqueViewers
            FROM watch_sessions
            WHERE started_at BETWEEN ? AND ?
            GROUP BY content_id
            ORDER BY views DESC
            LIMIT 20`,
        [startTimestamp, endTimestamp]
      ),

      // 4. Geographic Data
      adapter.query(
        isNeon
          ? `SELECT 
              UPPER(country) as country,
              COUNT(DISTINCT user_id) as unique_users,
              COUNT(DISTINCT session_id) as sessions
            FROM user_activity
            WHERE last_seen BETWEEN $1 AND $2
            AND country IS NOT NULL AND country != '' AND LENGTH(country) = 2
            GROUP BY UPPER(country)
            ORDER BY unique_users DESC
            LIMIT 50`
          : `SELECT 
              UPPER(country) as country,
              COUNT(DISTINCT user_id) as unique_users,
              COUNT(DISTINCT session_id) as sessions
            FROM user_activity
            WHERE last_seen BETWEEN ? AND ?
            AND country IS NOT NULL AND country != '' AND LENGTH(country) = 2
            GROUP BY UPPER(country)
            ORDER BY unique_users DESC
            LIMIT 50`,
        [startTimestamp, endTimestamp]
      ),

      // 5. Device Breakdown
      adapter.query(
        isNeon
          ? `SELECT device_type as "deviceType", COUNT(*) as count
            FROM watch_sessions
            WHERE started_at BETWEEN $1 AND $2
            GROUP BY device_type
            ORDER BY count DESC`
          : `SELECT device_type as deviceType, COUNT(*) as count
            FROM watch_sessions
            WHERE started_at BETWEEN ? AND ?
            GROUP BY device_type
            ORDER BY count DESC`,
        [startTimestamp, endTimestamp]
      ),

      // 6. Peak Hours
      adapter.query(
        isNeon
          ? `SELECT 
              EXTRACT(HOUR FROM TO_TIMESTAMP(started_at / 1000)) as hour,
              COUNT(*) as count
            FROM watch_sessions
            WHERE started_at BETWEEN $1 AND $2
            GROUP BY hour
            ORDER BY hour ASC`
          : `SELECT 
              strftime('%H', datetime(started_at / 1000, 'unixepoch')) as hour,
              COUNT(*) as count
            FROM watch_sessions
            WHERE started_at BETWEEN ? AND ?
            GROUP BY hour
            ORDER BY hour ASC`,
        [startTimestamp, endTimestamp]
      ),

      // 7. Advanced Metrics
      adapter.query(
        isNeon
          ? `WITH session_stats AS (
              SELECT session_id, COUNT(*) as view_count, SUM(total_watch_time) as session_duration
              FROM watch_sessions
              WHERE started_at BETWEEN $1 AND $2
              GROUP BY session_id
            )
            SELECT
              COUNT(*) as "uniqueViewers",
              AVG(session_duration) / 60 as "avgSessionDuration",
              (COUNT(*) FILTER (WHERE view_count = 1)::float / NULLIF(COUNT(*), 0)) * 100 as "bounceRate"
            FROM session_stats`
          : `SELECT
              COUNT(*) as uniqueViewers,
              AVG(session_duration) / 60 as avgSessionDuration,
              (CAST(SUM(CASE WHEN view_count = 1 THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0)) * 100 as bounceRate
            FROM (
              SELECT session_id, COUNT(*) as view_count, SUM(total_watch_time) as session_duration
              FROM watch_sessions
              WHERE started_at BETWEEN ? AND ?
              GROUP BY session_id
            )`,
        [startTimestamp, endTimestamp]
      ),
    ]);

    // Process results
    const overview = {
      totalViews: parseInt(overviewRaw[0]?.totalViews) || 0,
      totalWatchTime: Math.round(parseFloat(overviewRaw[0]?.totalWatchTime) || 0),
      uniqueSessions: parseInt(overviewRaw[0]?.uniqueSessions) || 0,
      uniqueUsers: parseInt(overviewRaw[0]?.uniqueUsers) || 0,
      avgSessionDuration: Math.round(parseFloat(advancedMetricsRaw[0]?.avgSessionDuration) || 0)
    };

    const dailyMetrics = dailyMetricsRaw.map((row: any) => ({
      date: row.date,
      views: parseInt(row.views) || 0,
      watchTime: Math.round(parseFloat(row.watchTime || row.watchtime) || 0),
      sessions: parseInt(row.sessions) || 0
    }));

    const contentPerformance = contentPerformanceRaw.map((row: any) => ({
      contentId: row.contentId,
      contentTitle: row.contentTitle || 'Unknown Title',
      contentType: row.contentType,
      views: parseInt(row.views) || 0,
      totalWatchTime: Math.round(parseFloat(row.totalWatchTime) || 0),
      avgCompletion: Math.round(parseFloat(row.avgCompletion) || 0),
      uniqueViewers: parseInt(row.uniqueViewers) || 0
    }));

    const geographic = geographicRaw
      .filter((row: any) => row.country && row.country.length === 2 && isValidCountryCode(row.country))
      .map((row: any) => ({
        country: row.country,
        countryName: getCountryName(row.country),
        count: parseInt(row.unique_users) || 0,
        uniqueUsers: parseInt(row.unique_users) || 0,
        sessions: parseInt(row.sessions) || 0
      }));

    const deviceBreakdown = deviceBreakdownRaw.map((row: any) => ({
      deviceType: row.deviceType || 'Unknown',
      count: parseInt(row.count) || 0
    }));

    const peakHours = peakHoursRaw.map((row: any) => ({
      hour: parseInt(row.hour) || 0,
      count: parseInt(row.count) || 0
    }));

    const advancedMetrics = {
      uniqueViewers: parseInt(advancedMetricsRaw[0]?.uniqueViewers) || 0,
      avgSessionDuration: Math.round(parseFloat(advancedMetricsRaw[0]?.avgSessionDuration) || 0),
      bounceRate: Math.round(parseFloat(advancedMetricsRaw[0]?.bounceRate) || 0),
    };

    const responseData = {
      success: true,
      data: {
        overview,
        dailyMetrics,
        contentPerformance,
        geographic,
        deviceBreakdown,
        peakHours,
        advancedMetrics,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    };
    
    // Cache the results
    analyticsCache = {
      data: responseData,
      timestamp: now,
      period: cacheKey,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
