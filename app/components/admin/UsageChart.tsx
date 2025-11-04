/**
 * UsageChart Component
 * Displays engagement trends visualization
 */

'use client';

import styles from './UsageChart.module.css';

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface UsageChartProps {
  data: ChartDataPoint[];
  type?: 'line' | 'bar' | 'area';
  title: string;
  metric: 'views' | 'watchTime' | 'users';
  loading?: boolean;
}

function formatValue(value: number, metric: string): string {
  if (metric === 'watchTime') {
    const hours = Math.floor(value / 3600);
    return `${hours}h`;
  }
  return value.toLocaleString();
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function UsageChart({
  data,
  type = 'line',
  title,
  metric,
  loading = false,
}: UsageChartProps) {
  if (loading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>{title}</h2>
        <div className={styles.skeleton}>
          <div className={styles.skeletonChart}></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>{title}</h2>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📈</span>
          <p className={styles.emptyText}>No data available</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>{title}</h2>
      
      <div className={styles.chart}>
        <div className={styles.yAxis}>
          <span className={styles.yLabel}>{formatValue(maxValue, metric)}</span>
          <span className={styles.yLabel}>{formatValue(maxValue / 2, metric)}</span>
          <span className={styles.yLabel}>0</span>
        </div>
        
        <div className={styles.plotArea}>
          <div className={styles.grid}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={styles.gridLine}></div>
            ))}
          </div>
          
          <div className={styles.bars}>
            {data.map((point, index) => {
              const height = ((point.value - minValue) / range) * 100;
              return (
                <div key={index} className={styles.barWrapper}>
                  <div 
                    className={styles.bar}
                    style={{ height: `${height}%` }}
                    title={`${formatDate(point.timestamp)}: ${formatValue(point.value, metric)}`}
                  >
                    <div className={styles.barFill}></div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {type === 'line' && (
            <svg className={styles.line} viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                d={data.map((point, index) => {
                  const x = (index / (data.length - 1)) * 100;
                  const y = 100 - ((point.value - minValue) / range) * 100;
                  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                className={styles.linePath}
              />
            </svg>
          )}
        </div>
        
        <div className={styles.xAxis}>
          {data.map((point, index) => {
            // Show every nth label to avoid crowding
            const showLabel = data.length <= 7 || index % Math.ceil(data.length / 7) === 0;
            return (
              <span 
                key={index} 
                className={styles.xLabel}
                style={{ opacity: showLabel ? 1 : 0 }}
              >
                {formatDate(point.timestamp)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
