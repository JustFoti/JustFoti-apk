/**
 * Content API Routes Tests
 * Tests for trending, search, and details endpoints
 */

import { describe, it, expect } from 'bun:test';
import { validateQuery, trendingQuerySchema, searchQuerySchema, detailsQuerySchema } from '@/lib/validation/content-schemas';

describe('Content API Validation', () => {
  describe('Trending Query Validation', () => {
    it('should validate valid trending query', () => {
      const params = new URLSearchParams({ mediaType: 'movie', timeWindow: 'week' });
      const result = validateQuery(trendingQuerySchema, params);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mediaType).toBe('movie');
        expect(result.data.timeWindow).toBe('week');
      }
    });

    it('should use default values for missing params', () => {
      const params = new URLSearchParams();
      const result = validateQuery(trendingQuerySchema, params);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mediaType).toBe('all');
        expect(result.data.timeWindow).toBe('week');
      }
    });

    it('should reject invalid mediaType', () => {
      const params = new URLSearchParams({ mediaType: 'invalid' });
      const result = validateQuery(trendingQuerySchema, params);
      
      expect(result.success).toBe(false);
    });
  });

  describe('Search Query Validation', () => {
    it('should validate valid search query', () => {
      const params = new URLSearchParams({ query: 'inception', page: '1' });
      const result = validateQuery(searchQuerySchema, params);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('inception');
        expect(result.data.page).toBe(1);
      }
    });

    it('should reject empty query', () => {
      const params = new URLSearchParams({ query: '' });
      const result = validateQuery(searchQuerySchema, params);
      
      expect(result.success).toBe(false);
    });

    it('should reject query that is too long', () => {
      const params = new URLSearchParams({ query: 'a'.repeat(101) });
      const result = validateQuery(searchQuerySchema, params);
      
      expect(result.success).toBe(false);
    });

    it('should coerce page to number', () => {
      const params = new URLSearchParams({ query: 'test', page: '5' });
      const result = validateQuery(searchQuerySchema, params);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(typeof result.data.page).toBe('number');
      }
    });
  });

  describe('Details Query Validation', () => {
    it('should validate valid details query', () => {
      const params = new URLSearchParams({ id: '550', mediaType: 'movie' });
      const result = validateQuery(detailsQuerySchema, params);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('550');
        expect(result.data.mediaType).toBe('movie');
      }
    });

    it('should reject missing id', () => {
      const params = new URLSearchParams({ mediaType: 'movie' });
      const result = validateQuery(detailsQuerySchema, params);
      
      expect(result.success).toBe(false);
    });

    it('should reject invalid mediaType', () => {
      const params = new URLSearchParams({ id: '550', mediaType: 'invalid' });
      const result = validateQuery(detailsQuerySchema, params);
      
      expect(result.success).toBe(false);
    });
  });
});
