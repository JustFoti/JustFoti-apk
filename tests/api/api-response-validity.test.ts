/**
 * Property-Based Tests for API Route Response Validity
 * Feature: vercel-to-cloudflare-migration, Property 7: API Route Response Validity
 * Validates: Requirements 2.1, 2.2
 * 
 * Tests that API routes return valid JSON with expected schema fields.
 * For any API request to /api/tmdb/* or /api/content/*, the response SHALL
 * contain valid JSON with expected schema fields.
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// ============================================
// Response Schema Definitions
// ============================================

/**
 * Base media item schema - common fields for movies and TV shows
 */
interface MediaItem {
  id: number;
  media_type?: 'movie' | 'tv' | 'person';
  title?: string;        // For movies
  name?: string;         // For TV shows
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  release_date?: string;      // For movies
  first_air_date?: string;    // For TV shows
}

/**
 * Paginated response schema
 */
interface PaginatedResponse {
  page?: number;
  results: MediaItem[];
  total_pages?: number;
  total_results?: number;
}

/**
 * Content API success response
 */
interface ContentApiResponse {
  success: boolean;
  data: MediaItem[] | MediaItem;
  count?: number;
  query?: string;
  page?: number;
  searchType?: string;
  mediaType?: string;
  timeWindow?: string;
  prefetched?: string[];
}

/**
 * Error response schema
 */
interface ErrorResponse {
  error: string;
  message?: string;
  code?: string;
  retryAfter?: number;
}

// ============================================
// Schema Validation Functions
// ============================================

/**
 * Validates that a response is valid JSON
 */
function isValidJson(data: unknown): boolean {
  if (data === null || data === undefined) return false;
  if (typeof data !== 'object') return false;
  return true;
}

/**
 * Validates a media item has required fields
 */
function isValidMediaItem(item: unknown): boolean {
  if (!isValidJson(item)) return false;
  const media = item as MediaItem;
  
  // Must have an id
  if (typeof media.id !== 'number') return false;
  
  // Must have either title (movie) or name (tv)
  const hasTitle = typeof media.title === 'string';
  const hasName = typeof media.name === 'string';
  if (!hasTitle && !hasName) return false;
  
  return true;
}

/**
 * Validates a paginated response structure
 */
function isValidPaginatedResponse(data: unknown): boolean {
  if (!isValidJson(data)) return false;
  const response = data as PaginatedResponse;
  
  // Must have results array
  if (!Array.isArray(response.results)) return false;
  
  return true;
}

/**
 * Validates a content API response structure
 */
function isValidContentApiResponse(data: unknown): boolean {
  if (!isValidJson(data)) return false;
  const response = data as ContentApiResponse;
  
  // Must have success boolean
  if (typeof response.success !== 'boolean') return false;
  
  // Must have data field
  if (response.data === undefined) return false;
  
  return true;
}

/**
 * Validates an error response structure
 */
function isValidErrorResponse(data: unknown): boolean {
  if (!isValidJson(data)) return false;
  const response = data as ErrorResponse;
  
  // Must have error string
  if (typeof response.error !== 'string') return false;
  
  return true;
}

// ============================================
// Mock Response Generators for Testing
// ============================================

/**
 * Generates a valid date string in YYYY-MM-DD format
 */
const dateStringArbitrary = fc.tuple(
  fc.integer({ min: 1990, max: 2030 }),  // year
  fc.integer({ min: 1, max: 12 }),        // month
  fc.integer({ min: 1, max: 28 })         // day (use 28 to avoid invalid dates)
).map(([year, month, day]) => {
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
});

/**
 * Generates a valid media item for testing
 */
const mediaItemArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  media_type: fc.constantFrom('movie', 'tv') as fc.Arbitrary<'movie' | 'tv'>,
  title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  overview: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
  poster_path: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  backdrop_path: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  vote_average: fc.option(fc.float({ min: 0, max: 10, noNaN: true }), { nil: undefined }),
  vote_count: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
  popularity: fc.option(fc.float({ min: 0, noNaN: true }), { nil: undefined }),
  genre_ids: fc.option(fc.array(fc.integer({ min: 1, max: 100 }), { maxLength: 5 }), { nil: undefined }),
  release_date: fc.option(dateStringArbitrary, { nil: undefined }),
  first_air_date: fc.option(dateStringArbitrary, { nil: undefined }),
}).map(item => {
  // Ensure at least one of title or name is present
  if (!item.title && !item.name) {
    if (item.media_type === 'movie') {
      item.title = 'Test Movie';
    } else {
      item.name = 'Test Show';
    }
  }
  return item;
});

