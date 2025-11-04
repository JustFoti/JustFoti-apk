/**
 * Core Services Tests
 * Basic tests for TMDB, Extractor, and Analytics services
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { cacheManager } from '@/lib/utils/cache';
import { createAPIError, isRetryableError } from '@/lib/utils/error-handler';

describe('Cache Manager', () => {
  beforeEach(async () => {
    await cacheManager.clear();
  });

  test('should store and retrieve data from cache', async () => {
    const key = 'test-key';
    const data = { message: 'Hello, World!' };
    const ttl = 5000;

    await cacheManager.set(key, data, ttl);
    const retrieved = await cacheManager.get(key);

    expect(retrieved).toEqual(data);
  });

  test('should return null for non-existent keys', async () => {
    const retrieved = await cacheManager.get('non-existent-key');
    expect(retrieved).toBeNull();
  });

  test('should delete cached data', async () => {
    const key = 'test-key';
    const data = { message: 'Hello, World!' };
    const ttl = 5000;

    await cacheManager.set(key, data, ttl);
    await cacheManager.delete(key);
    const retrieved = await cacheManager.get(key);

    expect(retrieved).toBeNull();
  });
});

describe('Error Handler', () => {
  test('should create API error correctly', () => {
    const error = createAPIError('TEST_ERROR', 'Test message', 500, true);

    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(true);
  });

  test('should identify retryable errors', () => {
    const retryableError = { statusCode: 503 };
    const nonRetryableError = { statusCode: 404 };

    expect(isRetryableError(retryableError)).toBe(true);
    expect(isRetryableError(nonRetryableError)).toBe(false);
  });

  test('should identify network errors as retryable', () => {
    const networkError = new TypeError('fetch failed');
    expect(isRetryableError(networkError)).toBe(true);
  });
});

describe('Service Integration', () => {
  test('should have TMDB service available', async () => {
    const { tmdbService } = await import('@/lib/services/tmdb');
    expect(tmdbService).toBeDefined();
    expect(typeof tmdbService.getTrending).toBe('function');
    expect(typeof tmdbService.search).toBe('function');
    expect(typeof tmdbService.getDetails).toBe('function');
  });

  test('should have extractor service available', async () => {
    const { extractorService } = await import('@/lib/services/extractor');
    expect(extractorService).toBeDefined();
    expect(typeof extractorService.extract).toBe('function');
    expect(typeof extractorService.extractMovie).toBe('function');
    expect(typeof extractorService.extractEpisode).toBe('function');
  });

  test('should have analytics service available', async () => {
    const { analyticsService } = await import('@/lib/services/analytics');
    expect(analyticsService).toBeDefined();
    expect(typeof analyticsService.trackPageView).toBe('function');
    expect(typeof analyticsService.trackSearch).toBe('function');
    expect(typeof analyticsService.trackPlay).toBe('function');
  });
});
