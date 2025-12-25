/**
 * Unit Tests for Content Analytics Calculations
 * Tests watch time aggregations and completion rate calculations
 * Tests ranking algorithm edge cases
 * Requirements: 4.2, 4.4
 */

import { describe, test, expect } from 'bun:test';

// Content analytics data structures
interface WatchSession {
  id: string;
  contentId: string;
  contentTitle: string;
  contentType: 'movie' | 'tv_show';
  userId: string;
  startedAt: number;
  endedAt?: number;
  totalWatchTime: number; // in seconds
  duration: number; // content duration in seconds
  completionPercentage: number;
  isCompleted: boolean;
  pauseCount: number;
  seekCount: number;
}

interface ContentAnalyticsResult {
  totalSessions: number;
  totalWatchTime: number; // in minutes
  averageWatchTime: number; // in minutes
  completionRate: number; // percentage
  averageCompletionRate: number; // percentage
  completedSessions: number;
  totalPauses: number;
  totalSeeks: number;
  uniqueContent: number;
  movieSessions: number;
  tvSessions: number;
}

// Content analytics calculation service
class ContentAnalyticsCalculator {
  static calculateAnalytics(sessions: WatchSession[]): ContentAnalyticsResult {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalWatchTime: 0,
        averageWatchTime: 0,
        completionRate: 0,
        averageCompletionRate: 0,
        completedSessions: 0,
        totalPauses: 0,
        totalSeeks: 0,
        uniqueContent: 0,
        movieSessions: 0,
        tvSessions: 0,
      };
    }

    const totalSessions = sessions.length;
    const totalWatchTimeSeconds = sessions.reduce((sum, session) => sum + session.totalWatchTime, 0);
    const totalWatchTime = Math.round(totalWatchTimeSeconds / 60); // Convert to minutes
    const averageWatchTime = Math.round(totalWatchTime / totalSessions);
    
    const completedSessions = sessions.filter(session => session.isCompleted).length;
    const completionRate = Math.round((completedSessions / totalSessions) * 100);
    
    const totalCompletionPercentage = sessions.reduce((sum, session) => sum + session.completionPercentage, 0);
    const averageCompletionRate = Math.round(totalCompletionPercentage / totalSessions);
    
    const totalPauses = sessions.reduce((sum, session) => sum + session.pauseCount, 0);
    const totalSeeks = sessions.reduce((sum, session) => sum + session.seekCount, 0);
    
    const uniqueContentIds = new Set(sessions.map(session => session.contentId));
    const uniqueContent = uniqueContentIds.size;
    
    const movieSessions = sessions.filter(session => session.contentType === 'movie').length;
    const tvSessions = sessions.filter(session => session.contentType === 'tv_show').length;

    return {
      totalSessions,
      totalWatchTime,
      averageWatchTime,
      completionRate,
      averageCompletionRate,
      completedSessions,
      totalPauses,
      totalSeeks,
      uniqueContent,
      movieSessions,
      tvSessions,
    };
  }

  static calculateWatchTimeByContent(sessions: WatchSession[]): Array<{
    contentId: string;
    contentTitle: string;
    contentType: string;
    totalWatchTime: number; // in minutes
    sessionCount: number;
    averageWatchTime: number;
    completionRate: number;
  }> {
    const contentMap = new Map<string, WatchSession[]>();
    
    // Group sessions by content
    sessions.forEach(session => {
      if (!contentMap.has(session.contentId)) {
        contentMap.set(session.contentId, []);
      }
      contentMap.get(session.contentId)!.push(session);
    });

    const results = [];
    for (const [contentId, contentSessions] of contentMap) {
      const totalWatchTimeSeconds = contentSessions.reduce((sum, session) => sum + session.totalWatchTime, 0);
      const totalWatchTime = Math.round(totalWatchTimeSeconds / 60);
      const sessionCount = contentSessions.length;
      const averageWatchTime = Math.round(totalWatchTime / sessionCount);
      const completedCount = contentSessions.filter(session => session.isCompleted).length;
      const completionRate = Math.round((completedCount / sessionCount) * 100);

      results.push({
        contentId,
        contentTitle: contentSessions[0].contentTitle,
        contentType: contentSessions[0].contentType,
        totalWatchTime,
        sessionCount,
        averageWatchTime,
        completionRate,
      });
    }

    return results.sort((a, b) => b.totalWatchTime - a.totalWatchTime);
  }

  static calculateCompletionRateDistribution(sessions: WatchSession[]): {
    '0-25%': number;
    '25-50%': number;
    '50-75%': number;
    '75-100%': number;
  } {
    const distribution = {
      '0-25%': 0,
      '25-50%': 0,
      '50-75%': 0,
      '75-100%': 0,
    };

    sessions.forEach(session => {
      const completion = session.completionPercentage;
      if (completion < 25) {
        distribution['0-25%']++;
      } else if (completion < 50) {
        distribution['25-50%']++;
      } else if (completion < 75) {
        distribution['50-75%']++;
      } else {
        distribution['75-100%']++;
      }
    });

    return distribution;
  }
}

