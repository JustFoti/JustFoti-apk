/**
 * Peak Stats API - GET/POST handlers for peak user counts
 * MIGRATED: Uses D1 database adapter for Cloudflare compatibility
 * Requirements: 13.8
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getAdapter } from '@/lib/db/adapter';

interface PeakStats {
  date: string;
  peakTotal: number;
  peakWatching: number;
  peakLiveTV: number;
  peakBrowsing: number;
  peakTotalTime: number;
  peakWatchingTime: number;
  peakLiveTVTime: number;
  peakBrowsingTime: number;
  lastUpdated: number;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const adapter = getAdapter();
    const today = getTodayDate();
    let peakStats: PeakStats | null = null;
    try {
      const result = await adapter.query<Record<string, unknown>>(
        'SELECT * FROM peak_stats WHERE date = ?',
        [today]
      );
      if (result.data && result.data.length > 0) {
        const row = result.data[0];
        peakStats = {
          date: row.date as string,
          peakTotal: (row.peak_total as number) || 0,
          peakWatching: (row.peak_watching as number) || 0,
          peakLiveTV: (row.peak_livetv as number) || 0,
          peakBrowsing: (row.peak_browsing as number) || 0,
          peakTotalTime: (row.peak_total_time as number) || 0,
          peakWatchingTime: (row.peak_watching_time as number) || 0,
          peakLiveTVTime: (row.peak_livetv_time as number) || 0,
          peakBrowsingTime: (row.peak_browsing_time as number) || 0,
          lastUpdated: (row.last_updated as number) || Date.now(),
        };
      }
    } catch { /* table may not exist */ }
    return NextResponse.json({
      success: true,
      today: peakStats || { date: today, peakTotal: 0, peakWatching: 0, peakLiveTV: 0, peakBrowsing: 0, peakTotalTime: 0, peakWatchingTime: 0, peakLiveTVTime: 0, peakBrowsingTime: 0, lastUpdated: 0 },
      history: [],
      source: 'd1',
    });
  } catch (error) {
    console.error('Failed to get peak stats:', error);
    return NextResponse.json({ success: false, error: 'Failed to get peak stats' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await request.json();
    const { total, watching, livetv, browsing } = data;
    const adapter = getAdapter();
    const today = getTodayDate();
    const now = Date.now();
    await adapter.execute(
      `CREATE TABLE IF NOT EXISTS peak_stats (date TEXT PRIMARY KEY, peak_total INTEGER DEFAULT 0, peak_watching INTEGER DEFAULT 0, peak_livetv INTEGER DEFAULT 0, peak_browsing INTEGER DEFAULT 0, peak_total_time INTEGER, peak_watching_time INTEGER, peak_livetv_time INTEGER, peak_browsing_time INTEGER, last_updated INTEGER)`
    );
    const existing = await adapter.query<Record<string, unknown>>('SELECT * FROM peak_stats WHERE date = ?', [today]);
    if (!existing.data || existing.data.length === 0) {
      await adapter.execute(
        'INSERT INTO peak_stats (date, peak_total, peak_watching, peak_livetv, peak_browsing, peak_total_time, peak_watching_time, peak_livetv_time, peak_browsing_time, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [today, total || 0, watching || 0, livetv || 0, browsing || 0, now, now, now, now, now]
      );
    }
    return NextResponse.json({ success: true, peaks: { date: today, peakTotal: total || 0, peakWatching: watching || 0, peakLiveTV: livetv || 0, peakBrowsing: browsing || 0 }, source: 'd1' });
  } catch (error) {
    console.error('Failed to update peak stats:', error);
    return NextResponse.json({ success: false, error: 'Failed to update peak stats' }, { status: 500 });
  }
}
