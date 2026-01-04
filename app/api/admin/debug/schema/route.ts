/**
 * Debug Schema API - Check database table columns
 * GET /api/admin/debug/schema
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
    const tables = ['user_activity', 'live_activity', 'watch_sessions', 'analytics_events', 'page_views', 'server_hits', 'referrer_stats'];
    const schema: Record<string, unknown> = {};
    const rowCounts: Record<string, number> = {};

    for (const table of tables) {
      try {
        const columnsResult = await adapter.query<Record<string, unknown>>(`PRAGMA table_info(${table})`);
        const columns = columnsResult.data || [];
        schema[table] = columns.map((col) => ({
          column_name: col.name,
          data_type: col.type,
          column_default: col.dflt_value,
          is_nullable: col.notnull === 0 ? 'YES' : 'NO'
        }));

        const countResult = await adapter.query<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
        rowCounts[table] = parseInt(String((countResult.data || [])[0]?.count)) || 0;
      } catch (e) {
        schema[table] = { error: String(e) };
        rowCounts[table] = 0;
      }
    }

    const requiredColumns: Record<string, string[]> = {
      user_activity: ['user_id', 'session_id', 'first_seen', 'last_seen', 'country', 'city', 'region', 
                      'mouse_entropy_avg', 'total_mouse_samples', 'human_score'],
      live_activity: ['user_id', 'session_id', 'activity_type', 'last_heartbeat', 'is_active', 'country', 'city'],
      watch_sessions: ['user_id', 'content_id', 'started_at', 'total_watch_time', 'completion_percentage'],
      analytics_events: ['session_id', 'timestamp', 'event_type', 'metadata'],
    };

    const missingColumns: Record<string, string[]> = {};
    
    for (const [table, required] of Object.entries(requiredColumns)) {
      const tableSchema = schema[table];
      if (Array.isArray(tableSchema)) {
        const existingColumns = tableSchema.map((col: { column_name: string }) => col.column_name);
        const missing = required.filter(col => !existingColumns.includes(col));
        if (missing.length > 0) {
          missingColumns[table] = missing;
        }
      }
    }

    return NextResponse.json({
      success: true,
      databaseType: 'D1 (SQLite)',
      schema,
      rowCounts,
      missingColumns: Object.keys(missingColumns).length > 0 ? missingColumns : null,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Debug schema API error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
