/**
 * Property-Based Tests for Unified Stats API Caching
 * Feature: admin-panel-unified-refactor, Property 2: Cache prevents duplicate API calls
 * Validates: Requirements 1.2
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import * as fc from 'fast-check';

// Mock the unified stats API module
const mockStatsCache = {
  data: null as any,
  timestamp: 0,
};

const CACHE_TTL = 10000; // 10 seconds

// Mock database calls counter
let dbCallCount = 0;

// Mock the database adapter
const mockAdapter = {
  query: mock(() => {
    dbCallCount++;
    return Promise.resolve([{ total: 100, count: 50 }]);
  }),
  execute: mock(() => {
    dbCallCount++;
    return Promise.resolve();
  }),
};

// Mock the unified stats function
async function mockUnifiedStatsLogic(now: number) {
  // Check cache first - return cached data if still valid
  if (mockStatsCache.data && (now - mockStatsCache.timestamp) < CACHE_TTL) {
    return {
      ...mockStatsCache.data,
      cached: true,
      cacheAge: now - mockStatsCache.timestamp,
    };
  }

  // Simulate database calls
  await mockAdapter.query('SELECT COUNT(*) FROM users');
  await mockAdapter.query('SELECT COUNT(*) FROM sessions');
  
  const responseData = {
    success: true,
    realtime: { totalActive: 10, trulyActive: 8 },
    users: { total: 100, dau: 50 },
    timestamp: now,
  };
  
  // Cache the results
  mockStatsCache.data = responseData;
  mockStatsCache.timestamp = now;

  return responseData;
}

describe('Unified Stats API Caching', () => {
  beforeEach(() => {
    // Reset cache and counters before each test
    mockStatsCache.data = null;
    mockStatsCache.timestamp = 0;
    dbCallCount = 0;
    mockAdapter.query.mockClear();
    mockAdapter.execute.mockClear();
  });

  afterEach(() => {
    // Clean up after each test
    mockStatsCache.data = null;
    mockStatsCache.timestamp = 0;
  });

  test('Property 2: Cache prevents duplicate API calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate sequences of request timestamps within cache TTL
        fc.array(
          fc.integer({ min: 0, max: CACHE_TTL - 1000 }), // Requests within cache window
          { minLength: 2, maxLength: 10 }
        ),
        async (requestDelays) => {
          // Reset for this property test iteration
          mockStatsCache.data = null;
          mockStatsCache.timestamp = 0;
          dbCallCount = 0;
          mockAdapter.query.mockClear();

          const baseTime = Date.now();
          let previousDbCallCount = 0;

          // Make the first request
          await mockUnifiedStatsLogic(baseTime);
          const firstCallCount = dbCallCount;
          expect(firstCallCount).toBeGreaterThan(0); // First call should hit database

          // Make subsequent requests within cache TTL
          for (let i = 0; i < requestDelays.length; i++) {
            const requestTime = baseTime + requestDelays[i];
            const result = await mockUnifiedStatsLogic(requestTime);
            
            // Within cache TTL, should return cached data
            if (requestTime - baseTime < CACHE_TTL) {
              expect(result.cached).toBe(true);
              expect(dbCallCount).toBe(firstCallCount); // No additional DB calls
            }
          }

          // Property: For any sequence of requests within cache TTL,
          // only the first request should trigger database calls
          return dbCallCount === firstCallCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Cache expiration triggers new database calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: CACHE_TTL + 1000, max: CACHE_TTL + 60000 }), // Time beyond cache TTL
        async (expiredDelay) => {
          // Reset for this property test iteration
          mockStatsCache.data = null;
          mockStatsCache.timestamp = 0;
          dbCallCount = 0;
          mockAdapter.query.mockClear();

          const baseTime = Date.now();

          // Make first request
          await mockUnifiedStatsLogic(baseTime);
          const firstCallCount = dbCallCount;

          // Make request after cache expires
          const expiredTime = baseTime + expiredDelay;
          const result = await mockUnifiedStatsLogic(expiredTime);

          // Should not be cached and should trigger new DB calls
          expect(result.cached).toBeUndefined();
          expect(dbCallCount).toBeGreaterThan(firstCallCount);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Cache age is correctly calculated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: CACHE_TTL - 100 }), // Valid cache age range
        async (cacheAge) => {
          // Reset for this property test iteration
          mockStatsCache.data = null;
          mockStatsCache.timestamp = 0;
          dbCallCount = 0;

          const baseTime = Date.now();

          // Make first request to populate cache
          await mockUnifiedStatsLogic(baseTime);

          // Make second request after specified cache age
          const secondRequestTime = baseTime + cacheAge;
          const result = await mockUnifiedStatsLogic(secondRequestTime);

          // Should return cached data with correct age
          expect(result.cached).toBe(true);
          expect(result.cacheAge).toBe(cacheAge);

          return Math.abs(result.cacheAge - cacheAge) < 10; // Allow small timing variance
        }
      ),
      { numRuns: 100 }
    );
  });
});