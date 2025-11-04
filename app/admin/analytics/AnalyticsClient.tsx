'use client';

/**
 * Analytics Client Component
 * Main analytics dashboard with detailed charts
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../AdminNav';
import CompletionRateChart from './CompletionRateChart';
import PeakUsageChart from './PeakUsageChart';
import DropOffChart from './DropOffChart';
import RetentionMetrics from './RetentionMetrics';
import ExportData from './ExportData';
import styles from './analytics.module.css';

interface AnalyticsClientProps {
  username: string;
}

interface DetailedAnalytics {
  completionRates: Array<{
    contentId: string;
    title: string;
    contentType: 'movie' | 'tv';
    completionRate: number;
    viewCount: number;
    avgWatchTime: number;
  }>;
  peakUsageHours: Array<{
    hour: number;
    count: number;
    label: string;
  }>;
  dropOffAnalysis: Array<{
    contentId: string;
    title: string;
    contentType: 'movie' | 'tv';
    dropOffPoints: Array<{
      timestamp: number;
      percentage: number;
    }>;
  }>;
  retentionMetrics: {
    dailyActiveUsers: Array<{
      date: string;
      count: number;
    }>;
    avgSessionDuration: number;
    returnRate: number;
    churnRate: number;
  };
}

type TimeRange = '24h' | '7d' | '30d' | '90d';

export default function AnalyticsClient({ username }: AnalyticsClientProps) {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [timezone, setTimezone] = useState<string>('UTC');
  const [analytics, setAnalytics] = useState<DetailedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, timezone]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/analytics/detailed?range=${timeRange}&timezone=${timezone}`
      );

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalytics();
  };

  return (
    <div className={styles.container}>
      <AdminNav username={username} />

      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Detailed Analytics</h1>
            <p className={styles.subtitle}>
              In-depth insights into user behavior and content performance
            </p>
          </div>

          <div className={styles.actions}>
            <button
              onClick={handleRefresh}
              className={styles.refreshButton}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className={styles.filterSelect}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={handleRefresh} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {loading && !analytics && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading analytics...</p>
          </div>
        )}

        {analytics && (
          <div className={styles.charts}>
            {/* Completion Rates */}
            <div className={styles.chartSection}>
              <h2 className={styles.chartTitle}>Watch Completion Rates</h2>
              <p className={styles.chartDescription}>
                Percentage of content watched to completion
              </p>
              <CompletionRateChart data={analytics.completionRates} />
            </div>

            {/* Peak Usage Hours */}
            <div className={styles.chartSection}>
              <h2 className={styles.chartTitle}>Peak Usage Hours</h2>
              <p className={styles.chartDescription}>
                Activity distribution across 24 hours ({timezone})
              </p>
              <PeakUsageChart data={analytics.peakUsageHours} />
            </div>

            {/* Drop-off Analysis */}
            <div className={styles.chartSection}>
              <h2 className={styles.chartTitle}>Content Drop-off Analysis</h2>
              <p className={styles.chartDescription}>
                Where users stop watching content
              </p>
              <DropOffChart data={analytics.dropOffAnalysis} />
            </div>

            {/* Retention Metrics */}
            <div className={styles.chartSection}>
              <h2 className={styles.chartTitle}>User Retention Metrics</h2>
              <p className={styles.chartDescription}>
                User engagement and return patterns
              </p>
              <RetentionMetrics data={analytics.retentionMetrics} />
            </div>

            {/* Export Data */}
            <div className={styles.chartSection}>
              <h2 className={styles.chartTitle}>Export Data</h2>
              <p className={styles.chartDescription}>
                Download analytics data for external analysis
              </p>
              <ExportData timeRange={timeRange} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
