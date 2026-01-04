/**
 * Admin Data Fix API
 * POST /api/admin/fix-data - Fix corrupted analytics data
 * GET /api/admin/fix-data - Check current data status
 * MIGRATED: Uses D1 database adapter for Cloudflare compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/db/adapter';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (!action || !['fix-watch-time', 'fix-sessions', 'fix-all'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use: fix-watch-time, fix-sessions, or fix-all' },
        { status: 400 }
      );
    }

    const adapter = getAdapter();
    const results: Record<string, { usersFixed: number; errors: number; details: string[] }> = {};

    if (action === 'fix-watch-time' || action === 'fix-all') {
      results.watchTimeFix = await fixWatchTime(adapter);
    }

    if (action === 'fix-sessions' || action === 'fix-all') {
      results.sessionsFix = await fixSessionCounts(adapter);
    }

    return NextResponse.json({
      success: true,
      action,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Data fix error:', error);
    return NextResponse.json(
      { error: 'Failed to fix data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function fixWatchTime(adapter: ReturnType<typeof getAdapter>): Promise<{ usersFixed: number; errors: number; details: string[] }> {
  const details: string[] = [];
  let usersFixed = 0;
  let errors = 0;

  try {
    const usersResult = await adapter.query<{ user_id: string }>('SELECT DISTINCT user_id FROM user_activity');
    const users = usersResult.data || [];
    details.push(`Found ${users.length} users to process`);

    for (const user of users) {
      try {
        const watchResult = await adapter.query<{ total: number }>(
          'SELECT COALESCE(SUM(total_watch_time), 0) as total FROM watch_sessions WHERE user_id = ?',
          [user.user_id]
        );
        const actualWatchTime = parseInt(String((watchResult.data || [])[0]?.total)) || 0;

        await adapter.execute(
          'UPDATE user_activity SET total_watch_time = ?, updated_at = ? WHERE user_id = ?',
          [actualWatchTime, Date.now(), user.user_id]
        );
        usersFixed++;
      } catch {
        errors++;
      }
    }

    details.push(`Fixed watch time for ${usersFixed} users`);
    if (errors > 0) details.push(`${errors} errors occurred`);

  } catch (err) {
    details.push(`Fatal error: ${err instanceof Error ? err.message : 'Unknown'}`);
    errors++;
  }

  return { usersFixed, errors, details };
}

async function fixSessionCounts(adapter: ReturnType<typeof getAdapter>): Promise<{ usersFixed: number; errors: number; details: string[] }> {
  const details: string[] = [];
  let usersFixed = 0;
  let errors = 0;

  try {
    details.push('Aggregating user data...');
    
    const aggregateResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
         user_id,
         COUNT(DISTINCT session_id) as unique_sessions,
         MIN(first_seen) as first_seen,
         MAX(last_seen) as last_seen,
         SUM(total_watch_time) as total_watch_time,
         MAX(session_id) as latest_session_id,
         MAX(device_type) as device_type,
         MAX(user_agent) as user_agent,
         MAX(country) as country,
         MAX(city) as city,
         MAX(region) as region
       FROM user_activity
       GROUP BY user_id`
    );
    const aggregatedUsers = aggregateResult.data || [];
    details.push(`Found ${aggregatedUsers.length} unique users`);

    if (aggregatedUsers.length === 0) {
      details.push('No users to migrate');
      return { usersFixed: 0, errors: 0, details };
    }

    const sessionCountsResult = await adapter.query<{ user_id: string; watch_sessions: number }>(
      'SELECT user_id, COUNT(DISTINCT session_id) as watch_sessions FROM watch_sessions GROUP BY user_id'
    );
    const sessionCountMap = new Map<string, number>(
      (sessionCountsResult.data || []).map((s) => [s.user_id, parseInt(String(s.watch_sessions)) || 0])
    );

    try {
      await adapter.execute('DROP TABLE IF EXISTS user_activity_backup_auto');
      await adapter.execute('CREATE TABLE user_activity_backup_auto AS SELECT * FROM user_activity');
      details.push('Backup created: user_activity_backup_auto');
    } catch {
      details.push('Warning: Could not create backup');
    }

    await adapter.execute('DELETE FROM user_activity');
    details.push('Cleared existing records');

    const now = Date.now();

    for (const user of aggregatedUsers) {
      try {
        const newId = `ua_${user.user_id}`;
        const uaSessionCount = parseInt(String(user.unique_sessions)) || 1;
        const wsSessionCount = sessionCountMap.get(user.user_id as string) || 0;
        const uniqueSessions = Math.max(uaSessionCount, wsSessionCount, 1);
        
        const firstSeen = parseInt(String(user.first_seen)) || now;
        const lastSeen = parseInt(String(user.last_seen)) || now;
        const totalWatchTime = parseInt(String(user.total_watch_time)) || 0;

        await adapter.execute(
          `INSERT INTO user_activity (
             id, user_id, session_id, first_seen, last_seen, total_sessions,
             total_watch_time, device_type, user_agent, country, city, region,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId,
            user.user_id,
            user.latest_session_id || 'unknown',
            firstSeen,
            lastSeen,
            uniqueSessions,
            totalWatchTime,
            user.device_type || 'unknown',
            user.user_agent || null,
            user.country || null,
            user.city || null,
            user.region || null,
            now,
            now
          ]
        );

        usersFixed++;
      } catch {
        errors++;
      }
    }

    details.push(`Migrated ${usersFixed} users with corrected session counts`);
    if (errors > 0) details.push(`${errors} errors occurred`);

    const countResult = await adapter.query<{ count: number }>('SELECT COUNT(*) as count FROM user_activity');
    details.push(`Final record count: ${(countResult.data || [])[0]?.count}`);

  } catch (err) {
    details.push(`Fatal error: ${err instanceof Error ? err.message : 'Unknown'}`);
    errors++;
  }

  return { usersFixed, errors, details };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adapter = getAdapter();

    const statsResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
         COUNT(*) as total_records,
         COUNT(DISTINCT user_id) as unique_users,
         SUM(total_sessions) as total_sessions_sum,
         SUM(total_watch_time) as total_watch_time_sum,
         AVG(total_sessions) as avg_sessions,
         AVG(total_watch_time) as avg_watch_time,
         SUM(CASE WHEN total_sessions > 100 THEN 1 ELSE 0 END) as suspicious_session_counts,
         SUM(CASE WHEN total_watch_time = 0 AND total_sessions > 1 THEN 1 ELSE 0 END) as zero_watch_time_with_sessions
       FROM user_activity`
    );
    const data = (statsResult.data || [])[0] || {};

    const issues: string[] = [];
    
    const totalRecords = parseInt(String(data.total_records)) || 0;
    const uniqueUsers = parseInt(String(data.unique_users)) || 0;
    const suspiciousSessions = parseInt(String(data.suspicious_session_counts)) || 0;
    const zeroWatchTime = parseInt(String(data.zero_watch_time_with_sessions)) || 0;

    if (totalRecords > uniqueUsers) {
      issues.push(`Duplicate records detected: ${totalRecords} records for ${uniqueUsers} users`);
    }
    if (suspiciousSessions > 0) {
      issues.push(`${suspiciousSessions} users have suspiciously high session counts (>100)`);
    }
    if (zeroWatchTime > 0) {
      issues.push(`${zeroWatchTime} users have sessions but 0 watch time`);
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalRecords,
        uniqueUsers,
        totalSessions: parseInt(String(data.total_sessions_sum)) || 0,
        totalWatchTime: Math.round((parseInt(String(data.total_watch_time_sum)) || 0) / 60),
        avgSessionsPerUser: parseFloat(String(data.avg_sessions || 0)).toFixed(2),
        avgWatchTimePerUser: Math.round((parseFloat(String(data.avg_watch_time)) || 0) / 60),
        suspiciousSessionCounts: suspiciousSessions,
        zeroWatchTimeWithSessions: zeroWatchTime,
      },
      issues,
      needsFix: issues.length > 0,
    });

  } catch (error) {
    console.error('Data status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check data status' },
      { status: 500 }
    );
  }
}
