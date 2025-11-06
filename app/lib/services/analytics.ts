/**
 * Analytics Service
 * Enhanced analytics with anonymized user tracking
 */

import { userTrackingService, type UserSession } from './user-tracking';

export interface AnalyticsEvent {
  id: string;
  type: string;
  userId: string;
  sessionId: string;
  deviceId: string;
  timestamp: number;
  data?: Record<string, any>;
  metadata: Record<string, any>;
}

export interface PageViewEvent {
  page: string;
  referrer?: string;
  loadTime?: number;
}

export interface WatchEvent {
  contentId: string;
  contentType: 'movie' | 'tv';
  action: 'start' | 'pause' | 'resume' | 'complete' | 'progress';
  currentTime: number;
  duration: number;
  quality?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface SearchEvent {
  query: string;
  resultsCount: number;
  selectedResult?: string;
  filters?: Record<string, any>;
}

export interface InteractionEvent {
  element: string;
  action: 'click' | 'hover' | 'scroll' | 'focus';
  context?: Record<string, any>;
}

class AnalyticsService {
  private userSession: UserSession | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * Initialize analytics service
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    this.userSession = userTrackingService.initialize();
    this.isInitialized = true;
    
    // Track page load
    this.trackPageView(window.location.pathname);
    
    // Set up periodic flush
    this.scheduleFlush();
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flushEvents();
      }
    });
    
    // Track before page unload
    window.addEventListener('beforeunload', () => {
      this.flushEvents();
    });
  }

  /**
   * Track a generic event
   */
  track(eventType: string, data?: Record<string, any>): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type: eventType,
      userId: this.userSession?.userId || 'anonymous',
      sessionId: this.userSession?.sessionId || 'unknown',
      deviceId: this.userSession?.deviceId || 'unknown',
      timestamp: Date.now(),
      data: data || {},
      metadata: userTrackingService.getAnalyticsMetadata(),
    };

    this.eventQueue.push(event);
    userTrackingService.updateLastActivity();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
    }
    
    this.scheduleFlush();
  }

  /**
   * Track page view
   */
  trackPageView(path: string, data?: PageViewEvent): void {
    this.track('page_view', {
      page: path,
      referrer: document.referrer,
      loadTime: performance.now(),
      ...data,
    });
  }

  /**
   * Track watch events
   */
  trackWatchEvent(event: WatchEvent): void {
    this.track('watch_event', event);
    
    // Update watch progress in user tracking
    if (event.action === 'progress' || event.action === 'complete') {
      userTrackingService.updateWatchProgress({
        contentId: event.contentId,
        contentType: event.contentType,
        seasonNumber: event.seasonNumber,
        episodeNumber: event.episodeNumber,
        currentTime: event.currentTime,
        duration: event.duration,
        completionPercentage: Math.round((event.currentTime / event.duration) * 100),
        lastWatched: Date.now(),
        completed: event.action === 'complete',
      });
    }
  }

  /**
   * Track search events
   */
  trackSearchEvent(event: SearchEvent): void {
    this.track('search_event', event);
  }

  /**
   * Track user interactions
   */
  trackInteraction(event: InteractionEvent): void {
    this.track('interaction', event);
  }

  /**
   * Track content engagement
   */
  trackContentEngagement(contentId: string, contentType: 'movie' | 'tv', action: string, data?: Record<string, any>): void {
    this.track('content_engagement', {
      contentId,
      contentType,
      action,
      ...data,
    });
  }

  /**
   * Track error events
   */
  trackError(error: Error, context?: Record<string, any>): void {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, context?: Record<string, any>): void {
    this.track('performance', {
      metric,
      value,
      context,
    });
  }

  /**
   * Schedule event flush
   */
  private scheduleFlush(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    
    // Flush immediately if queue is large, otherwise wait
    const delay = this.eventQueue.length > 10 ? 0 : 5000;
    
    this.flushTimeout = setTimeout(() => {
      this.flushEvents();
    }, delay);
  }

  /**
   * Flush events to server
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });
      
      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      
      // Re-queue events on failure (with limit to prevent memory issues)
      if (this.eventQueue.length < 100) {
        this.eventQueue.unshift(...events.slice(0, 50));
      }
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current user session
   */
  getUserSession(): UserSession | null {
    return this.userSession;
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(preferences: Partial<any>): void {
    userTrackingService.updatePreferences(preferences);
    this.track('preferences_updated', preferences);
  }

  /**
   * Clear user data (for privacy)
   */
  clearUserData(): void {
    userTrackingService.clearUserData();
    this.track('user_data_cleared');
    this.flushEvents();
  }
}

export const analyticsService = new AnalyticsService();

export class EventQueue {
  private queue: AnalyticsEvent[] = [];

  add(event: AnalyticsEvent): void {
    this.queue.push(event);
  }

  flush(): AnalyticsEvent[] {
    const events = [...this.queue];
    this.queue = [];
    return events;
  }

  size(): number {
    return this.queue.length;
  }
}

export const eventQueue = new EventQueue();