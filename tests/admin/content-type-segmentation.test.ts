/**
 * Property-Based Tests for Content Type Segmentation
 * Feature: admin-panel-unified-refactor, Property 11: Content type segmentation
 * Validates: Requirements 4.3
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Content analytics data structure
interface ContentAnalytics {
  contentId: string;
  title: string;
  contentType: 'movie' | 'tv_show';
  watchTime: number; // in minutes
  completionRate: number; // percentage 0-100
  totalViews: number;
  uniqueViewers: number;
  averageRating: number; // 0-10
  releaseDate: number; // timestamp
  genre: string;
  duration: number; // content duration in minutes
}

// Content segmentation service
class ContentSegmentationService {
  // Segment content by type
  static segmentByType(content: ContentAnalytics[]): { movies: ContentAnalytics[]; tvShows: ContentAnalytics[] } {
    // First, deduplicate content by contentId, keeping the first occurrence
    const seenIds = new Set<string>();
    const deduplicatedContent = content.filter(item => {
      if (seenIds.has(item.contentId)) {
        return false;
      }
      seenIds.add(item.contentId);
      return true;
    });
    
    const movies = deduplicatedContent.filter(item => item.contentType === 'movie');
    const tvShows = deduplicatedContent.filter(item => item.contentType === 'tv_show');
    
    return { movies, tvShows };
  }

  // Calculate performance metrics by content type
  static calculateMetricsByType(content: ContentAnalytics[]) {
    const { movies, tvShows } = this.segmentByType(content);
    
    const calculateMetrics = (items: ContentAnalytics[]) => {
      if (items.length === 0) {
        return {
          totalWatchTime: 0,
          avgWatchTime: 0,
          avgCompletionRate: 0,
          totalViews: 0,
          avgRating: 0,
          count: 0
        };
      }
      
      const totalWatchTime = items.reduce((sum, item) => sum + item.watchTime, 0);
      const totalViews = items.reduce((sum, item) => sum + item.totalViews, 0);
      const totalCompletionRate = items.reduce((sum, item) => sum + item.completionRate, 0);
      const totalRating = items.reduce((sum, item) => sum + item.averageRating, 0);
      
      return {
        totalWatchTime,
        avgWatchTime: totalWatchTime / items.length,
        avgCompletionRate: totalCompletionRate / items.length,
        totalViews,
        avgRating: totalRating / items.length,
        count: items.length
      };
    };
    
    return {
      movies: calculateMetrics(movies),
      tvShows: calculateMetrics(tvShows),
      overall: calculateMetrics(content)
    };
  }

  // Get top content by type
  static getTopContentByType(content: ContentAnalytics[], n: number, metric: 'watchTime' | 'views' | 'rating' = 'watchTime') {
    const { movies, tvShows } = this.segmentByType(content);
    
    const sortByMetric = (items: ContentAnalytics[]) => {
      return [...items].sort((a, b) => {
        switch (metric) {
          case 'watchTime':
            return b.watchTime - a.watchTime;
          case 'views':
            return b.totalViews - a.totalViews;
          case 'rating':
            return b.averageRating - a.averageRating;
          default:
            return b.watchTime - a.watchTime;
        }
      });
    };
    
    return {
      topMovies: sortByMetric(movies).slice(0, n),
      topTvShows: sortByMetric(tvShows).slice(0, n)
    };
  }

  // Filter content by type and additional criteria
  static filterContentByType(
    content: ContentAnalytics[], 
    contentType: 'movie' | 'tv_show' | 'all',
    minRating?: number,
    minWatchTime?: number
  ): ContentAnalytics[] {
    let filtered = content;
    
    // Filter by content type
    if (contentType !== 'all') {
      filtered = filtered.filter(item => item.contentType === contentType);
    }
    
    // Apply additional filters
    if (minRating !== undefined) {
      filtered = filtered.filter(item => item.averageRating >= minRating);
    }
    
    if (minWatchTime !== undefined) {
      filtered = filtered.filter(item => item.watchTime >= minWatchTime);
    }
    
    return filtered;
  }
}

// Generators for property-based testing
const generateContentId = () => fc.string({ minLength: 5, maxLength: 20 });
const generateTitle = () => fc.string({ minLength: 3, maxLength: 50 });
const generateContentType = () => fc.constantFrom('movie', 'tv_show');
const generateGenre = () => fc.constantFrom('action', 'comedy', 'drama', 'horror', 'sci-fi', 'romance', 'thriller');

const generateContentAnalytics = () => fc.record({
  contentId: generateContentId(),
  title: generateTitle(),
  contentType: generateContentType(),
  watchTime: fc.integer({ min: 0, max: 10000 }), // 0 to 10000 minutes
  completionRate: fc.integer({ min: 0, max: 100 }), // 0-100%
  totalViews: fc.integer({ min: 0, max: 1000000 }),
  uniqueViewers: fc.integer({ min: 0, max: 100000 }),
  averageRating: fc.float({ min: 0, max: 10, noNaN: true }),
  releaseDate: fc.integer({ min: Date.now() - (365 * 24 * 60 * 60 * 1000), max: Date.now() }),
  genre: generateGenre(),
  duration: fc.integer({ min: 30, max: 300 }) // 30 minutes to 5 hours
});

const generateContentAnalyticsList = () => fc.array(generateContentAnalytics(), { minLength: 0, maxLength: 100 });

describe('Content Type Segmentation', () => {
  test('Property 11: Content type segmentation - Segmentation completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateContentAnalyticsList(),
        async (contentList) => {
          const segmented = ContentSegmentationService.segmentByType(contentList);
          
          // First, calculate expected count after deduplication
          const seenIds = new Set<string>();
          const deduplicatedCount = contentList.filter(item => {
            if (seenIds.has(item.contentId)) {
              return false;
            }
            seenIds.add(item.contentId);
            return true;
          }).length;
          
          // Property: All deduplicated content should be segmented into exactly one category
          const totalSegmented = segmented.movies.length + segmented.tvShows.length;
          expect(totalSegmented).toBe(deduplicatedCount);
          
          // Property: No content should appear in both segments
          const movieIds = new Set(segmented.movies.map(c => c.contentId));
          const tvShowIds = new Set(segmented.tvShows.map(c => c.contentId));
          const intersection = new Set([...movieIds].filter(id => tvShowIds.has(id)));
          expect(intersection.size).toBe(0);
          
          // Property: All movies should have contentType 'movie'
          for (const movie of segmented.movies) {
            expect(movie.contentType).toBe('movie');
          }
          
          // Property: All TV shows should have contentType 'tv_show'
          for (const tvShow of segmented.tvShows) {
            expect(tvShow.contentType).toBe('tv_show');
          }
          
          // Property: All contentIds should be unique within each segment
          const movieIdArray = segmented.movies.map(c => c.contentId);
          const tvShowIdArray = segmented.tvShows.map(c => c.contentId);
          expect(new Set(movieIdArray).size).toBe(movieIdArray.length);
          expect(new Set(tvShowIdArray).size).toBe(tvShowIdArray.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Content type segmentation - Metrics calculation accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateContentAnalyticsList(),
        async (contentList) => {
          const metrics = ContentSegmentationService.calculateMetricsByType(contentList);
          
          // Property: Sum of type-specific metrics should equal overall metrics
          expect(metrics.movies.count + metrics.tvShows.count).toBe(metrics.overall.count);
          expect(metrics.movies.totalWatchTime + metrics.tvShows.totalWatchTime).toBe(metrics.overall.totalWatchTime);
          expect(metrics.movies.totalViews + metrics.tvShows.totalViews).toBe(metrics.overall.totalViews);
          
          // Property: Average metrics should be within reasonable bounds
          if (metrics.movies.count > 0) {
            expect(metrics.movies.avgWatchTime).toBeGreaterThanOrEqual(0);
            expect(metrics.movies.avgCompletionRate).toBeGreaterThanOrEqual(0);
            expect(metrics.movies.avgCompletionRate).toBeLessThanOrEqual(100);
            expect(metrics.movies.avgRating).toBeGreaterThanOrEqual(0);
            expect(metrics.movies.avgRating).toBeLessThanOrEqual(10);
          }
          
          if (metrics.tvShows.count > 0) {
            expect(metrics.tvShows.avgWatchTime).toBeGreaterThanOrEqual(0);
            expect(metrics.tvShows.avgCompletionRate).toBeGreaterThanOrEqual(0);
            expect(metrics.tvShows.avgCompletionRate).toBeLessThanOrEqual(100);
            expect(metrics.tvShows.avgRating).toBeGreaterThanOrEqual(0);
            expect(metrics.tvShows.avgRating).toBeLessThanOrEqual(10);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Content type segmentation - Top content selection accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateContentAnalyticsList(),
        fc.integer({ min: 1, max: 10 }),
        fc.constantFrom('watchTime', 'views', 'rating'),
        async (contentList, n, metric) => {
          const topContent = ContentSegmentationService.getTopContentByType(contentList, n, metric);
          
          const segmented = ContentSegmentationService.segmentByType(contentList);
          const expectedMovieCount = Math.min(n, segmented.movies.length);
          const expectedTvShowCount = Math.min(n, segmented.tvShows.length);
          
          // Property: Top content should return correct number of items per type
          expect(topContent.topMovies.length).toBe(expectedMovieCount);
          expect(topContent.topTvShows.length).toBe(expectedTvShowCount);
          
          // Property: All returned movies should be movies
          for (const movie of topContent.topMovies) {
            expect(movie.contentType).toBe('movie');
          }
          
          // Property: All returned TV shows should be TV shows
          for (const tvShow of topContent.topTvShows) {
            expect(tvShow.contentType).toBe('tv_show');
          }
          
          // Property: Top content should be sorted by the specified metric (descending)
          const getMetricValue = (item: ContentAnalytics, metricType: string) => {
            switch (metricType) {
              case 'watchTime': return item.watchTime;
              case 'views': return item.totalViews;
              case 'rating': return item.averageRating;
              default: return item.watchTime;
            }
          };
          
          for (let i = 0; i < topContent.topMovies.length - 1; i++) {
            const current = getMetricValue(topContent.topMovies[i], metric);
            const next = getMetricValue(topContent.topMovies[i + 1], metric);
            expect(current).toBeGreaterThanOrEqual(next);
          }
          
          for (let i = 0; i < topContent.topTvShows.length - 1; i++) {
            const current = getMetricValue(topContent.topTvShows[i], metric);
            const next = getMetricValue(topContent.topTvShows[i + 1], metric);
            expect(current).toBeGreaterThanOrEqual(next);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Content type segmentation - Filtering consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateContentAnalyticsList(),
        fc.constantFrom('movie', 'tv_show', 'all'),
        fc.float({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 5000 }),
        async (contentList, contentType, minRating, minWatchTime) => {
          const filtered = ContentSegmentationService.filterContentByType(
            contentList, 
            contentType, 
            minRating, 
            minWatchTime
          );
          
          // Property: Filtered content should only contain the specified type (if not 'all')
          if (contentType !== 'all') {
            for (const item of filtered) {
              expect(item.contentType).toBe(contentType);
            }
          }
          
          // Property: All filtered content should meet the minimum rating requirement
          for (const item of filtered) {
            expect(item.averageRating).toBeGreaterThanOrEqual(minRating);
          }
          
          // Property: All filtered content should meet the minimum watch time requirement
          for (const item of filtered) {
            expect(item.watchTime).toBeGreaterThanOrEqual(minWatchTime);
          }
          
          // Property: Filtered results should be a subset of original content
          expect(filtered.length).toBeLessThanOrEqual(contentList.length);
          
          // Property: All filtered content IDs should exist in original content
          const originalIds = new Set(contentList.map(c => c.contentId));
          for (const item of filtered) {
            expect(originalIds.has(item.contentId)).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Content type segmentation - Empty and edge cases', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('movie', 'tv_show', 'all'),
        async (contentType) => {
          // Test empty list
          const emptySegmented = ContentSegmentationService.segmentByType([]);
          expect(emptySegmented.movies).toEqual([]);
          expect(emptySegmented.tvShows).toEqual([]);
          
          const emptyMetrics = ContentSegmentationService.calculateMetricsByType([]);
          expect(emptyMetrics.movies.count).toBe(0);
          expect(emptyMetrics.tvShows.count).toBe(0);
          expect(emptyMetrics.overall.count).toBe(0);
          
          const emptyFiltered = ContentSegmentationService.filterContentByType([], contentType);
          expect(emptyFiltered).toEqual([]);
          
          const emptyTopContent = ContentSegmentationService.getTopContentByType([], 5);
          expect(emptyTopContent.topMovies).toEqual([]);
          expect(emptyTopContent.topTvShows).toEqual([]);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Content type segmentation - Single type collections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateContentAnalytics(), { minLength: 1, maxLength: 50 }),
        fc.constantFrom('movie', 'tv_show'),
        async (baseContentList, singleType) => {
          // Force all content to be of a single type
          const singleTypeContent = baseContentList.map(item => ({
            ...item,
            contentType: singleType as 'movie' | 'tv_show'
          }));
          
          const segmented = ContentSegmentationService.segmentByType(singleTypeContent);
          
          if (singleType === 'movie') {
            // Property: All content should be in movies, none in TV shows
            expect(segmented.movies.length).toBe(singleTypeContent.length);
            expect(segmented.tvShows.length).toBe(0);
          } else {
            // Property: All content should be in TV shows, none in movies
            expect(segmented.tvShows.length).toBe(singleTypeContent.length);
            expect(segmented.movies.length).toBe(0);
          }
          
          const metrics = ContentSegmentationService.calculateMetricsByType(singleTypeContent);
          
          if (singleType === 'movie') {
            expect(metrics.movies.count).toBe(singleTypeContent.length);
            expect(metrics.tvShows.count).toBe(0);
          } else {
            expect(metrics.tvShows.count).toBe(singleTypeContent.length);
            expect(metrics.movies.count).toBe(0);
          }
          
          // Property: Overall metrics should equal the single type metrics
          expect(metrics.overall.count).toBe(singleTypeContent.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Content type segmentation - Segmentation immutability', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateContentAnalyticsList(),
        async (contentList) => {
          // Create a deep copy of the original list
          const originalCopy = JSON.parse(JSON.stringify(contentList));
          
          // Perform segmentation operations
          const segmented = ContentSegmentationService.segmentByType(contentList);
          const metrics = ContentSegmentationService.calculateMetricsByType(contentList);
          const topContent = ContentSegmentationService.getTopContentByType(contentList, 5);
          const filtered = ContentSegmentationService.filterContentByType(contentList, 'all');
          
          // Property: Original content list should not be modified by any operations
          expect(contentList).toEqual(originalCopy);
          
          // Property: Segmented arrays should be different instances
          expect(segmented.movies).not.toBe(contentList);
          expect(segmented.tvShows).not.toBe(contentList);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});