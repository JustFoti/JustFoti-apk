/**
 * Admin Debug API - Check database health and data
 * GET /api/admin/debug - Get database stats and sample data
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

    const adapter = getAdapter();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const tables = ['analytics_events', 'watch_sessions', 'user_activity', 'live_activity', 'content_stats', 'page_views', 'user_engagement', 'session_details'];
    const tableCounts: Record<string, number> = {};
    
    for (const table of tables) {
      try {
        const result = await adapter.query<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
        tableCounts[table] = parseInt(String((result.data || [])[0]?.count)) || 0;
      } catch {
        tableCounts[table] = -1;
      }
    }

    const recentCounts: Record<string, number | string> = {};
    
    try {
      const eventsResult = await adapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM analytics_events WHERE timestamp > ?',
        [oneDayAgo]
      );
      recentCounts.events_24h = parseInt(String((eventsResult.data || [])[0]?.count)) || 0;
    } catch {
      recentCounts.events_24h = 'error';
    }

    try {
      const sessionsResult = await adapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM watch_sessions WHERE started_at > ?',
        [oneDayAgo]
      );
      recentCounts.sessions_24h = parseInt(String((sessionsResult.data || [])[0]?.count)) || 0;
    } catch {
      recentCounts.sessions_24h = 'error';
    }

    try {
      const activityResult = await adapter.query<{ count: number }>(
        'SELECT COUNT(DISTINCT user_id) as count FROM user_activity WHERE last_seen > ?',
        [oneDayAgo]
      );
      recentCounts.active_users_24h = parseInt(String((activityResult.data || [])[0]?.count)) || 0;
    } catch {
      recentCounts.active_users_24h = 'error';
    }

    try {
      const liveResult = await adapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM live_activity WHERE is_active = 1 AND last_heartbeat > ?',
        [now - 5 * 60 * 1000]
      );
      recentCounts.live_now = parseInt(String((liveResult.data || [])[0]?.count)) || 0;
    } catch {
      recentCounts.live_now = 'error';
    }

    return NextResponse.json({
      success: true,
      database: 'D1 (SQLite)',
      currentTime: now,
      currentTimeISO: new Date(now).toISOString(),
      tableCounts,
      recentCounts,
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: 'Failed to get debug info', details: String(error) },
      { status: 500 }
    );
  }
}
