/**
 * useAnalytics Hook
 * React hook for tracking user events with analytics service
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsService } from '@/lib/services/analytics';
import type { EventType } from '@/types/analytics';

/**
 * Hook for tracking page views automatically
 */
export function usePageTracking() {
  const pathname = usePathname();
  const previousPath = useRef<string>('');

  useEffect(() => {
    // Track page view when pathname changes
    if (pathname && pathname !== previousPath.current) {
      analyticsService.trackPageView(pathname, previousPath.current);
      previousPath.current = pathname;
    }
  }, [pathname]);
}

/**
 * Hook for tracking search events
 */
export function useSearchTracking() {
  const trackSearch = useCallback(
    (query: string, resultCount: number, selectedResult?: string) => {
      analyticsService.trackSearch(query, resultCount, selectedResult);
    },
    []
  );

  return { trackSearch };
}

/**
 * Hook for tracking content views
 */
export function useContentTracking() {
  const trackContentView = useCallback(
    (contentId: string, contentType: 'movie' | 'tv', title: string) => {
      analyticsService.trackContentView(contentId, contentType, title);
    },
    []
  );

  return { trackContentView };
}

/**
 * Hook for tracking video playback events
 */
export function usePlaybackTracking() {
  const trackPlay = useCallback(
    (
      contentId: string,
      contentType: 'movie' | 'episode',
      currentTime: number,
      duration: number,
      quality: string
    ) => {
      analyticsService.trackPlay(contentId, contentType, currentTime, duration, quality);
    },
    []
  );

  const trackPause = useCallback(
    (
      contentId: string,
      contentType: 'movie' | 'episode',
      currentTime: number,
      duration: number,
      quality: string
    ) => {
      analyticsService.trackPause(contentId, contentType, currentTime, duration, quality);
    },
    []
  );

  const trackSeek = useCallback(
    (
      contentId: string,
      contentType: 'movie' | 'episode',
      currentTime: number,
      duration: number,
      quality: string
    ) => {
      analyticsService.trackSeek(contentId, contentType, currentTime, duration, quality);
    },
    []
  );

  const trackComplete = useCallback(
    (
      contentId: string,
      contentType: 'movie' | 'episode',
      currentTime: number,
      duration: number,
      quality: string
    ) => {
      analyticsService.trackComplete(contentId, contentType, currentTime, duration, quality);
    },
    []
  );

  return {
    trackPlay,
    trackPause,
    trackSeek,
    trackComplete,
  };
}

/**
 * Main analytics hook with all tracking methods
 */
export function useAnalytics() {
  const { trackSearch } = useSearchTracking();
  const { trackContentView } = useContentTracking();
  const {
    trackPlay,
    trackPause,
    trackSeek,
    trackComplete,
  } = usePlaybackTracking();

  const trackEvent = useCallback(
    (eventType: EventType, metadata: Record<string, any>) => {
      analyticsService.trackEvent(eventType, metadata);
    },
    []
  );

  const optOut = useCallback(() => {
    analyticsService.optOut();
  }, []);

  const optIn = useCallback(() => {
    analyticsService.optIn();
  }, []);

  const isOptedOut = useCallback(() => {
    return analyticsService.isOptedOut();
  }, []);

  const getSessionId = useCallback(() => {
    return analyticsService.getSessionId();
  }, []);

  const flush = useCallback(async () => {
    await analyticsService.flush();
  }, []);

  return {
    // Search tracking
    trackSearch,
    
    // Content tracking
    trackContentView,
    
    // Playback tracking
    trackPlay,
    trackPause,
    trackSeek,
    trackComplete,
    
    // Custom events
    trackEvent,
    
    // Privacy controls
    optOut,
    optIn,
    isOptedOut,
    
    // Session management
    getSessionId,
    
    // Manual flush
    flush,
  };
}

/**
 * Hook for analytics privacy controls
 */
export function useAnalyticsPrivacy() {
  const optOut = useCallback(() => {
    analyticsService.optOut();
  }, []);

  const optIn = useCallback(() => {
    analyticsService.optIn();
  }, []);

  const isOptedOut = useCallback(() => {
    return analyticsService.isOptedOut();
  }, []);

  return {
    optOut,
    optIn,
    isOptedOut,
  };
}

/**
 * Hook for fetching analytics metrics (admin use)
 */
export function useAnalyticsMetrics(dateRange: '24h' | '7d' | '30d' | '90d' = '7d') {
  const fetchMetrics = useCallback(async () => {
    return await analyticsService.getMetrics(dateRange);
  }, [dateRange]);

  const exportData = useCallback(
    async (format: 'csv' | 'json' = 'json', customDateRange?: { start: number; end: number }) => {
      return await analyticsService.exportData(format, customDateRange);
    },
    []
  );

  return {
    fetchMetrics,
    exportData,
  };
}
