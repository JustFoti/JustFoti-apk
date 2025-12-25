'use client';

/**
 * Unified Stats Bar
 * Displays consistent real-time stats across all admin pages
 * Uses the StatsContext for single source of truth
 * Enhanced with responsive design and accessibility features
 */

import { useStats } from '../context/StatsContext';
import { useState, useEffect } from 'react';
import AccessibleButton from './AccessibleButton';

export default function UnifiedStatsBar() {
  const { stats, loading, lastRefresh, refresh } = useStats();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div 
      style={{
        background: 'rgba(15, 23, 42, 0.8)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: isMobile ? '12px 16px' : '12px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: isMobile ? '12px' : '24px',
        backdropFilter: 'blur(10px)',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        minHeight: '60px',
      }}
      role="banner"
      aria-label="Real-time statistics"
    >
      {/* Left side - Key metrics */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '12px' : '24px',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          flex: 1,
          minWidth: 0,
        }}
        role="group"
        aria-label="Current statistics"
      >
        {/* Live Users - shows total active (2-min window) */}
        <StatItem
          icon="🟢"
          label="On Site"
          value={stats.liveUsers}
          loading={loading}
          pulse={stats.liveUsers > 0}
          color="#10b981"
          subtitle={stats.liveWatching > 0 ? `${stats.liveWatching} watching` : undefined}
          priority={1}
          isMobile={isMobile}
        />
        
        {/* DAU */}
        <StatItem
          icon="📊"
          label="Today (DAU)"
          value={stats.activeToday}
          loading={loading}
          color="#7877c6"
          priority={2}
          isMobile={isMobile}
        />
        
        {/* WAU - Hide on mobile to save space */}
        {!isMobile && (
          <StatItem
            icon="📈"
            label="This Week"
            value={stats.activeThisWeek}
            loading={loading}
            color="#f59e0b"
            priority={3}
            isMobile={isMobile}
          />
        )}
        
        {/* Sessions Today */}
        <StatItem
          icon="▶️"
          label={isMobile ? "Sessions" : "Sessions (24h)"}
          value={stats.totalSessions}
          loading={loading}
          color="#3b82f6"
          priority={4}
          isMobile={isMobile}
        />
        
        {/* Watch Time - show in hours as float, hide on mobile */}
        {!isMobile && (
          <StatItem
            icon="⏱️"
            label="Watch Time (24h)"
            value={`${(stats.totalWatchTime / 60).toFixed(1)}h`}
            loading={loading}
            color="#ec4899"
            subtitle={stats.allTimeWatchTime > 0 ? `All time: ${(stats.allTimeWatchTime / 60).toFixed(1)}h` : undefined}
            priority={5}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Right side - Last updated & refresh */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          flexShrink: 0,
        }}
        role="group"
        aria-label="Data refresh controls"
      >
        {!isMobile && (
          <span 
            style={{ 
              color: '#64748b', 
              fontSize: '11px',
              whiteSpace: 'nowrap',
            }}
            aria-live="polite"
          >
            {lastRefresh 
              ? `Updated ${lastRefresh.toLocaleTimeString()}`
              : 'Loading...'
            }
          </span>
        )}
        <AccessibleButton
          onClick={refresh}
          disabled={loading}
          variant="ghost"
          size="sm"
          ariaLabel="Refresh statistics data"
          style={{
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: '#94a3b8',
            fontSize: '12px',
            minHeight: '32px',
          }}
        >
          <span 
            style={{ 
              display: 'inline-block',
              animation: loading ? 'spin 1s linear infinite' : 'none'
            }}
            aria-hidden="true"
          >
            🔄
          </span>
          {!isMobile && 'Refresh'}
        </AccessibleButton>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function StatItem({ 
  icon, 
  label, 
  value, 
  loading, 
  pulse = false,
  color = '#94a3b8',
  subtitle,
  priority = 1,
  isMobile = false
}: { 
  icon: string; 
  label: string; 
  value: string | number; 
  loading: boolean;
  pulse?: boolean;
  color?: string;
  subtitle?: string;
  priority?: number;
  isMobile?: boolean;
}) {
  // Hide lower priority items on mobile
  if (isMobile && priority > 4) {
    return null;
  }

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: isMobile ? '4px 8px' : '6px 12px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        minWidth: isMobile ? '80px' : '120px',
        flexShrink: 0,
      }}
      role="group"
      aria-label={`${label}: ${loading ? 'Loading' : (typeof value === 'number' ? value.toLocaleString() : value)}`}
    >
      <span 
        style={{ 
          fontSize: isMobile ? '12px' : '14px',
          position: 'relative',
        }}
        aria-hidden="true"
      >
        {icon}
        {pulse && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '6px',
            height: '6px',
            background: '#10b981',
            borderRadius: '50%',
            animation: 'pulse 2s infinite',
          }} />
        )}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div 
          style={{ 
            color: '#64748b', 
            fontSize: isMobile ? '9px' : '10px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </div>
        <div 
          style={{ 
            color: color, 
            fontSize: isMobile ? '14px' : '16px', 
            fontWeight: '700',
            opacity: loading ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
          aria-live="polite"
        >
          {loading ? '...' : (typeof value === 'number' ? value.toLocaleString() : value)}
        </div>
        {subtitle && !isMobile && (
          <div 
            style={{ 
              color: '#475569', 
              fontSize: '9px', 
              marginTop: '1px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
