/**
 * Neon Connection Compatibility Shim
 * 
 * This file provides backward compatibility for code that still imports from neon-connection.
 * After the Vercel to Cloudflare migration, all database operations use D1.
 * 
 * @deprecated Use adapter.ts or d1-connection.ts directly instead
 */

import { getAdapter, type DatabaseAdapter } from './adapter';
import { getD1Database } from './d1-connection';

/**
 * Legacy adapter wrapper that returns arrays directly instead of result objects
 */
class LegacyAdapterWrapper {
  private adapter: DatabaseAdapter;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.adapter.query<T>(sql, params);
    return result.data || [];
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const result = await this.adapter.execute(sql, params);
    return { changes: result.changes || 0 };
  }
}

/**
 * Legacy database wrapper that provides backward compatibility
 * for code expecting the old Neon interface
 */
class LegacyDatabaseWrapper {
  private adapter: DatabaseAdapter;

  constructor() {
    this.adapter = getAdapter();
  }

  /**
   * Get the underlying adapter
   * @deprecated Use getAdapter() from adapter.ts directly
   */
  getAdapter(): LegacyAdapterWrapper {
    return new LegacyAdapterWrapper(this.adapter);
  }

  /**
   * Check if using Neon (always false after migration)
   * @deprecated Always returns false - D1 only
   */
  isUsingNeon(): boolean {
    return false;
  }

  /**
   * Execute a query
   */
  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.adapter.query<T>(sql, params);
    return result.data || [];
  }

  /**
   * Execute a write operation
   */
  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const result = await this.adapter.execute(sql, params);
    return { changes: result.changes || 0 };
  }

  /**
   * Insert an analytics event
   */
  async insertAnalyticsEvent(event: {
    id: string;
    sessionId: string;
    timestamp: number;
    eventType: string;
    metadata?: Record<string, unknown>;
    userId?: string;
  }): Promise<void> {
    await this.adapter.execute(
      `INSERT INTO analytics_events (id, session_id, user_id, timestamp, event_type, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.sessionId,
        event.userId || null,
        event.timestamp,
        event.eventType,
        event.metadata ? JSON.stringify(event.metadata) : null,
        Date.now()
      ]
    );
  }

  /**
   * Upsert user activity
   */
  async upsertUserActivity(data: {
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
    
    const existing = await this.adapter.query<{ id: string }>(
      'SELECT id FROM user_activity WHERE user_id = ?',
      [data.userId]
    );

    if (existing.data && existing.data.length > 0) {
      await this.adapter.execute(
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
      await this.adapter.execute(
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

  /**
   * Upsert live activity
   */
  async upsertLiveActivity(data: {
    id: string;
    userId: string;
    sessionId: string;
    activityType: string;
    contentId?: string;
    contentTitle?: string;
    contentType?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    currentPosition?: number;
    duration?: number;
    quality?: string;
    deviceType?: string;
    country?: string;
    city?: string;
    region?: string;
  }): Promise<void> {
    const now = Date.now();
    
    const existing = await this.adapter.query<{ id: string }>(
      'SELECT id FROM live_activity WHERE id = ?',
      [data.id]
    );

    if (existing.data && existing.data.length > 0) {
      await this.adapter.execute(
        `UPDATE live_activity SET 
          activity_type = ?, content_id = ?, content_title = ?, content_type = ?,
          season_number = ?, episode_number = ?, current_position = ?, duration = ?,
          quality = ?, device_type = ?, country = ?, city = ?, region = ?,
          last_heartbeat = ?, is_active = 1
        WHERE id = ?`,
        [
          data.activityType, data.contentId || null, data.contentTitle || null, data.contentType || null,
          data.seasonNumber || null, data.episodeNumber || null, data.currentPosition || 0, data.duration || 0,
          data.quality || null, data.deviceType || null, data.country || null, data.city || null, data.region || null,
          now, data.id
        ]
      );
    } else {
      await this.adapter.execute(
        `INSERT INTO live_activity (
          id, user_id, session_id, activity_type, content_id, content_title, content_type,
          season_number, episode_number, current_position, duration, quality, device_type,
          country, city, region, last_heartbeat, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          data.id, data.userId, data.sessionId, data.activityType,
          data.contentId || null, data.contentTitle || null, data.contentType || null,
          data.seasonNumber || null, data.episodeNumber || null, data.currentPosition || 0, data.duration || 0,
          data.quality || null, data.deviceType || null, data.country || null, data.city || null, data.region || null,
          now, now
        ]
      );
    }
  }

  /**
   * Get live activities
   */
  async getLiveActivities(maxAgeMinutes: number = 5): Promise<Record<string, unknown>[]> {
    const cutoff = Date.now() - (maxAgeMinutes * 60 * 1000);
    const result = await this.adapter.query<Record<string, unknown>>(
      'SELECT * FROM live_activity WHERE is_active = 1 AND last_heartbeat >= ? ORDER BY last_heartbeat DESC',
      [cutoff]
    );
    return result.data || [];
  }

  /**
   * Cleanup stale activities
   */
  async cleanupStaleActivities(maxAgeMinutes: number = 10): Promise<number> {
    const cutoff = Date.now() - (maxAgeMinutes * 60 * 1000);
    const result = await this.adapter.execute(
      'UPDATE live_activity SET is_active = 0 WHERE is_active = 1 AND last_heartbeat < ?',
      [cutoff]
    );
    return result.changes || 0;
  }

  /**
   * Deactivate live activity
   */
  async deactivateLiveActivity(activityId: string): Promise<void> {
    await this.adapter.execute(
      'UPDATE live_activity SET is_active = 0 WHERE id = ?',
      [activityId]
    );
  }
}

// Singleton instance
let dbInstance: LegacyDatabaseWrapper | null = null;

/**
 * Initialize the database connection
 * @deprecated Use getAdapter() from adapter.ts instead
 */
export async function initializeDB(): Promise<LegacyDatabaseWrapper> {
  if (!dbInstance) {
    dbInstance = new LegacyDatabaseWrapper();
  }
  return dbInstance;
}

/**
 * Get the database wrapper instance
 * @deprecated Use getAdapter() from adapter.ts instead
 */
export function getDB(): LegacyDatabaseWrapper {
  if (!dbInstance) {
    dbInstance = new LegacyDatabaseWrapper();
  }
  return dbInstance;
}

/**
 * Get the raw D1 database instance
 * @deprecated Use getD1Database() from d1-connection.ts instead
 */
export function getD1() {
  return getD1Database();
}

// Re-export adapter types for convenience
export type { DatabaseAdapter } from './adapter';
export { adapterQuery, adapterExecute, pgToSqlite, getAdapter } from './adapter';
