/**
 * Analytics Service
 * Handles event tracking, aggregation, and metrics collection
 */

import type {
  AnalyticsEvent,
  PlaybackEvent,
  SearchEvent,
  PageViewEvent,
  ContentViewEvent,
  EventType,
} from '@/types/analytics';
import { APIErrorHandler, createAPIError } from '@/lib/utils/error-handler';

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  // Check if session ID exists in sessionStorage
  let sessionId = sessionStorage.getItem('flyx_session_id');
  
  if (!sessionId) {
    // Generate new UUID v4
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    sessionStorage.setItem('flyx_session_id', sessionId);
  }
  
  return sessionId;
}

/**
 * Check if user has opted out of analytics
 */
function hasOptedOut(): boolean {
  if (typeof window === 'undefined') return true;
  
  // Check Do Not Track header
  if (navigator.doNotTrack === '1' || (window as any).doNotTrack === '1') {
    return true;
  }
  
  // Check localStorage opt-out flag
  return localStorage.getItem('flyx_analytics_opt_out') === 'true';
}

/**
 * Event queue for batch processing
 */
class EventQueue {
  private queue: AnalyticsEvent[] = [];
  private maxSize = 10;
  private flushInterval = 5000; // 5 seconds
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.startTimer();
      
      // Flush on page unload
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  add(event: AnalyticsEvent): void {
    this.queue.push(event);
    
    // Flush if queue is full
    if (this.queue.length >= this.maxSize) {
      this.flush();
    }
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
        // Use keepalive for requests during page unload
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-queue events on failure (up to max size)
      this.queue.unshift(...events.slice(0, this.maxSize - this.queue.length));
    }
  }

  clear(): void {
    this.queue = [];
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}

// Singleton event queue
const eventQueue = new EventQueue();

/**
 * Create a base analytics event
 */
function createEvent(
  eventType: EventType,
  metadata: Record<string, any>
): AnalyticsEvent {
  return {
    id: crypto.randomUUID(),
    sessionId: generateSessionId(),
    timestamp: Date.now(),
    eventType,
    metadata,
  };
}

/**
 * Analytics Service
 */
export const analyticsService = {
  /**
   * Track a page view
   */
  trackPageView(path: string, referrer?: string): void {
    if (hasOptedOut()) return;

    const event: PageViewEvent = createEvent('page_view', {
      path,
      referrer: referrer || document.referrer,
    }) as PageViewEvent;

    eventQueue.add(event);
  },

  /**
   * Track a search query
   */
  trackSearch(query: string, resultCount: number, selectedResult?: string): void {
    if (hasOptedOut()) return;

    const event: SearchEvent = createEvent('search', {
      query,
      resultCount,
      selectedResult,
    }) as SearchEvent;

    eventQueue.add(event);
  },

  /**
   * Track content view
   */
  trackContentView(contentId: string, contentType: 'movie' | 'tv', title: string): void {
    if (hasOptedOut()) return;

    const event: ContentViewEvent = createEvent('content_view', {
      contentId,
      contentType,
      title,
    }) as ContentViewEvent;

    eventQueue.add(event);
  },

  /**
   * Track video playback start
   */
  trackPlay(
    contentId: string,
    contentType: 'movie' | 'episode',
    currentTime: number,
    duration: number,
    quality: string
  ): void {
    if (hasOptedOut()) return;

    const event: PlaybackEvent = createEvent('play', {
      contentId,
      contentType,
      currentTime,
      duration,
      quality,
    }) as PlaybackEvent;

    eventQueue.add(event);
  },

  /**
   * Track video pause
   */
  trackPause(
    contentId: string,
    contentType: 'movie' | 'episode',
    currentTime: number,
    duration: number,
    quality: string
  ): void {
    if (hasOptedOut()) return;

    const event: PlaybackEvent = createEvent('pause', {
      contentId,
      contentType,
      currentTime,
      duration,
      quality,
    }) as PlaybackEvent;

    eventQueue.add(event);
  },

  /**
   * Track video seek
   */
  trackSeek(
    contentId: string,
    contentType: 'movie' | 'episode',
    currentTime: number,
    duration: number,
    quality: string
  ): void {
    if (hasOptedOut()) return;

    const event: PlaybackEvent = createEvent('seek', {
      contentId,
      contentType,
      currentTime,
      duration,
      quality,
    }) as PlaybackEvent;

    eventQueue.add(event);
  },

  /**
   * Track video completion
   */
  trackComplete(
    contentId: string,
    contentType: 'movie' | 'episode',
    currentTime: number,
    duration: number,
    quality: string
  ): void {
    if (hasOptedOut()) return;

    const event: PlaybackEvent = createEvent('complete', {
      contentId,
      contentType,
      currentTime,
      duration,
      quality,
    }) as PlaybackEvent;

    eventQueue.add(event);
  },

  /**
   * Track custom event
   */
  trackEvent(eventType: EventType, metadata: Record<string, any>): void {
    if (hasOptedOut()) return;

    const event = createEvent(eventType, metadata);
    eventQueue.add(event);
  },

  /**
   * Opt out of analytics
   */
  optOut(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('flyx_analytics_opt_out', 'true');
    eventQueue.clear();
  },

  /**
   * Opt in to analytics
   */
  optIn(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('flyx_analytics_opt_out');
  },

  /**
   * Check if user has opted out
   */
  isOptedOut(): boolean {
    return hasOptedOut();
  },

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return generateSessionId();
  },

  /**
   * Manually flush event queue
   */
  async flush(): Promise<void> {
    await eventQueue.flush();
  },

  /**
   * Fetch metrics from API
   */
  async getMetrics(
    dateRange: '24h' | '7d' | '30d' | '90d' = '7d'
  ): Promise<any> {
    try {
      const response = await fetch(`/api/analytics/metrics?range=${dateRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw createAPIError(
          `METRICS_${response.status}`,
          'Failed to fetch metrics',
          response.status,
          false
        );
      }

      return await response.json();
    } catch (error) {
      throw APIErrorHandler.handle(error);
    }
  },

  /**
   * Export analytics data
   */
  async exportData(
    format: 'csv' | 'json' = 'json',
    dateRange?: { start: number; end: number }
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams({ format });
      if (dateRange) {
        params.append('start', dateRange.start.toString());
        params.append('end', dateRange.end.toString());
      }

      const response = await fetch(`/api/analytics/export?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw createAPIError(
          `EXPORT_${response.status}`,
          'Failed to export data',
          response.status,
          false
        );
      }

      return await response.blob();
    } catch (error) {
      throw APIErrorHandler.handle(error);
    }
  },
};

// Export event queue for testing
export { eventQueue };
