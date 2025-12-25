/**
 * Property-Based Tests for Content Performance Ranking
 * Feature: admin-panel-unified-refactor, Property 10: Content performance ranking
 * Validates: Requirements 4.1
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Content performance data structure
interface ContentMetric {
  contentId: string;
  title: string;
  contentType: 'movie' | 'tv_show';
  watchTime: number; // in minutes
  completionRate: number; // percentage 0-100
  totalViews: number;
  uniqueViewers: number;
  averageRating: number; // 0-10
  releaseDate: number; // timestamp
}

// Content ranking algorithms
class ContentRankingService {
  // Rank by watch time (descending)
  static rankByWatchTime(content: ContentMetric[]): ContentMetric[] {
    return [...content].sort((a, b) => b.watchTime - a.watchTime);
  }

  // Rank by completion rate (descending)
  static rankByCompletionRate(content: ContentMetric[]): ContentMetric[] {
    return [...content].sort((a, b) => b.completionRate - a.completionRate);
  }

  // Rank by total views (descending)
  static rankByTotalViews(content: ContentMetric[]): ContentMetric[] {
    return [...content].sort((a, b) => b.totalViews - a.totalViews);
  }

  // Rank by unique viewers (descending)
  static rankByUniqueViewers(content: ContentMetric[]): ContentMetric[] {
    return [...content].sort((a, b) => b.uniqueViewers - a.uniqueViewers);
  }

  // Composite ranking algorithm (weighted score)
  static rankByCompositeScore(content: ContentMetric[], weights = {
    watchTime: 0.3,
    completionRate: 0.25,
    totalViews: 0.2,
    uniqueViewers: 0.15,
    averageRating: 0.1
  }): ContentMetric[] {
    // Normalize metrics to 0-1 scale for fair comparison
    const maxWatchTime = Math.max(...content.map(c => c.watchTime));
    const maxTotalViews = Math.max(...content.map(c => c.totalViews));
    const maxUniqueViewers = Math.max(...content.map(c => c.uniqueViewers));

    const contentWithScores = content.map(item => {
      const normalizedWatchTime = maxWatchTime > 0 ? item.watchTime / maxWatchTime : 0;
      const normalizedCompletionRate = item.completionRate / 100;
      const normalizedTotalViews = maxTotalViews > 0 ? item.totalViews / maxTotalViews : 0;
      const normalizedUniqueViewers = maxUniqueViewers > 0 ? item.uniqueViewers / maxUniqueViewers : 0;
      const normalizedRating = item.averageRating / 10;

      const compositeScore = 
        (normalizedWatchTime * weights.watchTime) +
        (normalizedCompletionRate * weights.completionRate) +
        (normalizedTotalViews * weights.totalViews) +
        (normalizedUniqueViewers * weights.uniqueViewers) +
        (normalizedRating * weights.averageRating);

      return { ...item, compositeScore };
    });

    return contentWithScores.sort((a, b) => b.compositeScore - a.compositeScore);
  }

  // Get top N content items
  static getTopContent(content: ContentMetric[], n: number, rankingMethod: 'watchTime' | 'completionRate' | 'totalViews' | 'composite' = 'composite'): ContentMetric[] {
    let ranked: ContentMetric[];
    
    switch (rankingMethod) {
      case 'watchTime':
        ranked = this.rankByWatchTime(content);
        break;
      case 'completionRate':
        ranked = this.rankByCompletionRate(content);
        break;
      case 'totalViews':
        ranked = this.rankByTotalViews(content);
        break;
      case 'composite':
      default:
        ranked = this.rankByCompositeScore(content);
        break;
    }

    return ranked.slice(0, n);
  }
}

// Generators for property-based testing
const generateContentId = () => fc.string({ minLength: 5, maxLength: 20 });
const generateTitle = () => fc.string({ minLength: 3, maxLength: 50 });
const generateContentType = () => fc.constantFrom('movie', 'tv_show');

const generateContentMetric = () => fc.record({
  contentId: generateContentId(),
  title: generateTitle(),
  contentType: generateContentType(),
  watchTime: fc.integer({ min: 0, max: 10000 }), // 0 to 10000 minutes
  completionRate: fc.integer({ min: 0, max: 100 }), // 0-100%
  totalViews: fc.integer({ min: 0, max: 1000000 }),
  uniqueViewers: fc.integer({ min: 0, max: 100000 }),
  averageRating: fc.float({ min: 0, max: 10, noNaN: true }),
  releaseDate: fc.integer({ min: Date.now() - (365 * 24 * 60 * 60 * 1000), max: Date.now() })
});

const generateContentMetrics = () => fc.array(generateContentMetric(), { minLength: 1, maxLength: 100 });

describe('Content Performance Ranking', () => {
  test('Property 10: Content performance ranking - Watch time ranking correctness', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateContentMetrics(),
        async (contentList) => {
          const ranked = ContentRankingService.rankByWatchTime(contentList);
          
          // Property: Content should be ranked in descending order by watch time
          for (let i = 0; i < ranked.length - 1; i++) {
            expect(ranked[i].watchTime).toBeGreaterThanOrEqual(ranked[i + 1].watchTime);
          }
          
          // Property: Ranking should preserve all original content
          expect(ranked.length).toBe(contentList.length);
          
          // Property: All original content IDs should be present
          const originalIds = new Set(contentList.map(c => c.contentId));
          const rankedIds = new Set(ranked.map(c => c.contentId));
          expect(rankedIds).toEqual(originalIds);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Content performance ranking - Completion rate ranking correctness', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateContentMetrics(),
        async (contentList) => {
          const ranked = ContentRankingService.rankByCompletionRate(contentList);
          
          // Property: Content should be ranked in descending order by completion rate
          for (let i = 0; i < ranked.length - 1; i++) {
            expect(ranked[i].completionRate).toBeGreaterThanOrEqual(ranked[i + 1].completionRate);
          }
          
          // Property: Ranking should preserve all original content
          expect(ranked.length).toBe(contentList.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Content performance ranking - Top N selection accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateContentMetrics(),
        fc.integer({ min: 1, max: 20 }),
        fc.constantFrom('watchTime', 'completionRate', 'totalViews', 'composite'),
        async (contentList, n, rankingMethod) => {
          const topContent = ContentRankingService.getTopContent(contentList, n, rankingMethod);
          const expectedLength = Math.min(n, contentList.length);
          
          // Property: Top N should return exactly N items (or all items if less than N available)
          expect(topContent.length).toBe(expectedLength);
          
          // Property: Top N items should be the highest ranked according to the specified method
          const fullRanking = (() => {
            switch (rankingMethod) {
              case 'watchTime':
                return ContentRankingService.rankByWatchTime(contentList);
              case 'completionRate':
                return ContentRankingService.rankByCompletionRate(contentList);
              case 'totalViews':
                return ContentRankingService.rankByTotalViews(contentList);
              case 'composite':
              default:
                return ContentRankingService.rankByCompositeScore(contentList);
            }
          })();
          
          const expectedTopContent = fullRanking.slice(0, expectedLength);
          
          // Verify that the top N matches the first N from full ranking by comparing contentIds
          // This handles cases where ranking methods add computed properties (like compositeScore)
          for (let i = 0; i < expectedLength; i++) {
            expect(topContent[i].contentId).toBe(expectedTopContent[i].contentId);
          }
          
          // Additional verification: ensure the ranking order is preserved
          if (rankingMethod === 'composite') {
            // For composite ranking, verify the composite scores are in descending order
            for (let i = 0; i < topContent.length - 1; i++) {
              const currentScore = (topContent[i] as any).compositeScore;
              const nextScore = (topContent[i + 1] as any).compositeScore;
              if (currentScore !== undefined && nextScore !== undefined) {
                expect(currentScore).toBeGreaterThanOrEqual(nextScore);
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Content performance ranking - Ranking stability with identical metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 100 }),
        async (numItems, watchTime, completionRate) => {
          // Create content items with identical performance metrics
          const identicalContent: ContentMetric[] = [];
          for (let i = 0; i < numItems; i++) {
            identicalContent.push({
              contentId: `content_${i}`,
              title: `Title ${i}`,
              contentType: i % 2 === 0 ? 'movie' : 'tv_show',
              watchTime,
              completionRate,
              totalViews: 1000,
              uniqueViewers: 500,
              averageRating: 7.5,
              releaseDate: Date.now()
            });
          }
          
          const ranked = ContentRankingService.rankByWatchTime(identicalContent);
          
          // Property: When metrics are identical, ranking should be stable
          // (all items should have the same metric value)
          for (const item of ranked) {
            expect(item.watchTime).toBe(watchTime);
            expect(item.completionRate).toBe(completionRate);
          }
          
          // Property: All original items should be preserved
          expect(ranked.length).toBe(numItems);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Content performance ranking - Composite score ranking properties', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateContentMetrics(),
        async (contentList) => {
          // Skip if empty list
          if (contentList.length === 0) return true;
          
          const ranked = ContentRankingService.rankByCompositeScore(contentList);
          
          // Property: Composite ranking should preserve all content
          expect(ranked.length).toBe(contentList.length);
          
          // Property: Content with higher individual metrics should generally rank higher
          // Test with extreme cases
          const highPerformer: ContentMetric = {
            contentId: 'high_performer',
            title: 'High Performer',
            contentType: 'movie',
            watchTime: 10000,
            completionRate: 100,
            totalViews: 1000000,
            uniqueViewers: 100000,
            averageRating: 10,
            releaseDate: Date.now()
          };
          
          const lowPerformer: ContentMetric = {
            contentId: 'low_performer',
            title: 'Low Performer',
            contentType: 'movie',
            watchTime: 0,
            completionRate: 0,
            totalViews: 0,
            uniqueViewers: 0,
            averageRating: 0,
            releaseDate: Date.now()
          };
          
          const testList = [...contentList, highPerformer, lowPerformer];
          const testRanked = ContentRankingService.rankByCompositeScore(testList);
          
          const highPerformerIndex = testRanked.findIndex(c => c.contentId === 'high_performer');
          const lowPerformerIndex = testRanked.findIndex(c => c.contentId === 'low_performer');
          
          // Property: High performer should rank higher (lower index) than low performer
          expect(highPerformerIndex).toBeLessThan(lowPerformerIndex);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Content performance ranking - Ranking immutability', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateContentMetrics(),
        async (contentList) => {
          // Create a deep copy of the original list
          const originalCopy = JSON.parse(JSON.stringify(contentList));
          
          // Perform ranking
          const ranked = ContentRankingService.rankByWatchTime(contentList);
          
          // Property: Original content list should not be modified by ranking
          expect(contentList).toEqual(originalCopy);
          
          // Property: Ranked list should be a different array instance
          expect(ranked).not.toBe(contentList);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Content performance ranking - Empty and single item edge cases', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('watchTime', 'completionRate', 'totalViews', 'composite'),
        async (rankingMethod) => {
          // Test empty list
          const emptyRanked = ContentRankingService.getTopContent([], 5, rankingMethod);
          expect(emptyRanked).toEqual([]);
          
          // Test single item
          const singleItem: ContentMetric = {
            contentId: 'single',
            title: 'Single Item',
            contentType: 'movie',
            watchTime: 100,
            completionRate: 80,
            totalViews: 1000,
            uniqueViewers: 500,
            averageRating: 7.5,
            releaseDate: Date.now()
          };
          
          const singleRanked = ContentRankingService.getTopContent([singleItem], 5, rankingMethod);
          expect(singleRanked.length).toBe(1);
          expect(singleRanked[0].contentId).toBe(singleItem.contentId);
          
          // For composite ranking, verify the compositeScore was added
          if (rankingMethod === 'composite') {
            expect((singleRanked[0] as any).compositeScore).toBeDefined();
            expect(typeof (singleRanked[0] as any).compositeScore).toBe('number');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});