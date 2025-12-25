'use client';

/**
 * System Health Monitor Component
 * Displays comprehensive system health metrics including:
 * - Server performance (CPU, memory, disk)
 * - API response times and error rates
 * - Database performance
 * - Traffic patterns and alerts
 */

import { useState, useEffect, useCallback } from 'react';
import { getAdminAnalyticsUrl } from '../hooks/useAnalyticsApi';

// System health metrics interface
interface SystemHealthMetrics {
  serverPerformance: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
    loadAverage: number[];
  };
  apiMetrics: {
    responseTime: number;
    errorRate: number;
    requestsPerSecond: number;
    activeConnections: number;
    totalRequests24h: number;
  };
  databaseMetrics: {
    queryTime: number;
    connectionCount: number;
    slowQueries: number;
    cacheHitRate: number;
    tableSize: number;
  };
  trafficMetrics: {
    activeUsers: number;
    bandwidth: number;
    loadDistribution: number[];
    peakTraffic: number;
    geographicDistribution: Array<{ country: string; percentage: number }>;
  };
  alerts: {
    active: number;
    critical: number;
    warnings: number;
    resolved24h: number;
  };
  timestamp: number;
}

// Metric card component
interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  subtitle?: string;
}

function MetricCard({ title, value, unit, status = 'good', trend, subtitle }: MetricCardProps) {
  const statusColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
  };

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    stable: '→',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${statusColors[status]}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {trend && <span className="text-lg">{trendIcons[trend]}</span>}
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toFixed(1) : value}
          {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
        </div>
        {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}

// Progress bar component
interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

function ProgressBar({ value, max, label, color = 'blue' }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{label}</span>
        <span>{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function SystemHealthMonitor() {
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealthMetrics = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(getAdminAnalyticsUrl('system-health'));
      
      if (!response.ok) {
        throw new Error('Failed to fetch system health metrics');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setHealthMetrics(data);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Failed to fetch system health:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch health metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchHealthMetrics();
  }, [fetchHealthMetrics]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchHealthMetrics, 15000);
    return () => clearInterval(interval);
  }, [fetchHealthMetrics]);

  // Helper functions
  const getStatusForPercentage = (value: number, warningThreshold: number, criticalThreshold: number) => {
    if (value >= criticalThreshold) return 'critical';
    if (value >= warningThreshold) return 'warning';
    return 'good';
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800 mb-2">System Health Monitoring Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchHealthMetrics}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!healthMetrics) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">No health metrics available</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Health Monitor</h2>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated?.toLocaleTimeString()}
        </div>
      </div>

      {/* Alert Summary */}
      {healthMetrics.alerts.active > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 text-xl mr-3">⚠️</div>
            <div>
              <h3 className="text-lg font-medium text-red-800">
                {healthMetrics.alerts.active} Active Alert{healthMetrics.alerts.active !== 1 ? 's' : ''}
              </h3>
              <p className="text-red-600">
                {healthMetrics.alerts.critical} critical, {healthMetrics.alerts.warnings} warnings
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU Usage"
          value={healthMetrics.serverPerformance.cpuUsage}
          unit="%"
          status={getStatusForPercentage(healthMetrics.serverPerformance.cpuUsage, 80, 90)}
        />
        <MetricCard
          title="Memory Usage"
          value={healthMetrics.serverPerformance.memoryUsage}
          unit="%"
          status={getStatusForPercentage(healthMetrics.serverPerformance.memoryUsage, 85, 95)}
        />
        <MetricCard
          title="API Response Time"
          value={healthMetrics.apiMetrics.responseTime}
          unit="ms"
          status={getStatusForPercentage(healthMetrics.apiMetrics.responseTime, 500, 1000)}
        />
        <MetricCard
          title="Error Rate"
          value={healthMetrics.apiMetrics.errorRate}
          unit="%"
          status={getStatusForPercentage(healthMetrics.apiMetrics.errorRate, 5, 10)}
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Server Performance */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Server Performance</h3>
          <div className="space-y-4">
            <ProgressBar
              value={healthMetrics.serverPerformance.cpuUsage}
              max={100}
              label="CPU Usage"
              color={healthMetrics.serverPerformance.cpuUsage > 80 ? 'red' : 'blue'}
            />
            <ProgressBar
              value={healthMetrics.serverPerformance.memoryUsage}
              max={100}
              label="Memory Usage"
              color={healthMetrics.serverPerformance.memoryUsage > 85 ? 'red' : 'blue'}
            />
            <ProgressBar
              value={healthMetrics.serverPerformance.diskUsage}
              max={100}
              label="Disk Usage"
              color={healthMetrics.serverPerformance.diskUsage > 90 ? 'red' : 'blue'}
            />
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Uptime</span>
                <span className="font-medium">{formatUptime(Date.now() - healthMetrics.serverPerformance.uptime)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Load Average</span>
                <span className="font-medium">
                  {healthMetrics.serverPerformance.loadAverage.map(load => load.toFixed(2)).join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* API Metrics */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Performance</h3>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Response Time"
              value={healthMetrics.apiMetrics.responseTime}
              unit="ms"
              status={getStatusForPercentage(healthMetrics.apiMetrics.responseTime, 500, 1000)}
            />
            <MetricCard
              title="Error Rate"
              value={healthMetrics.apiMetrics.errorRate}
              unit="%"
              status={getStatusForPercentage(healthMetrics.apiMetrics.errorRate, 5, 10)}
            />
            <MetricCard
              title="Requests/sec"
              value={healthMetrics.apiMetrics.requestsPerSecond}
              subtitle="Current rate"
            />
            <MetricCard
              title="Active Connections"
              value={healthMetrics.apiMetrics.activeConnections}
              subtitle="Live connections"
            />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Total requests (24h): <span className="font-medium">{healthMetrics.apiMetrics.totalRequests24h.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Database Metrics */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Performance</h3>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Query Time"
              value={healthMetrics.databaseMetrics.queryTime}
              unit="ms"
              status={getStatusForPercentage(healthMetrics.databaseMetrics.queryTime, 500, 1000)}
            />
            <MetricCard
              title="Cache Hit Rate"
              value={healthMetrics.databaseMetrics.cacheHitRate}
              unit="%"
              status={healthMetrics.databaseMetrics.cacheHitRate > 80 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Connections"
              value={healthMetrics.databaseMetrics.connectionCount}
              subtitle="Active connections"
            />
            <MetricCard
              title="Slow Queries"
              value={healthMetrics.databaseMetrics.slowQueries}
              status={healthMetrics.databaseMetrics.slowQueries > 5 ? 'warning' : 'good'}
              subtitle="Last hour"
            />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Table size: <span className="font-medium">{formatBytes(healthMetrics.databaseMetrics.tableSize)}</span>
            </div>
          </div>
        </div>

        {/* Traffic Metrics */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic & Load</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <MetricCard
              title="Active Users"
              value={healthMetrics.trafficMetrics.activeUsers}
              subtitle="Currently online"
            />
            <MetricCard
              title="Bandwidth"
              value={healthMetrics.trafficMetrics.bandwidth}
              unit="MB/s"
              subtitle="Current usage"
            />
          </div>
          
          {/* Load Distribution */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Load Distribution</h4>
            {healthMetrics.trafficMetrics.loadDistribution.map((load, index) => (
              <ProgressBar
                key={index}
                value={load}
                max={100}
                label={`Server ${index + 1}`}
                color={load > 80 ? 'red' : load > 60 ? 'yellow' : 'green'}
              />
            ))}
          </div>

          {/* Geographic Distribution */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Top Countries</h4>
            <div className="space-y-1">
              {healthMetrics.trafficMetrics.geographicDistribution.slice(0, 5).map((geo, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{geo.country}</span>
                  <span className="font-medium">{geo.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}