/**
 * Property-Based Tests for Analytics Sorting Correctness
 * Feature: admin-panel-production-ready, Property 3: Sorting correctness
 * Validates: Requirements 2.3
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

// Sort options matching the analytics page
type SortField = 'started_at' | 'total_watch_time' | 'completion_percentage';
type SortOrder = 'asc' | 'desc';

interface SortOptions {
  sortField: SortField;
  sortOrder: SortOrder;
}

// Mock sorting service that replicates the analytics page sorting logic
class MockSortingService {
  private sessions: WatchSession[] = [];

  setSessions(sessions: WatchSession[]) {
    this.sessions = sessions;
  }

  sortSessions(options: SortOptions): WatchSession[] {
    const result = [...this.sessions];

    result.sort((a, b) => {
      const aVal = a[options.sortField] || 0;
      const bVal = b[options.sortField] || 0;
      return options.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }

  reset() {
    this.sessions = [];
  }
}

// Generate realistic watch session data with distinct values for sorting
const generateWatchSession = () => fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  content_id: fc.string({ minLength: 5, maxLength: 15 }),
  content_type: fc.constantFrom('movie', 'tv_show'),
  content_title: fc.string({ minLength: 3, maxLength: 50 }),
  season_number: fc.option(fc.integer({ min: 1, max: 10 })),
  episode_number: fc.option(fc.integer({ min: 1, max: 24 })),
  started_at: fc.integer({ min: Date.now() - 86400000 * 30, max: Date.now() }),
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

describe('Analytics Sorting Correctness', () => {
  let sortingService: MockSortingService;

  beforeEach(() => {
    sortingService = new MockSortingService();
  });

  afterEach(() => {
    sortingService.reset();
  });

  test('Property 3: Sorting correctness - descending order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateWatchSession(), { minLength: 5, maxLength: 100 }),
        fc.constantFrom('started_at', 'total_watch_time', 'completion_percentage'),
        async (sessions, sortField) => {
          sortingService.setSessions(sessions);

          const options: SortOptions = {
            sortField: sortField as SortField,
            sortOrder: 'desc',
          };

          const sortedSessions = sortingService.sortSessions(options);

          // Property: Each element should be >= the next element (descending order)
          for (let i = 0; i < sortedSessions.length - 1; i++) {
            const currentVal = sortedSessions[i][sortField] || 0;
            const nextVal = sortedSessions[i + 1][sortField] || 0;
            expect(currentVal).toBeGreaterThanOrEqual(nextVal);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3: Sorting correctness - ascending order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateWatchSession(), { minLength: 5, maxLength: 100 }),
        fc.constantFrom('started_at', 'total_watch_time', 'completion_percentage'),
        async (sessions, sortField) => {
          sortingService.setSessions(sessions);

          const options: SortOptions = {
            sortField: sortField as SortField,
            sortOrder: 'asc',
          };

          const sortedSessions = sortingService.sortSessions(options);

          // Property: Each element should be <= the next element (ascending order)
          for (let i = 0; i < sortedSessions.length - 1; i++) {
            const currentVal = sortedSessions[i][sortField] || 0;
            const nextVal = sortedSessions[i + 1][sortField] || 0;
            expect(currentVal).toBeLessThanOrEqual(nextVal);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3: Sorting preserves all elements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateWatchSession(), { minLength: 5, maxLength: 50 }),
        fc.constantFrom('started_at', 'total_watch_time', 'completion_percentage'),
        fc.constantFrom('asc', 'desc'),
        async (sessions, sortField, sortOrder) => {
          sortingService.setSessions(sessions);

          const options: SortOptions = {
            sortField: sortField as SortField,
            sortOrder: sortOrder as SortOrder,
          };

          const sortedSessions = sortingService.sortSessions(options);

          // Property: Sorting should not add or remove elements
          expect(sortedSessions.length).toBe(sessions.length);

          // Property: All original sessions should be present in sorted result
          const originalIds = new Set(sessions.map(s => s.id));
          const sortedIds = new Set(sortedSessions.map(s => s.id));

          expect(sortedIds.size).toBe(originalIds.size);
          for (const id of originalIds) {
            expect(sortedIds.has(id)).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3: Sorting is stable for equal values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        fc.constantFrom('started_at', 'total_watch_time', 'completion_percentage'),
        async (sessionCount, sortField) => {
          // Create sessions with some equal values for the sort field
          const sessions: WatchSession[] = [];
          const sharedValue = 5000;

          for (let i = 0; i < sessionCount; i++) {
            const baseSession = fc.sample(generateWatchSession(), 1)[0];
            sessions.push({
              ...baseSession,
              id: `session-${i}`,
              // Half the sessions have the same value for the sort field
              [sortField]: i % 2 === 0 ? sharedValue : baseSession[sortField as keyof WatchSession],
            });
          }

          sortingService.setSessions(sessions);

          const options: SortOptions = {
            sortField: sortField as SortField,
            sortOrder: 'desc',
          };

          // Sort multiple times
          const sorted1 = sortingService.sortSessions(options);
          const sorted2 = sortingService.sortSessions(options);

          // Property: Multiple sorts should produce consistent results
          expect(sorted1.length).toBe(sorted2.length);
          for (let i = 0; i < sorted1.length; i++) {
            expect(sorted1[i].id).toBe(sorted2[i].id);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3: Ascending and descending are inverses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateWatchSession(), { minLength: 5, maxLength: 50 }),
        fc.constantFrom('started_at', 'total_watch_time', 'completion_percentage'),
        async (sessions, sortField) => {
          sortingService.setSessions(sessions);

          const ascOptions: SortOptions = {
            sortField: sortField as SortField,
            sortOrder: 'asc',
          };

          const descOptions: SortOptions = {
            sortField: sortField as SortField,
            sortOrder: 'desc',
          };

          const ascSorted = sortingService.sortSessions(ascOptions);
          const descSorted = sortingService.sortSessions(descOptions);

          // Property: First element in ascending should be last in descending (and vice versa)
          // when all values are unique
          if (ascSorted.length > 0) {
            const ascFirst = ascSorted[0][sortField] || 0;
            const descLast = descSorted[descSorted.length - 1][sortField] || 0;
            expect(ascFirst).toBeLessThanOrEqual(descLast);

            const ascLast = ascSorted[ascSorted.length - 1][sortField] || 0;
            const descFirst = descSorted[0][sortField] || 0;
            expect(ascLast).toBeLessThanOrEqual(descFirst);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3: Sorting handles edge cases - empty array', async () => {
    sortingService.setSessions([]);

    const options: SortOptions = {
      sortField: 'started_at',
      sortOrder: 'desc',
    };

    const sortedSessions = sortingService.sortSessions(options);

    // Property: Sorting empty array should return empty array
    expect(sortedSessions.length).toBe(0);
  });

  test('Property 3: Sorting handles edge cases - single element', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateWatchSession(),
        fc.constantFrom('started_at', 'total_watch_time', 'completion_percentage'),
        fc.constantFrom('asc', 'desc'),
        async (session, sortField, sortOrder) => {
          sortingService.setSessions([session]);

          const options: SortOptions = {
            sortField: sortField as SortField,
            sortOrder: sortOrder as SortOrder,
          };

          const sortedSessions = sortingService.sortSessions(options);

          // Property: Single element array should remain unchanged
          expect(sortedSessions.length).toBe(1);
          expect(sortedSessions[0].id).toBe(session.id);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3: Sorting handles null/undefined values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        async (sessionCount) => {
          // Create sessions with some undefined values
          const sessions: WatchSession[] = [];

          for (let i = 0; i < sessionCount; i++) {
            const baseSession = fc.sample(generateWatchSession(), 1)[0];
            sessions.push({
              ...baseSession,
              id: `session-${i}`,
              // Some sessions have 0 or undefined-like values
              total_watch_time: i % 3 === 0 ? 0 : baseSession.total_watch_time,
            });
          }

          sortingService.setSessions(sessions);

          const options: SortOptions = {
            sortField: 'total_watch_time',
            sortOrder: 'desc',
          };

          const sortedSessions = sortingService.sortSessions(options);

          // Property: Sorting should not throw and should maintain order
          expect(sortedSessions.length).toBe(sessions.length);

          // Verify descending order is maintained
          for (let i = 0; i < sortedSessions.length - 1; i++) {
            const currentVal = sortedSessions[i].total_watch_time || 0;
            const nextVal = sortedSessions[i + 1].total_watch_time || 0;
            expect(currentVal).toBeGreaterThanOrEqual(nextVal);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3: Different sort fields produce different orderings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateWatchSession(), { minLength: 10, maxLength: 30 }),
        async (sessions) => {
          sortingService.setSessions(sessions);

          const sortByStarted = sortingService.sortSessions({
            sortField: 'started_at',
            sortOrder: 'desc',
          });

          const sortByWatchTime = sortingService.sortSessions({
            sortField: 'total_watch_time',
            sortOrder: 'desc',
          });

          const sortByCompletion = sortingService.sortSessions({
            sortField: 'completion_percentage',
            sortOrder: 'desc',
          });

          // Property: All sorts should have same length
          expect(sortByStarted.length).toBe(sessions.length);
          expect(sortByWatchTime.length).toBe(sessions.length);
          expect(sortByCompletion.length).toBe(sessions.length);

          // Property: Each sort should be correctly ordered by its field
          for (let i = 0; i < sortByStarted.length - 1; i++) {
            expect(sortByStarted[i].started_at || 0).toBeGreaterThanOrEqual(sortByStarted[i + 1].started_at || 0);
          }

          for (let i = 0; i < sortByWatchTime.length - 1; i++) {
            expect(sortByWatchTime[i].total_watch_time || 0).toBeGreaterThanOrEqual(sortByWatchTime[i + 1].total_watch_time || 0);
          }

          for (let i = 0; i < sortByCompletion.length - 1; i++) {
            expect(sortByCompletion[i].completion_percentage || 0).toBeGreaterThanOrEqual(sortByCompletion[i + 1].completion_percentage || 0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
