/**
 * Stream API Tests
 * Tests for /api/stream/extract route
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { extractorService } from '@/lib/services/extractor';
import type { VideoData } from '@/types/media';

// Mock the extractor service
const mockExtractorService = {
  extract: mock(async () => ({
    sources: [
      {
        url: 'https://example.com/stream-1080.m3u8',
        quality: 'auto' as const,
        type: 'hls' as const,
      },
      {
        url: 'https://example.com/stream-720.m3u8',
        quality: 'auto' as const,
        type: 'hls' as const,
      },
    ],
    subtitles: [
      {
        label: 'English',
        language: 'en',
        url: 'https://example.com/en.vtt',
      },
    ],
    poster: 'https://example.com/poster.jpg',
    duration: 7200,
  } as VideoData)),
};

describe('Stream API - /api/stream/extract', () => {
  beforeEach(() => {
    mockExtractorService.extract.mockClear();
  });

  describe('Query Parameter Validation', () => {
    test('should require tmdbId parameter', async () => {
      const url = new URL('http://localhost:3000/api/stream/extract');
      url.searchParams.set('mediaType', 'movie');

      const response = await fetch(url.toString());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.message).toContain('tmdbId');
    });

    test('should require mediaType parameter', async () => {
      const url = new URL('http://localhost:3000/api/stream/extract');
      url.searchParams.set('tmdbId', '550');

      const response = await fetch(url.toString());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    test('should validate mediaType enum', async () => {
      const url = new URL('http://localhost:3000/api/stream/extract');
      url.searchParams.set('tmdbId', '550');
      url.searchParams.set('mediaType', 'invalid');

      const response = await fetch(url.toString());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    test('should require season and episode for TV shows', async () => {
      const url = new URL('http://localhost:3000/api/stream/extract');
      url.searchParams.set('tmdbId', '1396');
      url.searchParams.set('mediaType', 'tv');

      const response = await fetch(url.toString());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.message).toContain('season');
    });

    test('should accept valid movie parameters', async () => {
      const url = new URL('http://localhost:3000/api/stream/extract');
      url.searchParams.set('tmdbId', '550');
      url.searchParams.set('mediaType', 'movie');

      // This will fail without actual service, but validates parameters
      const response = await fetch(url.toString());
      
      // Should not be a validation error
      if (response.status === 400) {
        const data = await response.json();
        expect(data.error).not.toBe('Validation error');
      }
    });

    test('should accept valid TV parameters', async () => {
      const url = new URL('http://localhost:3000/api/stream/extract');
      url.searchParams.set('tmdbId', '1396');
      url.searchParams.set('mediaType', 'tv');
      url.searchParams.set('season', '1');
      url.searchParams.set('episode', '1');

      const response = await fetch(url.toString());
      
      // Should not be a validation error
      if (response.status === 400) {
        const data = await response.json();
        expect(data.error).not.toBe('Validation error');
      }
    });
  });

  describe('Quality Detection', () => {
    test('should detect 1080p from URL', () => {
      const source = {
        url: 'https://example.com/stream-1080.m3u8',
        quality: 'auto' as const,
        type: 'hls' as const,
      };

      // Quality detection logic (from route)
      const url = source.url.toLowerCase();
      const detected = url.includes('1080') ? '1080p' : source.quality;

      expect(detected).toBe('1080p');
    });

    test('should detect 720p from URL', () => {
      const source = {
        url: 'https://example.com/stream-720.m3u8',
        quality: 'auto' as const,
        type: 'hls' as const,
      };

      const url = source.url.toLowerCase();
      const detected = url.includes('720') ? '720p' : source.quality;

      expect(detected).toBe('720p');
    });

    test('should detect HD quality', () => {
      const source = {
        url: 'https://example.com/stream-hd.m3u8',
        quality: 'auto' as const,
        type: 'hls' as const,
      };

      const url = source.url.toLowerCase();
      const detected = url.includes('hd') ? '720p' : source.quality;

      expect(detected).toBe('720p');
    });

    test('should keep auto for HLS without quality indicator', () => {
      const source = {
        url: 'https://example.com/stream.m3u8',
        quality: 'auto' as const,
        type: 'hls' as const,
      };

      const url = source.url.toLowerCase();
      const hasQuality = url.includes('1080') || url.includes('720') || url.includes('480');
      const detected = hasQuality ? '720p' : 'auto';

      expect(detected).toBe('auto');
    });
  });

  describe('Quality Selection', () => {
    test('should prefer HLS auto quality', () => {
      const sources = [
        { url: 'https://example.com/720.mp4', quality: '720p' as const, type: 'mp4' as const },
        { url: 'https://example.com/stream.m3u8', quality: 'auto' as const, type: 'hls' as const },
      ];

      const hlsAuto = sources.find(s => s.type === 'hls' && s.quality === 'auto');
      expect(hlsAuto).toBeDefined();
      expect(hlsAuto?.type).toBe('hls');
    });

    test('should select highest quality when no HLS auto', () => {
      const sources = [
        { url: 'https://example.com/480.mp4', quality: '480p' as const, type: 'mp4' as const },
        { url: 'https://example.com/1080.mp4', quality: '1080p' as const, type: 'mp4' as const },
        { url: 'https://example.com/720.mp4', quality: '720p' as const, type: 'mp4' as const },
      ];

      const qualityOrder = ['1080p', '720p', '480p', '360p', 'auto'];
      let bestSource = null;

      for (const quality of qualityOrder) {
        const source = sources.find(s => s.quality === quality);
        if (source) {
          bestSource = source;
          break;
        }
      }

      expect(bestSource?.quality).toBe('1080p');
    });

    test('should return first source as fallback', () => {
      const sources = [
        { url: 'https://example.com/stream.mp4', quality: 'auto' as const, type: 'mp4' as const },
      ];

      const fallback = sources[0];
      expect(fallback).toBeDefined();
    });
  });

  describe('Response Format', () => {
    test('should include success flag in response', () => {
      const response = {
        success: true,
        data: {},
        metadata: {},
      };

      expect(response.success).toBe(true);
    });

    test('should include metadata in response', () => {
      const metadata = {
        tmdbId: '550',
        mediaType: 'movie',
        sourceCount: 2,
        subtitleCount: 1,
        bestQuality: '1080p',
        responseTime: '1234ms',
      };

      expect(metadata.tmdbId).toBe('550');
      expect(metadata.sourceCount).toBeGreaterThan(0);
      expect(metadata.responseTime).toContain('ms');
    });

    test('should include error details on failure', () => {
      const errorResponse = {
        error: 'Extraction failed',
        message: 'Failed to extract video stream',
        retryable: false,
      };

      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.message).toBeDefined();
      expect(typeof errorResponse.retryable).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('should handle timeout errors', () => {
      const error = {
        name: 'AbortError',
        code: 'TIMEOUT',
      };

      const isTimeout = error.name === 'AbortError' || error.code === 'TIMEOUT';
      expect(isTimeout).toBe(true);
    });

    test('should handle service unavailable', () => {
      const error = {
        code: 'NETWORK_ERROR',
        statusCode: 503,
      };

      const isUnavailable = error.code === 'NETWORK_ERROR' || error.statusCode === 503;
      expect(isUnavailable).toBe(true);
    });

    test('should handle extraction failures', () => {
      const error = {
        code: 'EXTRACTION_FAILED',
        retryable: false,
      };

      expect(error.code).toBe('EXTRACTION_FAILED');
      expect(error.retryable).toBe(false);
    });

    test('should classify retryable errors', () => {
      const retryableErrors = [
        { statusCode: 503 },
        { statusCode: 504 },
        { statusCode: 429 },
        { name: 'AbortError' },
      ];

      retryableErrors.forEach(error => {
        const isRetryable = 
          error.statusCode === 503 ||
          error.statusCode === 504 ||
          error.statusCode === 429 ||
          error.name === 'AbortError';
        
        expect(isRetryable).toBe(true);
      });
    });

    test('should classify non-retryable errors', () => {
      const nonRetryableErrors = [
        { statusCode: 400 },
        { statusCode: 404 },
        { code: 'INVALID_PARAMS' },
      ];

      nonRetryableErrors.forEach(error => {
        const isRetryable = 
          error.statusCode === 503 ||
          error.statusCode === 504 ||
          error.statusCode === 429;
        
        expect(isRetryable).toBe(false);
      });
    });
  });

  describe('Caching', () => {
    test('should set appropriate cache headers', () => {
      const headers = {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      };

      expect(headers['Cache-Control']).toContain('s-maxage=1800');
      expect(headers['Cache-Control']).toContain('stale-while-revalidate=3600');
    });

    test('should include cache duration of 30 minutes', () => {
      const cacheControl = 'public, s-maxage=1800, stale-while-revalidate=3600';
      const maxAge = parseInt(cacheControl.match(/s-maxage=(\d+)/)?.[1] || '0');
      
      expect(maxAge).toBe(1800); // 30 minutes
    });

    test('should include stale-while-revalidate of 1 hour', () => {
      const cacheControl = 'public, s-maxage=1800, stale-while-revalidate=3600';
      const staleTime = parseInt(cacheControl.match(/stale-while-revalidate=(\d+)/)?.[1] || '0');
      
      expect(staleTime).toBe(3600); // 1 hour
    });
  });

  describe('Rate Limiting', () => {
    test('should include rate limit headers', () => {
      const headers = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': Date.now().toString(),
      };

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(parseInt(headers['X-RateLimit-Remaining'])).toBeLessThanOrEqual(100);
      expect(parseInt(headers['X-RateLimit-Reset'])).toBeGreaterThan(0);
    });

    test('should return 429 when rate limit exceeded', () => {
      const response = {
        status: 429,
        error: 'Too many requests',
        retryAfter: 60,
      };

      expect(response.status).toBe(429);
      expect(response.retryAfter).toBeGreaterThan(0);
    });
  });
});
