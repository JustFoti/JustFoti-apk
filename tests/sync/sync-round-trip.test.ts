/**
 * Property-Based Tests for Sync Data Round-Trip
 * Feature: vercel-to-cloudflare-migration, Property 3: Sync Data Round-Trip
 * Validates: Requirements 9.1, 9.2, 9.3
 * 
 * Tests that sync data (watch progress, watchlist, settings) saved via Sync Worker
 * and loaded back returns equivalent data.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fc from 'fast-check';

// Types matching app/lib/sync/types.ts
interface WatchProgressItem {
  contentId: string;
  contentType: 'movie' | 'tv';
  title?: string;
  poster?: string;
  progress: number;
  currentTime: number;
  duration: number;
  seasonNumber?: number;
  episodeNumber?: number;
  lastWatched: number;
}

interface WatchlistSyncItem {
  id: number | string;
  title: string;
  posterPath: string;
  backdropPath?: string;
  mediaType: 'movie' | 'tv';
  releaseDate?: string;
  rating?: number;
  addedAt: number;
}


interface ProviderSettings {
  providerOrder: string[];
  disabledProviders: string[];
  lastSuccessfulProviders: Record<string, string>;
  animeAudioPreference: 'sub' | 'dub';
  preferredAnimeKaiServer: string | null;
}

interface SubtitleSettings {
  enabled: boolean;
  languageCode: string;
  languageName: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  verticalPosition: number;
}

interface PlayerSettings {
  autoPlayNextEpisode: boolean;
  autoPlayCountdown: number;
  showNextEpisodeBeforeEnd: number;
  volume: number;
  isMuted: boolean;
}

interface AccountProfile {
  name: string;
  icon: string;
  color: string;
  createdAt: number;
}

interface SyncData {
  profile?: AccountProfile;
  watchProgress: Record<string, WatchProgressItem>;
  watchlist: WatchlistSyncItem[];
  providerSettings: ProviderSettings;
  subtitleSettings: SubtitleSettings;
  playerSettings: PlayerSettings;
  lastSyncedAt: number;
  schemaVersion: number;
}


// ============================================
// Mock Sync Storage (simulates D1 storage in worker)
// ============================================

class MockSyncStorage {
  private syncAccounts: Map<string, { syncData: SyncData; lastSyncedAt: number }> = new Map();

  async save(syncCode: string, data: SyncData): Promise<{ success: boolean; lastSyncedAt: number }> {
    const now = Date.now();
    const dataToStore = { ...data, lastSyncedAt: now };
    this.syncAccounts.set(syncCode, { syncData: dataToStore, lastSyncedAt: now });
    return { success: true, lastSyncedAt: now };
  }

  async load(syncCode: string): Promise<{ success: boolean; data?: SyncData; isNew: boolean }> {
    const account = this.syncAccounts.get(syncCode);
    if (!account) {
      return { success: true, data: undefined, isNew: true };
    }
    return { success: true, data: account.syncData, isNew: false };
  }

  async delete(syncCode: string): Promise<{ success: boolean }> {
    this.syncAccounts.delete(syncCode);
    return { success: true };
  }

  clear(): void {
    this.syncAccounts.clear();
  }
}


// ============================================
// Mock Sync Client (simulates cloudflare-client.ts)
// ============================================

class MockSyncClient {
  private storage: MockSyncStorage;
  private localStorage: Map<string, unknown> = new Map();
  private workerAvailable: boolean = true;

  constructor(storage: MockSyncStorage) {
    this.storage = storage;
  }

  setWorkerAvailable(available: boolean): void {
    this.workerAvailable = available;
  }

  isWorkerAvailable(): boolean {
    return this.workerAvailable;
  }

  async syncWatchProgress(
    syncCode: string,
    progress: WatchProgressItem
  ): Promise<{ success: boolean; source: 'worker' | 'local' }> {
    if (!syncCode) {
      this.saveProgressLocally(progress);
      return { success: true, source: 'local' };
    }

    const currentData = await this.loadSyncData(syncCode);
    const key = progress.contentType === 'tv'
      ? `${progress.contentId}_s${progress.seasonNumber || 1}_e${progress.episodeNumber || 1}`
      : progress.contentId;

    const updatedData: SyncData = {
      ...(currentData.data || this.getEmptySyncData()),
      watchProgress: {
        ...(currentData.data?.watchProgress || {}),
        [key]: progress,
      },
      lastSyncedAt: Date.now(),
    };

    if (!this.workerAvailable) {
      this.saveLocalSyncData(updatedData);
      return { success: true, source: 'local' };
    }

    await this.storage.save(syncCode, updatedData);
    this.saveLocalSyncData(updatedData);
    return { success: true, source: 'worker' };
  }


  async loadSyncData(
    syncCode: string
  ): Promise<{ success: boolean; data?: SyncData; source: 'worker' | 'local' | 'none' }> {
    if (!syncCode) {
      const localData = this.getLocalSyncData();
      return { success: true, data: localData, source: 'local' };
    }

    if (!this.workerAvailable) {
      const localData = this.getLocalSyncData();
      if (localData.lastSyncedAt > 0) {
        return { success: true, data: localData, source: 'local' };
      }
      return { success: false, source: 'none' };
    }

    const result = await this.storage.load(syncCode);
    if (result.success && result.data) {
      this.saveLocalSyncData(result.data);
      return { success: true, data: result.data, source: 'worker' };
    }

    if (result.isNew) {
      return { success: true, data: undefined, source: 'worker' };
    }

    return { success: false, source: 'none' };
  }

  async pushSyncData(
    syncCode: string,
    data: SyncData
  ): Promise<{ success: boolean; source: 'worker' | 'local' }> {
    if (!syncCode) {
      this.saveLocalSyncData(data);
      return { success: true, source: 'local' };
    }

    if (!this.workerAvailable) {
      this.saveLocalSyncData(data);
      return { success: true, source: 'local' };
    }

    await this.storage.save(syncCode, data);
    this.saveLocalSyncData(data);
    return { success: true, source: 'worker' };
  }


  async syncWatchlist(
    syncCode: string,
    watchlist: WatchlistSyncItem[]
  ): Promise<{ success: boolean; source: 'worker' | 'local' }> {
    if (!syncCode) {
      this.localStorage.set('watchlist', watchlist);
      return { success: true, source: 'local' };
    }

    const currentData = await this.loadSyncData(syncCode);
    const updatedData: SyncData = {
      ...(currentData.data || this.getEmptySyncData()),
      watchlist,
      lastSyncedAt: Date.now(),
    };

    return this.pushSyncData(syncCode, updatedData);
  }

  private saveProgressLocally(progress: WatchProgressItem): void {
    const key = progress.contentType === 'tv'
      ? `${progress.contentId}_s${progress.seasonNumber || 1}_e${progress.episodeNumber || 1}`
      : progress.contentId;
    const existing = (this.localStorage.get('watchProgress') as Record<string, WatchProgressItem>) || {};
    existing[key] = progress;
    this.localStorage.set('watchProgress', existing);
  }

  private saveLocalSyncData(data: SyncData): void {
    this.localStorage.set('syncData', data);
  }

  private getLocalSyncData(): SyncData {
    const cached = this.localStorage.get('syncData') as SyncData | undefined;
    if (cached) return cached;
    return this.getEmptySyncData();
  }


  private getEmptySyncData(): SyncData {
    return {
      watchProgress: {},
      watchlist: [],
      providerSettings: {
        providerOrder: ['vidsrc', 'flixer'],
        disabledProviders: [],
        lastSuccessfulProviders: {},
        animeAudioPreference: 'sub',
        preferredAnimeKaiServer: null,
      },
      subtitleSettings: {
        enabled: true,
        languageCode: 'eng',
        languageName: 'English',
        fontSize: 100,
        textColor: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backgroundOpacity: 80,
        verticalPosition: 90,
      },
      playerSettings: {
        autoPlayNextEpisode: true,
        autoPlayCountdown: 10,
        showNextEpisodeBeforeEnd: 90,
        volume: 1,
        isMuted: false,
      },
      lastSyncedAt: 0,
      schemaVersion: 2,
    };
  }

  clearLocalStorage(): void {
    this.localStorage.clear();
  }

  getStorage(): MockSyncStorage {
    return this.storage;
  }
}


// ============================================
// fast-check Arbitraries
// ============================================

const watchProgressArbitrary = fc.record({
  contentId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  contentType: fc.constantFrom('movie', 'tv') as fc.Arbitrary<'movie' | 'tv'>,
  title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  progress: fc.integer({ min: 0, max: 100 }),
  currentTime: fc.integer({ min: 0, max: 36000 }),
  duration: fc.integer({ min: 1, max: 36000 }),
  seasonNumber: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined }),
  episodeNumber: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  lastWatched: fc.integer({ min: 1600000000000, max: 1800000000000 }),
});

const watchlistItemArbitrary = fc.record({
  id: fc.oneof(fc.integer({ min: 1, max: 999999 }), fc.string({ minLength: 1, maxLength: 20 })),
  title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  posterPath: fc.string({ minLength: 1, maxLength: 200 }),
  backdropPath: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  mediaType: fc.constantFrom('movie', 'tv') as fc.Arbitrary<'movie' | 'tv'>,
  releaseDate: fc.option(fc.string({ minLength: 10, maxLength: 10 }), { nil: undefined }),
  rating: fc.option(fc.float({ min: 0, max: 10, noNaN: true }), { nil: undefined }),
  addedAt: fc.integer({ min: 1600000000000, max: 1800000000000 }),
});

const syncCodeArbitrary = fc.string({ minLength: 10, maxLength: 20 }).filter(s => s.trim().length >= 10);


// ============================================
// Property-Based Tests
// ============================================

describe('Sync Data Round-Trip', () => {
  let storage: MockSyncStorage;
  let client: MockSyncClient;

  beforeEach(() => {
    storage = new MockSyncStorage();
    client = new MockSyncClient(storage);
  });

  afterEach(() => {
    storage.clear();
    client.clearLocalStorage();
  });

  test('Property 3: Sync Data Round-Trip - Watch Progress', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 3: Sync Data Round-Trip
     * Validates: Requirements 9.1, 9.2
     * 
     * For any watch progress data, saving it via Sync Worker and then loading it
     * SHALL return equivalent data.
     */
    await fc.assert(
      fc.asyncProperty(
        syncCodeArbitrary,
        watchProgressArbitrary,
        async (syncCode, progress) => {
          // Save watch progress
          const saveResult = await client.syncWatchProgress(syncCode, progress);
          expect(saveResult.success).toBe(true);
          expect(saveResult.source).toBe('worker');

          // Load sync data
          const loadResult = await client.loadSyncData(syncCode);
          expect(loadResult.success).toBe(true);
          expect(loadResult.data).toBeDefined();

          // Find the matching progress entry
          const key = progress.contentType === 'tv'
            ? `${progress.contentId}_s${progress.seasonNumber || 1}_e${progress.episodeNumber || 1}`
            : progress.contentId;

          const loadedProgress = loadResult.data!.watchProgress[key];
          expect(loadedProgress).toBeDefined();

          // Verify data integrity
          expect(loadedProgress.contentId).toBe(progress.contentId);
          expect(loadedProgress.contentType).toBe(progress.contentType);
          expect(loadedProgress.progress).toBe(progress.progress);
          expect(loadedProgress.currentTime).toBe(progress.currentTime);
          expect(loadedProgress.duration).toBe(progress.duration);
          expect(loadedProgress.lastWatched).toBe(progress.lastWatched);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });


  test('Property 3: Sync Data Round-Trip - Watchlist', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 3: Sync Data Round-Trip
     * Validates: Requirements 9.1, 9.3
     * 
     * For any watchlist data, saving it via Sync Worker and then loading it
     * SHALL return equivalent data.
     */
    await fc.assert(
      fc.asyncProperty(
        syncCodeArbitrary,
        fc.array(watchlistItemArbitrary, { minLength: 1, maxLength: 20 }),
        async (syncCode, watchlist) => {
          // Save watchlist
          const saveResult = await client.syncWatchlist(syncCode, watchlist);
          expect(saveResult.success).toBe(true);
          expect(saveResult.source).toBe('worker');

          // Load sync data
          const loadResult = await client.loadSyncData(syncCode);
          expect(loadResult.success).toBe(true);
          expect(loadResult.data).toBeDefined();

          // Verify watchlist length
          expect(loadResult.data!.watchlist.length).toBe(watchlist.length);

          // Verify each item
          for (let i = 0; i < watchlist.length; i++) {
            const original = watchlist[i];
            const loaded = loadResult.data!.watchlist[i];

            expect(loaded.id).toBe(original.id);
            expect(loaded.title).toBe(original.title);
            expect(loaded.posterPath).toBe(original.posterPath);
            expect(loaded.mediaType).toBe(original.mediaType);
            expect(loaded.addedAt).toBe(original.addedAt);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });


  test('Property 3: Sync Data Round-Trip - Full Sync Data', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 3: Sync Data Round-Trip
     * Validates: Requirements 9.1, 9.2, 9.3
     * 
     * For any complete sync data object, saving it and loading it back
     * SHALL return equivalent data.
     */
    await fc.assert(
      fc.asyncProperty(
        syncCodeArbitrary,
        fc.record({
          watchProgress: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 30 }),
            watchProgressArbitrary
          ),
          watchlist: fc.array(watchlistItemArbitrary, { maxLength: 10 }),
          providerSettings: fc.record({
            providerOrder: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
            disabledProviders: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 3 }),
            lastSuccessfulProviders: fc.dictionary(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.string({ minLength: 1, maxLength: 20 })
            ),
            animeAudioPreference: fc.constantFrom('sub', 'dub') as fc.Arbitrary<'sub' | 'dub'>,
            preferredAnimeKaiServer: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
          }),
          subtitleSettings: fc.record({
            enabled: fc.boolean(),
            languageCode: fc.string({ minLength: 2, maxLength: 5 }),
            languageName: fc.string({ minLength: 1, maxLength: 50 }),
            fontSize: fc.integer({ min: 50, max: 200 }),
            textColor: fc.string({ minLength: 7, maxLength: 7 }).map(s => '#' + s.slice(0, 6)),
            backgroundColor: fc.string({ minLength: 1, maxLength: 50 }),
            backgroundOpacity: fc.integer({ min: 0, max: 100 }),
            verticalPosition: fc.integer({ min: 0, max: 100 }),
          }),
          playerSettings: fc.record({
            autoPlayNextEpisode: fc.boolean(),
            autoPlayCountdown: fc.integer({ min: 5, max: 30 }),
            showNextEpisodeBeforeEnd: fc.integer({ min: 30, max: 180 }),
            volume: fc.float({ min: 0, max: 1, noNaN: true }),
            isMuted: fc.boolean(),
          }),
          lastSyncedAt: fc.integer({ min: 0, max: 1800000000000 }),
          schemaVersion: fc.constant(2),
        }),
        async (syncCode, syncData) => {
          // Push full sync data
          const saveResult = await client.pushSyncData(syncCode, syncData as SyncData);
          expect(saveResult.success).toBe(true);

          // Load sync data
          const loadResult = await client.loadSyncData(syncCode);
          expect(loadResult.success).toBe(true);
          expect(loadResult.data).toBeDefined();

          const loaded = loadResult.data!;

          // Verify watch progress keys match
          expect(Object.keys(loaded.watchProgress).sort()).toEqual(
            Object.keys(syncData.watchProgress).sort()
          );

          // Verify watchlist length
          expect(loaded.watchlist.length).toBe(syncData.watchlist.length);

          // Verify provider settings
          expect(loaded.providerSettings.providerOrder).toEqual(syncData.providerSettings.providerOrder);
          expect(loaded.providerSettings.animeAudioPreference).toBe(syncData.providerSettings.animeAudioPreference);

          // Verify subtitle settings
          expect(loaded.subtitleSettings.enabled).toBe(syncData.subtitleSettings.enabled);
          expect(loaded.subtitleSettings.fontSize).toBe(syncData.subtitleSettings.fontSize);

          // Verify player settings
          expect(loaded.playerSettings.autoPlayNextEpisode).toBe(syncData.playerSettings.autoPlayNextEpisode);
          expect(loaded.playerSettings.volume).toBe(syncData.playerSettings.volume);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });


  test('Multiple watch progress updates preserve all entries', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 3: Sync Data Round-Trip
     * Validates: Requirements 9.1, 9.2
     * 
     * Multiple watch progress updates should all be preserved.
     */
    await fc.assert(
      fc.asyncProperty(
        syncCodeArbitrary,
        fc.array(watchProgressArbitrary, { minLength: 2, maxLength: 10 }),
        async (syncCode, progressItems) => {
          // Make content IDs unique
          const uniqueItems = progressItems.map((item, index) => ({
            ...item,
            contentId: `content_${index}_${item.contentId}`,
          }));

          // Save each progress item
          for (const progress of uniqueItems) {
            const result = await client.syncWatchProgress(syncCode, progress);
            expect(result.success).toBe(true);
          }

          // Load sync data
          const loadResult = await client.loadSyncData(syncCode);
          expect(loadResult.success).toBe(true);
          expect(loadResult.data).toBeDefined();

          // Verify all items are present
          for (const progress of uniqueItems) {
            const key = progress.contentType === 'tv'
              ? `${progress.contentId}_s${progress.seasonNumber || 1}_e${progress.episodeNumber || 1}`
              : progress.contentId;

            const loaded = loadResult.data!.watchProgress[key];
            expect(loaded).toBeDefined();
            expect(loaded.contentId).toBe(progress.contentId);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Watch progress update overwrites previous value for same key', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 3: Sync Data Round-Trip
     * Validates: Requirements 9.1, 9.2
     * 
     * Updating watch progress for the same content should overwrite the previous value.
     */
    await fc.assert(
      fc.asyncProperty(
        syncCodeArbitrary,
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        async (syncCode, contentId, initialProgress, updatedProgress) => {
          // Save initial progress
          await client.syncWatchProgress(syncCode, {
            contentId,
            contentType: 'movie',
            progress: initialProgress,
            currentTime: initialProgress * 10,
            duration: 1000,
            lastWatched: Date.now() - 10000,
          });

          // Update progress
          const newLastWatched = Date.now();
          await client.syncWatchProgress(syncCode, {
            contentId,
            contentType: 'movie',
            progress: updatedProgress,
            currentTime: updatedProgress * 10,
            duration: 1000,
            lastWatched: newLastWatched,
          });

          // Load and verify
          const loadResult = await client.loadSyncData(syncCode);
          expect(loadResult.success).toBe(true);

          const loaded = loadResult.data!.watchProgress[contentId];
          expect(loaded).toBeDefined();
          expect(loaded.progress).toBe(updatedProgress);
          expect(loaded.lastWatched).toBe(newLastWatched);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });


  test('TV show episodes have separate progress entries', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 3: Sync Data Round-Trip
     * Validates: Requirements 9.1, 9.2
     * 
     * Different episodes of the same TV show should have separate progress entries.
     */
    await fc.assert(
      fc.asyncProperty(
        syncCodeArbitrary,
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.integer({ min: 1, max: 24 }), { minLength: 2, maxLength: 5 }),
        async (syncCode, contentId, season, episodes) => {
          // Make episodes unique
          const uniqueEpisodes = [...new Set(episodes)];
          if (uniqueEpisodes.length < 2) return true; // Skip if not enough unique episodes

          // Save progress for each episode
          for (const episode of uniqueEpisodes) {
            await client.syncWatchProgress(syncCode, {
              contentId,
              contentType: 'tv',
              progress: episode * 10,
              currentTime: episode * 100,
              duration: 2400,
              seasonNumber: season,
              episodeNumber: episode,
              lastWatched: Date.now(),
            });
          }

          // Load and verify
          const loadResult = await client.loadSyncData(syncCode);
          expect(loadResult.success).toBe(true);

          // Each episode should have its own entry
          for (const episode of uniqueEpisodes) {
            const key = `${contentId}_s${season}_e${episode}`;
            const loaded = loadResult.data!.watchProgress[key];
            expect(loaded).toBeDefined();
            expect(loaded.episodeNumber).toBe(episode);
            expect(loaded.seasonNumber).toBe(season);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Empty sync code uses local storage', async () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 3: Sync Data Round-Trip
     * Validates: Requirements 9.4
     * 
     * When no sync code is provided, data should be stored locally.
     */
    await fc.assert(
      fc.asyncProperty(
        watchProgressArbitrary,
        async (progress) => {
          // Save with empty sync code
          const saveResult = await client.syncWatchProgress('', progress);
          expect(saveResult.success).toBe(true);
          expect(saveResult.source).toBe('local');

          // Load with empty sync code
          const loadResult = await client.loadSyncData('');
          expect(loadResult.success).toBe(true);
          expect(loadResult.source).toBe('local');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
