/**
 * Analytics Types - Event tracking and metrics models
 */

export type EventType = 
  | 'page_view' 
  | 'search' 
  | 'content_view' 
  | 'play' 
  | 'pause' 
  | 'seek' 
  | 'complete';

export interface AnalyticsEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  eventType: EventType;
  metadata: Record<string, any>;
}

export interface PlaybackEvent extends AnalyticsEvent {
  eventType: 'play' | 'pause' | 'seek' | 'complete';
  metadata: {
    contentId: string;
    contentType: 'movie' | 'episode';
    currentTime: number;
    duration: number;
    quality: string;
  };
}

export interface SearchEvent extends AnalyticsEvent {
  eventType: 'search';
  metadata: {
    query: string;
    resultCount: number;
    selectedResult?: string;
  };
}

export interface PageViewEvent extends AnalyticsEvent {
  eventType: 'page_view';
  metadata: {
    path: string;
    referrer?: string;
  };
}

export interface ContentViewEvent extends AnalyticsEvent {
  eventType: 'content_view';
  metadata: {
    contentId: string;
    contentType: 'movie' | 'tv';
    title: string;
  };
}

export interface MetricsData {
  date: string;
  totalViews: number;
  totalWatchTime: number;
  uniqueSessions: number;
  avgSessionDuration: number;
  topContent: string;
}

export interface ContentStats {
  contentId: string;
  contentType: 'movie' | 'tv';
  viewCount: number;
  totalWatchTime: number;
  completionRate: number;
  avgWatchTime: number;
  lastViewed: number;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  label?: string;
}
