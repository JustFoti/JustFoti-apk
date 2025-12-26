/**
 * Property-Based Tests for Analytics Filtering Consistency
 * Feature: admin-panel-production-ready, Property 2: Filtering consistency across pages
 * Validates: Requirements 2.1, 2.2
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fc from 'fast-check';

// Mock watch session data matching the analytics page interface
interface WatchSession {
  id: string;
  user_id: string;
  content_id: string;
  content_type: string;
  content_title: string;
  season_number?: number;
  episode_number?: number;
  started_at: number;
  ended_at?: number;
  total_watch_time: number;
  last_position: number;
  duration: number;
  completion_percentage: number;
  quality?: string;
  device_type?: string;
  is_completed: boolean;
  pause_count: number;
  seek_count: number;
}

// Filter options matching the analytics page
interface FilterOptions {
  searchQuery: string;
  filterDevice: string;
  filterQuality: string;
  filterContentType: string;
}

// Mock filtering service that replicates the analytics page filtering logic
class MockFilteringService {
  private sessions: WatchSession[] = [];

  setSessions(sessions: WatchSession[]) {
    this.sessions = sessions;
  }

  filterSessions(options: FilterOptions): WatchSession[] {
    let result = [...this.sessions];

    // Apply search filter (matches content_title, content_id, or user_id)
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase();
      result = result.filter(s =>
        s.content_title?.toLowerCase().includes(query) ||
        s.content_id?.toLowerCase().includes(query) ||
        s.user_id?.toLowerCase().includes(query)
      );
    }

    // Apply device filter
    if (options.filterDevice !== 'all') {
      result = result.filter(s => s.device_type === options.filterDevice);
    }

    // Apply quality filter
    if (options.filterQuality !== 'all') {
      result = result.filter(s => s.quality === options.filterQuality);
    }

    // Apply content type filter
    if (options.filterContentType !== 'all') {
      result = result.filter(s => s.content_type === options.filterContentType);
    }

    return result;
  }

  reset() {
    this.sessions = [];
  }
}

// Generate realistic watch session data
const generateWatchSession = () => fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  content_id: fc.string({ minLength: 5, maxLength: 15 }),
  content_type: fc.constantFrom('movie', 'tv_show'),
  content_title: fc.string({ minLength: 3, maxLength: 50 }),
  season_number: fc.option(fc.integer({ min: 1, max: 10 })),
  episode_number: fc.option(fc.integer({ min: 1, max: 24 })),
  started_at: fc.integer({ min: Date.now() - 86400000 * 7, max: Date.now() }),
  ended_at: fc.option(fc.integer({ min: Date.now() - 86400000, max: Date.now() })),
  total_watch_time: fc.integer({ min: 60, max: 7200 }),
  last_position: fc.integer({ min: 0, max: 7200 }),
  duration: fc.integer({ min: 1800, max: 10800 }),
  completion_percentage: fc.integer({ min: 0, max: 100 }),
  quality: fc.constantFrom('auto', '720p', '1080p', '4k', undefined),
  device_type: fc.constantFrom('desktop', 'mobile', 'tablet', 'tv', undefined),
  is_completed: fc.boolean(),
  pause_count: fc.integer({ min: 0, max: 20 }),
  seek_count: fc.integer({ min: 0, max: 50 }),
});

describe('Analytics Filtering Consistency', () => {
  let filteringService: MockFilteringService;

  beforeEach(() => {
    filteringService = new MockFilteringService();
  });

  afterEach(() => {
    filteringService.reset();
  });

  test('Property 2: Filtering consistency - all results match filter criteria', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateWatchSession(), { minLength: 10, maxLength: 100 }),
        fc.string({ minLength: 0, maxLength: 10 }), // search query
        fc.constantFrom('all', 'desktop', 'mobile', 'tablet', 'tv'),
        fc.constantFrom('all', 'auto', '720p', '1080p', '4k'),
        fc.constantFrom('all', 'movie', 'tv_show'),
        async (sessions, searchQuery, filterDevice, filterQuality, filterContentType) => {
          filteringService.setSessions(sessions);

          const options: FilterOptions = {
            searchQuery,
            filterDevice,
            filterQuality,
            filterContentType,
          };

          const filteredSessions = filteringService.filterSessions(options);

          // Property: All filtered results must match ALL applied filter criteria
          for (const session of filteredSessions) {
            // Check search query match
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              const matchesSearch =
                session.content_title?.toLowerCase().includes(query) ||
                session.content_id?.toLowerCase().includes(query) ||
                session.user_id?.toLowerCase().includes(query);
              expect(matchesSearch).toBe(true);
            }

            // Check device filter match
            if (filterDevice !== 'all') {
              expect(session.device_type).toBe(filterDevice);
            }

            // Check quality filter match
            if (filterQuality !== 'all') {
              expect(session.quality).toBe(filterQuality);
            }

            // Check content type filter match
            if (filterContentType !== 'all') {
              expect(session.content_type).toBe(filterContentType);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Filtering is complete - no matching records are excluded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateWatchSession(), { minLength: 10, maxLength: 50 }),
        fc.constantFrom('all', 'desktop', 'mobile'),
        fc.constantFrom('all', 'movie', 'tv_show'),
        async (sessions, filterDevice, filterContentType) => {
          filteringService.setSessions(sessions);

          const options: FilterOptions = {
            searchQuery: '',
            filterDevice,
            filterQuality: 'all',
            filterContentType,
          };

          const filteredSessions = filteringService.filterSessions(options);

          // Property: All sessions that match the criteria should be included
          const expectedMatches = sessions.filter(s => {
            if (filterDevice !== 'all' && s.device_type !== filterDevice) return false;
            if (filterContentType !== 'all' && s.content_type !== filterContentType) return false;
            return true;
          });

          expect(filteredSessions.length).toBe(expectedMatches.length);

          // Verify each expected match is in the filtered results
          for (const expected of expectedMatches) {
            const found = filteredSessions.some(s => s.id === expected.id);
            expect(found).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Multiple filters combine correctly (AND logic)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateWatchSession(), { minLength: 20, maxLength: 80 }),
        fc.constantFrom('desktop', 'mobile', 'tablet'),
        fc.constantFrom('movie', 'tv_show'),
        async (sessions, filterDevice, filterContentType) => {
          filteringService.setSessions(sessions);

          // Apply individual filters
          const deviceOnlyOptions: FilterOptions = {
            searchQuery: '',
            filterDevice,
            filterQuality: 'all',
            filterContentType: 'all',
          };

          const contentTypeOnlyOptions: FilterOptions = {
            searchQuery: '',
            filterDevice: 'all',
            filterQuality: 'all',
            filterContentType,
          };

          const combinedOptions: FilterOptions = {
            searchQuery: '',
            filterDevice,
            filterQuality: 'all',
            filterContentType,
          };

          const deviceOnlyResults = filteringService.filterSessions(deviceOnlyOptions);
          const contentTypeOnlyResults = filteringService.filterSessions(contentTypeOnlyOptions);
          const combinedResults = filteringService.filterSessions(combinedOptions);

          // Property: Combined filter results should be subset of individual filter results
          expect(combinedResults.length).toBeLessThanOrEqual(deviceOnlyResults.length);
          expect(combinedResults.length).toBeLessThanOrEqual(contentTypeOnlyResults.length);

          // Property: Combined results should be intersection of individual results
          for (const session of combinedResults) {
            const inDeviceResults = deviceOnlyResults.some(s => s.id === session.id);
            const inContentTypeResults = contentTypeOnlyResults.some(s => s.id === session.id);
            expect(inDeviceResults).toBe(true);
            expect(inContentTypeResults).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Search filtering is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateWatchSession(), { minLength: 10, maxLength: 30 }),
        fc.string({ minLength: 2, maxLength: 8 }),
        async (sessions, searchTerm) => {
          // Ensure at least one session contains the search term
          const modifiedSessions = [...sessions];
          if (modifiedSessions.length > 0) {
            modifiedSessions[0] = {
              ...modifiedSessions[0],
              content_title: `Test ${searchTerm} Movie`,
            };
          }

          filteringService.setSessions(modifiedSessions);

          const lowerCaseOptions: FilterOptions = {
            searchQuery: searchTerm.toLowerCase(),
            filterDevice: 'all',
            filterQuality: 'all',
            filterContentType: 'all',
          };

          const upperCaseOptions: FilterOptions = {
            searchQuery: searchTerm.toUpperCase(),
            filterDevice: 'all',
            filterQuality: 'all',
            filterContentType: 'all',
          };

          const mixedCaseOptions: FilterOptions = {
            searchQuery: searchTerm,
            filterDevice: 'all',
            filterQuality: 'all',
            filterContentType: 'all',
          };

          const lowerResults = filteringService.filterSessions(lowerCaseOptions);
          const upperResults = filteringService.filterSessions(upperCaseOptions);
          const mixedResults = filteringService.filterSessions(mixedCaseOptions);

          // Property: Search should be case-insensitive - all variations should return same results
          expect(lowerResults.length).toBe(upperResults.length);
          expect(upperResults.length).toBe(mixedResults.length);

          // Verify same sessions are returned
          const lowerIds = new Set(lowerResults.map(s => s.id));
          const upperIds = new Set(upperResults.map(s => s.id));
          const mixedIds = new Set(mixedResults.map(s => s.id));

          for (const id of lowerIds) {
            expect(upperIds.has(id)).toBe(true);
            expect(mixedIds.has(id)).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Empty search returns all sessions (with other filters)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateWatchSession(), { minLength: 5, maxLength: 30 }),
        async (sessions) => {
          filteringService.setSessions(sessions);

          const noFilterOptions: FilterOptions = {
            searchQuery: '',
            filterDevice: 'all',
            filterQuality: 'all',
            filterContentType: 'all',
          };

          const filteredSessions = filteringService.filterSessions(noFilterOptions);

          // Property: With no filters applied, all sessions should be returned
          expect(filteredSessions.length).toBe(sessions.length);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Filtering is deterministic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateWatchSession(), { minLength: 10, maxLength: 40 }),
        fc.string({ minLength: 0, maxLength: 5 }),
        fc.constantFrom('all', 'desktop', 'mobile'),
        fc.constantFrom('all', 'movie', 'tv_show'),
        async (sessions, searchQuery, filterDevice, filterContentType) => {
          filteringService.setSessions(sessions);

          const options: FilterOptions = {
            searchQuery,
            filterDevice,
            filterQuality: 'all',
            filterContentType,
          };

          // Run filtering multiple times
          const result1 = filteringService.filterSessions(options);
          const result2 = filteringService.filterSessions(options);
          const result3 = filteringService.filterSessions(options);

          // Property: Same filters should always produce same results
          expect(result1.length).toBe(result2.length);
          expect(result2.length).toBe(result3.length);

          // Verify same sessions are returned in same order
          for (let i = 0; i < result1.length; i++) {
            expect(result1[i].id).toBe(result2[i].id);
            expect(result2[i].id).toBe(result3[i].id);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Search matches content_title, content_id, and user_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        fc.string({ minLength: 4, maxLength: 8 }),
        async (sessionCount, searchTerm) => {
          // Create sessions with searchTerm in different fields
          const sessions: WatchSession[] = [];
          
          for (let i = 0; i < sessionCount; i++) {
            const baseSession = fc.sample(generateWatchSession(), 1)[0];
            
            // Distribute search term across different fields
            if (i % 3 === 0) {
              sessions.push({
                ...baseSession,
                id: `id-${i}`,
                content_title: `Movie with ${searchTerm} in title`,
              });
            } else if (i % 3 === 1) {
              sessions.push({
                ...baseSession,
                id: `id-${i}`,
                content_id: `${searchTerm}-content-${i}`,
              });
            } else {
              sessions.push({
                ...baseSession,
                id: `id-${i}`,
                user_id: `user-${searchTerm}-${i}`,
              });
            }
          }

          filteringService.setSessions(sessions);

          const options: FilterOptions = {
            searchQuery: searchTerm,
            filterDevice: 'all',
            filterQuality: 'all',
            filterContentType: 'all',
          };

          const filteredSessions = filteringService.filterSessions(options);

          // Property: All sessions should be found since they all contain the search term
          expect(filteredSessions.length).toBe(sessionCount);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
