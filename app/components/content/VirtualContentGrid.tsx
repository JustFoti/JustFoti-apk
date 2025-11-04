'use client';

/**
 * Virtual Content Grid
 * High-performance grid with virtual scrolling for large datasets
 */

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ContentCard } from './ContentCard';
import { useVirtualGrid } from '@/app/lib/hooks/useVirtualScroll';
import type { MediaItem } from '@/app/types/media';

export interface VirtualContentGridProps {
  items: MediaItem[];
  onItemSelect?: (id: string) => void;
  onItemClick?: (item: MediaItem) => void;
  containerHeight?: number;
  itemWidth?: number;
  itemHeight?: number;
  gap?: number;
  className?: string;
}

export const VirtualContentGrid: React.FC<VirtualContentGridProps> = ({
  items,
  onItemSelect,
  onItemClick,
  containerHeight = 800,
  itemWidth = 200,
  itemHeight = 350,
  gap = 16,
  className = '',
}) => {
  // Get container width (responsive)
  const [containerWidth, setContainerWidth] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth - 32 : 1200
  );

  React.useEffect(() => {
    const handleResize = () => {
      setContainerWidth(window.innerWidth - 32);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Virtual scrolling
  const { virtualItems, totalHeight, containerRef } = useVirtualGrid({
    itemWidth,
    itemHeight,
    containerWidth,
    containerHeight,
    gap,
    totalItems: items.length,
    overscan: 2,
  });

  const handleItemSelect = useCallback(
    (id: string) => {
      if (onItemClick) {
        const item = items.find((i) => i.id === id);
        if (item) {
          onItemClick(item);
        }
      } else {
        onItemSelect?.(id);
      }
    },
    [onItemSelect, onItemClick, items]
  );

  return (
    <div
      ref={containerRef}
      className={`virtual-content-grid overflow-y-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div
        className="relative"
        style={{ height: totalHeight, width: '100%' }}
      >
        {virtualItems.map(({ index, x, y, width, height }) => {
          const item = items[index];
          if (!item) return null;

          return (
            <motion.div
              key={item.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                width,
                height,
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <ContentCard
                item={item}
                onSelect={handleItemSelect}
                priority={false}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualContentGrid;
