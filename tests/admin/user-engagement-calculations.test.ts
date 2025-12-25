/**
 * Property-Based Tests for User Engagement Calculations
 * Feature: admin-panel-unified-refactor, Property 12: User engagement calculations
 * Validates: Requirements 5.3
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Mock user session data structure
interface UserSession {
  userId: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  contentId: string;
  contentType: 'movie' | 'tv';
  contentDuration: number; // in minutes
  watchTime: number; // in minutes
  pauseCount: number;
  seekCount: number;
  completed: boolean;
  completionPercentage: number;
}

// User engagement metrics structure
interface UserEngagementMetrics {
  totalWatchTime: number;
  avgCompletion: number;
  completedCount: number;
  totalPauses: number;
  totalSeeks: number;
  daysActive: number;
  currentStreak: number;
  engagementScore: number;
}

// User engagement calculation functions
class UserEngagementCalculator {
  static calculateEngagementMetrics(sessions: UserSession[], referenceTime: number): UserEngagementMetrics {
    if (sessions.length === 0) {
      return {
        totalWatchTime: 0,
        avgCompletion: 0,
        completedCount: 0,
        totalPauses: 0,
        totalSeeks: 0,
        daysActive: 0,
        currentStreak: 0,
        engagementScore: 0
      };
    }

    const totalWatchTime = sessions.reduce((sum, session) => sum + (session.watchTime || 0), 0);
    const completedCount = sessions.filter(session => session.completed).length;
    
    // Handle NaN values in completion percentage
    const validCompletions = sessions
      .map(session => session.completionPercentage || 0)
      .filter(completion => !isNaN(completion) && isFinite(completion));
    
    const avgCompletion = validCompletions.length > 0 
      ? validCompletions.reduce((sum, completion) => sum + completion, 0) / validCompletions.length 
      : 0;
    
    const totalPauses = sessions.reduce((sum, session) => sum + (session.pauseCount || 0), 0);
    const totalSeeks = sessions.reduce((sum, session) => sum + (session.seekCount || 0), 0);

    // Calculate days active (unique days with sessions)
    const uniqueDays = new Set(
      sessions.map(session => Math.floor((session.startTime || 0) / (24 * 60 * 60 * 1000)))
    );
    const daysActive = uniqueDays.size;

    // Calculate current streak (consecutive days with activity leading up to reference time)
    const sortedDays = Array.from(uniqueDays).sort((a, b) => b - a);
    const referenceDayNumber = Math.floor(referenceTime / (24 * 60 * 60 * 1000));
    let currentStreak = 0;
    
    for (let i = 0; i < sortedDays.length; i++) {
      const expectedDay = referenceDayNumber - i;
      if (sortedDays[i] === expectedDay) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate engagement score (0-100 based on multiple factors)
    const avgSessionLength = sessions.length > 0 ? totalWatchTime / sessions.length : 0;
    const completionRate = sessions.length > 0 ? completedCount / sessions.length : 0;
    const interactionRate = sessions.length > 0 ? (totalPauses + totalSeeks) / sessions.length : 0;
    
    // Ensure all values are valid numbers before calculation
    const safeAvgCompletion = isNaN(avgCompletion) || !isFinite(avgCompletion) ? 0 : avgCompletion;
    const safeCompletionRate = isNaN(completionRate) || !isFinite(completionRate) ? 0 : completionRate;
    const safeAvgSessionLength = isNaN(avgSessionLength) || !isFinite(avgSessionLength) ? 0 : avgSessionLength;
    const safeInteractionRate = isNaN(interactionRate) || !isFinite(interactionRate) ? 0 : interactionRate;
    
    const engagementScore = Math.min(100, Math.max(0, Math.round(
      (safeAvgCompletion * 0.4) + 
      (safeCompletionRate * 100 * 0.3) + 
      (Math.min(safeAvgSessionLength / 60, 1) * 100 * 0.2) + 
      (Math.min(safeInteractionRate / 10, 1) * 100 * 0.1)
    )));

    return {
      totalWatchTime: Math.round(totalWatchTime),
      avgCompletion: Math.round(safeAvgCompletion * 100) / 100,
      completedCount,
      totalPauses,
      totalSeeks,
      daysActive,
      currentStreak,
      engagementScore: isNaN(engagementScore) || !isFinite(engagementScore) ? 0 : engagementScore
    };
  }

  static calculateBehavioralPatterns(sessions: UserSession[]): {
    preferredContentType: 'movie' | 'tv' | 'mixed';
    avgSessionDuration: number;
    peakActivityHour: number;
    bingeBehavior: boolean;
  } {
    if (sessions.length === 0) {
      return {
        preferredContentType: 'mixed',
        avgSessionDuration: 0,
        peakActivityHour: 0,
        bingeBehavior: false
      };
    }

    const movieSessions = sessions.filter(s => s.contentType === 'movie').length;
    const tvSessions = sessions.filter(s => s.contentType === 'tv').length;
    
    let preferredContentType: 'movie' | 'tv' | 'mixed';
    if (movieSessions > tvSessions * 1.5) {
      preferredContentType = 'movie';
    } else if (tvSessions > movieSessions * 1.5) {
      preferredContentType = 'tv';
    } else {
      preferredContentType = 'mixed';
    }

    const avgSessionDuration = sessions.reduce((sum, s) => sum + s.watchTime, 0) / sessions.length;

    // Calculate peak activity hour
    const hourCounts = new Array(24).fill(0);
    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourCounts[hour]++;
    });
    const peakActivityHour = hourCounts.indexOf(Math.max(...hourCounts));

    // Detect binge behavior (multiple sessions in short time periods)
    const sortedSessions = sessions.sort((a, b) => a.startTime - b.startTime);
    let bingeCount = 0;
    for (let i = 1; i < sortedSessions.length; i++) {
      const timeDiff = sortedSessions[i].startTime - sortedSessions[i-1].endTime;
      if (timeDiff < 30 * 60 * 1000) { // Less than 30 minutes between sessions
        bingeCount++;
      }
    }
    const bingeBehavior = bingeCount > sessions.length * 0.3; // 30% of sessions are part of binges

    return {
      preferredContentType,
      avgSessionDuration: Math.round(avgSessionDuration),
      peakActivityHour,
      bingeBehavior
    };
  }
}

// Generators for property-based testing
const generateUserId = () => fc.string({ minLength: 5, maxLength: 20 });
const generateSessionId = () => fc.string({ minLength: 10, maxLength: 30 });
const generateContentId = () => fc.string({ minLength: 5, maxLength: 15 });
const generateContentType = () => fc.constantFrom('movie', 'tv');

const generateUserSession = (baseTime: number, timeRange: number) => 
  fc.record({
    userId: generateUserId(),
    sessionId: generateSessionId(),
    startTime: fc.integer({ min: baseTime - timeRange, max: baseTime }),
    contentId: generateContentId(),
    contentType: generateContentType(),
    contentDuration: fc.integer({ min: 30, max: 180 }), // 30-180 minutes
    watchTime: fc.integer({ min: 1, max: 180 }),
    pauseCount: fc.integer({ min: 0, max: 20 }),
    seekCount: fc.integer({ min: 0, max: 50 }),
    completed: fc.boolean(),
    completionPercentage: fc.float({ min: 0, max: 100 })
  }).map(session => ({
    ...session,
    endTime: session.startTime + (session.watchTime * 60 * 1000),
    // Ensure completion percentage is consistent with completed flag and not NaN
    completionPercentage: session.completed ? 
      Math.max(session.completionPercentage || 90, 90) : 
      Math.min(session.completionPercentage || 50, 95)
  }));

const generateUserSessions = (baseTime: number, timeRange: number) =>
  fc.array(generateUserSession(baseTime, timeRange), { minLength: 0, maxLength: 100 });

describe('User Engagement Calculations', () => {
  test('Property 12: User engagement calculations - Non-negative metrics invariant', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }),
        generateUserSessions(Date.now(), 30 * 24 * 60 * 60 * 1000),
        async (referenceTime, sessions) => {
          const metrics = UserEngagementCalculator.calculateEngagementMetrics(sessions, referenceTime);
          
          // Property: All engagement metrics should be non-negative
          expect(metrics.totalWatchTime).toBeGreaterThanOrEqual(0);
          expect(metrics.avgCompletion).toBeGreaterThanOrEqual(0);
          expect(metrics.completedCount).toBeGreaterThanOrEqual(0);
          expect(metrics.totalPauses).toBeGreaterThanOrEqual(0);
          expect(metrics.totalSeeks).toBeGreaterThanOrEqual(0);
          expect(metrics.daysActive).toBeGreaterThanOrEqual(0);
          expect(metrics.currentStreak).toBeGreaterThanOrEqual(0);
          expect(metrics.engagementScore).toBeGreaterThanOrEqual(0);
          expect(metrics.engagementScore).toBeLessThanOrEqual(100);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: User engagement calculations - Completion consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }),
        generateUserSessions(Date.now(), 30 * 24 * 60 * 60 * 1000),
        async (referenceTime, sessions) => {
          const metrics = UserEngagementCalculator.calculateEngagementMetrics(sessions, referenceTime);
          const actualCompletedCount = sessions.filter(s => s.completed).length;
          
          // Property: Completed count should match the actual number of completed sessions
          expect(metrics.completedCount).toBe(actualCompletedCount);
          
          // Property: Completed count should never exceed total sessions
          expect(metrics.completedCount).toBeLessThanOrEqual(sessions.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: User engagement calculations - Watch time aggregation accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }),
        generateUserSessions(Date.now(), 30 * 24 * 60 * 60 * 1000),
        async (referenceTime, sessions) => {
          const metrics = UserEngagementCalculator.calculateEngagementMetrics(sessions, referenceTime);
          const expectedTotalWatchTime = sessions.reduce((sum, s) => sum + s.watchTime, 0);
          
          // Property: Total watch time should equal sum of all session watch times
          expect(metrics.totalWatchTime).toBe(Math.round(expectedTotalWatchTime));
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: User engagement calculations - Interaction count accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }),
        generateUserSessions(Date.now(), 30 * 24 * 60 * 60 * 1000),
        async (referenceTime, sessions) => {
          const metrics = UserEngagementCalculator.calculateEngagementMetrics(sessions, referenceTime);
          const expectedTotalPauses = sessions.reduce((sum, s) => sum + s.pauseCount, 0);
          const expectedTotalSeeks = sessions.reduce((sum, s) => sum + s.seekCount, 0);
          
          // Property: Total pauses and seeks should equal sum of all session interactions
          expect(metrics.totalPauses).toBe(expectedTotalPauses);
          expect(metrics.totalSeeks).toBe(expectedTotalSeeks);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: User engagement calculations - Days active calculation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }),
        fc.array(fc.integer({ min: 0, max: 29 }), { minLength: 1, maxLength: 30 }),
        generateUserId(),
        async (referenceTime, dayOffsets, userId) => {
          // Remove duplicates to ensure unique days
          const uniqueDayOffsets = [...new Set(dayOffsets)];
          
          // Create sessions on specific unique days
          const sessions: UserSession[] = uniqueDayOffsets.map((dayOffset, index) => ({
            userId,
            sessionId: `session_${index}`,
            startTime: referenceTime - (dayOffset * 24 * 60 * 60 * 1000),
            endTime: referenceTime - (dayOffset * 24 * 60 * 60 * 1000) + (60 * 60 * 1000),
            contentId: `content_${index}`,
            contentType: index % 2 === 0 ? 'movie' : 'tv',
            contentDuration: 90,
            watchTime: 45,
            pauseCount: 2,
            seekCount: 5,
            completed: true,
            completionPercentage: 95
          }));

          const metrics = UserEngagementCalculator.calculateEngagementMetrics(sessions, referenceTime);
          
          // Property: Days active should equal the number of unique days with sessions
          expect(metrics.daysActive).toBe(uniqueDayOffsets.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: User engagement calculations - Current streak calculation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 10 * 24 * 60 * 60 * 1000, max: Date.now() }),
        fc.integer({ min: 1, max: 7 }),
        generateUserId(),
        async (referenceTime, streakLength, userId) => {
          // Create sessions for consecutive days leading up to reference time
          const sessions: UserSession[] = [];
          for (let i = 0; i < streakLength; i++) {
            sessions.push({
              userId,
              sessionId: `session_${i}`,
              startTime: referenceTime - (i * 24 * 60 * 60 * 1000),
              endTime: referenceTime - (i * 24 * 60 * 60 * 1000) + (60 * 60 * 1000),
              contentId: `content_${i}`,
              contentType: i % 2 === 0 ? 'movie' : 'tv',
              contentDuration: 90,
              watchTime: 45,
              pauseCount: 1,
              seekCount: 3,
              completed: true,
              completionPercentage: 90
            });
          }

          const metrics = UserEngagementCalculator.calculateEngagementMetrics(sessions, referenceTime);
          
          // Property: Current streak should equal the number of consecutive days with activity
          expect(metrics.currentStreak).toBe(streakLength);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: User engagement calculations - Empty sessions handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }),
        async (referenceTime) => {
          const emptySessions: UserSession[] = [];
          const metrics = UserEngagementCalculator.calculateEngagementMetrics(emptySessions, referenceTime);
          
          // Property: Empty sessions should result in zero metrics
          expect(metrics.totalWatchTime).toBe(0);
          expect(metrics.avgCompletion).toBe(0);
          expect(metrics.completedCount).toBe(0);
          expect(metrics.totalPauses).toBe(0);
          expect(metrics.totalSeeks).toBe(0);
          expect(metrics.daysActive).toBe(0);
          expect(metrics.currentStreak).toBe(0);
          expect(metrics.engagementScore).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: User engagement calculations - Behavioral pattern consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateUserSessions(Date.now(), 30 * 24 * 60 * 60 * 1000),
        async (sessions) => {
          const patterns = UserEngagementCalculator.calculateBehavioralPatterns(sessions);
          
          if (sessions.length === 0) {
            expect(patterns.avgSessionDuration).toBe(0);
            expect(patterns.preferredContentType).toBe('mixed');
            return true;
          }

          // Property: Average session duration should be non-negative
          expect(patterns.avgSessionDuration).toBeGreaterThanOrEqual(0);
          
          // Property: Peak activity hour should be valid (0-23)
          expect(patterns.peakActivityHour).toBeGreaterThanOrEqual(0);
          expect(patterns.peakActivityHour).toBeLessThanOrEqual(23);
          
          // Property: Preferred content type should be one of the valid options
          expect(['movie', 'tv', 'mixed']).toContain(patterns.preferredContentType);
          
          // Property: Binge behavior should be boolean
          expect(typeof patterns.bingeBehavior).toBe('boolean');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: User engagement calculations - Engagement score bounds and consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }),
        generateUserSessions(Date.now(), 30 * 24 * 60 * 60 * 1000),
        async (referenceTime, sessions) => {
          const metrics = UserEngagementCalculator.calculateEngagementMetrics(sessions, referenceTime);
          
          // Property: Engagement score should always be between 0 and 100
          expect(metrics.engagementScore).toBeGreaterThanOrEqual(0);
          expect(metrics.engagementScore).toBeLessThanOrEqual(100);
          
          // Property: Higher completion rates should generally lead to higher engagement scores
          // (when other factors are similar)
          if (sessions.length > 0) {
            const avgCompletion = sessions.reduce((sum, s) => sum + s.completionPercentage, 0) / sessions.length;
            if (avgCompletion > 80) {
              expect(metrics.engagementScore).toBeGreaterThan(0);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});