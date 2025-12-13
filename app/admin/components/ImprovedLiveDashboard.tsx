'use client';

/**
 * Improved Live Dashboard
 * Clear, accurate display of real-time user activity
 * 
 * Shows:
 * - Total users on site (with heartbeat validation)
 * - Users actively watching content (VOD)
 * - Users watching Live TV
 * - Users browsing (not watching anything)
 * - Persistent peak tracking (stored in DB)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStats } from '../context/StatsContext';

interface PeakStats {
  date: string;
  peakTotal: number;
  peakWatching: number;
  peakLiveTV: number;
  peakBrowsing: number;
  peakTotalTime: number;
  peakWatchingTime: number;
  peakLiveTVTime: number;
  peakBrowsingTime: number;
}

interface ActivityBreakdown {
  watching: number;
  livetv: number;
  browsing: number;
  total: number;
}

interface HistoryPoint {
  time: number;
  total: number;
  watching: number;
  livetv: number;
  browsing: number;
}

export default function ImprovedLiveDashboard() {
  const { stats: unifiedStats, loading: statsLoading, refresh: refreshStats } = useStats();
  
  const [peakStats, setPeakStats] = useState<PeakStats | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshRate, setRefreshRate] = useState(10); // seconds
  const peakUpdateRef = useRef<NodeJS.Timeout | null>(null);

  // Current activity breakdown from unified stats
  const currentActivity: ActivityBreakdown = {
    watching: unifiedStats.liveWatching,
    livetv: unifiedStats.liveTVViewers,
    browsing: unifiedStats.liveBrowsing,
    total: unifiedStats.liveUsers,
  };

  // Fetch peak stats from database
  const fetchPeakStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/peak-stats');
      const data = await response.json();
      if (data.success && data.today) {
        setPeakStats(data.today);
      }
    } catch (error) {
      console.error('Failed to fetch peak stats:', error);
    }
  }, []);

  // Update peak stats if current values are higher
  const updatePeakStats = useCallback(async () => {
    if (currentActivity.total === 0) return;
    
    try {
      const response = await fetch('/api/admin/peak-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total: currentActivity.total,
          watching: currentActivity.watching,
          livetv: currentActivity.livetv,
          browsing: currentActivity.browsing,
        }),
      });
      const data = await response.json();
      if (data.success && data.peaks) {
        setPeakStats(data.peaks);
      }
    } catch (error) {
      console.error('Failed to update peak stats:', error);
    }
  }, [currentActivity]);

  // Initial fetch
  useEffect(() => {
    fetchPeakStats();
  }, [fetchPeakStats]);

  // Update history and check peaks when stats change
  useEffect(() => {
    if (statsLoading) return;
    
    setLastUpdate(new Date());
    
    // Add to history
    setHistory(prev => {
      const newPoint: HistoryPoint = {
        time: Date.now(),
        total: currentActivity.total,
        watching: currentActivity.watching,
        livetv: currentActivity.livetv,
        browsing: currentActivity.browsing,
      };
      const newHistory = [...prev, newPoint];
      // Keep last 60 data points (10 minutes at 10s intervals)
      return newHistory.slice(-60);
    });

    // Debounce peak updates to avoid too many DB writes
    if (peakUpdateRef.current) {
      clearTimeout(peakUpdateRef.current);
    }
    peakUpdateRef.current = setTimeout(() => {
      updatePeakStats();
    }, 5000); // Update peaks every 5 seconds max

    return () => {
      if (peakUpdateRef.current) {
        clearTimeout(peakUpdateRef.current);
      }
    };
  }, [unifiedStats, statsLoading, updatePeakStats]);

  // Auto-refresh stats
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStats();
    }, refreshRate * 1000);
    return () => clearInterval(interval);
  }, [refreshRate, refreshStats]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Real-Time Activity
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '4px 10px', 
              background: 'rgba(16, 185, 129, 0.2)', 
              borderRadius: '20px', 
              fontSize: '11px', 
              color: '#10b981',
              fontWeight: '500'
            }}>
              <span style={{ 
                width: '6px', 
                height: '6px', 
                background: '#10b981', 
                borderRadius: '50%', 
                animation: 'pulse 2s infinite' 
              }} />
              LIVE
            </span>
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Loading...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            value={refreshRate} 
            onChange={(e) => setRefreshRate(parseInt(e.target.value))}
            style={{ 
              padding: '6px 10px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '6px', 
              color: '#f8fafc', 
              fontSize: '13px' 
            }}
          >
            <option value={5}>5s refresh</option>
            <option value={10}>10s refresh</option>
            <option value={30}>30s refresh</option>
          </select>
          <button
            onClick={refreshStats}
            disabled={statsLoading}
            style={{
              padding: '6px 12px',
              background: 'rgba(120, 119, 198, 0.2)',
              border: '1px solid rgba(120, 119, 198, 0.3)',
              borderRadius: '6px',
              color: '#7877c6',
              fontSize: '13px',
              cursor: statsLoading ? 'not-allowed' : 'pointer',
              opacity: statsLoading ? 0.6 : 1,
            }}
          >
            {statsLoading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Main Stats Grid - Clear breakdown */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '16px',
      }}>
        {/* Total On Site */}
        <ActivityCard
          title="On Site"
          subtitle="Total users currently active"
          value={currentActivity.total}
          peak={peakStats?.peakTotal || 0}
          peakTime={peakStats?.peakTotalTime || 0}
          icon="👥"
          color="#10b981"
          isMain
        />
        
        {/* Watching VOD */}
        <ActivityCard
          title="Watching VOD"
          subtitle="Users watching movies/shows"
          value={currentActivity.watching}
          peak={peakStats?.peakWatching || 0}
          peakTime={peakStats?.peakWatchingTime || 0}
          icon="▶️"
          color="#7877c6"
        />
        
        {/* Watching Live TV */}
        <ActivityCard
          title="Live TV"
          subtitle="Users watching live channels"
          value={currentActivity.livetv}
          peak={peakStats?.peakLiveTV || 0}
          peakTime={peakStats?.peakLiveTVTime || 0}
          icon="📺"
          color="#f59e0b"
        />
        
        {/* Browsing */}
        <ActivityCard
          title="Browsing"
          subtitle="Users exploring content"
          value={currentActivity.browsing}
          peak={peakStats?.peakBrowsing || 0}
          peakTime={peakStats?.peakBrowsingTime || 0}
          icon="🔍"
          color="#3b82f6"
        />
      </div>

      {/* Activity Breakdown Bar */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.03)', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '12px', 
        padding: '16px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Activity Breakdown</span>
          <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600' }}>{currentActivity.total} total</span>
        </div>
        
        {currentActivity.total > 0 ? (
          <>
            <div style={{ display: 'flex', height: '24px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.05)' }}>
              {currentActivity.watching > 0 && (
                <div 
                  style={{ 
                    width: `${(currentActivity.watching / currentActivity.total) * 100}%`, 
                    background: '#7877c6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: 'white',
                    fontWeight: '600',
                    minWidth: currentActivity.watching > 0 ? '30px' : '0',
                  }}
                  title={`Watching VOD: ${currentActivity.watching}`}
                >
                  {currentActivity.watching}
                </div>
              )}
              {currentActivity.livetv > 0 && (
                <div 
                  style={{ 
                    width: `${(currentActivity.livetv / currentActivity.total) * 100}%`, 
                    background: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: 'white',
                    fontWeight: '600',
                    minWidth: currentActivity.livetv > 0 ? '30px' : '0',
                  }}
                  title={`Live TV: ${currentActivity.livetv}`}
                >
                  {currentActivity.livetv}
                </div>
              )}
              {currentActivity.browsing > 0 && (
                <div 
                  style={{ 
                    width: `${(currentActivity.browsing / currentActivity.total) * 100}%`, 
                    background: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: 'white',
                    fontWeight: '600',
                    minWidth: currentActivity.browsing > 0 ? '30px' : '0',
                  }}
                  title={`Browsing: ${currentActivity.browsing}`}
                >
                  {currentActivity.browsing}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
              <LegendItem color="#7877c6" label="Watching VOD" value={currentActivity.watching} total={currentActivity.total} />
              <LegendItem color="#f59e0b" label="Live TV" value={currentActivity.livetv} total={currentActivity.total} />
              <LegendItem color="#3b82f6" label="Browsing" value={currentActivity.browsing} total={currentActivity.total} />
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
            No active users right now
          </div>
        )}
      </div>

      {/* Activity Trend Chart */}
      {history.length > 1 && (
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          borderRadius: '12px', 
          padding: '16px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>
              Activity Trend (Last {Math.round(history.length * refreshRate / 60)} min)
            </span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
              <span style={{ color: '#10b981' }}>● Total</span>
              <span style={{ color: '#7877c6' }}>● VOD</span>
              <span style={{ color: '#f59e0b' }}>● Live TV</span>
            </div>
          </div>
          <div style={{ position: 'relative', height: '100px' }}>
            {/* Grid lines */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: '100%' }} />
              ))}
            </div>
            
            {/* Chart */}
            <svg width="100%" height="100%" style={{ position: 'relative' }}>
              {/* Total line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                points={history.map((point, i) => {
                  const x = (i / (history.length - 1)) * 100;
                  const maxVal = Math.max(...history.map(h => h.total), 1);
                  const y = 100 - (point.total / maxVal) * 90;
                  return `${x}%,${y}%`;
                }).join(' ')}
              />
              {/* VOD line */}
              <polyline
                fill="none"
                stroke="#7877c6"
                strokeWidth="1.5"
                strokeDasharray="4,2"
                points={history.map((point, i) => {
                  const x = (i / (history.length - 1)) * 100;
                  const maxVal = Math.max(...history.map(h => h.total), 1);
                  const y = 100 - (point.watching / maxVal) * 90;
                  return `${x}%,${y}%`;
                }).join(' ')}
              />
              {/* Live TV line */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4,2"
                points={history.map((point, i) => {
                  const x = (i / (history.length - 1)) * 100;
                  const maxVal = Math.max(...history.map(h => h.total), 1);
                  const y = 100 - (point.livetv / maxVal) * 90;
                  return `${x}%,${y}%`;
                }).join(' ')}
              />
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '11px' }}>{formatTime(history[0]?.time || Date.now())}</span>
            <span style={{ color: '#64748b', fontSize: '11px' }}>{formatTime(history[history.length - 1]?.time || Date.now())}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function ActivityCard({ 
  title, 
  subtitle, 
  value, 
  peak, 
  peakTime, 
  icon, 
  color,
  isMain = false 
}: { 
  title: string; 
  subtitle: string; 
  value: number; 
  peak: number; 
  peakTime: number; 
  icon: string; 
  color: string;
  isMain?: boolean;
}) {
  const formatPeakTime = (ts: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ 
      background: isMain ? `linear-gradient(135deg, ${color}15, ${color}05)` : 'rgba(255, 255, 255, 0.03)', 
      border: `1px solid ${isMain ? color + '30' : 'rgba(255, 255, 255, 0.1)'}`, 
      borderRadius: '12px', 
      padding: '16px',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <div>
          <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '600' }}>{title}</div>
          <div style={{ color: '#64748b', fontSize: '11px' }}>{subtitle}</div>
        </div>
      </div>
      
      <div style={{ 
        fontSize: isMain ? '36px' : '28px', 
        fontWeight: '700', 
        color: color,
        lineHeight: '1',
        marginBottom: '8px'
      }}>
        {value.toLocaleString()}
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px',
        padding: '6px 8px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '6px',
        fontSize: '11px',
      }}>
        <span style={{ color: '#ec4899' }}>📈</span>
        <span style={{ color: '#94a3b8' }}>Peak today:</span>
        <span style={{ color: '#f8fafc', fontWeight: '600' }}>{peak}</span>
        {peakTime > 0 && (
          <span style={{ color: '#64748b' }}>at {formatPeakTime(peakTime)}</span>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }} />
      <span style={{ color: '#94a3b8', fontSize: '12px' }}>{label}:</span>
      <span style={{ color: '#f8fafc', fontSize: '12px', fontWeight: '600' }}>{value}</span>
      <span style={{ color: '#64748b', fontSize: '11px' }}>({percentage}%)</span>
    </div>
  );
}
