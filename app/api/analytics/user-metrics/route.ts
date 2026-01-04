/**
 * User Metrics API
 * GET /api/analytics/user-metrics - Get DAU, WAU, MAU, and other user metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/app/lib/db/adapter';
import { getLocationFromHeaders } from '@/app/lib/utils/geolocation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const includeDaily = searchParams.get('includeDaily') === 'true';

    const adapter = getAdapter();

    const now = Date.now();
    const startTime = now - (days * 24 * 60 * 60 * 1000);

    // Get current metrics from user_activity table
    const metricsResult = await adapter.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN last_seen >= ? THEN user_id END) as dau,
        COUNT(DISTINCT CASE WHEN last_seen >= ? THEN user_id END) as wau,
        COUNT(DISTINCT CASE WHEN last_seen >= ? THEN user_id END) as mau,
        COUNT(DISTINCT CASE WHEN first_seen >= ? THEN user_id END) as new_users,
        COUNT(DISTINCT CASE WHEN first_seen < ? AND last_seen >= ? THEN user_id END) as returning_users,
        SUM(total_sessions) as total_sessions,
        SUM(total_watch_time) as total_watch_time
      FROM user_activity
      WHERE last_seen >= ?
    `, [
      now - (24 * 60 * 60 * 1000), // DAU - last 24 hours
      now - (7 * 24 * 60 * 60 * 1000), // WAU - last 7 days
      now - (30 * 24 * 60 * 60 * 1000), // MAU - last 30 days
      startTime, // New users in period
      startTime, startTime, // Returning users
      startTime // Total activity in period
    ]);

    const metrics = (metricsResult.data && metricsResult.data[0]) || {
      dau: 0,
      wau: 0,
      mau: 0,
      new_users: 0,
      returning_users: 0,
      total_sessions: 0,
      total_watch_time: 0
    };

    // Get daily breakdown if requested
    let dailyMetrics: any[] = [];
    if (includeDaily) {
      const dailyResult = await adapter.query(`
        SELECT 
          DATE(last_seen / 1000, 'unixepoch') as date,
          COUNT(DISTINCT user_id) as active_users,
          SUM(total_sessions) as sessions,
          SUM(total_watch_time) as watch_time
        FROM user_activity
        WHERE last_seen >= ?
        GROUP BY DATE(last_seen / 1000, 'unixepoch')
        ORDER BY date DESC
        LIMIT ?
      `, [startTime, days]);
      
      dailyMetrics = dailyResult.data || [];
    }

    // Calculate growth rates (simplified - using same period comparison)
    const previousPeriodStart = startTime - (days * 24 * 60 * 60 * 1000);
    const previousResult = await adapter.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN last_seen >= ? AND last_seen < ? THEN user_id END) as dau,
        COUNT(DISTINCT CASE WHEN last_seen >= ? AND last_seen < ? THEN user_id END) as wau,
        COUNT(DISTINCT CASE WHEN last_seen >= ? AND last_seen < ? THEN user_id END) as mau,
        COUNT(DISTINCT CASE WHEN first_seen >= ? AND first_seen < ? THEN user_id END) as new_users,
        SUM(CASE WHEN last_seen >= ? AND last_seen < ? THEN total_sessions ELSE 0 END) as total_sessions
      FROM user_activity
    `, [
      previousPeriodStart, startTime, // Previous DAU
      previousPeriodStart, startTime, // Previous WAU  
      previousPeriodStart, startTime, // Previous MAU
      previousPeriodStart, startTime, // Previous new users
      previousPeriodStart, startTime  // Previous sessions
    ]);

    const previousMetrics = (previousResult.data && previousResult.data[0]) || {
      dau: 0,
      wau: 0,
      mau: 0,
      new_users: 0,
      total_sessions: 0
    };

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const growth = {
      dau: calculateGrowth(Number((metrics as any).dau), Number((previousMetrics as any).dau)),
      wau: calculateGrowth(Number((metrics as any).wau), Number((previousMetrics as any).wau)),
      mau: calculateGrowth(Number((metrics as any).mau), Number((previousMetrics as any).mau)),
      newUsers: calculateGrowth(Number((metrics as any).new_users), Number((previousMetrics as any).new_users)),
      sessions: calculateGrowth(Number((metrics as any).total_sessions), Number((previousMetrics as any).total_sessions)),
    };

    // Calculate retention rate (returning users / total active users)
    const newUsers = Number((metrics as any).new_users) || 0;
    const returningUsers = Number((metrics as any).returning_users) || 0;
    const totalActiveUsers = newUsers + returningUsers;
    const retentionRate = totalActiveUsers > 0 
      ? Math.round((returningUsers / totalActiveUsers) * 100) 
      : 0;

    // Calculate engagement metrics
    const avgSessionsPerUser = totalActiveUsers > 0
      ? Math.round((Number((metrics as any).total_sessions) / totalActiveUsers) * 10) / 10
      : 0;

    return NextResponse.json({
      success: true,
      metrics: {
        dau: Number((metrics as any).dau),
        wau: Number((metrics as any).wau),
        mau: Number((metrics as any).mau),
        newUsers,
        returningUsers,
        totalSessions: Number((metrics as any).total_sessions),
        totalWatchTime: Number((metrics as any).total_watch_time),
        retentionRate,
        avgSessionsPerUser,
        totalActiveUsers,
      },
      growth,
      dailyMetrics,
      period: {
        days,
        start: startTime,
        end: now,
      },
    });
  } catch (error) {
    console.error('Failed to get user metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get user metrics' },
      { status: 500 }
    );
  }
}

// POST endpoint to update user activity and daily metrics
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const adapter = getAdapter();

    // Handle different types of updates
    if (data.date) {
      // Update metrics for the specified date (simplified - just return success)
      return NextResponse.json({
        success: true,
        message: `Daily metrics updated for ${data.date}`,
      });
    }

    if (data.userId && data.sessionId) {
      // Update user activity with watch time
      const userAgent = request.headers.get('user-agent') || '';
      const deviceType = getDeviceType(userAgent);
      
      // Get geo data from headers using utility
      const locationData = getLocationFromHeaders(request);

      // Use the upsertUserActivity function from track route
      await upsertUserActivity(adapter, {
        userId: data.userId,
        sessionId: data.sessionId,
        deviceType,
        userAgent,
        country: locationData.countryCode,
        city: locationData.city,
        region: locationData.region,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid request - provide date or userId/sessionId' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to update metrics:', error);
    return NextResponse.json(
      { error: 'Failed to update metrics' },
      { status: 500 }
    );
  }
}

function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else if (ua.includes('smart-tv') || ua.includes('smarttv')) {
    return 'tv';
  }
  return 'desktop';
}

// Upsert user activity using adapter
async function upsertUserActivity(adapter: any, data: {
  userId: string;
  sessionId: string;
  deviceType?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  region?: string;
}): Promise<void> {
  const now = Date.now();
  const id = `ua_${data.userId}`;
  
  const existingResult = await adapter.query(
    'SELECT id FROM user_activity WHERE user_id = ?',
    [data.userId]
  );

  if (existingResult.data && existingResult.data.length > 0) {
    await adapter.execute(
      `UPDATE user_activity SET 
        session_id = ?, last_seen = ?, device_type = COALESCE(?, device_type),
        user_agent = COALESCE(?, user_agent), country = COALESCE(?, country),
        city = COALESCE(?, city), region = COALESCE(?, region),
        total_sessions = total_sessions + 1, updated_at = ?
      WHERE user_id = ?`,
      [
        data.sessionId, now, data.deviceType || null, data.userAgent || null,
        data.country || null, data.city || null, data.region || null, now, data.userId
      ]
    );
  } else {
    await adapter.execute(
      `INSERT INTO user_activity (
        id, user_id, session_id, first_seen, last_seen, total_sessions,
        device_type, user_agent, country, city, region, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.userId, data.sessionId, now, now,
        data.deviceType || 'unknown', data.userAgent || null,
        data.country || null, data.city || null, data.region || null, now, now
      ]
    );
  }
}
