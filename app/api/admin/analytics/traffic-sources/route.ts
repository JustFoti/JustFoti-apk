/**
 * Traffic Sources Analytics API
 * GET /api/admin/analytics/traffic-sources - Get traffic source analytics
 * MIGRATED: Uses D1 database adapter for Cloudflare compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/db/adapter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 10000);

    const adapter = getAdapter();
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Get human traffic from page_views table
    let humanPageViews = 0;
    let uniqueHumanVisitors = 0;
    try {
      const humanResult = await adapter.query<{ total_views: number; unique_visitors: number }>(
        `SELECT COUNT(*) as total_views, COUNT(DISTINCT user_id) as unique_visitors
         FROM page_views WHERE entry_time > ?`,
        [startTime]
      );
      const humanStats = (humanResult.data || [])[0];
      humanPageViews = parseInt(String(humanStats?.total_views)) || 0;
      uniqueHumanVisitors = parseInt(String(humanStats?.unique_visitors)) || 0;
    } catch (e) {
      console.error('Error fetching page_views:', e);
    }

    // Fallback to analytics_events if page_views is empty
    if (humanPageViews === 0) {
      try {
        const eventResult = await adapter.query<{ total_views: number; unique_visitors: number }>(
          `SELECT COUNT(*) as total_views,
           COUNT(DISTINCT COALESCE(JSON_EXTRACT(metadata, '$.userId'), session_id)) as unique_visitors
           FROM analytics_events WHERE timestamp > ? AND event_type = 'page_view'`,
          [startTime]
        );
        const eventStats = (eventResult.data || [])[0];
        humanPageViews = parseInt(String(eventStats?.total_views)) || 0;
        uniqueHumanVisitors = parseInt(String(eventStats?.unique_visitors)) || 0;
      } catch (e) {
        console.error('Error fetching analytics_events:', e);
      }
    }

    // Get bot traffic from server_hits
    let botHits = 0;
    let botStats: Record<string, unknown>[] = [];
    try {
      const botTotalsResult = await adapter.query<{ total: number }>(
        `SELECT COUNT(*) as total FROM server_hits WHERE timestamp > ?`,
        [startTime]
      );
      botHits = parseInt(String((botTotalsResult.data || [])[0]?.total)) || 0;

      const botStatsResult = await adapter.query<Record<string, unknown>>(
        `SELECT COALESCE(source_name, 'Unknown') as source_name, COUNT(*) as hit_count
         FROM server_hits WHERE timestamp > ?
         GROUP BY source_name ORDER BY hit_count DESC LIMIT ?`,
        [startTime, limit]
      );
      botStats = botStatsResult.data || [];
    } catch (e) {
      console.error('Error fetching server_hits:', e);
    }

    // Get traffic by source type
    let sourceTypeStats: Record<string, unknown>[] = [];
    try {
      const sourceResult = await adapter.query<Record<string, unknown>>(
        `SELECT 
          CASE 
            WHEN referrer IS NULL OR referrer = '' THEN 'direct'
            WHEN referrer LIKE '%google%' OR referrer LIKE '%bing%' OR referrer LIKE '%yahoo%' OR referrer LIKE '%duckduckgo%' THEN 'organic'
            WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%reddit%' OR referrer LIKE '%instagram%' OR referrer LIKE '%tiktok%' OR referrer LIKE '%t.co%' OR referrer LIKE '%x.com%' THEN 'social'
            ELSE 'referral'
          END as source_type,
          'Browser' as source_name,
          COUNT(*) as hit_count,
          COUNT(DISTINCT user_id) as unique_visitors
        FROM page_views WHERE entry_time > ?
        GROUP BY source_type ORDER BY hit_count DESC`,
        [startTime]
      );
      sourceTypeStats = sourceResult.data || [];
    } catch (e) {
      console.error('Error fetching source type stats:', e);
    }

    // Get traffic by medium
    let mediumStats: Record<string, unknown>[] = [];
    try {
      const mediumResult = await adapter.query<Record<string, unknown>>(
        `SELECT 
          CASE 
            WHEN referrer IS NULL OR referrer = '' THEN 'direct'
            WHEN referrer LIKE '%google%' OR referrer LIKE '%bing%' OR referrer LIKE '%yahoo%' OR referrer LIKE '%duckduckgo%' THEN 'organic'
            WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%reddit%' OR referrer LIKE '%instagram%' OR referrer LIKE '%tiktok%' OR referrer LIKE '%t.co%' OR referrer LIKE '%x.com%' THEN 'social'
            ELSE 'referral'
          END as referrer_medium,
          COUNT(*) as hit_count,
          COUNT(DISTINCT user_id) as unique_visitors
        FROM page_views WHERE entry_time > ?
        GROUP BY referrer_medium ORDER BY hit_count DESC`,
        [startTime]
      );
      mediumStats = mediumResult.data || [];
    } catch (e) {
      console.error('Error fetching medium stats:', e);
    }

    // Get top referring domains
    let topReferrers: Record<string, unknown>[] = [];
    try {
      const referrerResult = await adapter.query<Record<string, unknown>>(
        `SELECT 
          CASE 
            WHEN referrer IS NULL OR referrer = '' THEN '(direct)'
            ELSE SUBSTR(referrer, INSTR(referrer, '://') + 3, 
              CASE 
                WHEN INSTR(SUBSTR(referrer, INSTR(referrer, '://') + 3), '/') > 0 
                THEN INSTR(SUBSTR(referrer, INSTR(referrer, '://') + 3), '/') - 1
                ELSE LENGTH(referrer)
              END)
          END as referrer_domain,
          CASE 
            WHEN referrer IS NULL OR referrer = '' THEN 'direct'
            WHEN referrer LIKE '%google%' OR referrer LIKE '%bing%' THEN 'organic'
            WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%reddit%' THEN 'social'
            ELSE 'referral'
          END as referrer_medium,
          COUNT(*) as hit_count,
          MAX(entry_time) as last_hit
        FROM page_views
        WHERE entry_time > ? AND referrer IS NOT NULL AND referrer != ''
        GROUP BY referrer_domain, referrer_medium
        ORDER BY hit_count DESC LIMIT ?`,
        [startTime, limit]
      );
      topReferrers = referrerResult.data || [];
    } catch (e) {
      console.error('Error fetching top referrers:', e);
    }

    // Get detailed referrer URLs
    let detailedReferrers: Record<string, unknown>[] = [];
    try {
      const detailedResult = await adapter.query<Record<string, unknown>>(
        `SELECT 
          referrer as referrer_url,
          CASE 
            WHEN referrer IS NULL OR referrer = '' THEN '(direct)'
            ELSE SUBSTR(referrer, INSTR(referrer, '://') + 3, 
              CASE 
                WHEN INSTR(SUBSTR(referrer, INSTR(referrer, '://') + 3), '/') > 0 
                THEN INSTR(SUBSTR(referrer, INSTR(referrer, '://') + 3), '/') - 1
                ELSE LENGTH(referrer)
              END)
          END as referrer_domain,
          CASE 
            WHEN referrer LIKE '%google%' OR referrer LIKE '%bing%' THEN 'organic'
            WHEN referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%reddit%' THEN 'social'
            ELSE 'referral'
          END as referrer_medium,
          COUNT(*) as hit_count,
          COUNT(DISTINCT user_id) as unique_visitors,
          MAX(entry_time) as last_hit
        FROM page_views
        WHERE entry_time > ? AND referrer IS NOT NULL AND referrer != ''
        GROUP BY referrer
        ORDER BY hit_count DESC LIMIT ?`,
        [startTime, limit * 2]
      );
      detailedReferrers = detailedResult.data || [];
    } catch (e) {
      console.error('Error fetching detailed referrers:', e);
    }

    // Get hourly traffic pattern
    let hourlyPattern: Record<string, unknown>[] = [];
    try {
      const hourlyResult = await adapter.query<Record<string, unknown>>(
        `SELECT 
          CAST(strftime('%H', datetime(entry_time / 1000, 'unixepoch')) AS INTEGER) as hour,
          COUNT(*) as hit_count,
          0 as bot_hits
        FROM page_views WHERE entry_time > ?
        GROUP BY strftime('%H', datetime(entry_time / 1000, 'unixepoch'))
        ORDER BY hour`,
        [startTime]
      );
      hourlyPattern = hourlyResult.data || [];
    } catch (e) {
      console.error('Error fetching hourly pattern:', e);
    }

    // Get geographic distribution
    let geoStats: Record<string, unknown>[] = [];
    try {
      const geoResult = await adapter.query<Record<string, unknown>>(
        `SELECT 
          UPPER(country) as country,
          COUNT(DISTINCT user_id) as hit_count,
          COUNT(DISTINCT user_id) as unique_visitors
        FROM user_activity
        WHERE last_seen > ? AND country IS NOT NULL AND country != '' AND LENGTH(country) = 2
        GROUP BY UPPER(country)
        ORDER BY hit_count DESC LIMIT ?`,
        [startTime, limit]
      );
      geoStats = geoResult.data || [];
    } catch (e) {
      console.error('Error fetching geo stats:', e);
    }

    const totalHits = humanPageViews + botHits;

    return NextResponse.json({
      success: true,
      period: { days, startTime },
      totals: {
        total_hits: totalHits,
        unique_visitors: uniqueHumanVisitors,
        bot_hits: botHits,
        human_hits: humanPageViews,
      },
      sourceTypeStats,
      mediumStats,
      topReferrers,
      detailedReferrers,
      botStats,
      hourlyPattern,
      geoStats,
    });
  } catch (error) {
    console.error('Failed to get traffic source analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get traffic source analytics' },
      { status: 500 }
    );
  }
}
