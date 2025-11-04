/**
 * Dashboard Client Component
 * Main admin dashboard with real-time metrics
 */

'use client';

import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';
import MetricsCard from '@/components/admin/MetricsCard';
import TopContent from '@/components/admin/TopContent';
import LiveSessions from '@/components/admin/LiveSessions';
import UsageChart from '@/components/admin/UsageChart';
import DateRangeFilter, { DateRange } from '@/components/admin/DateRangeFilter';

interface DashboardMetrics {
  overview: {
    activeUsers: number;
    totalViews: number;
    totalWatchTime: number;
    avgSessionDuration: number;
  };
  topContent: Array<{
    contentId: string;
    title: string;
    contentType: 'movie' | 'tv';
    viewCount: number;
    totalWatchTime: number;
    completionRate: number;
    posterPath?: string;
  }>;
  liveSessions: Array<{
    sessionId: string;
    lastActivity: number;
    currentContent?: {
      title: string;
      contentType: 'movie' | 'tv';
    };
    eventsCount: number;
  }>;
  trends: Array<{
    timestamp: number;
    value: number;
    label?: string;
  }>;
}

function formatWatchTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  if (hours > 1000) {
    return `${(hours / 1000).toFixed(1)}k`;
  }
  return hours.toString();
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

export default function DashboardClient() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/analytics/metrics?range=${dateRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    
    return () => clearInterval(interval);
  }, [dateRange]);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          <h3 className={styles.errorTitle}>Error Loading Dashboard</h3>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryButton} onClick={fetchMetrics}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Real-time analytics and insights</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
      </div>

      {/* Overview Metrics */}
      <div className={styles.metricsGrid}>
        <MetricsCard
          title="Active Users"
          value={metrics?.overview.activeUsers || 0}
          icon="👥"
          loading={loading}
        />
        <MetricsCard
          title="Total Views"
          value={metrics?.overview.totalViews.toLocaleString() || '0'}
          icon="👁️"
          loading={loading}
        />
        <MetricsCard
          title="Watch Time"
          value={formatWatchTime(metrics?.overview.totalWatchTime || 0)}
          suffix="hrs"
          icon="⏱️"
          loading={loading}
        />
        <MetricsCard
          title="Avg Session"
          value={formatDuration(metrics?.overview.avgSessionDuration || 0)}
          icon="📊"
          loading={loading}
        />
      </div>

      {/* Engagement Trends */}
      <div className={styles.chartSection}>
        <UsageChart
          data={metrics?.trends || []}
          title="Engagement Trends"
          metric="views"
          type="line"
          loading={loading}
        />
      </div>

      {/* Content and Sessions */}
      <div className={styles.contentGrid}>
        <div className={styles.contentSection}>
          <TopContent
            items={metrics?.topContent || []}
            loading={loading}
          />
        </div>
        <div className={styles.sessionsSection}>
          <LiveSessions
            sessions={metrics?.liveSessions || []}
            loading={loading}
            autoRefresh={true}
          />
        </div>
      </div>
    </div>
  );
}
