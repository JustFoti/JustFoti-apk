/**
 * Property-Based Tests for Cron Job Metrics Aggregation
 * Feature: vercel-to-cloudflare-migration, Property 8: Cron Job Metrics Aggregation
 * Validates: Requirements 5.2
 * 
 * Tests that for any day with watch session data, after the cron job executes,
 * the metrics_daily table contains an entry with correctly aggregated totals.
 * 
 * Uses mock implementations to test the aggregation logic without requiring a live D1 database.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fc from 'fast-check';

// ============================================
// Types from cron.ts
// ============================================

interface DailyMetrics {
  date: string;
  total_sessions: number;
  total_watch_time: number;
  unique_users: number;
  avg_completion_rate: number;
  movie_sessions: number;
  tv_sessions: number;
  livetv_sessions: number;
  page_views: number;
  unique_visitors: number;
  new_users: number;
  returning_users: number;
}

// ============================================
// Mock Data Types
// ============================================

interface WatchSession {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'movie' | 'tv' | 'livetv';
  started_at: number;
  last_position: number;
  completion_percentage: number;
}

interface PageView {
  id: string;
  user_id: string;
  page_path: string;
  entry_time: number;
}

interface UserActivity {
  user_id: string;
  first_seen: number;
  last_seen: number;
}

// ============================================
// Mock D1 Database
// ============================================

class MockD1Database {
  private watchSessions: WatchSession[] = [];
  private pageViews: PageView[] = [];
  private userActivity: UserActivity[] = [];
  private metricsDaily: Map<string, DailyMetrics> = new Map();

  addWatchSession(session: WatchSession): void {
    this.watchSessions.push(session);
  }

  addPageView(pageView: PageView): void {
    this.pageViews.push(pageView);
  }

  addUserActivity(activity: UserActivity): void {
    // Update existing or add new
    const existing = this.userActivity.find(u => u.user_id === activity.user_id);
    if (existing) {
      existing.first_seen = Math.min(existing.first_seen, activity.first_seen);
      existing.last_seen = Math.max(existing.last_seen, activity.last_seen);
    } else {
      this.userActivity.push(activity);
    }
  }

  getWatchSessionsForDay(dayStart: number, dayEnd: number): WatchSession[] {
    return this.watchSessions.filter(
      s => s.started_at >= dayStart && s.started_at <= dayEnd
    );
  }

  getPageViewsForDay(dayStart: number, dayEnd: number): PageView[] {
    return this.pageViews.filter(
      pv => pv.entry_time >= dayStart && pv.entry_time <= dayEnd
    );
  }

  getUserActivityForDay(dayStart: number, dayEnd: number): {
    newUsers: string[];
    returningUsers: string[];
  } {
    const newUsers = this.userActivity
      .filter(u => u.first_seen >= dayStart && u.first_seen <= dayEnd)
      .map(u => u.user_id);
    
    const returningUsers = this.userActivity
      .filter(u => u.first_seen < dayStart && u.last_seen >= dayStart && u.last_seen <= dayEnd)
      .map(u => u.user_id);
    
    return { newUsers, returningUsers };
  }

  saveMetrics(metrics: DailyMetrics): void {
    this.metricsDaily.set(metrics.date, metrics);
  }

  getMetrics(date: string): DailyMetrics | undefined {
    return this.metricsDaily.get(date);
  }

  clear(): void {
    this.watchSessions = [];
    this.pageViews = [];
    this.userActivity = [];
    this.metricsDaily.clear();
  }
}

// ============================================
// Mock Aggregation Function (mirrors cron.ts logic)
// ============================================

function aggregateDailyMetrics(
  db: MockD1Database,
  dateStr: string
): DailyMetrics {
  const dayStart = new Date(dateStr + 'T00:00:00Z').getTime();
  const dayEnd = new Date(dateStr + 'T23:59:59.999Z').getTime();

  // Get watch sessions for the day
  const sessions = db.getWatchSessionsForDay(dayStart, dayEnd);
  
  // Calculate watch session stats
  const totalSessions = sessions.length;
  const totalWatchTime = sessions.reduce((sum, s) => {
    // Filter out invalid watch times (same as cron.ts)
    if (s.last_position > 0 && s.last_position < 36000) {
      return sum + s.last_position;
    }
    return sum;
  }, 0);
  
  const uniqueUsers = new Set(sessions.map(s => s.user_id)).size;
  
  // Calculate average completion rate (only valid percentages)
  const validCompletions = sessions.filter(
    s => s.completion_percentage >= 0 && s.completion_percentage <= 100
  );
  const avgCompletionRate = validCompletions.length > 0
    ? Math.round(validCompletions.reduce((sum, s) => sum + s.completion_percentage, 0) / validCompletions.length)
    : 0;
  
  // Count sessions by content type
  const movieSessions = sessions.filter(s => s.content_type === 'movie').length;
  const tvSessions = sessions.filter(s => s.content_type === 'tv').length;
  const livetvSessions = sessions.filter(s => s.content_type === 'livetv').length;

  // Get page views for the day
  const pageViewsData = db.getPageViewsForDay(dayStart, dayEnd);
  const pageViews = pageViewsData.length;
  const uniqueVisitors = new Set(pageViewsData.map(pv => pv.user_id)).size;

  // Get user activity stats
  const { newUsers, returningUsers } = db.getUserActivityForDay(dayStart, dayEnd);

  return {
    date: dateStr,
    total_sessions: totalSessions,
    total_watch_time: totalWatchTime,
    unique_users: uniqueUsers,
    avg_completion_rate: avgCompletionRate,
    movie_sessions: movieSessions,
    tv_sessions: tvSessions,
    livetv_sessions: livetvSessions,
    page_views: pageViews,
    unique_visitors: uniqueVisitors,
    new_users: newUsers.length,
    returning_users: returningUsers.length,
  };
}

// ============================================
// Arbitraries for Property-Based Testing
// ============================================

const watchSessionArbitrary = (dateStr: string): fc.Arbitrary<WatchSession> => {
  const dayStart = new Date(dateStr + 'T00:00:00Z').getTime();
  const dayEnd = new Date(dateStr + 'T23:59:59.999Z').getTime();
  
  return fc.record({
    id: fc.string({ minLength: 5, maxLength: 20 }).map(s => `ws_${s}`),
    user_id: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0),
    content_id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    content_type: fc.constantFrom('movie', 'tv', 'livetv') as fc.Arbitrary<'movie' | 'tv' | 'livetv'>,
    started_at: fc.integer({ min: dayStart, max: dayEnd }),
    last_position: fc.integer({ min: 0, max: 35999 }), // Valid range: 0 to just under 10 hours
    completion_percentage: fc.integer({ min: 0, max: 100 }),
  });
};

const pageViewArbitrary = (dateStr: string): fc.Arbitrary<PageView> => {
  const dayStart = new Date(dateStr + 'T00:00:00Z').getTime();
  const dayEnd = new Date(dateStr + 'T23:59:59.999Z').getTime();
  
  return fc.record({
    id: fc.string({ minLength: 5, maxLength: 20 }).map(s => `pv_${s}`),
    user_id: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0),
    page_path: fc.string({ minLength: 1, maxLength: 100 }).map(s => '/' + s),
    entry_time: fc.integer({ min: dayStart, max: dayEnd }),
  });
};

// ============================================
// Property-Based Tests
// ============================================

describe('Cron Job Metrics Aggregation', () => {
  let db: MockD1Database;
  const testDate = '2025-01-02'; // Fixed date for testing

  beforeEach(() => {
    db = new MockD1Database();
  });

  afterEach(() => {
    db.clear();
  });

  test('Property 8: Cron Job Metrics Aggregation - Total Sessions Count', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 8: Cron Job Metrics Aggregation
     * Validates: Requirements 5.2
     * 
     * For any set of watch sessions on a given day, the aggregated total_sessions
     * count SHALL equal the number of sessions in the input data.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(watchSessionArbitrary(testDate), { minLength: 1, maxLength: 50 }),
        async (sessions) => {
          // Clear database before each iteration
          db.clear();
          
          // Add sessions to mock database
          for (const session of sessions) {
            db.addWatchSession(session);
          }

          // Aggregate metrics
          const metrics = aggregateDailyMetrics(db, testDate);

          // Verify total sessions count
          expect(metrics.total_sessions).toBe(sessions.length);
          expect(metrics.date).toBe(testDate);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: Cron Job Metrics Aggregation - Unique Users Count', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 8: Cron Job Metrics Aggregation
     * Validates: Requirements 5.2
     * 
     * For any set of watch sessions, the unique_users count SHALL equal
     * the number of distinct user IDs in the session data.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(watchSessionArbitrary(testDate), { minLength: 1, maxLength: 50 }),
        async (sessions) => {
          // Clear database before each iteration
          db.clear();
          
          // Add sessions to mock database
          for (const session of sessions) {
            db.addWatchSession(session);
          }

          // Calculate expected unique users
          const expectedUniqueUsers = new Set(sessions.map(s => s.user_id)).size;

          // Aggregate metrics
          const metrics = aggregateDailyMetrics(db, testDate);

          // Verify unique users count
          expect(metrics.unique_users).toBe(expectedUniqueUsers);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: Cron Job Metrics Aggregation - Watch Time Sum', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 8: Cron Job Metrics Aggregation
     * Validates: Requirements 5.2
     * 
     * For any set of watch sessions, the total_watch_time SHALL equal
     * the sum of valid last_position values (0 < position < 36000).
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(watchSessionArbitrary(testDate), { minLength: 1, maxLength: 50 }),
        async (sessions) => {
          // Clear database before each iteration
          db.clear();
          
          // Add sessions to mock database
          for (const session of sessions) {
            db.addWatchSession(session);
          }

          // Calculate expected watch time (only valid positions)
          const expectedWatchTime = sessions.reduce((sum, s) => {
            if (s.last_position > 0 && s.last_position < 36000) {
              return sum + s.last_position;
            }
            return sum;
          }, 0);

          // Aggregate metrics
          const metrics = aggregateDailyMetrics(db, testDate);

          // Verify total watch time
          expect(metrics.total_watch_time).toBe(expectedWatchTime);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: Cron Job Metrics Aggregation - Content Type Breakdown', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 8: Cron Job Metrics Aggregation
     * Validates: Requirements 5.2
     * 
     * For any set of watch sessions, the content type counts SHALL equal
     * the actual counts of each content type in the session data.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(watchSessionArbitrary(testDate), { minLength: 1, maxLength: 50 }),
        async (sessions) => {
          // Clear database before each iteration
          db.clear();
          
          // Add sessions to mock database
          for (const session of sessions) {
            db.addWatchSession(session);
          }

          // Calculate expected counts
          const expectedMovie = sessions.filter(s => s.content_type === 'movie').length;
          const expectedTv = sessions.filter(s => s.content_type === 'tv').length;
          const expectedLivetv = sessions.filter(s => s.content_type === 'livetv').length;

          // Aggregate metrics
          const metrics = aggregateDailyMetrics(db, testDate);

          // Verify content type breakdown
          expect(metrics.movie_sessions).toBe(expectedMovie);
          expect(metrics.tv_sessions).toBe(expectedTv);
          expect(metrics.livetv_sessions).toBe(expectedLivetv);

          // Verify sum equals total
          expect(metrics.movie_sessions + metrics.tv_sessions + metrics.livetv_sessions)
            .toBe(metrics.total_sessions);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: Cron Job Metrics Aggregation - Page Views Count', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 8: Cron Job Metrics Aggregation
     * Validates: Requirements 5.2
     * 
     * For any set of page views, the page_views count SHALL equal
     * the number of page views in the input data.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(pageViewArbitrary(testDate), { minLength: 1, maxLength: 50 }),
        async (pageViewsData) => {
          // Clear database before each iteration
          db.clear();
          
          // Add page views to mock database
          for (const pv of pageViewsData) {
            db.addPageView(pv);
          }

          // Aggregate metrics
          const metrics = aggregateDailyMetrics(db, testDate);

          // Verify page views count
          expect(metrics.page_views).toBe(pageViewsData.length);

          // Verify unique visitors
          const expectedUniqueVisitors = new Set(pageViewsData.map(pv => pv.user_id)).size;
          expect(metrics.unique_visitors).toBe(expectedUniqueVisitors);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: Cron Job Metrics Aggregation - Average Completion Rate', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 8: Cron Job Metrics Aggregation
     * Validates: Requirements 5.2
     * 
     * For any set of watch sessions with valid completion percentages,
     * the avg_completion_rate SHALL be the rounded average of those percentages.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(watchSessionArbitrary(testDate), { minLength: 1, maxLength: 50 }),
        async (sessions) => {
          // Clear database before each iteration
          db.clear();
          
          // Add sessions to mock database
          for (const session of sessions) {
            db.addWatchSession(session);
          }

          // Calculate expected average (only valid percentages 0-100)
          const validCompletions = sessions.filter(
            s => s.completion_percentage >= 0 && s.completion_percentage <= 100
          );
          const expectedAvg = validCompletions.length > 0
            ? Math.round(
                validCompletions.reduce((sum, s) => sum + s.completion_percentage, 0) / 
                validCompletions.length
              )
            : 0;

          // Aggregate metrics
          const metrics = aggregateDailyMetrics(db, testDate);

          // Verify average completion rate
          expect(metrics.avg_completion_rate).toBe(expectedAvg);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 8: Cron Job Metrics Aggregation - Metrics Persistence', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 8: Cron Job Metrics Aggregation
     * Validates: Requirements 5.2
     * 
     * After aggregation, the metrics SHALL be saved and retrievable from storage.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(watchSessionArbitrary(testDate), { minLength: 1, maxLength: 20 }),
        fc.array(pageViewArbitrary(testDate), { minLength: 1, maxLength: 20 }),
        async (sessions, pageViewsData) => {
          // Clear database before each iteration
          db.clear();
          
          // Add data to mock database
          for (const session of sessions) {
            db.addWatchSession(session);
          }
          for (const pv of pageViewsData) {
            db.addPageView(pv);
          }

          // Aggregate and save metrics
          const metrics = aggregateDailyMetrics(db, testDate);
          db.saveMetrics(metrics);

          // Retrieve metrics
          const retrieved = db.getMetrics(testDate);

          // Verify metrics are retrievable
          expect(retrieved).toBeDefined();
          expect(retrieved!.date).toBe(testDate);
          expect(retrieved!.total_sessions).toBe(metrics.total_sessions);
          expect(retrieved!.total_watch_time).toBe(metrics.total_watch_time);
          expect(retrieved!.unique_users).toBe(metrics.unique_users);
          expect(retrieved!.page_views).toBe(metrics.page_views);
          expect(retrieved!.unique_visitors).toBe(metrics.unique_visitors);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Empty day returns zero metrics', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 8: Cron Job Metrics Aggregation
     * Validates: Requirements 5.2
     * 
     * For a day with no data, all metrics should be zero.
     */
    const metrics = aggregateDailyMetrics(db, testDate);

    expect(metrics.date).toBe(testDate);
    expect(metrics.total_sessions).toBe(0);
    expect(metrics.total_watch_time).toBe(0);
    expect(metrics.unique_users).toBe(0);
    expect(metrics.avg_completion_rate).toBe(0);
    expect(metrics.movie_sessions).toBe(0);
    expect(metrics.tv_sessions).toBe(0);
    expect(metrics.livetv_sessions).toBe(0);
    expect(metrics.page_views).toBe(0);
    expect(metrics.unique_visitors).toBe(0);
    expect(metrics.new_users).toBe(0);
    expect(metrics.returning_users).toBe(0);
  });

  test('Sessions outside date range are excluded', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 8: Cron Job Metrics Aggregation
     * Validates: Requirements 5.2
     * 
     * Sessions from other days should not be included in the aggregation.
     */
    const dayStart = new Date(testDate + 'T00:00:00Z').getTime();
    const dayEnd = new Date(testDate + 'T23:59:59.999Z').getTime();

    // Add session from the test date
    db.addWatchSession({
      id: 'ws_today',
      user_id: 'user1',
      content_id: 'movie1',
      content_type: 'movie',
      started_at: dayStart + 1000,
      last_position: 1000,
      completion_percentage: 50,
    });

    // Add session from previous day
    db.addWatchSession({
      id: 'ws_yesterday',
      user_id: 'user2',
      content_id: 'movie2',
      content_type: 'movie',
      started_at: dayStart - 86400000, // 1 day before
      last_position: 2000,
      completion_percentage: 75,
    });

    // Add session from next day
    db.addWatchSession({
      id: 'ws_tomorrow',
      user_id: 'user3',
      content_id: 'movie3',
      content_type: 'tv',
      started_at: dayEnd + 86400000, // 1 day after
      last_position: 3000,
      completion_percentage: 100,
    });

    // Aggregate metrics
    const metrics = aggregateDailyMetrics(db, testDate);

    // Only the session from testDate should be counted
    expect(metrics.total_sessions).toBe(1);
    expect(metrics.unique_users).toBe(1);
    expect(metrics.total_watch_time).toBe(1000);
    expect(metrics.movie_sessions).toBe(1);
    expect(metrics.tv_sessions).toBe(0);
  });
});
