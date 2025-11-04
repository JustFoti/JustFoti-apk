/**
 * MetricsCard Component
 * Displays a single metric with value, trend, and icon
 */

'use client';

import styles from './MetricsCard.module.css';

export interface MetricsCardProps {
  title: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
  suffix?: string;
  loading?: boolean;
}

export default function MetricsCard({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  suffix = '',
  loading = false,
}: MetricsCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendClass = () => {
    if (trend === 'up') return styles.trendUp;
    if (trend === 'down') return styles.trendDown;
    return styles.trendNeutral;
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonValue}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <h3 className={styles.title}>{title}</h3>
      </div>
      
      <div className={styles.content}>
        <div className={styles.value}>
          {value}
          {suffix && <span className={styles.suffix}>{suffix}</span>}
        </div>
        
        {change !== undefined && (
          <div className={`${styles.trend} ${getTrendClass()}`}>
            <span className={styles.trendIcon}>{getTrendIcon()}</span>
            <span className={styles.trendValue}>
              {Math.abs(change)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
