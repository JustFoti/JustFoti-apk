/**
 * Admin Users API - Single Source of Truth for User Data
 * GET /api/admin/users - Get all users with their activity data
 * GET /api/admin/users?userId=xxx - Get detailed profile for a specific user
 * MIGRATED: Uses D1 database adapter for Cloudflare compatibility
 * Requirements: 6.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/db/adapter';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getCountryName } from '@/app/lib/utils/geolocation';

function isValidTimestamp(ts: number): boolean {
  if (!ts || ts <= 0 || isNaN(ts)) return false;
  const now = Date.now();
  const minValidDate = new Date('2020-01-01').getTime();
  const oneHourFromNow = now + (60 * 60 * 1000);
  return ts >= minValidDate && ts <= oneHourFromNow;
}

function normalizeTimestamp(ts: unknown): number {
  if (!ts) return 0;
  const num = typeof ts === 'string' ? parseInt(ts, 10) : Number(ts);
  if (isNaN(num) || num <= 0) return 0;
  if (num < 1000000000000) return num * 1000;
  return num;
}

function getMostCommon(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const counts: Record<string, number> = {};
  arr.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adapter = getAdapter();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    if (userId) {
      return await getUserProfile(adapter, userId, now, fiveMinutesAgo);
    }

    return await getAllUsers(adapter, limit, offset, fiveMinutesAgo, oneDayAgo, oneWeekAgo);

  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

async function getAllUsers(
  adapter: ReturnType<typeof getAdapter>, 
  limit: number, 
  offset: number,
  fiveMinutesAgo: number,
  oneDayAgo: number,
  oneWeekAgo: number
) {
  let users: Record<string, unknown>[] = [];
  
  try {
    const usersResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
         ua.user_id, ua.session_id, ua.first_seen, ua.last_seen,
         ua.total_sessions, 
         COALESCE(ws.actual_watch_time, ua.total_watch_time, 0) as total_watch_time,
         ua.country, ua.city, ua.region, ua.device_type, ua.user_agent
       FROM (
         SELECT id, user_id, session_id, first_seen, last_seen,
           total_sessions, total_watch_time, country, city, region,
           device_type, user_agent
         FROM user_activity
         WHERE first_seen > 0 AND last_seen > 0
         GROUP BY user_id
         HAVING last_seen = MAX(last_seen)
       ) ua
       LEFT JOIN (
         SELECT user_id, SUM(total_watch_time) as actual_watch_time
         FROM watch_sessions
         GROUP BY user_id
       ) ws ON ua.user_id = ws.user_id
       ORDER BY ua.last_seen DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    users = usersResult.data || [];
  } catch (e) {
    console.error('Error fetching users:', e);
  }
  
  let liveUsers: Record<string, { activity: string; content: string }> = {};
  try {
    const liveResult = await adapter.query<Record<string, unknown>>(
      `SELECT user_id, activity_type, content_title FROM live_activity WHERE is_active = 1 AND last_heartbeat >= ?`,
      [fiveMinutesAgo]
    );
    (liveResult.data || []).forEach((l) => {
      liveUsers[l.user_id as string] = { activity: l.activity_type as string, content: l.content_title as string };
    });
  } catch (e) {
    console.error('Error fetching live activity:', e);
  }

  let totalUsers = 0;
  try {
    const countResult = await adapter.query<{ count: number }>(
      'SELECT COUNT(DISTINCT user_id) as count FROM user_activity WHERE first_seen > 0 AND last_seen > 0'
    );
    totalUsers = parseInt(String((countResult.data || [])[0]?.count)) || 0;
  } catch (e) {
    console.error('Error counting users:', e);
  }

  const validUsers = users
    .map((u) => {
      const firstSeen = normalizeTimestamp(u.first_seen);
      const lastSeen = normalizeTimestamp(u.last_seen);
      const live = liveUsers[u.user_id as string];
      const country = u.country as string;
      
      return {
        userId: u.user_id,
        sessionId: u.session_id,
        firstSeen: isValidTimestamp(firstSeen) ? firstSeen : 0,
        lastSeen: isValidTimestamp(lastSeen) ? lastSeen : 0,
        totalSessions: Math.max(0, parseInt(String(u.total_sessions)) || 0),
        totalWatchTime: Math.max(0, Math.round((parseInt(String(u.total_watch_time)) || 0) / 60)),
        country: country && country.length === 2 ? country.toUpperCase() : null,
        countryName: country && country.length === 2 ? (getCountryName(country.toUpperCase()) || country) : null,
        city: u.city || null,
        region: u.region || null,
        deviceType: u.device_type || 'unknown',
        userAgent: u.user_agent,
        isOnline: !!live,
        currentActivity: live?.activity || null,
        currentContent: live?.content || null,
      };
    })
    .filter((u) => u.userId && (u.firstSeen > 0 || u.lastSeen > 0));

  const activeToday = validUsers.filter((u) => u.lastSeen >= oneDayAgo).length;
  const activeThisWeek = validUsers.filter((u) => u.lastSeen >= oneWeekAgo).length;
  const onlineNow = validUsers.filter((u) => u.isOnline).length;

  return NextResponse.json({
    success: true,
    users: validUsers,
    pagination: { total: totalUsers, limit, offset, hasMore: offset + limit < totalUsers },
    summary: { totalUsers, activeToday, activeThisWeek, onlineNow },
  });
}

async function getUserProfile(adapter: ReturnType<typeof getAdapter>, userId: string, _now: number, fiveMinutesAgo: number) {
  try {
    const userResult = await adapter.query<Record<string, unknown>>(
      `SELECT * FROM user_activity WHERE user_id = ? ORDER BY last_seen DESC LIMIT 1`,
      [userId]
    );
    
    if (!userResult.data || userResult.data.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userResult.data[0];
    const userFirstSeen = normalizeTimestamp(user.first_seen);
    const userLastSeen = normalizeTimestamp(user.last_seen);

    let liveActivity: Record<string, unknown> | null = null;
    try {
      const liveResult = await adapter.query<Record<string, unknown>>(
        `SELECT * FROM live_activity WHERE user_id = ? AND is_active = 1 AND last_heartbeat >= ?`,
        [userId, fiveMinutesAgo]
      );
      liveActivity = (liveResult.data || [])[0] || null;
    } catch (e) {
      console.error('Error fetching live activity:', e);
    }

    let watchHistory: Record<string, unknown>[] = [];
    try {
      const watchResult = await adapter.query<Record<string, unknown>>(
        `SELECT content_id, content_type, content_title, season_number, episode_number,
           started_at, ended_at, total_watch_time, last_position, duration, completion_percentage,
           quality, device_type, is_completed, pause_count, seek_count
         FROM watch_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 100`,
        [userId]
      );
      watchHistory = watchResult.data || [];
    } catch (e) {
      console.error('Error fetching watch history:', e);
    }

    const totalWatchTime = watchHistory.reduce((sum, w) => sum + (parseInt(String(w.total_watch_time)) || 0), 0);
    const avgCompletion = watchHistory.length > 0 
      ? watchHistory.reduce((sum, w) => sum + (parseFloat(String(w.completion_percentage)) || 0), 0) / watchHistory.length 
      : 0;
    const completedCount = watchHistory.filter((w) => w.is_completed).length;
    const movieCount = watchHistory.filter((w) => w.content_type === 'movie').length;
    const tvCount = watchHistory.filter((w) => w.content_type === 'tv').length;

    const country = user.country as string;

    return NextResponse.json({
      success: true,
      profile: {
        userId: user.user_id,
        sessionId: user.session_id,
        firstSeen: isValidTimestamp(userFirstSeen) ? userFirstSeen : 0,
        lastSeen: isValidTimestamp(userLastSeen) ? userLastSeen : 0,
        totalSessions: Math.max(0, Number(user.total_sessions) || 0),
        country: country && country.length === 2 ? country.toUpperCase() : null,
        countryName: country && country.length === 2 ? (getCountryName(country.toUpperCase()) || country) : null,
        city: user.city || null,
        region: user.region || null,
        deviceType: user.device_type || 'unknown',
        userAgent: user.user_agent,
      },
      liveStatus: liveActivity ? {
        isOnline: true,
        activityType: liveActivity.activity_type,
        contentId: liveActivity.content_id,
        contentTitle: liveActivity.content_title,
        currentPosition: Number(liveActivity.current_position) || 0,
        lastHeartbeat: Number(liveActivity.last_heartbeat) || 0,
      } : { isOnline: false },
      engagement: {
        totalWatchTime: Math.round(totalWatchTime / 60),
        avgCompletion: Math.round(avgCompletion),
        completedCount,
      },
      preferences: {
        movieCount,
        tvCount,
        preferredType: movieCount > tvCount ? 'movies' : tvCount > movieCount ? 'tv' : 'mixed',
        topQuality: getMostCommon(watchHistory.map((w) => w.quality as string).filter(Boolean)),
        topDevice: getMostCommon(watchHistory.map((w) => w.device_type as string).filter(Boolean)),
      },
      watchHistory: watchHistory.slice(0, 20).map((w) => ({
        contentId: w.content_id,
        contentType: w.content_type,
        contentTitle: w.content_title || `Content ${w.content_id}`,
        startedAt: normalizeTimestamp(w.started_at),
        watchTime: Math.max(0, Math.round((parseInt(String(w.total_watch_time)) || 0) / 60)),
        completion: Math.min(100, Math.max(0, Math.round(parseFloat(String(w.completion_percentage)) || 0))),
        isCompleted: !!w.is_completed,
      })),
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch user profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
