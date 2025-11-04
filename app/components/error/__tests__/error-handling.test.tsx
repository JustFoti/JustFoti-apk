/**
 * Error Handling System Tests
 * Tests for error boundaries, error display, and error utilities
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorDisplay } from '../ErrorDisplay';
import { apiClient } from '@/lib/utils/api-client';
import { offlineManager } from '@/lib/utils/offline-manager';
import { swrCache } from '@/lib/utils/swr-cache';
import { parseError, retryWithBackoff } from '@/lib/utils/error-handler';

// Mock component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('catches errors and shows fallback UI', () => {
    render(
      <ErrorBoundary level="component">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/failed to load this section/i)).toBeInTheDocument();
  });

  test('shows retry button', () => {
    render(
      <ErrorBoundary level="component">
        <ThrowError />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText(/retry/i);
    expect(retryButton).toBeInTheDocument();
  });

  test('resets error state on retry', () => {
    const { rerender } = render(
      <ErrorBoundary level="component">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/failed to load this section/i)).toBeInTheDocument();

    const retryButton = screen.getByText(/retry/i);
    fireEvent.click(retryButton);

    rerender(
      <ErrorBoundary level="component">
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/failed to load this section/i)).not.toBeInTheDocument();
  });

  test('calls onError callback', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary level="component" onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
  });

  test('uses custom fallback', () => {
    const customFallback = (error: Error, reset: () => void) => (
      <div>
        <p>Custom error: {error.message}</p>
        <button onClick={reset}>Custom retry</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/custom error: test error/i)).toBeInTheDocument();
    expect(screen.getByText(/custom retry/i)).toBeInTheDocument();
  });
});

describe('ErrorDisplay', () => {
  const mockError = {
    code: 'NETWORK_ERROR',
    message: 'Network request failed',
    statusCode: 0,
    retryable: true,
  };

  test('displays error message', () => {
    render(<ErrorDisplay error={mockError} />);
    expect(screen.getByText(/network request failed/i)).toBeInTheDocument();
  });

  test('shows retry button for retryable errors', () => {
    const onRetry = jest.fn();
    render(<ErrorDisplay error={mockError} onRetry={onRetry} />);

    const retryButton = screen.getByText(/retry/i);
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  test('does not show retry button for non-retryable errors', () => {
    const nonRetryableError = {
      ...mockError,
      retryable: false,
    };

    render(<ErrorDisplay error={nonRetryableError} />);
    expect(screen.queryByText(/retry/i)).not.toBeInTheDocument();
  });

  test('renders banner variant', () => {
    const { container } = render(
      <ErrorDisplay error={mockError} variant="banner" />
    );

    const banner = container.querySelector('.banner');
    expect(banner).toBeInTheDocument();
  });

  test('renders modal variant', () => {
    const { container } = render(
      <ErrorDisplay error={mockError} variant="modal" />
    );

    const modal = container.querySelector('.modal');
    expect(modal).toBeInTheDocument();
  });

  test('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = jest.fn();
    render(
      <ErrorDisplay
        error={mockError}
        variant="banner"
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button', { name: '' }); // SVG button
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('Error Handler Utilities', () => {
  test('parseError converts generic error to APIError', () => {
    const error = new Error('Test error');
    const apiError = parseError(error);

    expect(apiError).toHaveProperty('code');
    expect(apiError).toHaveProperty('message');
    expect(apiError).toHaveProperty('statusCode');
    expect(apiError).toHaveProperty('retryable');
  });

  test('parseError handles network errors', () => {
    const networkError = new TypeError('Failed to fetch');
    const apiError = parseError(networkError);

    expect(apiError.code).toBe('NETWORK_ERROR');
    expect(apiError.retryable).toBe(true);
  });

  test('retryWithBackoff retries on failure', async () => {
    let attempts = 0;
    const fn = jest.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary error');
      }
      return 'success';
    });

    const result = await retryWithBackoff(fn, {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('retryWithBackoff throws after max attempts', async () => {
    const fn = jest.fn(async () => {
      throw new Error('Persistent error');
    });

    await expect(
      retryWithBackoff(fn, {
        maxAttempts: 2,
        initialDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
      })
    ).rejects.toThrow();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('API Client', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    swrCache.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('makes GET request', async () => {
    const mockData = { results: [] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const data = await apiClient.get('/api/test');
    expect(data).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test('makes POST request', async () => {
    const mockData = { success: true };
    const postData = { test: 'data' };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const data = await apiClient.post('/api/test', postData);
    expect(data).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(postData),
      })
    );
  });

  test('handles HTTP errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Resource not found' }),
    });

    await expect(apiClient.get('/api/test')).rejects.toMatchObject({
      statusCode: 404,
      retryable: false,
    });
  });

  test('retries on network error', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

    const data = await apiClient.get('/api/test');
    expect(data).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('caches GET requests', async () => {
    const mockData = { results: [] };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    // First call
    await apiClient.get('/api/test');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second call should use cache
    await apiClient.get('/api/test');
    expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1
  });

  test('invalidates cache', async () => {
    const mockData = { results: [] };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    await apiClient.get('/api/test');
    apiClient.invalidateCache('/api/test');
    await apiClient.get('/api/test');

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('Offline Manager', () => {
  test('detects offline state', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    expect(offlineManager.getIsOffline()).toBe(true);
  });

  test('queues requests when offline', () => {
    const requestId = offlineManager.queueRequest('/api/test', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' }),
    });

    expect(requestId).toBeTruthy();
    expect(offlineManager.getQueueSize()).toBeGreaterThan(0);
  });

  test('clears queue', () => {
    offlineManager.queueRequest('/api/test', { method: 'POST' });
    offlineManager.clearQueue();
    expect(offlineManager.getQueueSize()).toBe(0);
  });
});

describe('SWR Cache', () => {
  beforeEach(() => {
    swrCache.clear();
  });

  test('caches data', async () => {
    const fetcher = jest.fn(async () => ({ data: 'test' }));

    const result1 = await swrCache.get('test-key', fetcher, {
      ttl: 5000,
      staleTime: 1000,
    });

    const result2 = await swrCache.get('test-key', fetcher, {
      ttl: 5000,
      staleTime: 1000,
    });

    expect(result1).toEqual(result2);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test('invalidates cache', async () => {
    const fetcher = jest.fn(async () => ({ data: 'test' }));

    await swrCache.get('test-key', fetcher, {
      ttl: 5000,
      staleTime: 1000,
    });

    swrCache.invalidate('test-key');

    await swrCache.get('test-key', fetcher, {
      ttl: 5000,
      staleTime: 1000,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test('returns stale data on error', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({ data: 'cached' })
      .mockRejectedValueOnce(new Error('Network error'));

    // First call succeeds
    const result1 = await swrCache.get('test-key', fetcher, {
      ttl: 5000,
      staleTime: 1000,
    });

    expect(result1).toEqual({ data: 'cached' });

    // Invalidate to force refetch
    swrCache.invalidate('test-key');

    // Second call fails but returns cached data
    const result2 = await swrCache.get('test-key', fetcher, {
      ttl: 5000,
      staleTime: 1000,
    });

    expect(result2).toEqual({ data: 'cached' });
  });
});
