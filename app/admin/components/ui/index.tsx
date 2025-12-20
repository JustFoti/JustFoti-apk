'use client';

/**
 * Unified Admin UI Components
 * Single source of truth for all admin panel UI elements
 * Eliminates code duplication across admin pages
 */

import { ReactNode, CSSProperties } from 'react';

// ============================================
// TYPES
// ============================================

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  gradient?: string;
  pulse?: boolean;
  subtitle?: string;
  trend?: { value: number; label?: string };
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  subtitle?: string;
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  gradient?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  count?: number | null;
}

export interface TabSelectorProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

export interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
}

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  maxRows?: number;
}

// ============================================
// COLORS & THEMES
// ============================================

export const colors = {
  primary: '#7877c6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  pink: '#ec4899',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
  },
  bg: {
    card: 'rgba(255, 255, 255, 0.03)',
    cardHover: 'rgba(255, 255, 255, 0.05)',
    input: 'rgba(255, 255, 255, 0.05)',
  },
  border: {
    default: 'rgba(255, 255, 255, 0.1)',
    subtle: 'rgba(255, 255, 255, 0.05)',
  },
};

export const gradients = {
  primary: 'linear-gradient(135deg, #7877c6 0%, #9333ea 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  pink: 'linear-gradient(135deg, #ff77c6 0%, #ec4899 100%)',
  purple: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  mixed: 'linear-gradient(90deg, #7877c6, #ff77c6)',
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${secs}s`;
}

export function formatDurationMinutes(minutes: number): string {
  if (!minutes || minutes < 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatTimeAgo(timestamp: number): string {
  const ts = normalizeTimestamp(timestamp);
  if (!ts || !isValidTimestamp(ts)) return 'N/A';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 0) return 'Just now';
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days > 365) return `${Math.floor(days / 365)}y ago`;
  return `${days}d ago`;
}

export function formatDate(timestamp: number): string {
  const ts = normalizeTimestamp(timestamp);
  if (!ts || !isValidTimestamp(ts)) return 'N/A';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return 'N/A';
  }
}

export function formatDateShort(timestamp: number): string {
  const ts = normalizeTimestamp(timestamp);
  if (!ts || !isValidTimestamp(ts)) return 'N/A';
  try {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
  }
}

export function isValidTimestamp(ts: number): boolean {
  if (!ts || ts <= 0 || isNaN(ts)) return false;
  const now = Date.now();
  const minValidDate = new Date('2020-01-01').getTime();
  return ts >= minValidDate && ts <= now + 3600000;
}

export function normalizeTimestamp(ts: any): number {
  if (!ts) return 0;
  const num = typeof ts === 'string' ? parseInt(ts, 10) : Number(ts);
  if (isNaN(num) || num <= 0) return 0;
  if (num < 1000000000000) return num * 1000;
  return num;
}

export function getCompletionColor(percentage: number): string {
  if (percentage >= 90) return colors.success;
  if (percentage >= 50) return colors.warning;
  return colors.danger;
}

export function getEngagementColor(score: number): string {
  if (score >= 80) return colors.success;
  if (score >= 50) return colors.warning;
  if (score >= 20) return colors.info;
  return colors.text.muted;
}

export function getPercentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

// ============================================
// BASE STYLES
// ============================================

const baseCardStyle: CSSProperties = {
  background: colors.bg.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: '12px',
  padding: '16px',
  transition: 'all 0.2s ease',
};

const baseInputStyle: CSSProperties = {
  padding: '10px 16px',
  background: colors.bg.input,
  border: `1px solid ${colors.border.default}`,
  borderRadius: '8px',
  color: colors.text.primary,
  fontSize: '14px',
  outline: 'none',
};

const baseButtonStyle: CSSProperties = {
  padding: '10px 20px',
  border: `1px solid ${colors.border.default}`,
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: '500',
  fontSize: '14px',
  transition: 'all 0.2s ease',
};

// ============================================
// COMPONENTS
// ============================================

export function StatCard({ 
  title, 
  value, 
  icon, 
  color = colors.primary,
  gradient,
  pulse = false,
  subtitle,
  trend,
  size = 'md',
  onClick
}: StatCardProps) {
  const sizes = {
    sm: { padding: '12px', iconSize: '16px', valueSize: '18px', titleSize: '11px' },
    md: { padding: '16px', iconSize: '20px', valueSize: '24px', titleSize: '12px' },
    lg: { padding: '20px', iconSize: '24px', valueSize: '32px', titleSize: '13px' },
  };
  const s = sizes[size];
  
  // Use gradient for border if provided, otherwise use solid color
  const borderStyle = gradient 
    ? { borderImage: `${gradient} 1`, borderTop: '3px solid' }
    : { borderTop: `3px solid ${color}` };

  return (
    <div 
      style={{
        ...baseCardStyle,
        padding: s.padding,
        ...borderStyle,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ 
          fontSize: s.iconSize, 
          position: 'relative',
          background: gradient || 'transparent',
          WebkitBackgroundClip: gradient ? 'text' : undefined,
          WebkitTextFillColor: gradient ? 'transparent' : undefined,
        }}>
          {icon}
          {pulse && (
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '8px',
              height: '8px',
              background: colors.success,
              borderRadius: '50%',
              animation: 'pulse 2s infinite',
            }} />
          )}
        </span>
        <span style={{ color: colors.text.secondary, fontSize: s.titleSize }}>{title}</span>
        {trend && (
          <span style={{
            marginLeft: 'auto',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            background: trend.value >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: trend.value >= 0 ? colors.success : colors.danger,
          }}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div style={{ 
        fontSize: s.valueSize, 
        fontWeight: '700', 
        color: gradient ? undefined : colors.text.primary,
        background: gradient || 'transparent',
        WebkitBackgroundClip: gradient ? 'text' : undefined,
        WebkitTextFillColor: gradient ? 'transparent' : undefined,
      }}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      {subtitle && (
        <div style={{ color: colors.text.muted, fontSize: '11px', marginTop: '4px' }}>{subtitle}</div>
      )}
    </div>
  );
}

export function MetricCard({ label, value, icon, color = colors.primary, subtitle }: MetricCardProps) {
  return (
    <div style={{
      ...baseCardStyle,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      borderLeft: `4px solid ${color}`,
    }}>
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '700', color }}>
          {typeof value === 'number' ? formatNumber(value) : value}
        </div>
        <div style={{ fontSize: '12px', color: colors.text.muted }}>{label}</div>
        {subtitle && <div style={{ fontSize: '10px', color: colors.text.muted, marginTop: '2px' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

export function ProgressBar({ 
  value, 
  max = 100, 
  color = colors.primary, 
  gradient,
  height = 8,
  showLabel = false,
  label
}: ProgressBarProps) {
  const percentage = getPercentage(value, max);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      {label && <span style={{ color: colors.text.secondary, fontSize: '13px', minWidth: '80px' }}>{label}</span>}
      <div style={{
        flex: 1,
        height: `${height}px`,
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: `${height / 2}px`,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: gradient || color,
          borderRadius: `${height / 2}px`,
          transition: 'width 0.3s ease',
        }} />
      </div>
      {showLabel && (
        <span style={{ color: colors.text.primary, fontSize: '13px', fontWeight: '600', minWidth: '50px', textAlign: 'right' }}>
          {percentage}%
        </span>
      )}
    </div>
  );
}


export function TabSelector({ tabs, activeTab, onChange }: TabSelectorProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: `1px solid ${colors.border.default}`,
      flexWrap: 'wrap',
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            ...baseButtonStyle,
            background: activeTab === tab.id ? 'rgba(120, 119, 198, 0.2)' : colors.bg.card,
            borderColor: activeTab === tab.id ? colors.primary : colors.border.default,
            color: activeTab === tab.id ? colors.primary : colors.text.secondary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.count !== null && tab.count !== undefined && (
            <span style={{
              background: activeTab === tab.id ? colors.primary : 'rgba(255, 255, 255, 0.1)',
              color: activeTab === tab.id ? 'white' : colors.text.secondary,
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '600',
            }}>
              {formatNumber(tab.count)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function TimeRangeSelector({ 
  value, 
  onChange, 
  options = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: 'all', label: 'All Time' },
  ]
}: TimeRangeSelectorProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      background: colors.bg.input,
      padding: '4px',
      borderRadius: '10px',
      border: `1px solid ${colors.border.default}`,
    }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '8px 16px',
            background: value === opt.value ? colors.primary : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: value === opt.value ? 'white' : colors.text.secondary,
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function DataTable<T extends Record<string, any>>({ 
  data, 
  columns, 
  loading = false, 
  emptyMessage = 'No data available',
  onRowClick,
  maxRows = 50
}: DataTableProps<T>) {
  const thStyle: CSSProperties = {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderBottom: `1px solid ${colors.border.default}`,
  };

  const tdStyle: CSSProperties = {
    padding: '14px 16px',
    color: colors.text.primary,
    fontSize: '14px',
    borderBottom: `1px solid ${colors.border.subtle}`,
  };

  return (
    <div style={{
      background: colors.bg.card,
      border: `1px solid ${colors.border.default}`,
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} style={{ ...thStyle, width: col.width, textAlign: col.align || 'left' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ ...tdStyle, textAlign: 'center', padding: '40px' }}>
                  <Spinner /> Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: colors.text.muted }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.slice(0, maxRows).map((item, index) => (
                <tr 
                  key={index} 
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} style={{ ...tdStyle, textAlign: col.align || 'left' }}>
                      {col.render ? col.render(item, index) : String(item[col.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Spinner({ size = 40 }: { size?: number }) {
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      border: '3px solid rgba(120, 119, 198, 0.2)',
      borderTopColor: colors.primary,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      display: 'inline-block',
    }} />
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px',
      color: colors.text.secondary,
      gap: '16px',
    }}>
      <Spinner />
      {message}
    </div>
  );
}

export function EmptyState({ 
  icon = '📊', 
  title = 'No Data', 
  message = 'Data will appear here once available' 
}: { icon?: string; title?: string; message?: string }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 40px',
      background: colors.bg.card,
      borderRadius: '16px',
      border: `1px solid ${colors.border.default}`,
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
      <h3 style={{ color: colors.text.primary, margin: '0 0 8px 0' }}>{title}</h3>
      <p style={{ color: colors.text.muted, margin: 0 }}>{message}</p>
    </div>
  );
}

export function PageHeader({ 
  title, 
  subtitle, 
  icon,
  actions 
}: { 
  title: string; 
  subtitle?: string; 
  icon?: string;
  actions?: ReactNode;
}) {
  return (
    <div style={{
      marginBottom: '32px',
      paddingBottom: '20px',
      borderBottom: `1px solid ${colors.border.default}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: '16px',
    }}>
      <div>
        <h2 style={{
          margin: 0,
          color: colors.text.primary,
          fontSize: '24px',
          fontWeight: '600',
          letterSpacing: '-0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {icon && <span style={{ fontSize: '28px' }}>{icon}</span>}
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '8px 0 0 0', color: colors.text.secondary, fontSize: '16px' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

export function Card({ 
  children, 
  title, 
  icon,
  padding = '20px',
  className
}: { 
  children: ReactNode; 
  title?: string; 
  icon?: string;
  padding?: string;
  className?: string;
}) {
  return (
    <div style={{ ...baseCardStyle, padding }} className={className}>
      {title && (
        <h3 style={{ 
          margin: '0 0 16px 0', 
          color: colors.text.primary, 
          fontSize: '16px', 
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {icon && <span>{icon}</span>}
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export function Grid({ 
  children, 
  cols = 'auto-fit', 
  minWidth = '200px', 
  gap = '16px' 
}: { 
  children: ReactNode; 
  cols?: string | number; 
  minWidth?: string; 
  gap?: string;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: typeof cols === 'number' 
        ? `repeat(${cols}, 1fr)` 
        : `repeat(${cols}, minmax(${minWidth}, 1fr))`,
      gap,
    }}>
      {children}
    </div>
  );
}

export function Badge({ 
  children, 
  color = colors.primary, 
  variant = 'filled' 
}: { 
  children: ReactNode; 
  color?: string; 
  variant?: 'filled' | 'outline';
}) {
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      background: variant === 'filled' ? `${color}33` : 'transparent',
      color: color,
      border: variant === 'outline' ? `1px solid ${color}` : 'none',
    }}>
      {children}
    </span>
  );
}

export function LiveIndicator({ active = true }: { active?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
      border: `1px solid ${active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
      borderRadius: '20px',
      padding: '6px 14px',
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: active ? colors.success : colors.text.muted,
        animation: active ? 'pulse 2s ease-in-out infinite' : 'none',
      }} />
      <span style={{ 
        color: active ? colors.success : colors.text.muted, 
        fontSize: '13px', 
        fontWeight: '500' 
      }}>
        {active ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'Search...' 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...baseInputStyle,
        flex: 1,
        minWidth: '200px',
      }}
    />
  );
}

export function Select<T extends string>({ 
  value, 
  onChange, 
  options 
}: { 
  value: T; 
  onChange: (value: T) => void; 
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{
        ...baseInputStyle,
        cursor: 'pointer',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e' }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function Button({ 
  children, 
  onClick, 
  variant = 'default',
  disabled = false,
  icon
}: { 
  children: ReactNode; 
  onClick?: () => void; 
  variant?: 'default' | 'primary' | 'success' | 'danger';
  disabled?: boolean;
  icon?: string;
}) {
  const variants = {
    default: { bg: colors.bg.input, color: colors.text.secondary, border: colors.border.default },
    primary: { bg: 'rgba(120, 119, 198, 0.2)', color: colors.primary, border: colors.primary },
    success: { bg: 'rgba(16, 185, 129, 0.2)', color: colors.success, border: colors.success },
    danger: { bg: 'rgba(239, 68, 68, 0.2)', color: colors.danger, border: colors.danger },
  };
  const v = variants[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...baseButtonStyle,
        background: v.bg,
        color: v.color,
        borderColor: v.border,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

// Global styles injection
export function AdminStyles() {
  return (
    <style jsx global>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
      }
    `}</style>
  );
}