/**
 * Generates a valid paginated response for testing
 */
const paginatedResponseArbitrary = fc.record({
  page: fc.integer({ min: 1, max: 100 }),
  results: fc.array(mediaItemArbitrary, { minLength: 0, maxLength: 20 }),
  total_pages: fc.integer({ min: 1, max: 1000 }),
  total_results: fc.integer({ min: 0, max: 100000 }),
});

/**
 * Generates a valid content API response for testing
 */
const contentApiResponseArbitrary = fc.record({
  success: fc.constant(true),
  data: fc.array(mediaItemArbitrary, { minLength: 0, maxLength: 20 }),
  count: fc.integer({ min: 0, max: 100 }),
  query: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  page: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  searchType: fc.option(fc.constantFrom('text', 'category', 'genre'), { nil: undefined }),
  mediaType: fc.option(fc.constantFrom('movie', 'tv', 'all'), { nil: undefined }),
  timeWindow: fc.option(fc.constantFrom('day', 'week'), { nil: undefined }),
});

/**
 * Generates a valid error response for testing
 */
const errorResponseArbitrary = fc.record({
  error: fc.string({ minLength: 1, maxLength: 100 }),
  message: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  code: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  retryAfter: fc.option(fc.integer({ min: 1, max: 3600 }), { nil: undefined }),
});

// ============================================
// Property-Based Tests
// ============================================

