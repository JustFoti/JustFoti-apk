/**
 * Presence Statistics API
 * GET /api/admin/analytics/presence-stats - Get detailed presence tracking stats
 * MIGRATED: Uses D1 database adapter for Cloudflare compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/db/adapter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minutes = parseInt(searchParams.get('minutes') || '30');

    const adapter = getAdapter();

    const now = Date.now();
    const cutoffTime = now - (minutes * 60 * 1000);
    const strictCutoff = now - (30 * 1000);

    // Get active users by activity type (D1/SQLite syntax)
    const activityResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
        COALESCE(activity_type, 'unknown') as activity_type,
        COUNT(DISTINCT user_id) as user_count,
        COUNT(DISTINCT CASE WHEN last_heartbeat >= ? THEN user_id END) as truly_active
      FROM live_activity
      WHERE is_active = 1 AND last_heartbeat >= ?
      GROUP BY COALESCE(activity_type, 'unknown')`,
      [strictCutoff, cutoffTime]
    );
    const activityBreakdown = activityResult.data || [];

    // Get validation score distribution
    const validationResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
        CASE 
          WHEN human_score >= 80 THEN 'high_trust'
          WHEN human_score >= 50 THEN 'medium_trust'
          WHEN human_score >= 30 THEN 'low_trust'
          ELSE 'suspicious'
        END as trust_level,
        COUNT(*) as user_count,
        AVG(human_score) as avg_score
      FROM user_activity
      WHERE last_seen >= ?
      GROUP BY 
        CASE 
          WHEN human_score >= 80 THEN 'high_trust'
          WHEN human_score >= 50 THEN 'medium_trust'
          WHEN human_score >= 30 THEN 'low_trust'
          ELSE 'suspicious'
        END
      ORDER BY avg_score DESC`,
      [cutoffTime]
    );
    const validationScores = validationResult.data || [];

    // Get mouse entropy distribution
    const entropyResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
        CASE 
          WHEN mouse_entropy_avg >= 0.5 THEN 'high_entropy'
          WHEN mouse_entropy_avg >= 0.3 THEN 'medium_entropy'
          WHEN mouse_entropy_avg >= 0.1 THEN 'low_entropy'
          ELSE 'minimal_entropy'
        END as entropy_level,
        COUNT(*) as user_count,
        AVG(total_mouse_samples) as avg_samples
      FROM user_activity
      WHERE last_seen >= ? AND total_mouse_samples > 0
      GROUP BY 
        CASE 
          WHEN mouse_entropy_avg >= 0.5 THEN 'high_entropy'
          WHEN mouse_entropy_avg >= 0.3 THEN 'medium_entropy'
          WHEN mouse_entropy_avg >= 0.1 THEN 'low_entropy'
          ELSE 'minimal_entropy'
        END`,
      [cutoffTime]
    );
    const entropyStats = entropyResult.data || [];

    // Get geographic distribution
    const geoResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
        country,
        city,
        COUNT(DISTINCT user_id) as user_count
      FROM live_activity
      WHERE is_active = 1 AND last_heartbeat >= ? AND country IS NOT NULL
      GROUP BY country, city
      ORDER BY user_count DESC
      LIMIT 20`,
      [cutoffTime]
    );
    const geoDistribution = geoResult.data || [];

    // Get device type distribution
    const deviceResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
        device_type,
        COUNT(DISTINCT user_id) as user_count
      FROM live_activity
      WHERE is_active = 1 AND last_heartbeat >= ?
      GROUP BY device_type`,
      [cutoffTime]
    );
    const deviceDistribution = deviceResult.data || [];

    // Get content being watched
    const contentResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
        content_title,
        content_type,
        activity_type,
        COUNT(DISTINCT user_id) as viewer_count
      FROM live_activity
      WHERE is_active = 1 
        AND last_heartbeat >= ? 
        AND content_title IS NOT NULL
        AND activity_type IN ('watching', 'livetv')
      GROUP BY content_title, content_type, activity_type
      ORDER BY viewer_count DESC
      LIMIT 10`,
      [cutoffTime]
    );
    const activeContent = contentResult.data || [];

    // Calculate totals
    const totalsResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
        COUNT(DISTINCT user_id) as total_active,
        COUNT(DISTINCT CASE WHEN last_heartbeat >= ? THEN user_id END) as truly_active,
        COUNT(DISTINCT session_id) as total_sessions
      FROM live_activity
      WHERE is_active = 1 AND last_heartbeat >= ?`,
      [strictCutoff, cutoffTime]
    );
    const totals = (totalsResult.data || [])[0] || { total_active: 0, truly_active: 0, total_sessions: 0 };

    return NextResponse.json({
      success: true,
      timestamp: now,
      period: { minutes, cutoffTime },
      totals,
      activityBreakdown,
      validationScores,
      entropyStats,
      geoDistribution,
      deviceDistribution,
      activeContent,
    });
  } catch (error) {
    console.error('Failed to get presence stats:', error);
    return NextResponse.json(
      { error: 'Failed to get presence stats' },
      { status: 500 }
    );
  }
}
