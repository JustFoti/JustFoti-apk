'use client';

/**
 * Live Activity Summary
 * A compact summary of real-time user activity for the main dashboard
 * Shows clear breakdown of what users are doing
 */

import { useStats } from '../context/StatsContext';
import { useEffect, useState } from 'react';

interface PeakData {
  peakTotal: number;
  peakTotalTime: number;
}

export default function LiveActivitySummary() {
  const { stats, loading } = useStats();
  const [peak, setPeak] = useState<PeakData | null>(null);

  // Fetch today's peak
  useEffect(() => {
    const fetchPeak = async () => {
      try {
        const response = await fetch('/api/admin/peak-stats');
        const data = await response.json();
        if (data.success && data.today) {
          setPeak({
            peakTotal: data.today.peakTotal || 0,
            peakTotalTime: data.today.peakTotalTime || 0,
          });
        }
      } catch (e) {
        // Ignore errors
      }
    };
    fetchPeak();
    const interval = setInterval(fetchPeak, 60000); // Refresh peak every minute
    return () => clearInterval(interval);
  }, []);

  const total = stats.liveUsers;
  const watching = stats.liveWatching;
  const livetv = stats.liveTVViewers;
  const browsing = stats.liveBrowsing;

  const formatPeakTime = (ts: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Live Activity
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              background: total > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              borderRadius: '12px',
              fontSize: '10px',
              color: total > 0 ? '#10b981' : '#64748b',
            }}>
              <span style={{
                width: '5px',
                height: '5px',
                background: total > 0 ? '#10b981' : '#64748b',
                borderRadius: '50%',
                animation: total > 0 ? 'pulse 2s infinite' : 'none',
              }} />
              {total > 0 ? 'LIVE' : 'IDLE'}
            </span>
          </h3>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '12px' }}>
            Real-time user activity breakdown
          </p>
        </div>
        {peak && peak.peakTotal > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#64748b', fontSize: '11px' }}>Peak today</div>
            <div style={{ color: '#ec4899', fontSize: '16px', fontWeight: '700' }}>{peak.peakTotal}</div>
            {peak.peakTotalTime > 0 && (
              <div style={{ color: '#64748b', fontSize: '10px' }}>at {formatPeakTime(peak.peakTotalTime)}</div>
            )}
          </div>
        )}
      </div>

      {/* Main count */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'baseline', 
        gap: '8px', 
        marginBottom: '16px',
        padding: '12px 16px',
        background: 'rgba(16, 185, 129, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(16, 185, 129, 0.2)',
      }}>
        <span style={{ fontSize: '36px', fontWeight: '700', color: '#10b981' }}>
          {loading ? '...' : total}
        </span>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>users on site</span>
      </div>

      {/* Activity breakdown */}
      {total > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <ActivityRow 
            icon="▶️" 
            label="Watching content" 
            value={watching} 
            total={total} 
            color="#7877c6" 
          />
          <ActivityRow 
            icon="📺" 
            label="Live TV" 
            value={livetv} 
            total={total} 
            color="#f59e0b" 
          />
          <ActivityRow 
            icon="🔍" 
            label="Browsing" 
            value={browsing} 
            total={total} 
            color="#3b82f6" 
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '13px' }}>
          No active users right now
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

function ActivityRow({ 
  icon, 
  label, 
  value, 
  total, 
  color 
}: { 
  icon: string; 
  label: string; 
  value: number; 
  total: number; 
  color: string;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '16px', width: '24px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: '#e2e8f0', fontSize: '13px' }}>{label}</span>
          <span style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '600' }}>
            {value} <span style={{ color: '#64748b', fontWeight: '400' }}>({percentage}%)</span>
          </span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            width: `${percentage}%`, 
            background: color, 
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    </div>
  );
}
