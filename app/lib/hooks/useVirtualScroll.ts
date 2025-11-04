/**
 * Virtual Scrolling Hook
 * 
 * Implements virtual scrolling for large lists to improve performance
 * Only renders visible items plus a buffer
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside viewport
  totalItems: number;
}

export interface VirtualScrollResult {
  virtualItems: Array<{
    index: number;
    start: number;
    size: number;
  }>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useVirtualScroll({
  itemHeight,
  containerHeight,
  overscan = 3,
  totalItems,
}: VirtualScrollOptions): VirtualScrollResult {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Generate virtual items
  const virtualItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      start: i * itemHeight,
      size: itemHeight,
    });
  }

  const totalHeight = totalItems * itemHeight;

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback(
    (index: number) => {
      if (containerRef.current) {
        const scrollPosition = index * itemHeight;
        containerRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth',
        });
      }
    },
    [itemHeight]
  );

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return {
    virtualItems,
    totalHeight,
    scrollToIndex,
    containerRef,
  };
}

/**
 * Virtual Grid Hook
 * For 2D grid layouts with virtual scrolling
 */
export interface VirtualGridOptions {
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  overscan?: number;
  totalItems: number;
}

export interface VirtualGridResult {
  virtualItems: Array<{
    index: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  totalHeight: number;
  columns: number;
  scrollToIndex: (index: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useVirtualGrid({
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  gap = 0,
  overscan = 1,
  totalItems,
}: VirtualGridOptions): VirtualGridResult {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate columns
  const columns = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rows = Math.ceil(totalItems / columns);

  // Calculate visible range
  const rowHeight = itemHeight + gap;
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(
    rows - 1,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );

  // Generate virtual items
  const virtualItems = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      if (index >= totalItems) break;

      virtualItems.push({
        index,
        x: col * (itemWidth + gap),
        y: row * rowHeight,
        width: itemWidth,
        height: itemHeight,
      });
    }
  }

  const totalHeight = rows * rowHeight;

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback(
    (index: number) => {
      if (containerRef.current) {
        const row = Math.floor(index / columns);
        const scrollPosition = row * rowHeight;
        containerRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth',
        });
      }
    },
    [columns, rowHeight]
  );

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return {
    virtualItems,
    totalHeight,
    columns,
    scrollToIndex,
    containerRef,
  };
}
