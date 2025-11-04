/**
 * TopContent Component
 * Displays top watched content with stats
 */

'use client';

import styles from './TopContent.module.css';

export interface ContentItem {
  contentId: string;
  title: string;
  contentType: 'movie' | 'tv';
  viewCount: number;
  totalWatchTime: number;
  completionRate: number;
  posterPath?: string;
}

export interface TopContentProps {
  items: ContentItem[];
  loading?: boolean;
}

function formatWatchTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatCompletionRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default function TopContent({ items, loading = false }: TopContentProps) {
  if (loading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Top Watched Content</h2>
        <div className={styles.list}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className={styles.item}>
              <div className={styles.skeleton}>
                <div className={styles.skeletonPoster}></div>
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonTitle}></div>
                  <div className={styles.skeletonStats}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.heading}>Top Watched Content</h2>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📊</span>
          <p className={styles.emptyText}>No content data available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Top Watched Content</h2>
      <div className={styles.list}>
        {items.map((item, index) => (
          <div key={item.contentId} className={styles.item}>
            <div className={styles.rank}>{index + 1}</div>
            
            {item.posterPath && (
              <div className={styles.poster}>
                <img 
                  src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
                  alt={item.title}
                  className={styles.posterImage}
                />
              </div>
            )}
            
            <div className={styles.content}>
              <div className={styles.info}>
                <h3 className={styles.title}>{item.title}</h3>
                <span className={styles.type}>
                  {item.contentType === 'movie' ? '🎬 Movie' : '📺 TV Show'}
                </span>
              </div>
              
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Views</span>
                  <span className={styles.statValue}>{item.viewCount.toLocaleString()}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Watch Time</span>
                  <span className={styles.statValue}>{formatWatchTime(item.totalWatchTime)}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Completion</span>
                  <span className={styles.statValue}>{formatCompletionRate(item.completionRate)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
