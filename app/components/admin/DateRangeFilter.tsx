/**
 * DateRangeFilter Component
 * Allows filtering dashboard data by date range
 */

'use client';

import styles from './DateRangeFilter.module.css';

export type DateRange = '24h' | '7d' | '30d' | '90d';

export interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const ranges: { value: DateRange; label: string }[] = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div className={styles.container}>
      <label className={styles.label}>Time Range</label>
      <div className={styles.buttons}>
        {ranges.map((range) => (
          <button
            key={range.value}
            className={`${styles.button} ${value === range.value ? styles.active : ''}`}
            onClick={() => onChange(range.value)}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}
