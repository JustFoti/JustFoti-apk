'use client';

/**
 * Shared Admin Data Hooks
 * Reusable hooks for fetching and managing admin data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAdminAnalyticsUrl } from './useAnalyticsApi';

// ============================================
// TYPES
// ============================================

export interface FetchOptions {
  refreshInterval?: number;
  enabled?: boolean;
}

export interface FetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

// ============================================
// GENERIC FETCH HOOK
// ============================================

export function useFetch<T>(
  url: string | null,
  options: FetchOptions = {}
): FetchResult<T> {
  const { refreshInterval, enabled = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!refreshInterval || !enabled) return;
    
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval, enabled]);

  return { data, loading, error, refresh: fetchData, lastUpdated };
}

// ============================================
// WATCH SESSIONS HOOK
// ============================================

export interface WatchSession {
  id: string;
  user_id: string;
  content_id: string;
  content_type: string;
  content_title: string;
  season_number?: number;
  episode_number?: number;
  started_at: number;
  ended_at?: number;
  total_watch_time: number;
  last_position: number;
  duration: number;
  completion_percentage: number;
  quality?: string;
  device_type?: string;
  is_completed: boolean;
  pause_count: number;
  seek_count: number;
}

export interface WatchAnalytics {
  totalSessions: number;
  totalWatchTime: number;
  averageWatchTime: number;
  averageCompletionRate: number;
  totalPauses: number;
  totalSeeks: number;
  completedSessions: number;
  completionRate: number;
  deviceBreakdown: Record<string, number>;
  qualityBreakdown: Record<string, number>;
}

export function useWatchSessions(timeRange: string = '7d', limit: number = 200) {
  const [sessions, setSessions] = useState<WatchSession[]>([]);
  const [analytics, setAnalytics] = useState<WatchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const now = Date.now();
      const ranges: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        'all': 0,
      };

      const startDate = ranges[timeRange] ? now - ranges[timeRange] : 0;
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(startDate && { startDate: startDate.toString() }),
      });

      const response = await fetch(getAdminAnalyticsUrl('watch-session', Object.fromEntries(params)));
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions || []);
        setAnalytics(data.analytics);
      } else {
        throw new Error(data.error || 'Failed to fetch sessions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [timeRange, limit]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, analytics, loading, error, refresh: fetchSessions };
}

// ============================================
// USER ENGAGEMENT HOOK
// ============================================

export interface UserEngagement {
  user_id: string;
  first_visit: number;
  last_visit: number;
  total_visits: number;
  total_page_views: number;
  total_time_on_site: number;
  total_watch_time: number;
  avg_session_duration: number;
  avg_pages_per_session: number;
  engagement_score: number;
  device_types: string;
  countries: string;
  bounce_count: number;
}

export interface EngagementStats {
  total_users: number;
  avg_visits_per_user: number;
  avg_pages_per_user: number;
  avg_time_per_user: number;
  avg_engagement_score: number;
  return_rate: number;
  overall_bounce_rate: number;
}

export function useUserEngagement(timeRange: string = '7d', sortBy: string = 'last_visit') {
  const [users, setUsers] = useState<UserEngagement[]>([]);
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [frequency, setFrequency] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 365;
      const response = await fetch(getAdminAnalyticsUrl('user-engagement', { days, sortBy }));
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.users || []);
          setStats(data.aggregateStats);
          setDistribution(data.engagementDistribution || []);
          setFrequency(data.visitFrequency || []);
        } else {
          throw new Error(data.error || 'Failed to fetch users');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [timeRange, sortBy]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, stats, distribution, frequency, loading, error, refresh: fetchUsers };
}

// ============================================
// TRAFFIC SOURCES HOOK
// ============================================

export interface TrafficData {
  totals: {
    total_hits: number;
    unique_visitors: number;
    bot_hits: number;
    human_hits: number;
  };
  sourceTypeStats: Array<{ source_type: string; source_name: string; hit_count: number; unique_visitors: number }>;
  mediumStats: Array<{ referrer_medium: string; hit_count: number; unique_visitors: number }>;
  topReferrers: Array<{ referrer_domain: string; referrer_medium: string; hit_count: number; last_hit: number }>;
  botStats: Array<{ source_name: string; hit_count: number }>;
  hourlyPattern: Array<{ hour: number; hit_count: number; bot_hits: number }>;
  geoStats: Array<{ country: string; hit_count: number; unique_visitors: number }>;
}

export function useTrafficSources(timeRange: string = '7d') {
  const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 365;
  const url = getAdminAnalyticsUrl('traffic-sources', { days });
  
  const { data, loading, error, refresh, lastUpdated } = useFetch<{ success: boolean } & TrafficData>(url, {
    refreshInterval: 30000,
  });

  return {
    data: data?.success ? data : null,
    loading,
    error,
    refresh,
    lastUpdated,
  };
}

// ============================================
// PRESENCE STATS HOOK
// ============================================

export interface PresenceStats {
  totals: { total_active: number; truly_active: number; total_sessions: number };
  activityBreakdown: Array<{ activity_type: string; user_count: number; truly_active: number }>;
  validationScores: Array<{ trust_level: string; user_count: number; avg_score: number }>;
  activeContent: Array<{ content_title: string; content_type: string; activity_type: string; viewer_count: number }>;
  geoDistribution: Array<{ country: string; city: string; user_count: number }>;
  deviceDistribution: Array<{ device_type: string; user_count: number }>;
}

export function usePresenceStats(minutes: number = 30) {
  const url = getAdminAnalyticsUrl('presence-stats', { minutes });
  
  const { data, loading, error, refresh, lastUpdated } = useFetch<{ success: boolean } & PresenceStats>(url, {
    refreshInterval: 15000,
  });

  return {
    data: data?.success ? data : null,
    loading,
    error,
    refresh,
    lastUpdated,
  };
}

// ============================================
// LIVE TV STATS HOOK
// ============================================

export interface LiveTVStats {
  currentViewers: number;
  stats: {
    totalCurrentWatchTime: number;
    totalBufferEvents: number;
    recentSessions: number;
    avgSessionDuration: number;
    totalHistoricalWatchTime: number;
  };
  channels: Array<{
    channelId: string;
    channelName: string;
    category?: string;
    viewerCount: number;
  }>;
  categories: Array<{
    category: string;
    viewerCount: number;
  }>;
}

export function useLiveTVStats() {
  const url = getAdminAnalyticsUrl('livetv-session', { history: 'true' });
  
  const { data, loading, error, refresh, lastUpdated } = useFetch<LiveTVStats>(url, {
    refreshInterval: 30000,
  });

  return { data, loading, error, refresh, lastUpdated };
}

// ============================================
// FILTERING & SORTING UTILITIES
// ============================================

export function useFilteredData<T>(
  data: T[],
  filters: {
    searchQuery?: string;
    searchFields?: (keyof T)[];
    filterField?: keyof T;
    filterValue?: string;
  }
) {
  return useMemo(() => {
    let result = [...data];
    
    const { searchQuery, searchFields = [], filterField, filterValue } = filters;
    
    if (searchQuery && searchFields.length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        searchFields.some(field => 
          String(item[field] || '').toLowerCase().includes(query)
        )
      );
    }
    
    if (filterField && filterValue && filterValue !== 'all') {
      result = result.filter(item => item[filterField] === filterValue);
    }
    
    return result;
  }, [data, filters]);
}

export function useSortedData<T>(
  data: T[],
  sortField: keyof T,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  return useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }
      
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      return sortOrder === 'desc' ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr);
    });
  }, [data, sortField, sortOrder]);
}

// ============================================
// TIME RANGE UTILITIES
// ============================================

export function getTimeRangeMs(range: string): number {
  const ranges: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    '365d': 365 * 24 * 60 * 60 * 1000,
    'all': 0,
  };
  return ranges[range] || ranges['7d'];
}

export function getTimeRangeDays(range: string): number {
  const days: Record<string, number> = {
    '1h': 0,
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '365d': 365,
    'all': 9999,
  };
  return days[range] || 7;
}
