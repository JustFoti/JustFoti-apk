/**
 * Property-Based Tests for Retention and Churn Analytics
 * Feature: admin-panel-unified-refactor, Property 13: Retention and churn analytics
 * Validates: Requirements 5.4
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Mock user activity data structure
interface UserActivity {
  userId: string;
  timestamp: number;
  activityType: 'watching' | 'browsing' | 'livetv';
  sessionDuration: number; // in minutes
}

// Retention analytics results structure
interface RetentionAnalytics {
  totalUsers: number;
  returningUsers: number;
  newUsers: number;
  churnedUsers: number;
  retentionRate: number; // percentage
  churnRate: number; // percentage
  cohortRetention: CohortRetention[];
  userLifecycle: UserLifecycleMetrics;
}

interface CohortRetention {
  cohortPeriod: string; // e.g., "2024-01", "2024-02"
  initialUsers: number;
  retainedAfter1Period: number;
  retainedAfter3Periods: number;
  retainedAfter6Periods: number;
  retentionRate1Period: number;
  retentionRate3Periods: number;
  retentionRate6Periods: number;
}

interface UserLifecycleMetrics {
  newUserCount: number;
  activeUserCount: number;
  returningUserCount: number;
  churnedUserCount: number;
  reactivatedUserCount: number;
}

// Retention analytics calculation functions
class RetentionAnalyticsCalculator {
  private static readonly DAY_MS = 24 * 60 * 60 * 1000;
  private static readonly WEEK_MS = 7 * this.DAY_MS;
  private static readonly MONTH_MS = 30 * this.DAY_MS;

  static calculateRetentionAnalytics(
    activities: UserActivity[], 
    currentPeriodStart: number, 
    currentPeriodEnd: number,
    previousPeriodStart: number,
    previousPeriodEnd: number
  ): RetentionAnalytics {
    // Get unique users for each period
    const currentPeriodUsers = new Set(
      activities
        .filter(a => a.timestamp >= currentPeriodStart && a.timestamp <= currentPeriodEnd)
        .map(a => a.userId)
    );

    const previousPeriodUsers = new Set(
      activities
        .filter(a => a.timestamp >= previousPeriodStart && a.timestamp <= previousPeriodEnd)
        .map(a => a.userId)
    );

    // Calculate metrics
    const totalUsers = currentPeriodUsers.size;
    const returningUsers = Array.from(currentPeriodUsers).filter(userId => 
      previousPeriodUsers.has(userId)
    ).length;
    const newUsers = totalUsers - returningUsers;
    const churnedUsers = Array.from(previousPeriodUsers).filter(userId => 
      !currentPeriodUsers.has(userId)
    ).length;

    const retentionRate = previousPeriodUsers.size > 0 
      ? Math.round((returningUsers / previousPeriodUsers.size) * 100 * 100) / 100
      : 0;
    
    const churnRate = previousPeriodUsers.size > 0 
      ? Math.round((churnedUsers / previousPeriodUsers.size) * 100 * 100) / 100
      : 0;

    // Calculate cohort retention (simplified for testing)
    const cohortRetention = this.calculateCohortRetention(activities, currentPeriodEnd);

    // Calculate user lifecycle metrics
    const userLifecycle = this.calculateUserLifecycleMetrics(
      activities, 
      currentPeriodStart, 
      currentPeriodEnd, 
      previousPeriodStart, 
      previousPeriodEnd
    );

    return {
      totalUsers,
      returningUsers,
      newUsers,
      churnedUsers,
      retentionRate,
      churnRate,
      cohortRetention,
      userLifecycle
    };
  }

  private static calculateCohortRetention(activities: UserActivity[], referenceTime: number): CohortRetention[] {
    // Simplified cohort analysis for testing
    const cohorts: CohortRetention[] = [];
    
    // Create a sample cohort for the last 6 months
    for (let i = 0; i < 6; i++) {
      const cohortStart = referenceTime - ((i + 1) * this.MONTH_MS);
      const cohortEnd = referenceTime - (i * this.MONTH_MS);
      
      const cohortUsers = new Set(
        activities
          .filter(a => a.timestamp >= cohortStart && a.timestamp < cohortEnd)
          .map(a => a.userId)
      );

      if (cohortUsers.size === 0) continue;

      // Calculate retention for different periods
      const retainedAfter1 = Array.from(cohortUsers).filter(userId =>
        activities.some(a => 
          a.userId === userId && 
          a.timestamp >= cohortEnd && 
          a.timestamp < cohortEnd + this.MONTH_MS
        )
      ).length;

      const retainedAfter3 = Array.from(cohortUsers).filter(userId =>
        activities.some(a => 
          a.userId === userId && 
          a.timestamp >= cohortEnd + (2 * this.MONTH_MS) && 
          a.timestamp < cohortEnd + (3 * this.MONTH_MS)
        )
      ).length;

      const retainedAfter6 = Array.from(cohortUsers).filter(userId =>
        activities.some(a => 
          a.userId === userId && 
          a.timestamp >= cohortEnd + (5 * this.MONTH_MS) && 
          a.timestamp < cohortEnd + (6 * this.MONTH_MS)
        )
      ).length;

      cohorts.push({
        cohortPeriod: new Date(cohortStart).toISOString().substring(0, 7),
        initialUsers: cohortUsers.size,
        retainedAfter1Period: retainedAfter1,
        retainedAfter3Periods: retainedAfter3,
        retainedAfter6Periods: retainedAfter6,
        retentionRate1Period: Math.round((retainedAfter1 / cohortUsers.size) * 100 * 100) / 100,
        retentionRate3Periods: Math.round((retainedAfter3 / cohortUsers.size) * 100 * 100) / 100,
        retentionRate6Periods: Math.round((retainedAfter6 / cohortUsers.size) * 100 * 100) / 100
      });
    }

    return cohorts;
  }

  private static calculateUserLifecycleMetrics(
    activities: UserActivity[],
    currentPeriodStart: number,
    currentPeriodEnd: number,
    previousPeriodStart: number,
    previousPeriodEnd: number
  ): UserLifecycleMetrics {
    const currentUsers = new Set(
      activities
        .filter(a => a.timestamp >= currentPeriodStart && a.timestamp <= currentPeriodEnd)
        .map(a => a.userId)
    );

    const previousUsers = new Set(
      activities
        .filter(a => a.timestamp >= previousPeriodStart && a.timestamp <= previousPeriodEnd)
        .map(a => a.userId)
    );

    // Users who were active before the previous period
    const beforePreviousUsers = new Set(
      activities
        .filter(a => a.timestamp < previousPeriodStart)
        .map(a => a.userId)
    );

    const newUserCount = Array.from(currentUsers).filter(userId => 
      !previousUsers.has(userId) && !beforePreviousUsers.has(userId)
    ).length;

    const returningUserCount = Array.from(currentUsers).filter(userId => 
      previousUsers.has(userId)
    ).length;

    const churnedUserCount = Array.from(previousUsers).filter(userId => 
      !currentUsers.has(userId)
    ).length;

    const reactivatedUserCount = Array.from(currentUsers).filter(userId => 
      !previousUsers.has(userId) && beforePreviousUsers.has(userId)
    ).length;

    return {
      newUserCount,
      activeUserCount: currentUsers.size,
      returningUserCount,
      churnedUserCount,
      reactivatedUserCount
    };
  }

  static calculateRetentionTrends(activities: UserActivity[], periods: number = 12): {
    period: string;
    retentionRate: number;
    churnRate: number;
    userGrowth: number;
  }[] {
    const trends = [];
    const now = Date.now();

    for (let i = 0; i < periods; i++) {
      const currentStart = now - ((i + 1) * this.MONTH_MS);
      const currentEnd = now - (i * this.MONTH_MS);
      const previousStart = now - ((i + 2) * this.MONTH_MS);
      const previousEnd = now - ((i + 1) * this.MONTH_MS);

      const analytics = this.calculateRetentionAnalytics(
        activities, 
        currentStart, 
        currentEnd, 
        previousStart, 
        previousEnd
      );

      const previousTotalUsers = new Set(
        activities
          .filter(a => a.timestamp >= previousStart && a.timestamp <= previousEnd)
          .map(a => a.userId)
      ).size;

      const userGrowth = previousTotalUsers > 0 
        ? Math.round(((analytics.totalUsers - previousTotalUsers) / previousTotalUsers) * 100 * 100) / 100
        : 0;

      trends.push({
        period: new Date(currentStart).toISOString().substring(0, 7),
        retentionRate: analytics.retentionRate,
        churnRate: analytics.churnRate,
        userGrowth
      });
    }

    return trends.reverse(); // Return chronological order
  }
}

// Generators for property-based testing
const generateUserId = () => fc.string({ minLength: 5, maxLength: 20 });
const generateActivityType = () => fc.constantFrom('watching', 'browsing', 'livetv');

const generateUserActivity = (baseTime: number, timeRange: number) => 
  fc.record({
    userId: generateUserId(),
    timestamp: fc.integer({ min: baseTime - timeRange, max: baseTime }),
    activityType: generateActivityType(),
    sessionDuration: fc.integer({ min: 1, max: 300 }) // 1-300 minutes
  });

const generateUserActivities = (baseTime: number, timeRange: number) =>
  fc.array(generateUserActivity(baseTime, timeRange), { minLength: 0, maxLength: 500 });

describe('Retention and Churn Analytics', () => {
  test('Property 13: Retention and churn analytics - Rate consistency invariant', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 60 * 24 * 60 * 60 * 1000, max: Date.now() }),
        generateUserActivities(Date.now(), 60 * 24 * 60 * 60 * 1000),
        async (referenceTime, activities) => {
          const currentStart = referenceTime - (30 * 24 * 60 * 60 * 1000);
          const currentEnd = referenceTime;
          const previousStart = referenceTime - (60 * 24 * 60 * 60 * 1000);
          const previousEnd = referenceTime - (30 * 24 * 60 * 60 * 1000);

          const analytics = RetentionAnalyticsCalculator.calculateRetentionAnalytics(
            activities, currentStart, currentEnd, previousStart, previousEnd
          );
          
          // Property: Retention rate + churn rate should approximately equal 100%
          // (allowing for small rounding differences)
          const totalRate = analytics.retentionRate + analytics.churnRate;
          expect(totalRate).toBeGreaterThanOrEqual(0);
          expect(totalRate).toBeLessThanOrEqual(100.01); // Allow small rounding error
          
          // Property: All rates should be between 0 and 100
          expect(analytics.retentionRate).toBeGreaterThanOrEqual(0);
          expect(analytics.retentionRate).toBeLessThanOrEqual(100);
          expect(analytics.churnRate).toBeGreaterThanOrEqual(0);
          expect(analytics.churnRate).toBeLessThanOrEqual(100);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Retention and churn analytics - User count consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 60 * 24 * 60 * 60 * 1000, max: Date.now() }),
        generateUserActivities(Date.now(), 60 * 24 * 60 * 60 * 1000),
        async (referenceTime, activities) => {
          const currentStart = referenceTime - (30 * 24 * 60 * 60 * 1000);
          const currentEnd = referenceTime;
          const previousStart = referenceTime - (60 * 24 * 60 * 60 * 1000);
          const previousEnd = referenceTime - (30 * 24 * 60 * 60 * 1000);

          const analytics = RetentionAnalyticsCalculator.calculateRetentionAnalytics(
            activities, currentStart, currentEnd, previousStart, previousEnd
          );
          
          // Property: Total users should equal returning users + new users
          expect(analytics.totalUsers).toBe(analytics.returningUsers + analytics.newUsers);
          
          // Property: All user counts should be non-negative
          expect(analytics.totalUsers).toBeGreaterThanOrEqual(0);
          expect(analytics.returningUsers).toBeGreaterThanOrEqual(0);
          expect(analytics.newUsers).toBeGreaterThanOrEqual(0);
          expect(analytics.churnedUsers).toBeGreaterThanOrEqual(0);
          
          // Property: Returning users cannot exceed total users
          expect(analytics.returningUsers).toBeLessThanOrEqual(analytics.totalUsers);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Retention and churn analytics - Cohort retention monotonicity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 180 * 24 * 60 * 60 * 1000, max: Date.now() }),
        generateUserActivities(Date.now(), 180 * 24 * 60 * 60 * 1000),
        async (referenceTime, activities) => {
          const currentStart = referenceTime - (30 * 24 * 60 * 60 * 1000);
          const currentEnd = referenceTime;
          const previousStart = referenceTime - (60 * 24 * 60 * 60 * 1000);
          const previousEnd = referenceTime - (30 * 24 * 60 * 60 * 1000);

          const analytics = RetentionAnalyticsCalculator.calculateRetentionAnalytics(
            activities, currentStart, currentEnd, previousStart, previousEnd
          );
          
          // Property: Cohort retention should be monotonically decreasing over time
          analytics.cohortRetention.forEach(cohort => {
            expect(cohort.retainedAfter1Period).toBeLessThanOrEqual(cohort.initialUsers);
            expect(cohort.retainedAfter3Periods).toBeLessThanOrEqual(cohort.retainedAfter1Period);
            expect(cohort.retainedAfter6Periods).toBeLessThanOrEqual(cohort.retainedAfter3Periods);
            
            // Property: Retention rates should be monotonically decreasing
            expect(cohort.retentionRate1Period).toBeLessThanOrEqual(100);
            expect(cohort.retentionRate3Periods).toBeLessThanOrEqual(cohort.retentionRate1Period);
            expect(cohort.retentionRate6Periods).toBeLessThanOrEqual(cohort.retentionRate3Periods);
            
            // Property: All retention rates should be non-negative
            expect(cohort.retentionRate1Period).toBeGreaterThanOrEqual(0);
            expect(cohort.retentionRate3Periods).toBeGreaterThanOrEqual(0);
            expect(cohort.retentionRate6Periods).toBeGreaterThanOrEqual(0);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Retention and churn analytics - User lifecycle consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 90 * 24 * 60 * 60 * 1000, max: Date.now() }),
        generateUserActivities(Date.now(), 90 * 24 * 60 * 60 * 1000),
        async (referenceTime, activities) => {
          const currentStart = referenceTime - (30 * 24 * 60 * 60 * 1000);
          const currentEnd = referenceTime;
          const previousStart = referenceTime - (60 * 24 * 60 * 60 * 1000);
          const previousEnd = referenceTime - (30 * 24 * 60 * 60 * 1000);

          const analytics = RetentionAnalyticsCalculator.calculateRetentionAnalytics(
            activities, currentStart, currentEnd, previousStart, previousEnd
          );
          
          const lifecycle = analytics.userLifecycle;
          
          // Property: Active user count should equal the sum of user types
          const expectedActiveUsers = lifecycle.newUserCount + lifecycle.returningUserCount + lifecycle.reactivatedUserCount;
          expect(lifecycle.activeUserCount).toBe(expectedActiveUsers);
          
          // Property: All lifecycle metrics should be non-negative
          expect(lifecycle.newUserCount).toBeGreaterThanOrEqual(0);
          expect(lifecycle.activeUserCount).toBeGreaterThanOrEqual(0);
          expect(lifecycle.returningUserCount).toBeGreaterThanOrEqual(0);
          expect(lifecycle.churnedUserCount).toBeGreaterThanOrEqual(0);
          expect(lifecycle.reactivatedUserCount).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Retention and churn analytics - Empty data handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 60 * 24 * 60 * 60 * 1000, max: Date.now() }),
        async (referenceTime) => {
          const emptyActivities: UserActivity[] = [];
          const currentStart = referenceTime - (30 * 24 * 60 * 60 * 1000);
          const currentEnd = referenceTime;
          const previousStart = referenceTime - (60 * 24 * 60 * 60 * 1000);
          const previousEnd = referenceTime - (30 * 24 * 60 * 60 * 1000);

          const analytics = RetentionAnalyticsCalculator.calculateRetentionAnalytics(
            emptyActivities, currentStart, currentEnd, previousStart, previousEnd
          );
          
          // Property: Empty data should result in zero metrics
          expect(analytics.totalUsers).toBe(0);
          expect(analytics.returningUsers).toBe(0);
          expect(analytics.newUsers).toBe(0);
          expect(analytics.churnedUsers).toBe(0);
          expect(analytics.retentionRate).toBe(0);
          expect(analytics.churnRate).toBe(0);
          
          // Property: User lifecycle should also be zero
          expect(analytics.userLifecycle.activeUserCount).toBe(0);
          expect(analytics.userLifecycle.newUserCount).toBe(0);
          expect(analytics.userLifecycle.returningUserCount).toBe(0);
          expect(analytics.userLifecycle.churnedUserCount).toBe(0);
          expect(analytics.userLifecycle.reactivatedUserCount).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Retention and churn analytics - Retention trends consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateUserActivities(Date.now(), 365 * 24 * 60 * 60 * 1000),
        fc.integer({ min: 3, max: 12 }),
        async (activities, periods) => {
          const trends = RetentionAnalyticsCalculator.calculateRetentionTrends(activities, periods);
          
          // Property: Should return the requested number of periods
          expect(trends.length).toBe(periods);
          
          // Property: All trend values should be valid
          trends.forEach(trend => {
            expect(trend.retentionRate).toBeGreaterThanOrEqual(0);
            expect(trend.retentionRate).toBeLessThanOrEqual(100);
            expect(trend.churnRate).toBeGreaterThanOrEqual(0);
            expect(trend.churnRate).toBeLessThanOrEqual(100);
            expect(typeof trend.userGrowth).toBe('number');
            expect(trend.period).toMatch(/^\d{4}-\d{2}$/); // YYYY-MM format
          });
          
          // Property: Periods should be in chronological order
          for (let i = 1; i < trends.length; i++) {
            expect(trends[i].period > trends[i-1].period).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Retention and churn analytics - Single user behavior', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 90 * 24 * 60 * 60 * 1000, max: Date.now() }),
        generateUserId(),
        fc.boolean(),
        async (referenceTime, userId, activeInBothPeriods) => {
          const currentStart = referenceTime - (30 * 24 * 60 * 60 * 1000);
          const currentEnd = referenceTime;
          const previousStart = referenceTime - (60 * 24 * 60 * 60 * 1000);
          const previousEnd = referenceTime - (30 * 24 * 60 * 60 * 1000);

          const activities: UserActivity[] = [
            // Activity in previous period
            {
              userId,
              timestamp: previousStart + (10 * 24 * 60 * 60 * 1000),
              activityType: 'watching',
              sessionDuration: 60
            }
          ];

          // Conditionally add activity in current period
          if (activeInBothPeriods) {
            activities.push({
              userId,
              timestamp: currentStart + (10 * 24 * 60 * 60 * 1000),
              activityType: 'watching',
              sessionDuration: 45
            });
          }

          const analytics = RetentionAnalyticsCalculator.calculateRetentionAnalytics(
            activities, currentStart, currentEnd, previousStart, previousEnd
          );
          
          if (activeInBothPeriods) {
            // Property: User should be counted as returning
            expect(analytics.totalUsers).toBe(1);
            expect(analytics.returningUsers).toBe(1);
            expect(analytics.newUsers).toBe(0);
            expect(analytics.churnedUsers).toBe(0);
            expect(analytics.retentionRate).toBe(100);
            expect(analytics.churnRate).toBe(0);
          } else {
            // Property: User should be counted as churned
            expect(analytics.totalUsers).toBe(0);
            expect(analytics.returningUsers).toBe(0);
            expect(analytics.newUsers).toBe(0);
            expect(analytics.churnedUsers).toBe(1);
            expect(analytics.retentionRate).toBe(0);
            expect(analytics.churnRate).toBe(100);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 13: Retention and churn analytics - Multiple users scenario', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 90 * 24 * 60 * 60 * 1000, max: Date.now() }),
        fc.array(generateUserId(), { minLength: 2, maxLength: 10 }),
        fc.float({ min: 0, max: 1 }),
        async (referenceTime, userIds, retentionProbability) => {
          const currentStart = referenceTime - (30 * 24 * 60 * 60 * 1000);
          const currentEnd = referenceTime;
          const previousStart = referenceTime - (60 * 24 * 60 * 60 * 1000);
          const previousEnd = referenceTime - (30 * 24 * 60 * 60 * 1000);

          const activities: UserActivity[] = [];
          let expectedReturning = 0;
          let expectedChurned = 0;

          // All users have activity in previous period
          userIds.forEach(userId => {
            activities.push({
              userId,
              timestamp: previousStart + (10 * 24 * 60 * 60 * 1000),
              activityType: 'watching',
              sessionDuration: 60
            });

            // Some users continue to current period based on retention probability
            if (Math.random() < retentionProbability) {
              activities.push({
                userId,
                timestamp: currentStart + (10 * 24 * 60 * 60 * 1000),
                activityType: 'browsing',
                sessionDuration: 30
              });
              expectedReturning++;
            } else {
              expectedChurned++;
            }
          });

          const analytics = RetentionAnalyticsCalculator.calculateRetentionAnalytics(
            activities, currentStart, currentEnd, previousStart, previousEnd
          );
          
          // Property: User counts should match expected values
          expect(analytics.totalUsers).toBe(expectedReturning);
          expect(analytics.returningUsers).toBe(expectedReturning);
          expect(analytics.newUsers).toBe(0);
          expect(analytics.churnedUsers).toBe(expectedChurned);
          
          // Property: Total previous users should equal returning + churned
          expect(userIds.length).toBe(analytics.returningUsers + analytics.churnedUsers);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});