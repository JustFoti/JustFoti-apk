'use client';

/**
 * Unified Analytics Page - Complete Refactor
 * Merges analytics and analytics-v2 pages into single comprehensive page
 * Implements tabbed interface for different analytics views (sessions, trends, engagement)
 * Uses unified stats context for consistent data across all tabs
 * Includes advanced filtering and search capabilities
 * Requirements: 4.2, 4.3, 4.4, 4.5
 */

import { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useStats } from '../context/StatsContext';
import { getAdminAnalyticsUrl } from '../hooks/useAnalyticsApi';
import BotFilterControls from '../components/BotFilterControls';

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Data interfaces
interface WatchSession {
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

interface LiveTVAnalytics {
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
  recentHistory?: Array<{
    channelName: string;
    totalWatchDuration: number;
    startedAt: number;
    endedAt: number;
  }>;
}

interface TrendData {
  label: string;
  current: number;
  previous: number;
  change: number;
}

interface TrafficSources {
  totals?: {
    total_hits: number;
    human_hits: number;
    bot_hits: number;
    unique_visitors: number;
  };
  mediumStats?: Array<{
    referrer_medium: string;
    hit_count: string;
  }>;
  topReferrers?: Array<{
    referrer_domain: string;
    hit_count: string;
  }>;
  botStats?: Array<{
    source_name: string;
    hit_count: string;
  }>;
  geoStats?: Array<{
    country: string;
    hit_count: string;
  }>;
}

type AnalyticsTab = 'overview' | 'sessions' | 'livetv' | 'trends' | 'engagement' | 'traffic';

export default function UnifiedAnalyticsPage() {
  useAdmin(); // Context for admin state
  const { stats: unifiedStats, botFilterOptions } = useStats(); // Use unified stats as primary source
  
  const [sessions, setSessions] = useState<WatchSession[]>([]);
  const [liveTVAnalytics, setLiveTVAnalytics] = useState<LiveTVAnalytics | null>(null);
  const [trafficSources, setTrafficSources] = useState<TrafficSources | null>(null);
  const [previousAnalytics, setPreviousAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  
  // Advanced filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [filterQuality, setFilterQuality] = useState<string>('all');
  const [filterContentType, setFilterContentType] = useState<string>('all');
  const [sortField, setSortField] = useState<'started_at' | 'total_watch_time' | 'completion_percentage'>('started_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounce search query for better performance (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchAnalytics();
    fetchLiveTVAnalytics();
    fetchTrafficSources();
    fetchPreviousPeriodData();
  }, [timeRange, botFilterOptions]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const now = Date.now();
      const ranges: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        'all': 0,
      };

      const startDate = ranges[timeRange] ? now - ranges[timeRange] : 0;
      const params: any = { limit: '200' };
      if (startDate) params.startDate = startDate.toString();
      
      // Apply bot filtering
      if (!botFilterOptions.includeBots) {
        params.excludeBots = 'true';
        params.confidenceThreshold = botFilterOptions.confidenceThreshold.toString();
      }

      const response = await fetch(getAdminAnalyticsUrl('watch-session', params));
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveTVAnalytics = async () => {
    try {
      const response = await fetch(getAdminAnalyticsUrl('livetv-session', { history: 'true' }));
      const data = await response.json();
      if (data.success !== false) {
        setLiveTVAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch Live TV analytics:', error);
    }
  };

  const fetchTrafficSources = async () => {
    try {
      const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 365;
      const response = await fetch(getAdminAnalyticsUrl('traffic-sources', { days }));
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTrafficSources(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch traffic sources:', error);
    }
  };

  const fetchPreviousPeriodData = async () => {
    try {
      const now = Date.now();
      const ranges: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        'all': 0,
      };

      const periodLength = ranges[timeRange] || ranges['7d'];
      if (periodLength === 0) {
        setPreviousAnalytics(null);
        return;
      }

      const prevEndDate = now - periodLength;
      const prevStartDate = now - (2 * periodLength);

      const response = await fetch(getAdminAnalyticsUrl('watch-session', { 
        limit: '200', 
        startDate: prevStartDate.toString(), 
        endDate: prevEndDate.toString() 
      }));
      const data = await response.json();

      if (data.success && data.analytics) {
        setPreviousAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch previous period analytics:', error);
      setPreviousAnalytics(null);
    }
  };

  // Computed filtered and sorted sessions with advanced filtering
  const filteredSessions = useMemo(() => {
    let result = [...sessions];
    
    // Apply search filter with debounced query
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(s => 
        s.content_title?.toLowerCase().includes(query) ||
        s.content_id?.toLowerCase().includes(query) ||
        s.user_id?.toLowerCase().includes(query)
      );
    }
    
    // Apply device filter
    if (filterDevice !== 'all') {
      result = result.filter(s => s.device_type === filterDevice);
    }
    
    // Apply quality filter
    if (filterQuality !== 'all') {
      result = result.filter(s => s.quality === filterQuality);
    }

    // Apply content type filter
    if (filterContentType !== 'all') {
      result = result.filter(s => s.content_type === filterContentType);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return result;
  }, [sessions, debouncedSearchQuery, filterDevice, filterQuality, filterContentType, sortField, sortOrder]);

  // Calculate trends using real previous period data
  const trends = useMemo((): TrendData[] => {
    const calculateChange = (current: number, previous: number | undefined): number => {
      if (previous === undefined || previous === 0) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };
    
    return [
      {
        label: 'Total Sessions',
        current: unifiedStats.totalSessions,
        previous: previousAnalytics?.totalSessions ?? 0,
        change: calculateChange(unifiedStats.totalSessions, previousAnalytics?.totalSessions),
      },
      {
        label: 'Watch Time',
        current: unifiedStats.totalWatchTime,
        previous: previousAnalytics?.totalWatchTime ?? 0,
        change: calculateChange(unifiedStats.totalWatchTime, previousAnalytics?.totalWatchTime),
      },
      {
        label: 'Completion Rate',
        current: unifiedStats.completionRate,
        previous: previousAnalytics?.completionRate ?? 0,
        change: calculateChange(unifiedStats.completionRate, previousAnalytics?.completionRate),
      },
      {
        label: 'Avg Session Duration',
        current: unifiedStats.avgSessionDuration,
        previous: previousAnalytics?.averageWatchTime ?? 0,
        change: calculateChange(unifiedStats.avgSessionDuration, previousAnalytics?.averageWatchTime),
      },
    ];
  }, [unifiedStats, previousAnalytics]);

  // Engagement metrics
  const engagementMetrics = useMemo(() => {
    if (sessions.length === 0) return null;
    
    const avgPausesPerSession = (unifiedStats.totalPauses || 0) / Math.max(unifiedStats.totalSessions, 1);
    const avgSeeksPerSession = (unifiedStats.totalSeeks || 0) / Math.max(unifiedStats.totalSessions, 1);
    
    const completionDistribution = {
      '0-25%': sessions.filter(s => s.completion_percentage < 25).length,
      '25-50%': sessions.filter(s => s.completion_percentage >= 25 && s.completion_percentage < 50).length,
      '50-75%': sessions.filter(s => s.completion_percentage >= 50 && s.completion_percentage < 75).length,
      '75-100%': sessions.filter(s => s.completion_percentage >= 75).length,
    };
    
    // Calculate peak hours
    const hourCounts: Record<number, number> = {};
    sessions.forEach(s => {
      const hour = new Date(s.started_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    
    return {
      avgPausesPerSession: Math.round(avgPausesPerSession * 10) / 10,
      avgSeeksPerSession: Math.round(avgSeeksPerSession * 10) / 10,
      completionDistribution,
      peakHour: peakHour ? parseInt(peakHour[0]) : 0,
      peakHourCount: peakHour ? peakHour[1] : 0,
      hourCounts,
    };
  }, [sessions, unifiedStats]);

  // Content type segmentation
  const contentSegmentation = useMemo(() => {
    const movies = sessions.filter(s => s.content_type === 'movie');
    const tvShows = sessions.filter(s => s.content_type === 'tv_show');
    
    const calculateMetrics = (sessionList: WatchSession[]) => {
      if (sessionList.length === 0) return { sessions: 0, watchTime: 0, avgCompletion: 0 };
      
      const totalWatchTime = sessionList.reduce((sum, s) => sum + s.total_watch_time, 0);
      const totalCompletion = sessionList.reduce((sum, s) => sum + s.completion_percentage, 0);
      
      return {
        sessions: sessionList.length,
        watchTime: Math.round(totalWatchTime / 60), // Convert to minutes
        avgCompletion: Math.round(totalCompletion / sessionList.length),
      };
    };
    
    return {
      movies: calculateMetrics(movies),
      tvShows: calculateMetrics(tvShows),
      total: calculateMetrics(sessions),
    };
  }, [sessions]);

  // Utility functions
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 90) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  // Tab configuration
  const tabs = [
    { id: 'overview', label: '📊 Overview', count: null },
    { id: 'sessions', label: '🎬 Sessions', count: filteredSessions.length },
    { id: 'livetv', label: '📺 Live TV', count: liveTVAnalytics?.currentViewers || 0 },
    { id: 'trends', label: '📈 Trends', count: null },
    { id: 'engagement', label: '💡 Engagement', count: null },
    { id: 'traffic', label: '🌐 Traffic', count: trafficSources?.totals?.total_hits || null },
  ];

  if (loading && !unifiedStats.totalSessions) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px', 
        color: '#94a3b8' 
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid rgba(120, 119, 198, 0.3)', 
          borderTopColor: '#7877c6', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite', 
          marginBottom: '16px' 
        }} />
        Loading unified analytics...
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>📊</span>
              Unified Analytics Dashboard
            </h1>
            <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '16px' }}>
              Comprehensive analytics with real-time insights and advanced filtering
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['24h', '7d', '30d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '8px 16px',
                  background: timeRange === range ? '#7877c6' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid',
                  borderColor: timeRange === range ? '#7877c6' : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: timeRange === range ? 'white' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bot Filter Controls */}
      <div style={{ marginBottom: '24px' }}>
        <BotFilterControls />
      </div>

      {/* Key Stats from Unified Source - Single Source of Truth */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard title="Live Users" value={unifiedStats.liveUsers} icon="🟢" color="#22c55e" pulse />
        <StatCard title="Sessions (24h)" value={unifiedStats.totalSessions} icon="📊" color="#7877c6" />
        <StatCard title="Watch Time (24h)" value={`${unifiedStats.totalWatchTime}m`} icon="⏱️" color="#10b981" />
        <StatCard title="Avg Duration" value={`${unifiedStats.avgSessionDuration}m`} icon="📈" color="#f59e0b" />
        <StatCard title="Completion Rate" value={`${unifiedStats.completionRate}%`} icon="✅" color="#ec4899" />
        <StatCard title="Active Today (DAU)" value={unifiedStats.activeToday} icon="👥" color="#3b82f6" />
        <StatCard title="Active Week (WAU)" value={unifiedStats.activeThisWeek} icon="📅" color="#8b5cf6" />
        <StatCard title="Unique Content" value={unifiedStats.uniqueContentWatched} icon="🎬" color="#06b6d4" />
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AnalyticsTab)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab.id ? '#7877c6' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid',
              borderColor: activeTab === tab.id ? '#7877c6' : 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: activeTab === tab.id ? 'white' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {tab.label}
            {tab.count !== null && tab.count !== undefined && (
              <span style={{ 
                background: 'rgba(255,255,255,0.2)', 
                padding: '2px 8px', 
                borderRadius: '10px', 
                fontSize: '12px' 
              }}>
                {typeof tab.count === 'number' ? tab.count.toLocaleString() : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab 
          unifiedStats={unifiedStats} 
          contentSegmentation={contentSegmentation}
        />
      )}

      {activeTab === 'sessions' && (
        <SessionsTab 
          sessions={filteredSessions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterDevice={filterDevice}
          setFilterDevice={setFilterDevice}
          filterQuality={filterQuality}
          setFilterQuality={setFilterQuality}
          filterContentType={filterContentType}
          setFilterContentType={setFilterContentType}
          sortField={sortField}
          setSortField={setSortField}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          formatDate={formatDate}
          formatDuration={formatDuration}
          getCompletionColor={getCompletionColor}
        />
      )}

      {activeTab === 'livetv' && liveTVAnalytics && (
        <LiveTVTab 
          liveTVAnalytics={liveTVAnalytics}
          formatDuration={formatDuration}
        />
      )}

      {activeTab === 'trends' && (
        <TrendsTab 
          trends={trends}
          timeRange={timeRange}
          formatDuration={formatDuration}
        />
      )}

      {activeTab === 'engagement' && engagementMetrics && (
        <EngagementTab 
          engagementMetrics={engagementMetrics}
        />
      )}

      {activeTab === 'traffic' && (
        <TrafficTab 
          trafficSources={trafficSources}
        />
      )}
    </div>
  );
}

// Tab Components
function OverviewTab({ unifiedStats, contentSegmentation }: any) {
  return (
    <div>
      <h2 style={{ margin: '0 0 24px 0', color: '#f8fafc', fontSize: '20px' }}>Analytics Overview</h2>
      
      {/* Real-time Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🟢 Real-time Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ActivityBar 
              label="Watching VOD" 
              icon="▶️" 
              value={unifiedStats.liveWatching} 
              total={unifiedStats.liveUsers} 
            />
            <ActivityBar 
              label="Live TV" 
              icon="📺" 
              value={unifiedStats.liveTVViewers} 
              total={unifiedStats.liveUsers} 
            />
            <ActivityBar 
              label="Browsing" 
              icon="🔍" 
              value={unifiedStats.liveBrowsing} 
              total={unifiedStats.liveUsers} 
            />
          </div>
        </div>
        
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🎬 Content Type Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#f8fafc' }}>Movies</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#10b981', fontWeight: '600' }}>{contentSegmentation.movies.sessions}</span>
                <span style={{ color: '#64748b', fontSize: '12px' }}>sessions</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#f8fafc' }}>TV Shows</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#f59e0b', fontWeight: '600' }}>{contentSegmentation.tvShows.sessions}</span>
                <span style={{ color: '#64748b', fontSize: '12px' }}>sessions</span>
              </div>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#f8fafc', fontWeight: '600' }}>Total</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#7877c6', fontWeight: '700' }}>{contentSegmentation.total.sessions}</span>
                <span style={{ color: '#64748b', fontSize: '12px' }}>sessions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Countries */}
      {unifiedStats.topCountries && unifiedStats.topCountries.length > 0 && (
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🌍 Top Countries</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {unifiedStats.topCountries.slice(0, 6).map((country: any) => {
              const total = unifiedStats.topCountries.reduce((sum: number, c: any) => sum + c.count, 0);
              const percentage = total > 0 ? Math.round((country.count / total) * 100) : 0;
              return (
                <div key={country.country} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px'
                }}>
                  <span style={{ color: '#f8fafc' }}>{country.countryName || country.country}</span>
                  <span style={{ color: '#7877c6', fontWeight: '600' }}>
                    {country.count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Metrics Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        <StatCard title="Total Users" value={unifiedStats.totalUsers} icon="👥" color="#7877c6" />
        <StatCard title="New Today" value={unifiedStats.newUsersToday} icon="🆕" color="#10b981" />
        <StatCard title="Returning" value={unifiedStats.returningUsers} icon="🔄" color="#f59e0b" />
        <StatCard title="Page Views" value={unifiedStats.pageViews} icon="👁️" color="#ec4899" />
      </div>
    </div>
  );
}

function ActivityBar({ label, icon, value, total }: { label: string; icon: string; value: number; total: number }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: '#f8fafc', fontSize: '14px' }}>{label}</span>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>{value}</span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            width: `${percentage}%`, 
            background: 'linear-gradient(90deg, #7877c6, #a855f7)', 
            borderRadius: '3px' 
          }} />
        </div>
      </div>
    </div>
  );
}

function SessionsTab({ 
  sessions, 
  searchQuery, 
  setSearchQuery, 
  filterDevice, 
  setFilterDevice,
  filterQuality,
  setFilterQuality,
  filterContentType,
  setFilterContentType,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
  formatDate,
  formatDuration,
  getCompletionColor
}: any) {
  // Get unique values for filter options
  const deviceOptions = [...new Set(sessions.map((s: WatchSession) => s.device_type).filter(Boolean))] as string[];
  const qualityOptions = [...new Set(sessions.map((s: WatchSession) => s.quality).filter(Boolean))] as string[];

  return (
    <div>
      <h2 style={{ margin: '0 0 24px 0', color: '#f8fafc', fontSize: '20px' }}>
        Watch Sessions ({sessions.length.toLocaleString()})
      </h2>

      {/* Advanced Filters */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '12px', 
        marginBottom: '24px',
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <input
          type="text"
          placeholder="Search content, user ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '14px'
          }}
        />
        <select
          value={filterDevice}
          onChange={(e) => setFilterDevice(e.target.value)}
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '14px'
          }}
        >
          <option value="all">All Devices</option>
          {deviceOptions.map((device) => (
            <option key={device} value={device}>{device}</option>
          ))}
        </select>
        <select
          value={filterQuality}
          onChange={(e) => setFilterQuality(e.target.value)}
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '14px'
          }}
        >
          <option value="all">All Quality</option>
          {qualityOptions.map((quality) => (
            <option key={quality} value={quality}>{quality}</option>
          ))}
        </select>
        <select
          value={filterContentType}
          onChange={(e) => setFilterContentType(e.target.value)}
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '14px'
          }}
        >
          <option value="all">All Types</option>
          <option value="movie">Movies</option>
          <option value="tv_show">TV Shows</option>
        </select>
        <select 
          value={`${sortField}-${sortOrder}`} 
          onChange={(e) => {
            const [field, order] = e.target.value.split('-');
            setSortField(field as any);
            setSortOrder(order as any);
          }}
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '14px'
          }}
        >
          <option value="started_at-desc">Newest First</option>
          <option value="started_at-asc">Oldest First</option>
          <option value="total_watch_time-desc">Longest Watch</option>
          <option value="completion_percentage-desc">Highest Completion</option>
        </select>
      </div>

      {/* Sessions Table */}
      <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={thStyle}>Content</th>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Started</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Watch Time</th>
                <th style={thStyle}>Completion</th>
                <th style={thStyle}>Device</th>
                <th style={thStyle}>Quality</th>
                <th style={thStyle}>Pauses</th>
                <th style={thStyle}>Seeks</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 100).map((session: WatchSession) => (
                <tr key={session.id} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={tdStyle}>
                    <div>
                      <strong style={{ color: '#f8fafc' }}>{session.content_title || session.content_id}</strong>
                      {session.season_number && session.episode_number && (
                        <div style={{ color: '#64748b', fontSize: '12px' }}>
                          S{session.season_number}E{session.episode_number}
                        </div>
                      )}
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        background: session.content_type === 'movie' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: session.content_type === 'movie' ? '#10b981' : '#f59e0b',
                        marginTop: '4px',
                        display: 'inline-block'
                      }}>
                        {session.content_type}
                      </span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                      {session.user_id.slice(0, 8)}...
                    </span>
                  </td>
                  <td style={tdStyle}>{formatDate(session.started_at)}</td>
                  <td style={tdStyle}>{formatDuration(session.duration)}</td>
                  <td style={tdStyle}>{formatDuration(session.total_watch_time)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(session.completion_percentage, 100)}%`,
                          background: getCompletionColor(session.completion_percentage),
                          borderRadius: '3px'
                        }} />
                      </div>
                      <span style={{ color: getCompletionColor(session.completion_percentage), fontWeight: '600', fontSize: '13px' }}>
                        {Math.round(session.completion_percentage)}%
                      </span>
                    </div>
                  </td>
                  <td style={tdStyle}>{session.device_type || 'unknown'}</td>
                  <td style={tdStyle}>{session.quality || 'auto'}</td>
                  <td style={tdStyle}>{session.pause_count}</td>
                  <td style={tdStyle}>{session.seek_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sessions.length > 100 && (
          <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            Showing first 100 of {sessions.length.toLocaleString()} sessions
          </div>
        )}
      </div>
    </div>
  );
}

function LiveTVTab({ liveTVAnalytics, formatDuration }: any) {
  return (
    <div>
      <h2 style={{ margin: '0 0 24px 0', color: '#f8fafc', fontSize: '20px' }}>Live TV Analytics</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard title="Current Viewers" value={liveTVAnalytics.currentViewers} icon="👥" color="#10b981" pulse />
        <StatCard title="Total Watch Time" value={formatDuration(liveTVAnalytics.stats?.totalCurrentWatchTime || 0)} icon="⏱️" color="#7877c6" />
        <StatCard title="Avg Session" value={formatDuration(liveTVAnalytics.stats?.avgSessionDuration || 0)} icon="📊" color="#f59e0b" />
        <StatCard title="Recent Sessions" value={liveTVAnalytics.stats?.recentSessions || 0} icon="📺" color="#ec4899" />
        <StatCard title="Buffer Events" value={liveTVAnalytics.stats?.totalBufferEvents || 0} icon="⚠️" color="#ef4444" />
        <StatCard title="Historical Watch" value={formatDuration(liveTVAnalytics.stats?.totalHistoricalWatchTime || 0)} icon="📈" color="#3b82f6" />
      </div>

      {/* Active Channels */}
      {liveTVAnalytics.channels && liveTVAnalytics.channels.length > 0 && (
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🔴 Active Channels</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
            {liveTVAnalytics.channels.map((channel: any) => (
              <div key={channel.channelId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f8fafc', fontWeight: '500' }}>{channel.channelName}</div>
                  {channel.category && <div style={{ color: '#64748b', fontSize: '12px' }}>{channel.category}</div>}
                </div>
                <div style={{ color: '#10b981', fontWeight: '700' }}>
                  {channel.viewerCount} <span style={{ fontSize: '12px', fontWeight: '400' }}>viewers</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendsTab({ trends, timeRange, formatDuration }: any) {
  return (
    <div>
      <h2 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '20px' }}>Performance Trends</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
        {timeRange === 'all' 
          ? 'Trend comparison not available for "All Time" - select a specific time range'
          : 'Compare current period vs previous period'}
      </p>
      
      {timeRange === 'all' ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 40px', 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ color: '#f8fafc', margin: '0 0 8px 0' }}>Select a Time Range</h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Choose 24h, 7d, or 30d to see trend comparisons with the previous period
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {trends.map((trend: TrendData) => {
            const hasPreviousData = trend.previous > 0;
            return (
              <div key={trend.label} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ color: '#f8fafc', fontWeight: '600' }}>{trend.label}</span>
                  {hasPreviousData ? (
                    <span style={{
                      color: trend.change >= 0 ? '#10b981' : '#ef4444',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {trend.change >= 0 ? '↑' : '↓'} {Math.abs(trend.change)}%
                    </span>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '12px' }}>No prior data</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Current</div>
                    <div style={{ color: '#f8fafc', fontSize: '18px', fontWeight: '700' }}>
                      {typeof trend.current === 'number' && trend.label.includes('Time') 
                        ? formatDuration(trend.current) 
                        : trend.current}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Previous</div>
                    <div style={{ color: '#64748b', fontSize: '18px', fontWeight: '700' }}>
                      {hasPreviousData 
                        ? (typeof trend.previous === 'number' && trend.label.includes('Time') 
                            ? formatDuration(trend.previous) 
                            : trend.previous)
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EngagementTab({ engagementMetrics }: any) {
  return (
    <div>
      <h2 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '20px' }}>User Engagement Analysis</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Understand how users interact with content</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard title="Avg Pauses/Session" value={engagementMetrics.avgPausesPerSession} icon="⏸️" color="#f59e0b" />
        <StatCard title="Avg Seeks/Session" value={engagementMetrics.avgSeeksPerSession} icon="⏩" color="#3b82f6" />
        <StatCard title="Peak Hour" value={`${engagementMetrics.peakHour}:00`} icon="🕐" color="#ec4899" />
        <StatCard title="Peak Hour Views" value={engagementMetrics.peakHourCount} icon="📈" color="#10b981" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Completion Distribution */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>Completion Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(engagementMetrics.completionDistribution).map(([range, count]: [string, any]) => {
              const total = Object.values(engagementMetrics.completionDistribution).reduce((a: number, b: unknown) => a + (b as number), 0);
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              const colors: Record<string, string> = {
                '0-25%': '#ef4444',
                '25-50%': '#f59e0b',
                '50-75%': '#3b82f6',
                '75-100%': '#10b981',
              };
              return (
                <div key={range}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#f8fafc' }}>{range}</span>
                    <span style={{ color: '#94a3b8' }}>{count} ({percentage}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percentage}%`, background: colors[range], borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly Activity */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>Hourly Activity</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
            {Array.from({ length: 24 }, (_, hour) => {
              const count = engagementMetrics.hourCounts[hour] || 0;
              const maxCount = Math.max(...Object.values(engagementMetrics.hourCounts) as number[], 1);
              const heightPx = maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 4 : 0) : 0;
              return (
                <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${heightPx}px`,
                      background: hour === engagementMetrics.peakHour ? '#ec4899' : 'linear-gradient(180deg, #7877c6, #a855f7)',
                      borderRadius: '2px 2px 0 0',
                    }}
                    title={`${hour}:00 - ${count} sessions`}
                  />
                  {hour % 4 === 0 && <span style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>{hour}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrafficTab({ trafficSources }: any) {
  if (!trafficSources) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
        <h3 style={{ color: '#f8fafc', margin: '0 0 8px 0' }}>Traffic Sources</h3>
        <p>Loading traffic source data...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '20px' }}>Traffic Source Analytics</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Server-side traffic tracking including bots, referrers, and source types</p>
      
      {/* Traffic Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard title="Total Hits" value={trafficSources.totals?.total_hits || 0} icon="📊" color="#7877c6" />
        <StatCard title="Human Hits" value={trafficSources.totals?.human_hits || 0} icon="👤" color="#10b981" />
        <StatCard title="Bot Hits" value={trafficSources.totals?.bot_hits || 0} icon="🤖" color="#ef4444" />
        <StatCard title="Unique Visitors" value={trafficSources.totals?.unique_visitors || 0} icon="👥" color="#3b82f6" />
      </div>

      {/* Top Referrers */}
      {trafficSources.topReferrers && trafficSources.topReferrers.length > 0 && (
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>🔗 Top Referring Domains</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {trafficSources.topReferrers.slice(0, 8).map((ref: any, idx: number) => (
              <div key={ref.referrer_domain || idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>#{idx + 1}</span>
                  <span style={{ color: '#f8fafc' }}>{ref.referrer_domain || 'Direct'}</span>
                </div>
                <span style={{ color: '#7877c6', fontWeight: '600' }}>{parseInt(ref.hit_count).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color, pulse = false }: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderTop: `3px solid ${color}`,
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        position: 'relative'
      }}>
        {icon}
        {pulse && (
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            animation: 'pulse 2s infinite'
          }} />
        )}
      </div>
      <div>
        <h3 style={{ margin: 0, color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>{title}</h3>
        <p style={{ margin: '4px 0 0 0', color: '#f8fafc', fontSize: '24px', fontWeight: '700' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left' as const,
  color: '#94a3b8',
  fontSize: '13px',
  fontWeight: '600',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
};

const tdStyle = {
  padding: '12px 16px',
  color: '#f8fafc',
  fontSize: '14px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
};