/**
 * Analytics Types
 * Type definitions for analytics, metrics, and content statistics
 */

export interface AnalyticsEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  eventType: string;
  metadata: Record<string, any>;
}

export interface MetricsData {
  date: string;
  totalViews: number;
  totalWatchTime: number;
  uniqueSessions: number;
  avgSessionDuration: number;
  topContent: string; // JSON string
  updatedAt?: number;
}

export interface ContentStats {
  contentId: string;
  contentType: 'movie' | 'tv';
  viewCount: number;
  totalWatchTime: number;
  completionRate: number;
  avgWatchTime: number;
  lastViewed: number;
  updatedAt?: number;
}

export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
  last_login?: number;
}

// Enhanced analytics types for user tracking
export interface UserAnalytics {
  userId: string;
  deviceId: string;
  sessionCount: number;
  totalWatchTime: number;
  favoriteGenres: string[];
  preferredQuality: string;
  avgSessionDuration: number;
  completionRate: number;
  lastActive: number;
  createdAt: number;
}

export interface WatchSession {
  sessionId: string;
  userId: string;
  contentId: string;
  contentType: 'movie' | 'tv';
  startTime: number;
  endTime?: number;
  watchTime: number;
  completed: boolean;
  quality: string;
  device: string;
}

export interface SearchAnalytics {
  query: string;
  normalizedQuery: string;
  userId: string;
  sessionId: string;
  resultsCount: number;
  clickedResult?: string;
  timestamp: number;
}

export interface InteractionAnalytics {
  userId: string;
  sessionId: string;
  element: string;
  action: string;
  context: Record<string, any>;
  timestamp: number;
}

export interface PerformanceMetrics {
  userId: string;
  sessionId: string;
  metric: string;
  value: number;
  context: Record<string, any>;
  timestamp: number;
}