describe('Content Analytics Calculations', () => {
  describe('Watch Time Aggregations', () => {
    test('should calculate total watch time correctly', () => {
      const sessions: WatchSession[] = [
        {
          id: '1',
          contentId: 'movie1',
          contentTitle: 'Test Movie',
          contentType: 'movie',
          userId: 'user1',
          startedAt: Date.now(),
          totalWatchTime: 3600, // 1 hour in seconds
          duration: 7200, // 2 hours
          completionPercentage: 50,
          isCompleted: false,
          pauseCount: 2,
          seekCount: 1,
        },
        {
          id: '2',
          contentId: 'movie1',
          contentTitle: 'Test Movie',
          contentType: 'movie',
          userId: 'user2',
          startedAt: Date.now(),
          totalWatchTime: 1800, // 30 minutes in seconds
          duration: 7200,
          completionPercentage: 25,
          isCompleted: false,
          pauseCount: 1,
          seekCount: 0,
        },
      ];

      const analytics = ContentAnalyticsCalculator.calculateAnalytics(sessions);
      
      // Total watch time should be 90 minutes (3600 + 1800 seconds = 5400 seconds = 90 minutes)
      expect(analytics.totalWatchTime).toBe(90);
      expect(analytics.averageWatchTime).toBe(45); // 90 / 2 sessions
      expect(analytics.totalSessions).toBe(2);
    });

    test('should handle empty sessions array', () => {
      const analytics = ContentAnalyticsCalculator.calculateAnalytics([]);
      
      expect(analytics.totalSessions).toBe(0);
      expect(analytics.totalWatchTime).toBe(0);
      expect(analytics.averageWatchTime).toBe(0);
      expect(analytics.completionRate).toBe(0);
      expect(analytics.averageCompletionRate).toBe(0);
      expect(analytics.completedSessions).toBe(0);
      expect(analytics.totalPauses).toBe(0);
      expect(analytics.totalSeeks).toBe(0);
      expect(analytics.uniqueContent).toBe(0);
      expect(analytics.movieSessions).toBe(0);
      expect(analytics.tvSessions).toBe(0);
    });

    test('should calculate watch time by content correctly', () => {
      const sessions: WatchSession[] = [
        {
          id: '1',
          contentId: 'movie1',
          contentTitle: 'Popular Movie',
          contentType: 'movie',
          userId: 'user1',
          startedAt: Date.now(),
          totalWatchTime: 7200, // 2 hours
          duration: 7200,
          completionPercentage: 100,
          isCompleted: true,
          pauseCount: 0,
          seekCount: 0,
        },
        {
          id: '2',
          contentId: 'movie1',
          contentTitle: 'Popular Movie',
          contentType: 'movie',
          userId: 'user2',
          startedAt: Date.now(),
          totalWatchTime: 3600, // 1 hour
          duration: 7200,
          completionPercentage: 50,
          isCompleted: false,
          pauseCount: 2,
          seekCount: 1,
        },
        {
          id: '3',
          contentId: 'tv1',
          contentTitle: 'TV Show Episode',
          contentType: 'tv_show',
          userId: 'user1',
          startedAt: Date.now(),
          totalWatchTime: 1800, // 30 minutes
          duration: 1800,
          completionPercentage: 100,
          isCompleted: true,
          pauseCount: 0,
          seekCount: 0,
        },
      ];

      const contentAnalytics = ContentAnalyticsCalculator.calculateWatchTimeByContent(sessions);
      
      expect(contentAnalytics).toHaveLength(2);
      
      // Should be sorted by total watch time (descending)
      expect(contentAnalytics[0].contentId).toBe('movie1');
      expect(contentAnalytics[0].totalWatchTime).toBe(180); // (7200 + 3600) / 60 = 180 minutes
      expect(contentAnalytics[0].sessionCount).toBe(2);
      expect(contentAnalytics[0].averageWatchTime).toBe(90); // 180 / 2
      expect(contentAnalytics[0].completionRate).toBe(50); // 1 completed out of 2 sessions
      
      expect(contentAnalytics[1].contentId).toBe('tv1');
      expect(contentAnalytics[1].totalWatchTime).toBe(30); // 1800 / 60 = 30 minutes
      expect(contentAnalytics[1].sessionCount).toBe(1);
      expect(contentAnalytics[1].averageWatchTime).toBe(30);
      expect(contentAnalytics[1].completionRate).toBe(100); // 1 completed out of 1 session
    });

    test('should handle single session correctly', () => {
      const sessions: WatchSession[] = [
        {
          id: '1',
          contentId: 'movie1',
          contentTitle: 'Single Movie',
          contentType: 'movie',
          userId: 'user1',
          startedAt: Date.now(),
          totalWatchTime: 5400, // 90 minutes in seconds
          duration: 7200, // 2 hours
          completionPercentage: 75,
          isCompleted: false,
          pauseCount: 3,
          seekCount: 2,
        },
      ];

      const analytics = ContentAnalyticsCalculator.calculateAnalytics(sessions);
      
      expect(analytics.totalSessions).toBe(1);
      expect(analytics.totalWatchTime).toBe(90);
      expect(analytics.averageWatchTime).toBe(90);
      expect(analytics.completionRate).toBe(0); // Not completed
      expect(analytics.averageCompletionRate).toBe(75);
      expect(analytics.completedSessions).toBe(0);
      expect(analytics.totalPauses).toBe(3);
      expect(analytics.totalSeeks).toBe(2);
      expect(analytics.uniqueContent).toBe(1);
      expect(analytics.movieSessions).toBe(1);
      expect(analytics.tvSessions).toBe(0);
    });
  });

  describe('Completion Rate Calculations', () => {
    test('should calculate completion rate correctly', () => {
      const sessions: WatchSession[] = [
        {
          id: '1',
          contentId: 'content1',
          contentTitle: 'Content 1',
          contentType: 'movie',
          userId: 'user1',
          startedAt: Date.now(),
          totalWatchTime: 7200,
          duration: 7200,
          completionPercentage: 100,
          isCompleted: true,
          pauseCount: 0,
          seekCount: 0,
        },
        {
          id: '2',
          contentId: 'content2',
          contentTitle: 'Content 2',
          contentType: 'movie',
          userId: 'user2',
          startedAt: Date.now(),
          totalWatchTime: 3600,
          duration: 7200,
          completionPercentage: 50,
          isCompleted: false,
          pauseCount: 1,
          seekCount: 1,
        },
        {
          id: '3',
          contentId: 'content3',
          contentTitle: 'Content 3',
          contentType: 'tv_show',
          userId: 'user3',
          startedAt: Date.now(),
          totalWatchTime: 6480, // 90% of 7200
          duration: 7200,
          completionPercentage: 90,
          isCompleted: true,
          pauseCount: 0,
          seekCount: 0,
        },
        {
          id: '4',
          contentId: 'content4',
          contentTitle: 'Content 4',
          contentType: 'tv_show',
          userId: 'user4',
          startedAt: Date.now(),
          totalWatchTime: 1440, // 20% of 7200
          duration: 7200,
          completionPercentage: 20,
          isCompleted: false,
          pauseCount: 5,
          seekCount: 3,
        },
      ];

      const analytics = ContentAnalyticsCalculator.calculateAnalytics(sessions);
      
      expect(analytics.totalSessions).toBe(4);
      expect(analytics.completedSessions).toBe(2); // sessions 1 and 3 are completed
      expect(analytics.completionRate).toBe(50); // 2 out of 4 sessions completed = 50%
      
      // Average completion percentage: (100 + 50 + 90 + 20) / 4 = 65%
      expect(analytics.averageCompletionRate).toBe(65);
      
      expect(analytics.movieSessions).toBe(2);
      expect(analytics.tvSessions).toBe(2);
    });

    test('should calculate completion rate distribution correctly', () => {
      const sessions: WatchSession[] = [
        { id: '1', contentId: 'c1', contentTitle: 'C1', contentType: 'movie', userId: 'u1', startedAt: Date.now(), totalWatchTime: 1000, duration: 5000, completionPercentage: 10, isCompleted: false, pauseCount: 0, seekCount: 0 },
        { id: '2', contentId: 'c2', contentTitle: 'C2', contentType: 'movie', userId: 'u2', startedAt: Date.now(), totalWatchTime: 1500, duration: 5000, completionPercentage: 30, isCompleted: false, pauseCount: 0, seekCount: 0 },
        { id: '3', contentId: 'c3', contentTitle: 'C3', contentType: 'movie', userId: 'u3', startedAt: Date.now(), totalWatchTime: 3000, duration: 5000, completionPercentage: 60, isCompleted: false, pauseCount: 0, seekCount: 0 },
        { id: '4', contentId: 'c4', contentTitle: 'C4', contentType: 'movie', userId: 'u4', startedAt: Date.now(), totalWatchTime: 4500, duration: 5000, completionPercentage: 90, isCompleted: true, pauseCount: 0, seekCount: 0 },
        { id: '5', contentId: 'c5', contentTitle: 'C5', contentType: 'movie', userId: 'u5', startedAt: Date.now(), totalWatchTime: 5000, duration: 5000, completionPercentage: 100, isCompleted: true, pauseCount: 0, seekCount: 0 },
      ];

      const distribution = ContentAnalyticsCalculator.calculateCompletionRateDistribution(sessions);
      
      expect(distribution['0-25%']).toBe(1); // 10%
      expect(distribution['25-50%']).toBe(1); // 30%
      expect(distribution['50-75%']).toBe(1); // 60%
      expect(distribution['75-100%']).toBe(2); // 90%, 100%
    });

    test('should handle edge case completion percentages', () => {
      const sessions: WatchSession[] = [
        { id: '1', contentId: 'c1', contentTitle: 'C1', contentType: 'movie', userId: 'u1', startedAt: Date.now(), totalWatchTime: 0, duration: 5000, completionPercentage: 0, isCompleted: false, pauseCount: 0, seekCount: 0 },
        { id: '2', contentId: 'c2', contentTitle: 'C2', contentType: 'movie', userId: 'u2', startedAt: Date.now(), totalWatchTime: 1250, duration: 5000, completionPercentage: 25, isCompleted: false, pauseCount: 0, seekCount: 0 },
        { id: '3', contentId: 'c3', contentTitle: 'C3', contentType: 'movie', userId: 'u3', startedAt: Date.now(), totalWatchTime: 2500, duration: 5000, completionPercentage: 50, isCompleted: false, pauseCount: 0, seekCount: 0 },
        { id: '4', contentId: 'c4', contentTitle: 'C4', contentType: 'movie', userId: 'u4', startedAt: Date.now(), totalWatchTime: 3750, duration: 5000, completionPercentage: 75, isCompleted: false, pauseCount: 0, seekCount: 0 },
      ];

      const distribution = ContentAnalyticsCalculator.calculateCompletionRateDistribution(sessions);
      
      // Test boundary conditions
      // 0% goes to 0-25%, 25% goes to 25-50%, 50% goes to 50-75%, 75% goes to 75-100%
      expect(distribution['0-25%']).toBe(1); // 0%
      expect(distribution['25-50%']).toBe(1); // 25%
      expect(distribution['50-75%']).toBe(1); // 50%
      expect(distribution['75-100%']).toBe(1); // 75%
    });
  });

  describe('Ranking Algorithm Edge Cases', () => {
    test('should handle identical watch times in ranking', () => {
      const sessions: WatchSession[] = [
        { id: '1', contentId: 'movie1', contentTitle: 'Movie A', contentType: 'movie', userId: 'u1', startedAt: Date.now(), totalWatchTime: 3600, duration: 7200, completionPercentage: 50, isCompleted: false, pauseCount: 0, seekCount: 0 },
        { id: '2', contentId: 'movie2', contentTitle: 'Movie B', contentType: 'movie', userId: 'u2', startedAt: Date.now(), totalWatchTime: 3600, duration: 7200, completionPercentage: 50, isCompleted: false, pauseCount: 0, seekCount: 0 },
        { id: '3', contentId: 'movie3', contentTitle: 'Movie C', contentType: 'movie', userId: 'u3', startedAt: Date.now(), totalWatchTime: 7200, duration: 7200, completionPercentage: 100, isCompleted: true, pauseCount: 0, seekCount: 0 },
      ];

      const contentAnalytics = ContentAnalyticsCalculator.calculateWatchTimeByContent(sessions);
      
      expect(contentAnalytics).toHaveLength(3);
      
      // Movie C should be first (highest watch time)
      expect(contentAnalytics[0].contentId).toBe('movie3');
      expect(contentAnalytics[0].totalWatchTime).toBe(120); // 7200 / 60
      
      // Movies A and B should have identical watch times
      expect(contentAnalytics[1].totalWatchTime).toBe(60); // 3600 / 60
      expect(contentAnalytics[2].totalWatchTime).toBe(60); // 3600 / 60
      
      // Both should be present in the results
      const movieIds = contentAnalytics.slice(1).map(c => c.contentId).sort();
      expect(movieIds).toEqual(['movie1', 'movie2']);
    });

    test('should handle zero watch time sessions', () => {
      const sessions: WatchSession[] = [
        { id: '1', contentId: 'movie1', contentTitle: 'Movie A', contentType: 'movie', userId: 'u1', startedAt: Date.now(), totalWatchTime: 0, duration: 7200, completionPercentage: 0, isCompleted: false, pauseCount: 0, seekCount: 0 },
        { id: '2', contentId: 'movie2', contentTitle: 'Movie B', contentType: 'movie', userId: 'u2', startedAt: Date.now(), totalWatchTime: 3600, duration: 7200, completionPercentage: 50, isCompleted: false, pauseCount: 1, seekCount: 1 },
      ];

      const analytics = ContentAnalyticsCalculator.calculateAnalytics(sessions);
      
      expect(analytics.totalSessions).toBe(2);
      expect(analytics.totalWatchTime).toBe(60); // Only movie2's 3600 seconds = 60 minutes
      expect(analytics.averageWatchTime).toBe(30); // 60 / 2 sessions
      expect(analytics.completionRate).toBe(0); // No completed sessions
      expect(analytics.averageCompletionRate).toBe(25); // (0 + 50) / 2
      
      const contentAnalytics = ContentAnalyticsCalculator.calculateWatchTimeByContent(sessions);
      expect(contentAnalytics[0].contentId).toBe('movie2'); // Should be first due to higher watch time
      expect(contentAnalytics[1].contentId).toBe('movie1'); // Should be second with 0 watch time
      expect(contentAnalytics[1].totalWatchTime).toBe(0);
    });

    test('should handle very large numbers correctly', () => {
      const sessions: WatchSession[] = [
        {
          id: '1',
          contentId: 'movie1',
          contentTitle: 'Long Movie',
          contentType: 'movie',
          userId: 'u1',
          startedAt: Date.now(),
          totalWatchTime: 36000, // 10 hours in seconds
          duration: 36000,
          completionPercentage: 100,
          isCompleted: true,
          pauseCount: 50,
          seekCount: 25,
        },
      ];

      const analytics = ContentAnalyticsCalculator.calculateAnalytics(sessions);
      
      expect(analytics.totalWatchTime).toBe(600); // 36000 / 60 = 600 minutes
      expect(analytics.averageWatchTime).toBe(600);
      expect(analytics.totalPauses).toBe(50);
      expect(analytics.totalSeeks).toBe(25);
      expect(analytics.completionRate).toBe(100);
    });

    test('should maintain precision in calculations', () => {
      const sessions: WatchSession[] = [
        { id: '1', contentId: 'c1', contentTitle: 'C1', contentType: 'movie', userId: 'u1', startedAt: Date.now(), totalWatchTime: 100, duration: 300, completionPercentage: 33.33, isCompleted: false, pauseCount: 0, seekCount: 0 },
        { id: '2', contentId: 'c2', contentTitle: 'C2', contentType: 'movie', userId: 'u2', startedAt: Date.now(), totalWatchTime: 200, duration: 300, completionPercentage: 66.67, isCompleted: false, pauseCount: 0, seekCount: 0 },
      ];

      const analytics = ContentAnalyticsCalculator.calculateAnalytics(sessions);
      
      // Total watch time: (100 + 200) / 60 = 5 minutes
      expect(analytics.totalWatchTime).toBe(5);
      // Average watch time: 5 / 2 = 2.5, rounded to 3
      expect(analytics.averageWatchTime).toBe(3);
      // Average completion: (33.33 + 66.67) / 2 = 50%
      expect(analytics.averageCompletionRate).toBe(50);
    });

    test('should handle mixed content types correctly', () => {
      const sessions: WatchSession[] = [
        { id: '1', contentId: 'm1', contentTitle: 'Movie 1', contentType: 'movie', userId: 'u1', startedAt: Date.now(), totalWatchTime: 3600, duration: 7200, completionPercentage: 50, isCompleted: false, pauseCount: 1, seekCount: 0 },
        { id: '2', contentId: 'm2', contentTitle: 'Movie 2', contentType: 'movie', userId: 'u2', startedAt: Date.now(), totalWatchTime: 7200, duration: 7200, completionPercentage: 100, isCompleted: true, pauseCount: 0, seekCount: 0 },
        { id: '3', contentId: 't1', contentTitle: 'TV Show 1', contentType: 'tv_show', userId: 'u3', startedAt: Date.now(), totalWatchTime: 1800, duration: 1800, completionPercentage: 100, isCompleted: true, pauseCount: 0, seekCount: 1 },
        { id: '4', contentId: 't2', contentTitle: 'TV Show 2', contentType: 'tv_show', userId: 'u4', startedAt: Date.now(), totalWatchTime: 900, duration: 1800, completionPercentage: 50, isCompleted: false, pauseCount: 2, seekCount: 2 },
      ];

      const analytics = ContentAnalyticsCalculator.calculateAnalytics(sessions);
      
      expect(analytics.totalSessions).toBe(4);
      expect(analytics.movieSessions).toBe(2);
      expect(analytics.tvSessions).toBe(2);
      expect(analytics.completedSessions).toBe(2); // Movie 2 and TV Show 1
      expect(analytics.completionRate).toBe(50); // 2 out of 4 completed
      expect(analytics.uniqueContent).toBe(4); // All different content IDs
      
      // Total watch time: (3600 + 7200 + 1800 + 900) / 60 = 225 minutes
      expect(analytics.totalWatchTime).toBe(225);
      expect(analytics.averageWatchTime).toBe(56); // 225 / 4 = 56.25, rounded to 56
    });
  });
});