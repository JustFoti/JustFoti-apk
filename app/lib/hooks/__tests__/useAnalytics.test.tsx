/**
 * Analytics Hooks Tests
 * Tests for useAnalytics and related hooks
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import {
  useAnalytics,
  useSearchTracking,
  useContentTracking,
  usePlaybackTracking,
  useAnalyticsPrivacy,
} from '../useAnalytics';
import { analyticsService } from '@/lib/services/analytics';

// Mock the analytics service
const mockTrackPageView = mock(() => {});
const mockTrackSearch = mock(() => {});
const mockTrackContentView = mock(() => {});
const mockTrackPlay = mock(() => {});
const mockTrackPause = mock(() => {});
const mockTrackSeek = mock(() => {});
const mockTrackComplete = mock(() => {});
const mockTrackEvent = mock(() => {});
const mockOptOut = mock(() => {});
const mockOptIn = mock(() => {});
const mockIsOptedOut = mock(() => false);
const mockGetSessionId = mock(() => 'test-session-id');
const mockFlush = mock(async () => {});

// Mock analyticsService
const originalService = { ...analyticsService };

beforeEach(() => {
  // Reset mocks
  mockTrackPageView.mockClear();
  mockTrackSearch.mockClear();
  mockTrackContentView.mockClear();
  mockTrackPlay.mockClear();
  mockTrackPause.mockClear();
  mockTrackSeek.mockClear();
  mockTrackComplete.mockClear();
  mockTrackEvent.mockClear();
  mockOptOut.mockClear();
  mockOptIn.mockClear();
  mockIsOptedOut.mockClear();
  mockGetSessionId.mockClear();
  mockFlush.mockClear();

  // Mock service methods
  (analyticsService as any).trackPageView = mockTrackPageView;
  (analyticsService as any).trackSearch = mockTrackSearch;
  (analyticsService as any).trackContentView = mockTrackContentView;
  (analyticsService as any).trackPlay = mockTrackPlay;
  (analyticsService as any).trackPause = mockTrackPause;
  (analyticsService as any).trackSeek = mockTrackSeek;
  (analyticsService as any).trackComplete = mockTrackComplete;
  (analyticsService as any).trackEvent = mockTrackEvent;
  (analyticsService as any).optOut = mockOptOut;
  (analyticsService as any).optIn = mockOptIn;
  (analyticsService as any).isOptedOut = mockIsOptedOut;
  (analyticsService as any).getSessionId = mockGetSessionId;
  (analyticsService as any).flush = mockFlush;
});

afterEach(() => {
  // Restore original service
  Object.assign(analyticsService, originalService);
});

describe('useSearchTracking', () => {
  it('should track search events', () => {
    const { result } = renderHook(() => useSearchTracking());

    act(() => {
      result.current.trackSearch('action movies', 42);
    });

    expect(mockTrackSearch).toHaveBeenCalledTimes(1);
    expect(mockTrackSearch).toHaveBeenCalledWith('action movies', 42, undefined);
  });

  it('should track search with selected result', () => {
    const { result } = renderHook(() => useSearchTracking());

    act(() => {
      result.current.trackSearch('comedy', 10, 'movie-123');
    });

    expect(mockTrackSearch).toHaveBeenCalledWith('comedy', 10, 'movie-123');
  });
});

describe('useContentTracking', () => {
  it('should track content views', () => {
    const { result } = renderHook(() => useContentTracking());

    act(() => {
      result.current.trackContentView('movie-123', 'movie', 'Test Movie');
    });

    expect(mockTrackContentView).toHaveBeenCalledTimes(1);
    expect(mockTrackContentView).toHaveBeenCalledWith('movie-123', 'movie', 'Test Movie');
  });

  it('should track TV show views', () => {
    const { result } = renderHook(() => useContentTracking());

    act(() => {
      result.current.trackContentView('tv-456', 'tv', 'Test Show');
    });

    expect(mockTrackContentView).toHaveBeenCalledWith('tv-456', 'tv', 'Test Show');
  });
});

describe('usePlaybackTracking', () => {
  it('should track play events', () => {
    const { result } = renderHook(() => usePlaybackTracking());

    act(() => {
      result.current.trackPlay('movie-123', 'movie', 0, 7200, '1080p');
    });

    expect(mockTrackPlay).toHaveBeenCalledTimes(1);
    expect(mockTrackPlay).toHaveBeenCalledWith('movie-123', 'movie', 0, 7200, '1080p');
  });

  it('should track pause events', () => {
    const { result } = renderHook(() => usePlaybackTracking());

    act(() => {
      result.current.trackPause('movie-123', 'movie', 1234, 7200, '1080p');
    });

    expect(mockTrackPause).toHaveBeenCalledWith('movie-123', 'movie', 1234, 7200, '1080p');
  });

  it('should track seek events', () => {
    const { result } = renderHook(() => usePlaybackTracking());

    act(() => {
      result.current.trackSeek('episode-789', 'episode', 500, 2400, '720p');
    });

    expect(mockTrackSeek).toHaveBeenCalledWith('episode-789', 'episode', 500, 2400, '720p');
  });

  it('should track complete events', () => {
    const { result } = renderHook(() => usePlaybackTracking());

    act(() => {
      result.current.trackComplete('movie-123', 'movie', 7200, 7200, '1080p');
    });

    expect(mockTrackComplete).toHaveBeenCalledWith('movie-123', 'movie', 7200, 7200, '1080p');
  });
});

describe('useAnalytics', () => {
  it('should provide all tracking methods', () => {
    const { result } = renderHook(() => useAnalytics());

    expect(result.current.trackSearch).toBeDefined();
    expect(result.current.trackContentView).toBeDefined();
    expect(result.current.trackPlay).toBeDefined();
    expect(result.current.trackPause).toBeDefined();
    expect(result.current.trackSeek).toBeDefined();
    expect(result.current.trackComplete).toBeDefined();
    expect(result.current.trackEvent).toBeDefined();
    expect(result.current.optOut).toBeDefined();
    expect(result.current.optIn).toBeDefined();
    expect(result.current.isOptedOut).toBeDefined();
    expect(result.current.getSessionId).toBeDefined();
    expect(result.current.flush).toBeDefined();
  });

  it('should track custom events', () => {
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.trackEvent('page_view', { custom: 'data' });
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('page_view', { custom: 'data' });
  });

  it('should get session ID', () => {
    const { result } = renderHook(() => useAnalytics());

    const sessionId = result.current.getSessionId();

    expect(mockGetSessionId).toHaveBeenCalled();
    expect(sessionId).toBe('test-session-id');
  });

  it('should flush events', async () => {
    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      await result.current.flush();
    });

    expect(mockFlush).toHaveBeenCalled();
  });
});

describe('useAnalyticsPrivacy', () => {
  it('should opt out of analytics', () => {
    const { result } = renderHook(() => useAnalyticsPrivacy());

    act(() => {
      result.current.optOut();
    });

    expect(mockOptOut).toHaveBeenCalledTimes(1);
  });

  it('should opt in to analytics', () => {
    const { result } = renderHook(() => useAnalyticsPrivacy());

    act(() => {
      result.current.optIn();
    });

    expect(mockOptIn).toHaveBeenCalledTimes(1);
  });

  it('should check opt-out status', () => {
    const { result } = renderHook(() => useAnalyticsPrivacy());

    const isOptedOut = result.current.isOptedOut();

    expect(mockIsOptedOut).toHaveBeenCalled();
    expect(isOptedOut).toBe(false);
  });

  it('should return true when opted out', () => {
    mockIsOptedOut.mockReturnValue(true);
    const { result } = renderHook(() => useAnalyticsPrivacy());

    const isOptedOut = result.current.isOptedOut();

    expect(isOptedOut).toBe(true);
  });
});

describe('Hook stability', () => {
  it('should maintain stable function references', () => {
    const { result, rerender } = renderHook(() => useAnalytics());

    const firstRender = {
      trackSearch: result.current.trackSearch,
      trackContentView: result.current.trackContentView,
      trackPlay: result.current.trackPlay,
    };

    rerender();

    expect(result.current.trackSearch).toBe(firstRender.trackSearch);
    expect(result.current.trackContentView).toBe(firstRender.trackContentView);
    expect(result.current.trackPlay).toBe(firstRender.trackPlay);
  });
});

describe('Integration scenarios', () => {
  it('should handle complete video playback flow', () => {
    const { result } = renderHook(() => usePlaybackTracking());

    // User starts video
    act(() => {
      result.current.trackPlay('movie-123', 'movie', 0, 7200, '1080p');
    });

    // User pauses
    act(() => {
      result.current.trackPause('movie-123', 'movie', 1234, 7200, '1080p');
    });

    // User seeks
    act(() => {
      result.current.trackSeek('movie-123', 'movie', 3000, 7200, '1080p');
    });

    // User completes
    act(() => {
      result.current.trackComplete('movie-123', 'movie', 7200, 7200, '1080p');
    });

    expect(mockTrackPlay).toHaveBeenCalledTimes(1);
    expect(mockTrackPause).toHaveBeenCalledTimes(1);
    expect(mockTrackSeek).toHaveBeenCalledTimes(1);
    expect(mockTrackComplete).toHaveBeenCalledTimes(1);
  });

  it('should handle search to content view flow', () => {
    const { result: searchResult } = renderHook(() => useSearchTracking());
    const { result: contentResult } = renderHook(() => useContentTracking());

    // User searches
    act(() => {
      searchResult.current.trackSearch('action', 10);
    });

    // User selects result
    act(() => {
      searchResult.current.trackSearch('action', 10, 'movie-123');
    });

    // User views content
    act(() => {
      contentResult.current.trackContentView('movie-123', 'movie', 'Action Movie');
    });

    expect(mockTrackSearch).toHaveBeenCalledTimes(2);
    expect(mockTrackContentView).toHaveBeenCalledTimes(1);
  });
});
