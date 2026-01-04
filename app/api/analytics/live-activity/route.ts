/**
 * Live Activity API
 * POST /api/analytics/live-activity - Update live activity heartbeat
 * GET /api/analytics/live-activity - Get current live activities
 * DELETE /api/analytics/live-activity - Deactivate activity
 * MIGRATED: Uses D1 database adapter for Cloudflare compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/db/adapter';
import { getLocationFromHeaders } from '@/app/lib/utils/geolocation';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.userId || !data.sessionId || !data.activityType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const adapter = getAdapter();
    const activityId = `live_${data.userId}_${data.sessionId}`;
    const now = Date.now();

    const userAgent = request.headers.get('user-agent') || '';
    const deviceType = userAgent.includes('Mobile') ? 'mobile' : 
                      userAgent.includes('Tablet') ? 'tablet' : 'desktop';

    const locationData = getLocationFromHeaders(request);

    // Upsert live activity
    const existingResult = await adapter.query<{ id: string }>(
      'SELECT id FROM live_activity WHERE id = ?',
      [activityId]
    );

    if (existingResult.data && existingResult.data.length > 0) {
      await adapter.execute(
        `UPDATE live_activity SET 
          activity_type = ?, content_id = ?, content_title = ?, content_type = ?,
          season_number = ?, episode_number = ?, current_position = ?, duration = ?,
          quality = ?, device_type = ?, country = ?, city = ?, region = ?,
          last_heartbeat = ?, is_active = 1
        WHERE id = ?`,
        [
          data.activityType, data.contentId || null, data.contentTitle || null, data.contentType || null,
          data.seasonNumber || null, data.episodeNumber || null, data.currentPosition || 0, data.duration || 0,
          data.quality || null, deviceType, locationData.countryCode || null, locationData.city || null, locationData.region || null,
          now, activityId
        ]
      );
    } else {
      await adapter.execute(
        `INSERT INTO live_activity (
          id, user_id, session_id, activity_type, content_id, content_title, content_type,
          season_number, episode_number, current_position, duration, quality, device_type,
          country, city, region, last_heartbeat, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          activityId, data.userId, data.sessionId, data.activityType,
          data.contentId || null, data.contentTitle || null, data.contentType || null,
          data.seasonNumber || null, data.episodeNumber || null, data.currentPosition || 0, data.duration || 0,
          data.quality || null, deviceType, locationData.countryCode || null, locationData.city || null, locationData.region || null,
          now, now
        ]
      );
    }

    return NextResponse.json({ success: true, activityId });
  } catch (error) {
    console.error('Failed to update live activity:', error);
    return NextResponse.json(
      { error: 'Failed to update live activity' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxAge = parseInt(searchParams.get('maxAge') || '5');

    const adapter = getAdapter();
    const cutoff = Date.now() - (maxAge * 60 * 1000);

    const activitiesResult = await adapter.query<Record<string, unknown>>(
      `SELECT * FROM live_activity WHERE is_active = 1 AND last_heartbeat >= ? ORDER BY last_heartbeat DESC`,
      [cutoff]
    );
    const activities = activitiesResult.data || [];

    // Cleanup stale activities
    const staleTime = Date.now() - (maxAge * 2 * 60 * 1000);
    await adapter.execute(
      'UPDATE live_activity SET is_active = 0 WHERE is_active = 1 AND last_heartbeat < ?',
      [staleTime]
    );

    // Calculate stats
    const uniqueUsers = new Set(activities.map(a => a.user_id));
    const watchingUsers = new Set(activities.filter(a => a.activity_type === 'watching').map(a => a.user_id));
    const browsingUsers = new Set(activities.filter(a => a.activity_type === 'browsing').map(a => a.user_id));
    const livetvUsers = new Set(activities.filter(a => a.activity_type === 'livetv').map(a => a.user_id));
    
    const byDevice: Record<string, Set<unknown>> = {};
    const byCountry: Record<string, Set<unknown>> = {};
    const topContentMap: Record<string, { contentId: unknown; contentTitle: unknown; contentType: unknown; users: Set<unknown> }> = {};

    activities.forEach(a => {
      const device = (a.device_type as string) || 'unknown';
      if (!byDevice[device]) byDevice[device] = new Set();
      byDevice[device].add(a.user_id);

      const country = (a.country as string) || 'unknown';
      if (!byCountry[country]) byCountry[country] = new Set();
      byCountry[country].add(a.user_id);

      if (a.content_id) {
        const key = a.content_id as string;
        if (!topContentMap[key]) {
          topContentMap[key] = {
            contentId: a.content_id,
            contentTitle: a.content_title,
            contentType: a.content_type,
            users: new Set(),
          };
        }
        topContentMap[key].users.add(a.user_id);
      }
    });

    const byDeviceCounts: Record<string, number> = {};
    for (const [device, users] of Object.entries(byDevice)) {
      byDeviceCounts[device] = users.size;
    }
    
    const byCountryCounts: Record<string, number> = {};
    for (const [country, users] of Object.entries(byCountry)) {
      byCountryCounts[country] = users.size;
    }

    const topContentArray = Object.values(topContentMap)
      .map((content) => ({
        contentId: content.contentId,
        contentTitle: content.contentTitle,
        contentType: content.contentType,
        count: content.users.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      activities,
      stats: {
        totalActive: uniqueUsers.size,
        watching: watchingUsers.size,
        browsing: browsingUsers.size,
        livetv: livetvUsers.size,
        byDevice: byDeviceCounts,
        byCountry: byCountryCounts,
        topContent: topContentArray,
      },
    });
  } catch (error) {
    console.error('Failed to get live activities:', error);
    return NextResponse.json(
      { error: 'Failed to get live activities' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('id');

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const adapter = getAdapter();
    await adapter.execute(
      'UPDATE live_activity SET is_active = 0 WHERE id = ?',
      [activityId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to deactivate activity:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate activity' },
      { status: 500 }
    );
  }
}