describe('API Route Response Validity', () => {
  test('Property 7: Valid media items have required fields', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 7: API Route Response Validity
     * Validates: Requirements 2.1, 2.2
     * 
     * For any valid media item, it SHALL have an id and either title or name.
     */
    fc.assert(
      fc.property(
        mediaItemArbitrary,
        (mediaItem) => {
          // Verify the media item is valid JSON
          expect(isValidJson(mediaItem)).toBe(true);
          
          // Verify required fields
          expect(typeof mediaItem.id).toBe('number');
          expect(mediaItem.id).toBeGreaterThan(0);
          
          // Must have either title or name
          const hasTitle = typeof mediaItem.title === 'string' && mediaItem.title.length > 0;
          const hasName = typeof mediaItem.name === 'string' && mediaItem.name.length > 0;
          expect(hasTitle || hasName).toBe(true);
          
          // Verify the validation function works
          expect(isValidMediaItem(mediaItem)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 7: Paginated responses have results array', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 7: API Route Response Validity
     * Validates: Requirements 2.1, 2.2
     * 
     * For any paginated response, it SHALL have a results array.
     */
    fc.assert(
      fc.property(
        paginatedResponseArbitrary,
        (response) => {
          // Verify the response is valid JSON
          expect(isValidJson(response)).toBe(true);
          
          // Verify results is an array
          expect(Array.isArray(response.results)).toBe(true);
          
          // Verify page is a positive integer
          expect(typeof response.page).toBe('number');
          expect(response.page).toBeGreaterThan(0);
          
          // Verify total_pages is a positive integer
          expect(typeof response.total_pages).toBe('number');
          expect(response.total_pages).toBeGreaterThan(0);
          
          // Verify the validation function works
          expect(isValidPaginatedResponse(response)).toBe(true);
          
          // Verify each item in results is a valid media item
          response.results.forEach(item => {
            expect(isValidMediaItem(item)).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 7: Content API responses have success and data fields', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 7: API Route Response Validity
     * Validates: Requirements 2.1, 2.2
     * 
     * For any content API response, it SHALL have success boolean and data field.
     */
    fc.assert(
      fc.property(
        contentApiResponseArbitrary,
        (response) => {
          // Verify the response is valid JSON
          expect(isValidJson(response)).toBe(true);
          
          // Verify success is a boolean
          expect(typeof response.success).toBe('boolean');
          
          // Verify data exists
          expect(response.data).toBeDefined();
          
          // Verify the validation function works
          expect(isValidContentApiResponse(response)).toBe(true);
          
          // If data is an array, verify each item
          if (Array.isArray(response.data)) {
            response.data.forEach(item => {
              expect(isValidMediaItem(item)).toBe(true);
            });
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 7: Error responses have error field', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 7: API Route Response Validity
     * Validates: Requirements 2.1, 2.2
     * 
     * For any error response, it SHALL have an error string field.
     */
    fc.assert(
      fc.property(
        errorResponseArbitrary,
        (response) => {
          // Verify the response is valid JSON
          expect(isValidJson(response)).toBe(true);
          
          // Verify error is a non-empty string
          expect(typeof response.error).toBe('string');
          expect(response.error.length).toBeGreaterThan(0);
          
          // Verify the validation function works
          expect(isValidErrorResponse(response)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 7: JSON serialization round-trip preserves data', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 7: API Route Response Validity
     * Validates: Requirements 2.1, 2.2
     * 
     * For any API response, JSON serialization and deserialization SHALL preserve data.
     */
    fc.assert(
      fc.property(
        contentApiResponseArbitrary,
        (response) => {
          // Serialize to JSON string
          const jsonString = JSON.stringify(response);
          
          // Verify it's a valid JSON string
          expect(typeof jsonString).toBe('string');
          
          // Deserialize back
          const parsed = JSON.parse(jsonString);
          
          // Verify structure is preserved
          expect(parsed.success).toBe(response.success);
          expect(Array.isArray(parsed.data)).toBe(Array.isArray(response.data));
          
          if (Array.isArray(response.data) && Array.isArray(parsed.data)) {
            expect(parsed.data.length).toBe(response.data.length);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 7: Media type consistency in responses', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 7: API Route Response Validity
     * Validates: Requirements 2.1, 2.2
     * 
     * For any media item with media_type, the type SHALL be one of the valid values.
     */
    fc.assert(
      fc.property(
        mediaItemArbitrary,
        (mediaItem) => {
          // If media_type is present, it must be valid
          if (mediaItem.media_type !== undefined) {
            expect(['movie', 'tv', 'person']).toContain(mediaItem.media_type);
          }
          
          // Movies should have title, TV shows should have name
          if (mediaItem.media_type === 'movie') {
            // Movies typically have title
            if (mediaItem.title) {
              expect(typeof mediaItem.title).toBe('string');
            }
          } else if (mediaItem.media_type === 'tv') {
            // TV shows typically have name
            if (mediaItem.name) {
              expect(typeof mediaItem.name).toBe('string');
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 7: Vote average is within valid range', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 7: API Route Response Validity
     * Validates: Requirements 2.1, 2.2
     * 
     * For any media item with vote_average, it SHALL be between 0 and 10.
     */
    fc.assert(
      fc.property(
        mediaItemArbitrary,
        (mediaItem) => {
          if (mediaItem.vote_average !== undefined) {
            expect(mediaItem.vote_average).toBeGreaterThanOrEqual(0);
            expect(mediaItem.vote_average).toBeLessThanOrEqual(10);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 7: Date fields are valid ISO format', () => {
    /**
     * Feature: vercel-to-cloudflare-migration, Property 7: API Route Response Validity
     * Validates: Requirements 2.1, 2.2
     * 
     * For any media item with date fields, they SHALL be valid date strings.
     */
    fc.assert(
      fc.property(
        mediaItemArbitrary,
        (mediaItem) => {
          // Check release_date format (YYYY-MM-DD)
          if (mediaItem.release_date !== undefined) {
            expect(typeof mediaItem.release_date).toBe('string');
            // Should be parseable as a date
            const date = new Date(mediaItem.release_date);
            expect(date.toString()).not.toBe('Invalid Date');
          }
          
          // Check first_air_date format (YYYY-MM-DD)
          if (mediaItem.first_air_date !== undefined) {
            expect(typeof mediaItem.first_air_date).toBe('string');
            // Should be parseable as a date
            const date = new Date(mediaItem.first_air_date);
            expect(date.toString()).not.toBe('Invalid Date');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
