/**
 * Debug Traffic API - Check traffic and presence data
 * GET /api/admin/debug/traffic
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
    const thirtyMinutesAgo = now - 30 * 60 * 1000;
    const twoMinutesAgo = now - 2 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const results: Record<string, unknown> = {
      currentTime: now,
      currentTimeISO: new Date(now).toISOString(),
      thirtyMinutesAgo,
      twoMinutesAgo,
    };

    // Check server_hits table
    try {
      const serverHitsResult = await adapter.query<{ count: number }>('SELECT COUNT(*) as count FROM server_hits');
      const totalCount = parseInt(String((serverHitsResult.data || [])[0]?.count)) || 0;
      
      const last24hResult = await adapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM server_hits WHERE timestamp > ?',
        [oneDayAgo]
      );
      
      results.serverHits = {
        totalCount,
        last24hCount: parseInt(String((last24hResult.data || [])[0]?.count)) || 0,
      };
    } catch (e) {
      results.serverHits = { error: String(e) };
    }

    // Check live_activity
    try {
      const totalLiveResult = await adapter.query<{ count: number }>('SELECT COUNT(*) as count FROM live_activity');
      const activeResult = await adapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM live_activity WHERE is_active = 1'
      );
      const recentActiveResult = await adapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM live_activity WHERE is_active = 1 AND last_heartbeat >= ?',
        [twoMinutesAgo]
      );
      const thirtyMinResult = await adapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM live_activity WHERE is_active = 1 AND last_heartbeat >= ?',
        [thirtyMinutesAgo]
      );

      results.liveActivity = {
        totalRecords: parseInt(String((totalLiveResult.data || [])[0]?.count)) || 0,
        activeRecords: parseInt(String((activeResult.data || [])[0]?.count)) || 0,
        activeInLast2Min: parseInt(String((recentActiveResult.data || [])[0]?.count)) || 0,
        activeInLast30Min: parseInt(String((thirtyMinResult.data || [])[0]?.count)) || 0,
      };
    } catch (e) {
      results.liveActivity = { error: String(e) };
    }

    // Check user_activity
    try {
      const recentUsersResult = await adapter.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM user_activity WHERE last_seen >= ?',
        [thirtyMinutesAgo]
      );
      results.userActivity = {
        activeInLast30Min: parseInt(String((recentUsersResult.data || [])[0]?.count)) || 0,
      };
    } catch (e) {
      results.userActivity = { error: String(e) };
    }

    return NextResponse.json({
      success: true,
      databaseType: 'D1 (SQLite)',
      ...results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Debug traffic API error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
