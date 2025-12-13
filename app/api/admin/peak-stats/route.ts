/**
 * Peak Stats API
 * GET /api/admin/peak-stats - Get today's peak user counts
 * POST /api/admin/peak-stats - Update peak if current count is higher
 * 
 * Tracks peak concurrent users for:
 * - Total active users
 * - Users watching content (VOD)
 * - Users watching Live TV
 * - Users browsing
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDB, getDB } from '@/lib/db/neon-connection';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';

// In-memory cache for peak stats (persisted to DB periodically)
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

// Get today's date string in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    const isNeon = db.isUsingNeon();
    
    const today = getTodayDate();
    
    // Try to get today's peak stats from the database
    const query = isNeon
      ? `SELECT * FROM peak_stats WHERE date = $1`
      : `SELECT * FROM peak_stats WHERE date = ?`;
    
    let peakStats: PeakStats | null = null;
    
    try {
      const result = await adapter.query(query, [today]);
      if (result.length > 0) {
        const row = result[0];
        peakStats = {
          date: row.date,
          peakTotal: row.peak_total || 0,
          peakWatching: row.peak_watching || 0,
          peakLiveTV: row.peak_livetv || 0,
          peakBrowsing: row.peak_browsing || 0,
          peakTotalTime: row.peak_total_time || 0,
          peakWatchingTime: row.peak_watching_time || 0,
          peakLiveTVTime: row.peak_livetv_time || 0,
          peakBrowsingTime: row.peak_browsing_time || 0,
          lastUpdated: row.last_updated || Date.now(),
        };
      }
    } catch (e) {
      // Table might not exist yet, will be created on first POST
      console.log('Peak stats table may not exist yet');
    }
    
    // Also get historical peaks for the last 7 days
    let historicalPeaks: Array<{ date: string; peakTotal: number }> = [];
    try {
      const historyQuery = isNeon
        ? `SELECT date, peak_total FROM peak_stats WHERE date >= $1 ORDER BY date DESC LIMIT 7`
        : `SELECT date, peak_total FROM peak_stats WHERE date >= ? ORDER BY date DESC LIMIT 7`;
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      
      const historyResult = await adapter.query(historyQuery, [sevenDaysAgoStr]);
      historicalPeaks = historyResult.map((row: any) => ({
        date: row.date,
        peakTotal: row.peak_total || 0,
      }));
    } catch (e) {
      // Ignore if table doesn't exist
    }

    return NextResponse.json({
      success: true,
      today: peakStats || {
        date: today,
        peakTotal: 0,
        peakWatching: 0,
        peakLiveTV: 0,
        peakBrowsing: 0,
        peakTotalTime: 0,
        peakWatchingTime: 0,
        peakLiveTVTime: 0,
        peakBrowsingTime: 0,
        lastUpdated: 0,
      },
      history: historicalPeaks,
    });
  } catch (error) {
    console.error('Failed to get peak stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get peak stats' },
      { status: 500 }
    );
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

    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    const isNeon = db.isUsingNeon();
    
    const today = getTodayDate();
    const now = Date.now();

    // Ensure the peak_stats table exists
    const createTableQuery = isNeon
      ? `CREATE TABLE IF NOT EXISTS peak_stats (
          date TEXT PRIMARY KEY,
          peak_total INTEGER DEFAULT 0,
          peak_watching INTEGER DEFAULT 0,
          peak_livetv INTEGER DEFAULT 0,
          peak_browsing INTEGER DEFAULT 0,
          peak_total_time BIGINT,
          peak_watching_time BIGINT,
          peak_livetv_time BIGINT,
          peak_browsing_time BIGINT,
          last_updated BIGINT,
          created_at BIGINT
        )`
      : `CREATE TABLE IF NOT EXISTS peak_stats (
          date TEXT PRIMARY KEY,
          peak_total INTEGER DEFAULT 0,
          peak_watching INTEGER DEFAULT 0,
          peak_livetv INTEGER DEFAULT 0,
          peak_browsing INTEGER DEFAULT 0,
          peak_total_time INTEGER,
          peak_watching_time INTEGER,
          peak_livetv_time INTEGER,
          peak_browsing_time INTEGER,
          last_updated INTEGER,
          created_at INTEGER DEFAULT(strftime('%s', 'now'))
        )`;
    
    await adapter.execute(createTableQuery);

    // Get current peak stats for today
    const selectQuery = isNeon
      ? `SELECT * FROM peak_stats WHERE date = $1`
      : `SELECT * FROM peak_stats WHERE date = ?`;
    
    const existing = await adapter.query(selectQuery, [today]);
    
    if (existing.length === 0) {
      // Insert new record for today
      const insertQuery = isNeon
        ? `INSERT INTO peak_stats (date, peak_total, peak_watching, peak_livetv, peak_browsing, 
            peak_total_time, peak_watching_time, peak_livetv_time, peak_browsing_time, last_updated, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
        : `INSERT INTO peak_stats (date, peak_total, peak_watching, peak_livetv, peak_browsing,
            peak_total_time, peak_watching_time, peak_livetv_time, peak_browsing_time, last_updated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = isNeon
        ? [today, total || 0, watching || 0, livetv || 0, browsing || 0, now, now, now, now, now, now]
        : [today, total || 0, watching || 0, livetv || 0, browsing || 0, now, now, now, now, now];
      
      await adapter.execute(insertQuery, params);
    } else {
      // Update only if new values are higher
      const current = existing[0];
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      if ((total || 0) > (current.peak_total || 0)) {
        updates.push(isNeon ? `peak_total = $${paramIndex++}` : `peak_total = ?`);
        params.push(total);
        updates.push(isNeon ? `peak_total_time = $${paramIndex++}` : `peak_total_time = ?`);
        params.push(now);
      }
      if ((watching || 0) > (current.peak_watching || 0)) {
        updates.push(isNeon ? `peak_watching = $${paramIndex++}` : `peak_watching = ?`);
        params.push(watching);
        updates.push(isNeon ? `peak_watching_time = $${paramIndex++}` : `peak_watching_time = ?`);
        params.push(now);
      }
      if ((livetv || 0) > (current.peak_livetv || 0)) {
        updates.push(isNeon ? `peak_livetv = $${paramIndex++}` : `peak_livetv = ?`);
        params.push(livetv);
        updates.push(isNeon ? `peak_livetv_time = $${paramIndex++}` : `peak_livetv_time = ?`);
        params.push(now);
      }
      if ((browsing || 0) > (current.peak_browsing || 0)) {
        updates.push(isNeon ? `peak_browsing = $${paramIndex++}` : `peak_browsing = ?`);
        params.push(browsing);
        updates.push(isNeon ? `peak_browsing_time = $${paramIndex++}` : `peak_browsing_time = ?`);
        params.push(now);
      }
      
      if (updates.length > 0) {
        updates.push(isNeon ? `last_updated = $${paramIndex++}` : `last_updated = ?`);
        params.push(now);
        params.push(today);
        
        const updateQuery = isNeon
          ? `UPDATE peak_stats SET ${updates.join(', ')} WHERE date = $${paramIndex}`
          : `UPDATE peak_stats SET ${updates.join(', ')} WHERE date = ?`;
        
        await adapter.execute(updateQuery, params);
      }
    }

    // Return updated peak stats
    const result = await adapter.query(selectQuery, [today]);
    const row = result[0];

    return NextResponse.json({
      success: true,
      peaks: {
        date: row.date,
        peakTotal: row.peak_total || 0,
        peakWatching: row.peak_watching || 0,
        peakLiveTV: row.peak_livetv || 0,
        peakBrowsing: row.peak_browsing || 0,
        peakTotalTime: row.peak_total_time || 0,
        peakWatchingTime: row.peak_watching_time || 0,
        peakLiveTVTime: row.peak_livetv_time || 0,
        peakBrowsingTime: row.peak_browsing_time || 0,
      },
    });
  } catch (error) {
    console.error('Failed to update peak stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update peak stats' },
      { status: 500 }
    );
  }
}
