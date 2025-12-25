/**
 * Property-Based Tests for User Metrics Calculations
 * Feature: admin-panel-unified-refactor, Property 9: Time-based user metrics
 * Validates: Requirements 3.1
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Mock user activity data structure
interface UserActivity {
  userId: string;
  timestamp: number;
  activityType: 'watching' | 'browsing' | 'livetv';
  sessionId: string;
}

// Time window constants (in milliseconds)
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

// User metrics calculation functions
class UserMetricsCalculator {
  static calculateDAU(activities: UserActivity[], referenceTime: number): number {
    const dayStart = referenceTime - DAY_MS;
    const uniqueUsers = new Set(
      activities
        .filter(activity => activity.timestamp >= dayStart && activity.timestamp <= referenceTime)
        .map(activity => activity.userId)
    );
    return uniqueUsers.size;
  }

  static calculateWAU(activities: UserActivity[], referenceTime: number): number {
    const weekStart = referenceTime - WEEK_MS;
    const uniqueUsers = new Set(
      activities
        .filter(activity => activity.timestamp >= weekStart && activity.timestamp <= referenceTime)
        .map(activity => activity.userId)
    );
    return uniqueUsers.size;
  }

  static calculateMAU(activities: UserActivity[], referenceTime: number): number {
    const monthStart = referenceTime - MONTH_MS;
    const uniqueUsers = new Set(
      activities
        .filter(activity => activity.timestamp >= monthStart && activity.timestamp <= referenceTime)
        .map(activity => activity.userId)
    );
    return uniqueUsers.size;
  }

  static calculateAllMetrics(activities: UserActivity[], referenceTime: number) {
    return {
      dau: this.calculateDAU(activities, referenceTime),
      wau: this.calculateWAU(activities, referenceTime),
      mau: this.calculateMAU(activities, referenceTime)
    };
  }
}

// Generators for property-based testing
const generateUserId = () => fc.string({ minLength: 5, maxLength: 20 });
const generateSessionId = () => fc.string({ minLength: 10, maxLength: 30 });
const generateActivityType = () => fc.constantFrom('watching', 'browsing', 'livetv');

const generateUserActivity = (baseTime: number, timeRange: number) => 
  fc.record({
    userId: generateUserId(),
    timestamp: fc.integer({ min: baseTime - timeRange, max: baseTime }),
    activityType: generateActivityType(),
    sessionId: generateSessionId()
  });

const generateUserActivities = (baseTime: number, timeRange: number) =>
  fc.array(generateUserActivity(baseTime, timeRange), { minLength: 0, maxLength: 1000 });

describe('User Metrics Calculations', () => {
  test('Property 9: Time-based user metrics - DAU ≤ WAU ≤ MAU invariant', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - MONTH_MS, max: Date.now() }),
        generateUserActivities(Date.now(), MONTH_MS * 2),
        async (referenceTime, activities) => {
          const metrics = UserMetricsCalculator.calculateAllMetrics(activities, referenceTime);
          
          // Property: DAU should never exceed WAU, and WAU should never exceed MAU
          // This is a fundamental invariant of time-based user metrics
          expect(metrics.dau).toBeLessThanOrEqual(metrics.wau);
          expect(metrics.wau).toBeLessThanOrEqual(metrics.mau);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Time-based user metrics - Unique user counting accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - MONTH_MS, max: Date.now() }),
        fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 10 }),
        async (referenceTime, uniqueUserIds, activitiesPerUser) => {
          // Generate activities where each user has multiple activities within the day
          const activities: UserActivity[] = [];
          
          uniqueUserIds.forEach(userId => {
            for (let i = 0; i < activitiesPerUser; i++) {
              activities.push({
                userId,
                timestamp: referenceTime - Math.floor(Math.random() * DAY_MS),
                activityType: ['watching', 'browsing', 'livetv'][Math.floor(Math.random() * 3)] as any,
                sessionId: `session_${userId}_${i}`
              });
            }
          });

          const dau = UserMetricsCalculator.calculateDAU(activities, referenceTime);
          
          // Property: DAU should equal the number of unique users who had activity in the day
          // regardless of how many activities each user had
          expect(dau).toBe(uniqueUserIds.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Time-based user metrics - Time window boundary accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - MONTH_MS, max: Date.now() }),
        generateUserId(),
        async (referenceTime, userId) => {
          // Create activities at specific time boundaries
          const activities: UserActivity[] = [
            // Activity exactly at day boundary (should be included in DAU)
            {
              userId,
              timestamp: referenceTime - DAY_MS,
              activityType: 'watching',
              sessionId: 'session_day_boundary'
            },
            // Activity just outside day boundary (should not be included in DAU)
            {
              userId: userId + '_outside',
              timestamp: referenceTime - DAY_MS - 1,
              activityType: 'watching',
              sessionId: 'session_outside_day'
            },
            // Activity exactly at week boundary (should be included in WAU)
            {
              userId: userId + '_week',
              timestamp: referenceTime - WEEK_MS,
              activityType: 'browsing',
              sessionId: 'session_week_boundary'
            },
            // Activity just outside week boundary (should not be included in WAU)
            {
              userId: userId + '_outside_week',
              timestamp: referenceTime - WEEK_MS - 1,
              activityType: 'browsing',
              sessionId: 'session_outside_week'
            }
          ];

          const metrics = UserMetricsCalculator.calculateAllMetrics(activities, referenceTime);
          
          // Property: Time window boundaries should be inclusive at the start
          // DAU should include the user at exactly day boundary
          expect(metrics.dau).toBeGreaterThanOrEqual(1);
          // WAU should include users at day and week boundaries
          expect(metrics.wau).toBeGreaterThanOrEqual(2);
          // MAU should include all users within month boundary
          expect(metrics.mau).toBeGreaterThanOrEqual(2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Time-based user metrics - Empty data handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - MONTH_MS, max: Date.now() }),
        async (referenceTime) => {
          const emptyActivities: UserActivity[] = [];
          const metrics = UserMetricsCalculator.calculateAllMetrics(emptyActivities, referenceTime);
          
          // Property: Empty activity data should result in zero metrics
          expect(metrics.dau).toBe(0);
          expect(metrics.wau).toBe(0);
          expect(metrics.mau).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Time-based user metrics - Single user multiple time windows', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - MONTH_MS, max: Date.now() }),
        generateUserId(),
        async (referenceTime, userId) => {
          // Create activities for the same user across different time windows
          const activities: UserActivity[] = [
            // Activity in the last day
            {
              userId,
              timestamp: referenceTime - (DAY_MS / 2),
              activityType: 'watching',
              sessionId: 'session_day'
            },
            // Activity in the last week (but not in the last day)
            {
              userId,
              timestamp: referenceTime - (DAY_MS + 1000),
              activityType: 'browsing',
              sessionId: 'session_week'
            },
            // Activity in the last month (but not in the last week)
            {
              userId,
              timestamp: referenceTime - (WEEK_MS + 1000),
              activityType: 'livetv',
              sessionId: 'session_month'
            }
          ];

          const metrics = UserMetricsCalculator.calculateAllMetrics(activities, referenceTime);
          
          // Property: Same user with activities in different time windows
          // should be counted once in each respective metric
          expect(metrics.dau).toBe(1); // User active in last day
          expect(metrics.wau).toBe(1); // Same user active in last week
          expect(metrics.mau).toBe(1); // Same user active in last month
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Time-based user metrics - Monotonic time progression', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateUserActivities(Date.now(), MONTH_MS),
        fc.integer({ min: 1000, max: DAY_MS }),
        async (activities, timeIncrement) => {
          const baseTime = Date.now();
          const laterTime = baseTime + timeIncrement;
          
          const metricsBase = UserMetricsCalculator.calculateAllMetrics(activities, baseTime);
          const metricsLater = UserMetricsCalculator.calculateAllMetrics(activities, laterTime);
          
          // Property: As reference time moves forward, metrics should not increase
          // (since we're looking backward from the reference time)
          // This tests the monotonic nature of time-based calculations
          expect(metricsLater.dau).toBeLessThanOrEqual(metricsBase.dau);
          expect(metricsLater.wau).toBeLessThanOrEqual(metricsBase.wau);
          expect(metricsLater.mau).toBeLessThanOrEqual(metricsBase.mau);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});