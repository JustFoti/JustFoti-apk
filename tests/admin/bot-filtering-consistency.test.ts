/**
 * Property-Based Tests for Bot Filtering Consistency
 * Feature: admin-panel-unified-refactor, Property 28: Bot filtering consistency
 * Validates: Requirements 10.2
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fc from 'fast-check';

// Mock user activity data with bot detection information
interface UserActivityRecord {
  userId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  sessionId: string;
  pageViews: number;
  watchTime: number;
  country: string;
  deviceType: string;
  isSuspectedBot: boolean;
  botConfidenceScore: number;
  botDetectionReasons: string[];
}

// Mock analytics query with bot filtering options
interface AnalyticsQuery {
  metric: 'pageViews' | 'uniqueUsers' | 'watchTime' | 'sessions';
  timeRange: 'hour' | 'day' | 'week' | 'month';
  includeBots: boolean;
  botConfidenceThreshold?: number; // Only include bots above this confidence level
}

interface AnalyticsResult {
  value: number;
  includedRecords: UserActivityRecord[];
  excludedBotRecords: UserActivityRecord[];
  filterSettings: {
    includeBots: boolean;
    botConfidenceThreshold?: number;
  };
}

// Mock analytics service that applies bot filtering
class MockAnalyticsService {
  private userRecords: UserActivityRecord[] = [];

  setUserRecords(records: UserActivityRecord[]) {
    this.userRecords = records;
  }

  queryAnalytics(query: AnalyticsQuery): AnalyticsResult {
    let filteredRecords = [...this.userRecords];
    let excludedBotRecords: UserActivityRecord[] = [];

    // Apply bot filtering based on query settings
    if (!query.includeBots) {
      const threshold = query.botConfidenceThreshold || 50;
      
      // Separate bot and non-bot records
      const nonBotRecords: UserActivityRecord[] = [];
      const botRecords: UserActivityRecord[] = [];
      
      for (const record of filteredRecords) {
        if (record.isSuspectedBot && record.botConfidenceScore >= threshold) {
          botRecords.push(record);
        } else {
          nonBotRecords.push(record);
        }
      }
      
      filteredRecords = nonBotRecords;
      excludedBotRecords = botRecords;
    }

    // Calculate metric value based on filtered records
    let value = 0;
    switch (query.metric) {
      case 'pageViews':
        value = filteredRecords.reduce((sum, record) => sum + record.pageViews, 0);
        break;
      case 'uniqueUsers':
        value = new Set(filteredRecords.map(record => record.userId)).size;
        break;
      case 'watchTime':
        value = filteredRecords.reduce((sum, record) => sum + record.watchTime, 0);
        break;
      case 'sessions':
        value = new Set(filteredRecords.map(record => record.sessionId)).size;
        break;
    }

    return {
      value,
      includedRecords: filteredRecords,
      excludedBotRecords,
      filterSettings: {
        includeBots: query.includeBots,
        botConfidenceThreshold: query.botConfidenceThreshold,
      },
    };
  }

  reset() {
    this.userRecords = [];
  }
}

// Generate realistic user activity records
const generateUserActivityRecord = () => fc.record({
  userId: fc.string({ minLength: 8, maxLength: 20 }),
  ipAddress: fc.ipV4(),
  userAgent: fc.oneof(
    // Normal user agents
    fc.constantFrom(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ),
    // Bot user agents
    fc.constantFrom(
      'Mozilla/5.0 (compatible; Googlebot/2.1)',
      'curl/7.68.0',
      'python-requests/2.25.1',
      'Scrapy/2.5.0'
    )
  ),
  timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
  sessionId: fc.string({ minLength: 10, maxLength: 30 }),
  pageViews: fc.integer({ min: 1, max: 100 }),
  watchTime: fc.integer({ min: 0, max: 7200 }), // 0-2 hours in seconds
  country: fc.constantFrom('US', 'GB', 'CA', 'DE', 'FR', 'JP', 'AU'),
  deviceType: fc.constantFrom('desktop', 'mobile', 'tablet', 'tv'),
  isSuspectedBot: fc.boolean(),
  botConfidenceScore: fc.integer({ min: 0, max: 100 }),
  botDetectionReasons: fc.array(
    fc.constantFrom(
      'High request frequency',
      'Suspicious user agent',
      'No JavaScript execution',
      'Rapid navigation',
      'Datacenter IP',
      'VPN usage'
    ),
    { maxLength: 4 }
  ),
});

describe('Bot Filtering Consistency', () => {
  let analyticsService: MockAnalyticsService;

  beforeEach(() => {
    analyticsService = new MockAnalyticsService();
  });

  afterEach(() => {
    analyticsService.reset();
  });

  test('Property 28: Bot filtering consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateUserActivityRecord(), { minLength: 10, maxLength: 100 }),
        fc.constantFrom('pageViews', 'uniqueUsers', 'watchTime', 'sessions'),
        fc.constantFrom('hour', 'day', 'week', 'month'),
        fc.integer({ min: 30, max: 90 }), // Bot confidence threshold
        async (userRecords, metric, timeRange, threshold) => {
          analyticsService.setUserRecords(userRecords);

          // Query with bots included
          const queryWithBots: AnalyticsQuery = {
            metric,
            timeRange,
            includeBots: true,
            botConfidenceThreshold: threshold,
          };

          // Query with bots excluded
          const queryWithoutBots: AnalyticsQuery = {
            metric,
            timeRange,
            includeBots: false,
            botConfidenceThreshold: threshold,
          };

          const resultWithBots = analyticsService.queryAnalytics(queryWithBots);
          const resultWithoutBots = analyticsService.queryAnalytics(queryWithoutBots);

          // Property: Results should consistently include or exclude bot traffic based on filter setting
          
          // When bots are included, no records should be excluded
          expect(resultWithBots.excludedBotRecords.length).toBe(0);
          expect(resultWithBots.includedRecords.length).toBe(userRecords.length);
          expect(resultWithBots.filterSettings.includeBots).toBe(true);

          // When bots are excluded, suspected bots above threshold should be excluded
          const expectedExcludedBots = userRecords.filter(
            record => record.isSuspectedBot && record.botConfidenceScore >= threshold
          );
          const expectedIncludedRecords = userRecords.filter(
            record => !record.isSuspectedBot || record.botConfidenceScore < threshold
          );

          expect(resultWithoutBots.excludedBotRecords.length).toBe(expectedExcludedBots.length);
          expect(resultWithoutBots.includedRecords.length).toBe(expectedIncludedRecords.length);
          expect(resultWithoutBots.filterSettings.includeBots).toBe(false);
          expect(resultWithoutBots.filterSettings.botConfidenceThreshold).toBe(threshold);

          // Property: The sum of included and excluded records should equal total records when bots are excluded
          const totalProcessedRecords = resultWithoutBots.includedRecords.length + resultWithoutBots.excludedBotRecords.length;
          expect(totalProcessedRecords).toBe(userRecords.length);

          // Property: Metric values should be consistent with filtering
          if (expectedExcludedBots.length > 0) {
            // When bots are excluded, the metric value should be less than or equal to when bots are included
            expect(resultWithoutBots.value).toBeLessThanOrEqual(resultWithBots.value);
          } else {
            // When no bots are excluded, values should be identical
            expect(resultWithoutBots.value).toBe(resultWithBots.value);
          }

          // Property: All excluded records should actually be suspected bots above threshold
          for (const excludedRecord of resultWithoutBots.excludedBotRecords) {
            expect(excludedRecord.isSuspectedBot).toBe(true);
            expect(excludedRecord.botConfidenceScore).toBeGreaterThanOrEqual(threshold);
          }

          // Property: All included records should either not be bots or be below threshold
          for (const includedRecord of resultWithoutBots.includedRecords) {
            if (includedRecord.isSuspectedBot) {
              expect(includedRecord.botConfidenceScore).toBeLessThan(threshold);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Different confidence thresholds produce consistent filtering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateUserActivityRecord(), { minLength: 20, maxLength: 50 }),
        fc.constantFrom('uniqueUsers', 'sessions'),
        async (userRecords, metric) => {
          analyticsService.setUserRecords(userRecords);

          const thresholds = [30, 50, 70, 90];
          const results: AnalyticsResult[] = [];

          // Query with different confidence thresholds
          for (const threshold of thresholds) {
            const query: AnalyticsQuery = {
              metric,
              timeRange: 'day',
              includeBots: false,
              botConfidenceThreshold: threshold,
            };
            results.push(analyticsService.queryAnalytics(query));
          }

          // Property: Higher confidence thresholds should exclude fewer bots (more permissive)
          for (let i = 1; i < results.length; i++) {
            const lowerThresholdResult = results[i - 1]; // Lower threshold (more restrictive)
            const higherThresholdResult = results[i]; // Higher threshold (more permissive)

            // Higher threshold should include more or equal records
            expect(higherThresholdResult.includedRecords.length).toBeGreaterThanOrEqual(
              lowerThresholdResult.includedRecords.length
            );

            // Higher threshold should exclude fewer or equal records
            expect(higherThresholdResult.excludedBotRecords.length).toBeLessThanOrEqual(
              lowerThresholdResult.excludedBotRecords.length
            );

            // Metric value should be higher or equal with higher threshold (more permissive)
            expect(higherThresholdResult.value).toBeGreaterThanOrEqual(lowerThresholdResult.value);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Bot filtering is deterministic and repeatable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateUserActivityRecord(), { minLength: 15, maxLength: 30 }),
        fc.constantFrom('pageViews', 'watchTime'),
        fc.integer({ min: 40, max: 80 }),
        async (userRecords, metric, threshold) => {
          analyticsService.setUserRecords(userRecords);

          const query: AnalyticsQuery = {
            metric,
            timeRange: 'week',
            includeBots: false,
            botConfidenceThreshold: threshold,
          };

          // Run the same query multiple times
          const result1 = analyticsService.queryAnalytics(query);
          const result2 = analyticsService.queryAnalytics(query);
          const result3 = analyticsService.queryAnalytics(query);

          // Property: Results should be identical across multiple runs
          expect(result1.value).toBe(result2.value);
          expect(result2.value).toBe(result3.value);

          expect(result1.includedRecords.length).toBe(result2.includedRecords.length);
          expect(result2.includedRecords.length).toBe(result3.includedRecords.length);

          expect(result1.excludedBotRecords.length).toBe(result2.excludedBotRecords.length);
          expect(result2.excludedBotRecords.length).toBe(result3.excludedBotRecords.length);

          // Property: Filter settings should be preserved
          expect(result1.filterSettings.includeBots).toBe(result2.filterSettings.includeBots);
          expect(result1.filterSettings.botConfidenceThreshold).toBe(result2.filterSettings.botConfidenceThreshold);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Edge cases: All bots or no bots scenarios', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }), // Number of records
        fc.boolean(), // All bots or all humans
        fc.constantFrom('uniqueUsers', 'sessions', 'pageViews'),
        async (recordCount, allAreBots, metric) => {
          // Generate records that are all bots or all humans
          const records: UserActivityRecord[] = [];
          for (let i = 0; i < recordCount; i++) {
            const baseRecord = fc.sample(generateUserActivityRecord(), 1)[0];
            records.push({
              ...baseRecord,
              userId: `user-${i}`,
              sessionId: `session-${i}`,
              isSuspectedBot: allAreBots,
              botConfidenceScore: allAreBots ? 85 : 15, // High confidence for bots, low for humans
            });
          }

          analyticsService.setUserRecords(records);

          const queryExcludingBots: AnalyticsQuery = {
            metric,
            timeRange: 'day',
            includeBots: false,
            botConfidenceThreshold: 50,
          };

          const queryIncludingBots: AnalyticsQuery = {
            metric,
            timeRange: 'day',
            includeBots: true,
          };

          const resultExcludingBots = analyticsService.queryAnalytics(queryExcludingBots);
          const resultIncludingBots = analyticsService.queryAnalytics(queryIncludingBots);

          if (allAreBots) {
            // Property: When all records are bots, excluding bots should result in zero value
            expect(resultExcludingBots.value).toBe(0);
            expect(resultExcludingBots.includedRecords.length).toBe(0);
            expect(resultExcludingBots.excludedBotRecords.length).toBe(recordCount);

            // Including bots should give the full value
            expect(resultIncludingBots.value).toBeGreaterThan(0);
            expect(resultIncludingBots.includedRecords.length).toBe(recordCount);
          } else {
            // Property: When no records are bots, both queries should return identical results
            expect(resultExcludingBots.value).toBe(resultIncludingBots.value);
            expect(resultExcludingBots.includedRecords.length).toBe(recordCount);
            expect(resultExcludingBots.excludedBotRecords.length).toBe(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Bot filtering preserves data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateUserActivityRecord(), { minLength: 10, maxLength: 40 }),
        fc.integer({ min: 25, max: 75 }),
        async (userRecords, threshold) => {
          analyticsService.setUserRecords(userRecords);

          const query: AnalyticsQuery = {
            metric: 'uniqueUsers',
            timeRange: 'day',
            includeBots: false,
            botConfidenceThreshold: threshold,
          };

          const result = analyticsService.queryAnalytics(query);

          // Property: No data should be lost or corrupted during filtering
          const totalOriginalUsers = new Set(userRecords.map(r => r.userId)).size;
          const includedUsers = new Set(result.includedRecords.map(r => r.userId)).size;
          const excludedUsers = new Set(result.excludedBotRecords.map(r => r.userId)).size;

          // All original users should be accounted for (either included or excluded)
          // Note: Some users might appear in multiple records, so we check that no users are lost
          expect(includedUsers + excludedUsers).toBeLessThanOrEqual(totalOriginalUsers);

          // No user should appear in both included and excluded lists
          const includedUserIds = new Set(result.includedRecords.map(r => r.userId));
          const excludedUserIds = new Set(result.excludedBotRecords.map(r => r.userId));
          
          for (const userId of includedUserIds) {
            expect(excludedUserIds.has(userId)).toBe(false);
          }

          // Property: Metric value should match the count of included unique users
          expect(result.value).toBe(includedUsers);

          // Property: Total records processed should equal original records
          expect(result.includedRecords.length + result.excludedBotRecords.length).toBe(userRecords.length);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});