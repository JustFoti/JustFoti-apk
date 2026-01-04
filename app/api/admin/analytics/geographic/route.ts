/**
 * Geographic Analytics API
 * GET /api/admin/analytics/geographic - Get detailed geographic data for heatmaps
 * MIGRATED: Uses D1 database adapter for Cloudflare compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/db/adapter';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getCountryName, isValidCountryCode } from '@/app/lib/utils/geolocation';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    const groupBy = searchParams.get('groupBy') || 'country';

    // Calculate date range
    const now = new Date();
    let start: Date;

    switch (period) {
      case 'day':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const startTimestamp = start.getTime();
    const endTimestamp = now.getTime();

    const adapter = getAdapter();

    // Get geographic data by country (D1/SQLite syntax)
    const countryResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
        UPPER(country) as country,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT user_id) as unique_users,
        COALESCE(SUM(total_watch_time), 0) as total_watch_time
      FROM user_activity
      WHERE last_seen BETWEEN ? AND ?
      AND country IS NOT NULL
      AND country != ''
      AND LENGTH(country) = 2
      GROUP BY UPPER(country)
      ORDER BY unique_users DESC`,
      [startTimestamp, endTimestamp]
    );
    const countryDataRaw = countryResult.data || [];

    // Get city-level data if requested
    let cityData: { country: string; countryName: string; city: string; sessions: number; uniqueUsers: number }[] = [];
    if (groupBy === 'city') {
      const cityResult = await adapter.query<Record<string, unknown>>(
        `SELECT 
          UPPER(country) as country,
          city,
          COUNT(DISTINCT session_id) as sessions,
          COUNT(DISTINCT user_id) as unique_users
        FROM user_activity
        WHERE last_seen BETWEEN ? AND ?
        AND country IS NOT NULL
        AND LENGTH(country) = 2
        AND city IS NOT NULL
        AND city != ''
        AND city != 'Unknown'
        GROUP BY UPPER(country), city
        ORDER BY unique_users DESC
        LIMIT 50`,
        [startTimestamp, endTimestamp]
      );
      const cityDataRaw = cityResult.data || [];

      cityData = cityDataRaw
        .filter((row) => isValidCountryCode(row.country as string))
        .map((row) => ({
          country: row.country as string,
          countryName: getCountryName(row.country as string),
          city: row.city as string,
          sessions: parseInt(String(row.sessions)) || 0,
          uniqueUsers: parseInt(String(row.unique_users)) || 0,
        }));
    }

    // Get live activity geographic data (real-time)
    const liveGeoResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
        UPPER(country) as country,
        city,
        COUNT(DISTINCT user_id) as active_users
      FROM live_activity
      WHERE is_active = 1
      AND last_heartbeat >= ?
      AND country IS NOT NULL
      AND LENGTH(country) = 2
      GROUP BY UPPER(country), city
      ORDER BY active_users DESC`,
      [Date.now() - 5 * 60 * 1000]
    );
    const liveGeoRaw = liveGeoResult.data || [];

    // Process country data
    const countryData = countryDataRaw
      .filter((row) => {
        const code = row.country as string;
        return code && code.length === 2 && isValidCountryCode(code);
      })
      .map((row) => ({
        country: (row.country as string).toUpperCase(),
        countryName: getCountryName(row.country as string),
        sessions: parseInt(String(row.sessions)) || 0,
        uniqueUsers: parseInt(String(row.unique_users)) || 0,
        totalWatchTime: Math.round((parseInt(String(row.total_watch_time)) || 0) / 60),
      }));

    // Process live geo data
    const liveGeo = liveGeoRaw
      .filter((row) => {
        const code = row.country as string;
        return code && code.length === 2 && isValidCountryCode(code);
      })
      .map((row) => ({
        country: (row.country as string).toUpperCase(),
        countryName: getCountryName(row.country as string),
        city: row.city as string,
        activeUsers: parseInt(String(row.active_users)) || 0,
      }));

    // Calculate totals
    const totals = {
      totalSessions: countryData.reduce((sum, c) => sum + c.sessions, 0),
      totalUniqueUsers: countryData.reduce((sum, c) => sum + c.uniqueUsers, 0),
      totalWatchTime: countryData.reduce((sum, c) => sum + c.totalWatchTime, 0),
      totalCountries: countryData.length,
      currentlyActive: liveGeo.reduce((sum, l) => sum + l.activeUsers, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        countries: countryData,
        cities: cityData,
        liveActivity: liveGeo,
        totals,
        period: {
          start: start.toISOString(),
          end: now.toISOString(),
          days: Math.round((endTimestamp - startTimestamp) / (24 * 60 * 60 * 1000)),
        },
      },
    });
  } catch (error) {
    console.error('Geographic Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
