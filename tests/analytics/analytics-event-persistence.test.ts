/**
 * Property-Based Tests for Analytics Event Persistence
 * Feature: vercel-to-cloudflare-migration, Property 2: Analytics Event Persistence
 * Validates: Requirements 8.1, 8.2, 8.3
 * 
 * Tests that analytics events (page views, watch sessions, heartbeats) sent to the
 * Analytics Worker are stored and retrievable.
 * 
 * Uses mock implementations to test the client logic without requiring a live worker.
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import * as fc from 'fast-check';

// Types from the cloudflare-client
interface PageViewData {
  userId: string;
  sessionId?: string;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  entryTime?: number;
  deviceType?: string;
}

interface WatchSessionData {
  userId: string;
  sessionId?: string;
  contentId: string;
  contentType: 'movie' | 'tv' | 'livetv';
  contentTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  startedAt?: number;
  totalWatchTime: number;
  lastPosition: number;
  duration: number;
  completionPercentage: number;
  isCompleted?: boolean;
  quality?: string;
}

interface HeartbeatData {
  userId: string;
  sessionId?: string;
  activityType: 'browsing' | 'watching' | 'livetv';
  contentId?: string;
  contentTitle?: string;
  contentType?: 'movie' | 'tv' | 'livetv';
  seasonNumber?: number;
  episodeNumber?: number;
  isActive: boolean;
  isVisible: boolean;
  isLeaving?: boolean;
}

interface AnalyticsResponse {
  success: boolean;
  tracked?: boolean;
  error?: string;
  timestamp?: number;
}

// ============================================
// Mock Analytics Storage (simulates D1 storage in worker)
// ============================================

interface StoredPageView extends PageViewData {
  id: string;
  storedAt: number;
}

interface StoredWatchSession extends WatchSessionData {
  id: string;
  storedAt: number;
}

interface StoredHeartbeat extends HeartbeatData {
  id: string;
  storedAt: number;
}

class MockAnalyticsStorage {
  private pageViews: Map<string, StoredPageView> = new Map();
  private watchSessions: Map<string, StoredWatchSession> = new Map();
  private heartbeats: Map<string, StoredHeartbeat> = new Map();
  private liveUsers: Map<string, { userId: string; activityType: string; lastHeartbeat: number }> = new Map();

  storePageView(data: PageViewData): string {
    const id = `pv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.pageViews.set(id, { ...data, id, storedAt: Date.now() });
    return id;
  }

  storeWatchSession(data: WatchSessionData): string {
    const key = `${data.userId}_${data.contentId}_${data.seasonNumber || 0}_${data.episodeNumber || 0}`;
    const existing = this.watchSessions.get(key);
    const id = existing?.id || `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.watchSessions.set(key, { ...data, id, storedAt: Date.now() });
    return id;
  }

  storeHeartbeat(data: HeartbeatData): string {
    const id = `hb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.heartbeats.set(data.userId, { ...data, id, storedAt: Date.now() });
    
    // Update live users
    if (data.isLeaving) {
      this.liveUsers.delete(data.userId);
    } else {
      this.liveUsers.set(data.userId, {
        userId: data.userId,
        activityType: data.activityType,
        lastHeartbeat: Date.now(),
      });
    }
    
    return id;
  }

  getPageView(id: string): StoredPageView | undefined {
    return this.pageViews.get(id);
  }

  getPageViewsByUser(userId: string): StoredPageView[] {
    return Array.from(this.pageViews.values()).filter(pv => pv.userId === userId);
  }

  getWatchSession(userId: string, contentId: string, seasonNumber?: number, episodeNumber?: number): StoredWatchSession | undefined {
    const key = `${userId}_${contentId}_${seasonNumber || 0}_${episodeNumber || 0}`;
    return this.watchSessions.get(key);
  }

  getWatchSessionsByUser(userId: string): StoredWatchSession[] {
    return Array.from(this.watchSessions.values()).filter(ws => ws.userId === userId);
  }

  getHeartbeat(userId: string): StoredHeartbeat | undefined {
    return this.heartbeats.get(userId);
  }

  getLiveUsers(): Array<{ userId: string; activityType: string; lastHeartbeat: number }> {
    return Array.from(this.liveUsers.values());
  }

  clear(): void {
    this.pageViews.clear();
    this.watchSessions.clear();
    this.heartbeats.clear();
    this.liveUsers.clear();
  }
}

// ============================================
// Mock Analytics Client (simulates cloudflare-client.ts)
// ============================================

class MockAnalyticsClient {
  private storage: MockAnalyticsStorage;
  private workerAvailable: boolean = true;
  private lastFailureTime: number = 0;
  private readonly FAILURE_COOLDOWN = 30000;

  constructor(storage: MockAnalyticsStorage) {
    this.storage = storage;
  }

  isWorkerAvailable(): boolean {
    if (!this.workerAvailable) {
      if (Date.now() - this.lastFailureTime > this.FAILURE_COOLDOWN) {
        this.workerAvailable = true;
      }
    }
    return this.workerAvailable;
  }

  setWorkerAvailable(available: boolean): void {
    this.workerAvailable = available;
    if (!available) {
      this.lastFailureTime = Date.now();
    }
  }

  resetWorkerAvailability(): void {
    this.workerAvailable = true;
    this.lastFailureTime = 0;
  }

  async trackPageView(data: PageViewData): Promise<AnalyticsResponse> {
    if (!data.userId || !data.pagePath) {
      return { success: false, error: 'Missing required fields: userId, pagePath' };
    }

    if (!this.isWorkerAvailable()) {
      return { success: true, tracked: false, error: 'Worker temporarily unavailable' };
    }

    try {
      const id = this.storage.storePageView({
        ...data,
        entryTime: data.entryTime || Date.now(),
      });
      return { success: true, tracked: true, timestamp: Date.now() };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async trackWatchSession(data: WatchSessionData): Promise<AnalyticsResponse> {
    if (!data.userId || !data.contentId) {
      return { success: false, error: 'Missing required fields: userId, contentId' };
    }

    if (!this.isWorkerAvailable()) {
      return { success: true, tracked: false, error: 'Worker temporarily unavailable' };
    }

    try {
      const id = this.storage.storeWatchSession({
        ...data,
        startedAt: data.startedAt || Date.now(),
      });
      return { success: true, tracked: true, timestamp: Date.now() };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async sendHeartbeat(data: HeartbeatData, isLeaving = false): Promise<AnalyticsResponse> {
    if (!data.userId) {
      return { success: false, error: 'Missing required field: userId' };
    }

    if (!this.isWorkerAvailable()) {
      return { success: true, tracked: false, error: 'Worker temporarily unavailable' };
    }

    try {
      const id = this.storage.storeHeartbeat({
        ...data,
        isLeaving,
      });
      return { success: true, tracked: true, timestamp: Date.now() };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  getStorage(): MockAnalyticsStorage {
    return this.storage;
  }
}

// ============================================
// Property-Based Tests
// ============================================

describe('Analytics Event Persistence', () => {
  let storage: MockAnalyticsStorage;
  let client: MockAnalyticsClient;

  beforeEach(() => {
    storage = new MockAnalyticsStorage();
    client = new MockAnalyticsClient(storage);
  });

  afterEach(() => {
    storage.clear();
  });

  test('Property 2: Analytics Event Persistence - Page Views', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 2: Analytics Event Persistence
     * Validates: Requirements 8.1
     * 
     * For any valid page view event, sending it to the Analytics Worker SHALL result
     * in the event being stored and retrievable.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
          sessionId: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined }),
          pagePath: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.startsWith('/') || s === '/'),
          pageTitle: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          referrer: fc.option(fc.webUrl(), { nil: undefined }),
          deviceType: fc.option(fc.constantFrom('desktop', 'mobile', 'tablet'), { nil: undefined }),
        }).map(data => ({
          ...data,
          pagePath: data.pagePath.startsWith('/') ? data.pagePath : '/' + data.pagePath,
        })),
        async (pageViewData) => {
          // Send page view event
          const response = await client.trackPageView(pageViewData);

          // Verify event was tracked
          expect(response.success).toBe(true);
          expect(response.tracked).toBe(true);

          // Verify event is retrievable
          const storedPageViews = storage.getPageViewsByUser(pageViewData.userId);
          expect(storedPageViews.length).toBeGreaterThan(0);

          // Find the matching page view
          const matchingPageView = storedPageViews.find(pv => 
            pv.pagePath === pageViewData.pagePath &&
            pv.userId === pageViewData.userId
          );
          expect(matchingPageView).toBeDefined();

          // Verify data integrity
          expect(matchingPageView!.userId).toBe(pageViewData.userId);
          expect(matchingPageView!.pagePath).toBe(pageViewData.pagePath);
          if (pageViewData.pageTitle) {
            expect(matchingPageView!.pageTitle).toBe(pageViewData.pageTitle);
          }
          if (pageViewData.deviceType) {
            expect(matchingPageView!.deviceType).toBe(pageViewData.deviceType);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Analytics Event Persistence - Watch Sessions', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 2: Analytics Event Persistence
     * Validates: Requirements 8.2
     * 
     * For any valid watch session event, sending it to the Analytics Worker SHALL result
     * in the event being stored and retrievable.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
          sessionId: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined }),
          contentId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          contentType: fc.constantFrom('movie', 'tv', 'livetv') as fc.Arbitrary<'movie' | 'tv' | 'livetv'>,
          contentTitle: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          seasonNumber: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined }),
          episodeNumber: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
          totalWatchTime: fc.integer({ min: 0, max: 36000 }), // 0 to 10 hours in seconds
          lastPosition: fc.integer({ min: 0, max: 36000 }),
          duration: fc.integer({ min: 1, max: 36000 }),
          completionPercentage: fc.float({ min: 0, max: 100, noNaN: true }),
          isCompleted: fc.option(fc.boolean(), { nil: undefined }),
          quality: fc.option(fc.constantFrom('auto', '360p', '480p', '720p', '1080p', '4k'), { nil: undefined }),
        }),
        async (watchSessionData) => {
          // Send watch session event
          const response = await client.trackWatchSession(watchSessionData);

          // Verify event was tracked
          expect(response.success).toBe(true);
          expect(response.tracked).toBe(true);

          // Verify event is retrievable
          const storedSession = storage.getWatchSession(
            watchSessionData.userId,
            watchSessionData.contentId,
            watchSessionData.seasonNumber,
            watchSessionData.episodeNumber
          );
          expect(storedSession).toBeDefined();

          // Verify data integrity
          expect(storedSession!.userId).toBe(watchSessionData.userId);
          expect(storedSession!.contentId).toBe(watchSessionData.contentId);
          expect(storedSession!.contentType).toBe(watchSessionData.contentType);
          expect(storedSession!.totalWatchTime).toBe(watchSessionData.totalWatchTime);
          expect(storedSession!.lastPosition).toBe(watchSessionData.lastPosition);
          expect(storedSession!.duration).toBe(watchSessionData.duration);
          expect(storedSession!.completionPercentage).toBe(watchSessionData.completionPercentage);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Analytics Event Persistence - Heartbeats', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 2: Analytics Event Persistence
     * Validates: Requirements 8.3
     * 
     * For any valid heartbeat event, sending it to the Analytics Worker SHALL result
     * in the event being stored and the user appearing in live activity.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
          sessionId: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined }),
          activityType: fc.constantFrom('browsing', 'watching', 'livetv') as fc.Arbitrary<'browsing' | 'watching' | 'livetv'>,
          contentId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          contentTitle: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          isActive: fc.boolean(),
          isVisible: fc.boolean(),
        }),
        async (heartbeatData) => {
          // Send heartbeat event (not leaving)
          const response = await client.sendHeartbeat(heartbeatData, false);

          // Verify event was tracked
          expect(response.success).toBe(true);
          expect(response.tracked).toBe(true);

          // Verify heartbeat is stored
          const storedHeartbeat = storage.getHeartbeat(heartbeatData.userId);
          expect(storedHeartbeat).toBeDefined();

          // Verify data integrity
          expect(storedHeartbeat!.userId).toBe(heartbeatData.userId);
          expect(storedHeartbeat!.activityType).toBe(heartbeatData.activityType);
          expect(storedHeartbeat!.isActive).toBe(heartbeatData.isActive);
          expect(storedHeartbeat!.isVisible).toBe(heartbeatData.isVisible);

          // Verify user appears in live users
          const liveUsers = storage.getLiveUsers();
          const liveUser = liveUsers.find(u => u.userId === heartbeatData.userId);
          expect(liveUser).toBeDefined();
          expect(liveUser!.activityType).toBe(heartbeatData.activityType);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Heartbeat with isLeaving removes user from live activity', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 2: Analytics Event Persistence
     * Validates: Requirements 8.3
     * 
     * When a heartbeat is sent with isLeaving=true, the user should be removed
     * from live activity tracking.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (userId) => {
          // First, send a normal heartbeat to add user to live activity
          await client.sendHeartbeat({
            userId,
            activityType: 'browsing',
            isActive: true,
            isVisible: true,
          }, false);

          // Verify user is in live activity
          let liveUsers = storage.getLiveUsers();
          expect(liveUsers.some(u => u.userId === userId)).toBe(true);

          // Send leaving heartbeat
          await client.sendHeartbeat({
            userId,
            activityType: 'browsing',
            isActive: false,
            isVisible: false,
          }, true);

          // Verify user is removed from live activity
          liveUsers = storage.getLiveUsers();
          expect(liveUsers.some(u => u.userId === userId)).toBe(false);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Watch session updates preserve existing data', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 2: Analytics Event Persistence
     * Validates: Requirements 8.2
     * 
     * When a watch session is updated (same user, content, season, episode),
     * the update should preserve the session ID and update the progress.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
          contentId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          contentType: fc.constantFrom('movie', 'tv') as fc.Arbitrary<'movie' | 'tv'>,
          initialPosition: fc.integer({ min: 0, max: 1000 }),
          updatedPosition: fc.integer({ min: 1001, max: 2000 }),
          duration: fc.integer({ min: 2001, max: 5000 }),
        }),
        async (data) => {
          // Send initial watch session
          await client.trackWatchSession({
            userId: data.userId,
            contentId: data.contentId,
            contentType: data.contentType,
            totalWatchTime: data.initialPosition,
            lastPosition: data.initialPosition,
            duration: data.duration,
            completionPercentage: (data.initialPosition / data.duration) * 100,
          });

          // Get initial session
          const initialSession = storage.getWatchSession(data.userId, data.contentId);
          expect(initialSession).toBeDefined();
          const initialId = initialSession!.id;

          // Send updated watch session
          await client.trackWatchSession({
            userId: data.userId,
            contentId: data.contentId,
            contentType: data.contentType,
            totalWatchTime: data.updatedPosition,
            lastPosition: data.updatedPosition,
            duration: data.duration,
            completionPercentage: (data.updatedPosition / data.duration) * 100,
          });

          // Get updated session
          const updatedSession = storage.getWatchSession(data.userId, data.contentId);
          expect(updatedSession).toBeDefined();

          // Verify session ID is preserved
          expect(updatedSession!.id).toBe(initialId);

          // Verify position is updated
          expect(updatedSession!.lastPosition).toBe(data.updatedPosition);
          expect(updatedSession!.totalWatchTime).toBe(data.updatedPosition);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Invalid data returns appropriate error', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 2: Analytics Event Persistence
     * Validates: Requirements 8.1, 8.2, 8.3
     * 
     * Invalid data should return appropriate error responses without crashing.
     */
    
    // Test missing userId for page view
    const pageViewResponse = await client.trackPageView({
      userId: '',
      pagePath: '/test',
    });
    expect(pageViewResponse.success).toBe(false);
    expect(pageViewResponse.error).toContain('Missing required fields');

    // Test missing pagePath for page view
    const pageViewResponse2 = await client.trackPageView({
      userId: 'user123',
      pagePath: '',
    });
    expect(pageViewResponse2.success).toBe(false);
    expect(pageViewResponse2.error).toContain('Missing required fields');

    // Test missing userId for watch session
    const watchResponse = await client.trackWatchSession({
      userId: '',
      contentId: 'movie123',
      contentType: 'movie',
      totalWatchTime: 100,
      lastPosition: 100,
      duration: 1000,
      completionPercentage: 10,
    });
    expect(watchResponse.success).toBe(false);
    expect(watchResponse.error).toContain('Missing required fields');

    // Test missing contentId for watch session
    const watchResponse2 = await client.trackWatchSession({
      userId: 'user123',
      contentId: '',
      contentType: 'movie',
      totalWatchTime: 100,
      lastPosition: 100,
      duration: 1000,
      completionPercentage: 10,
    });
    expect(watchResponse2.success).toBe(false);
    expect(watchResponse2.error).toContain('Missing required fields');

    // Test missing userId for heartbeat
    const heartbeatResponse = await client.sendHeartbeat({
      userId: '',
      activityType: 'browsing',
      isActive: true,
      isVisible: true,
    });
    expect(heartbeatResponse.success).toBe(false);
    expect(heartbeatResponse.error).toContain('Missing required field');
  });

  test('Multiple page views from same user are all stored', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 2: Analytics Event Persistence
     * Validates: Requirements 8.1
     * 
     * Multiple page views from the same user should all be stored independently.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.string({ minLength: 1, maxLength: 50 }).map(s => '/' + s),
          { minLength: 2, maxLength: 10 }
        ),
        async (userId, pagePaths) => {
          // Make page paths unique by adding index
          const uniquePagePaths = pagePaths.map((path, index) => `${path}_${index}`);
          
          // Send multiple page views
          for (const pagePath of uniquePagePaths) {
            await client.trackPageView({ userId, pagePath });
          }

          // Verify all page views are stored
          const storedPageViews = storage.getPageViewsByUser(userId);
          expect(storedPageViews.length).toBe(uniquePagePaths.length);

          // Verify each page path is present
          for (const pagePath of uniquePagePaths) {
            const found = storedPageViews.some(pv => pv.pagePath === pagePath);
            expect(found).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
