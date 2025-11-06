/**
 * Admin Analytics API
 * GET /api/admin/analytics - Get analytics data for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDB, getDB } from '@/lib/db/neon-connection';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';



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
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Calculate date range
    const now = new Date();
    let start: Date;
    let end = new Date(now);

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
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
    }

    const startTimestamp = start.getTime();
    const endTimestamp = end.getTime();

    // Initialize database and get analytics data
    await initializeDB();
    const db = getDB();

    // Get overview statistics
    const overview = await db.getAnalyticsOverview(startTimestamp, endTimestamp);
    
    // For now, return simplified data structure
    // TODO: Implement full analytics queries for the new database adapter
    const dailyMetrics: any[] = [];
    const topContent: any[] = [];
    const geographic: any[] = [];
    const devices: any[] = [];

    return NextResponse.json({
      success: true,
      data: {
        overview,
        dailyMetrics,
        topContent,
        geographic,
        devices,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          period,
        },
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
