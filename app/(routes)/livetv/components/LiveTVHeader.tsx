/**
 * LiveTV Header Component
 * Simplified header with search
 */

import { memo } from 'react';
import styles from '../LiveTV.module.css';

interface LiveTVHeaderProps {
  stats: {
    live: number;
    total: number;
  };
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const LiveTVHeader = memo(function LiveTVHeader({
  stats,
  searchQuery,
  onSearchChange,
  onRefresh,
  loading,
}: LiveTVHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Live TV</h1>
          <p className={styles.subtitle}>
            {stats.live} live • {stats.total} total
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.searchInputWrapper}>
            <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className={styles.clearSearch}>
                ✕
              </button>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className={styles.refreshButton}
            aria-label="Refresh"
          >
            <svg 
              className={loading ? styles.spinning : ''} 
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});
