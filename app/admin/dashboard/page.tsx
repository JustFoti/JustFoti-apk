'use client';

/**
 * Admin Dashboard - Clean Rewrite
 * 
 * Shows:
 * 1. Live user count (real-time, updates every 10s)
 * 2. Activity breakdown (watching/browsing/livetv)
 * 3. Geographic distribution
 * 4. DAU/WAU/MAU metrics
 * 5. Top content being watched
 * 
 * Data source: Single API endpoint that returns all stats
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../context/AdminContext';

// Types for our analytics data
interface LiveStats {
  // Real-time (users active in last 5 minutes)
  liveUsers: number;
  watching: number;
  browsing: number;
  livetv: number;
  
  // Peak today
  peakToday: number;
  peakTime: string | null;
  
  // User metrics
  dau: number;  // Daily active users (24h)
  wau: number;  // Weekly active users (7d)
  mau: number;  // Monthly active users (30d)
  totalUsers: number;
  newToday: number;
  
  // Content metrics (24h)
  totalSessions: number;
  totalWatchTimeMinutes: number;
  avgSessionMinutes: number;
  completionRate: number;
  
  // Geographic (top 10 countries)
  topCountries: Array<{ country: string; code: string; count: number }>;
  
  // Top content (currently being watched)
  topContent: Array<{ 
    id: string; 
    title: string; 
    type: 'movie' | 'tv' | 'livetv';
    viewers: number;
  }>;
  
  // Live users list (for detailed view)
  liveUsersList: Array<{
    oderId: string;
    odertivity: 'watching' | 'browsing' | 'livetv';
    country: string;
    contentTitle?: string;
    lastSeen: number;
  }>;
  
  // Metadata
  timestamp: number;
  source: 'worker' | 'fallback';
}

const ANALYTICS_URL = process.env.NEXT_PUBLIC_CF_ANALYTICS_WORKER_URL || 'https://flyx-analytics.vynx.workers.dev';

export default function DashboardPage() {
  useAdmin();
  
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${ANALYTICS_URL}/admin/stats`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchStats();
    
    if (autoRefresh) {
      const interval = setInterval(fetchStats, 10000); // 10 second refresh
      return () => clearInterval(interval);
    }
  }, [fetchStats, autoRefresh]);

  const formatNumber = (n: number) => n.toLocaleString();
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
  };
  
  const getCountryFlag = (code: string) => {
    if (!code || code.length !== 2) return '🌍';
    try {
      return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
    } catch { return '🌍'; }
  };

  if (loading && !stats) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '24px' }}>📊 Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
            {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Loading...'}
            {error && <span style={{ color: '#ef4444', marginLeft: '12px' }}>⚠️ {error}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: '8px 16px',
              background: autoRefresh ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${autoRefresh ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              color: autoRefresh ? '#10b981' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {autoRefresh ? '⏸️ Pause' : '▶️ Resume'}
          </button>
          <button
            onClick={fetchStats}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: 'rgba(120, 119, 198, 0.2)',
              border: '1px solid rgba(120, 119, 198, 0.3)',
              borderRadius: '8px',
              color: '#7877c6',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Live Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard 
          icon="🟢" 
          label="Live Users" 
          value={stats?.liveUsers || 0} 
          color="#10b981"
          pulse
          subtitle={`Peak today: ${stats?.peakToday || 0}`}
        />
        <StatCard 
          icon="▶️" 
          label="Watching" 
          value={stats?.watching || 0} 
          color="#8b5cf6"
        />
        <StatCard 
          icon="📺" 
          label="Live TV" 
          value={stats?.livetv || 0} 
          color="#f59e0b"
        />
        <StatCard 
          icon="🔍" 
          label="Browsing" 
          value={stats?.browsing || 0} 
          color="#3b82f6"
        />
        <StatCard 
          icon="🏆" 
          label="7-Day Peak" 
          value={(stats as any)?.allTimePeak || stats?.peakToday || 0} 
          color="#ec4899"
          subtitle={(stats as any)?.allTimePeakDate || 'Today'}
        />
      </div>

      {/* Secondary Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard 
          icon="📊" 
          label="DAU" 
          value={stats?.dau || 0} 
          color="#7877c6"
          subtitle="24 hours"
          size="sm"
        />
        <StatCard 
          icon="📈" 
          label="WAU" 
          value={stats?.wau || 0} 
          color="#f59e0b"
          subtitle="7 days"
          size="sm"
        />
        <StatCard 
          icon="📅" 
          label="MAU" 
          value={stats?.mau || 0} 
          color="#ec4899"
          subtitle="30 days"
          size="sm"
        />
        <StatCard 
          icon="⏱️" 
          label="Watch Time" 
          value={formatTime(stats?.totalWatchTimeMinutes || 0)} 
          color="#06b6d4"
          subtitle="24 hours"
          size="sm"
        />
        <StatCard 
          icon="🆕" 
          label="New Users" 
          value={stats?.newToday || 0} 
          color="#10b981"
          subtitle="Today"
          size="sm"
        />
      </div>

      {/* Daily Peaks Chart */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', color: '#f8fafc', fontSize: '16px' }}>📈 Daily Peak Users (Last 14 Days)</h3>
        {(stats as any)?.dailyPeaks && (stats as any).dailyPeaks.length > 0 ? (
          <div>
            {/* Bar Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', marginBottom: '12px' }}>
              {[...(stats as any).dailyPeaks].reverse().map((day: { date: string; peak: number }) => {
                const maxPeak = Math.max(...(stats as any).dailyPeaks.map((d: any) => d.peak));
                const heightPct = maxPeak > 0 ? (day.peak / maxPeak) * 100 : 0;
                const isToday = day.date === new Date().toISOString().split('T')[0];
                return (
                  <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                    <div style={{ 
                      flex: 1, 
                      width: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'flex-end' 
                    }}>
                      <div style={{ 
                        width: '100%', 
                        height: `${heightPct}%`, 
                        minHeight: day.peak > 0 ? '4px' : '0',
                        background: isToday ? 'linear-gradient(180deg, #10b981, #059669)' : 'linear-gradient(180deg, #7877c6, #5b5a9e)',
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                      }}>
                        <span style={{ 
                          position: 'absolute', 
                          top: '-20px', 
                          left: '50%', 
                          transform: 'translateX(-50%)',
                          fontSize: '11px',
                          color: '#f8fafc',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                        }}>
                          {day.peak > 0 ? day.peak : ''}
                        </span>
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '10px', 
                      color: isToday ? '#10b981' : '#64748b', 
                      marginTop: '8px',
                      fontWeight: isToday ? '600' : '400',
                    }}>
                      {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Summary */}
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>
                  {Math.max(...(stats as any).dailyPeaks.map((d: any) => d.peak))}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Highest Peak</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>
                  {Math.round((stats as any).dailyPeaks.reduce((sum: number, d: any) => sum + d.peak, 0) / (stats as any).dailyPeaks.length)}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Avg Peak</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                  {(stats as any).dailyPeaks[0]?.peak || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Today&apos;s Peak</div>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No peak data available yet</p>
        )}
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Top Countries */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#f8fafc', fontSize: '16px' }}>🌍 Top Countries</h3>
          {stats?.topCountries && stats.topCountries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.topCountries.slice(0, 8).map((country) => (
                <div key={country.code} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{getCountryFlag(country.code)}</span>
                  <span style={{ flex: 1, color: '#f8fafc' }}>{country.country}</span>
                  <span style={{ 
                    color: '#94a3b8',
                    fontWeight: '400',
                  }}>
                    {formatNumber(country.count)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No data yet</p>
          )}
        </div>

        {/* Currently Watching */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#f8fafc', fontSize: '16px' }}>🎬 Currently Watching</h3>
          {stats?.topContent && stats.topContent.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.topContent.slice(0, 8).map((content) => (
                <div key={content.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px' }}>
                    {content.type === 'tv' ? '📺' : content.type === 'livetv' ? '📡' : '🎬'}
                  </span>
                  <span style={{ flex: 1, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {content.title}
                  </span>
                  <span style={{ 
                    color: '#10b981',
                    fontWeight: '600',
                    fontSize: '13px',
                  }}>
                    {content.viewers} watching
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No one watching</p>
          )}
        </div>
      </div>

      {/* Debug Info */}
      <details style={{ marginTop: '24px' }}>
        <summary style={{ color: '#64748b', cursor: 'pointer', fontSize: '13px' }}>
          Debug Info (source: {stats?.source || 'unknown'})
        </summary>
        <pre style={{ 
          background: 'rgba(0,0,0,0.3)', 
          padding: '16px', 
          borderRadius: '8px', 
          overflow: 'auto', 
          fontSize: '11px',
          color: '#94a3b8',
          marginTop: '8px',
        }}>
          {JSON.stringify(stats, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  icon, 
  label, 
  value, 
  color, 
  subtitle,
  pulse = false,
  size = 'md'
}: { 
  icon: string; 
  label: string; 
  value: number | string; 
  color: string;
  subtitle?: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
}) {
  const isSmall = size === 'sm';
  
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: isSmall ? '14px' : '18px',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: isSmall ? '14px' : '18px', position: 'relative' }}>
          {icon}
          {pulse && (
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '8px',
              height: '8px',
              background: color,
              borderRadius: '50%',
              animation: 'pulse 2s infinite',
            }} />
          )}
        </span>
        <span style={{ color: '#94a3b8', fontSize: isSmall ? '11px' : '12px' }}>{label}</span>
      </div>
      <div style={{ 
        fontSize: isSmall ? '20px' : '28px', 
        fontWeight: '700', 
        color: '#f8fafc',
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subtitle && (
        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>{subtitle}</div>
      )}
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
