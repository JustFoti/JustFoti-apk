'use client';

/**
 * Responsive Content Grid
 * Mobile-first grid layout with optimized spacing and touch interactions
 */

import React from 'react';
import { useIsMobile, useIsTablet } from '@/app/lib/hooks/useMediaQuery';
import { ContentCard } from './ContentCard';
import type { MediaItem } from '@/app/types/media';
import styles from './ResponsiveContentGrid.module.css';

export interface ResponsiveContentGridProps {
  items: MediaItem[];
  onItemSelect?: (id: string) => void;
  loading?: boolean;
  className?: string;
}

export const ResponsiveContentGrid: React.FC<ResponsiveContentGridProps> = ({
  items,
  onItemSelect,
  loading = false,
  className = '',
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Determine grid columns based on device
  const getGridClass = () => {
    if (isMobile) return styles.gridMobile;
    if (isTablet) return styles.gridTablet;
    return styles.gridDesktop;
  };

  if (loading) {
    return (
      <div className={`${styles.grid} ${getGridClass()} ${className}`}>
        {Array.from({ length: isMobile ? 4 : isTablet ? 6 : 8 }).map((_, index) => (
          <div key={index} className={styles.skeleton}>
            <div className={styles.skeletonPoster} />
            <div className={styles.skeletonInfo}>
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonMeta} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🎬</div>
        <p className={styles.emptyText}>No content available</p>
      </div>
    );
  }

  return (
    <div className={`${styles.grid} ${getGridClass()} ${className}`}>
      {items.map((item, index) => (
        <ContentCard
          key={item.id}
          item={item}
          onSelect={onItemSelect}
          priority={index < (isMobile ? 2 : 4)}
        />
      ))}
    </div>
  );
};

export default ResponsiveContentGrid;
