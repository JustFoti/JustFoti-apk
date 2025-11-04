import { useState, useEffect } from 'react';

interface ScrollPosition {
  x: number;
  y: number;
}

/**
 * Hook to track scroll position
 * @param throttleMs - Throttle delay in milliseconds (default: 100)
 * @returns Current scroll position {x, y}
 */
export function useScrollPosition(throttleMs: number = 100): ScrollPosition {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (timeoutId) {
        return;
      }

      timeoutId = setTimeout(() => {
        setScrollPosition({
          x: window.scrollX,
          y: window.scrollY,
        });
        timeoutId = null;
      }, throttleMs);
    };

    // Set initial position
    setScrollPosition({
      x: window.scrollX,
      y: window.scrollY,
    });

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [throttleMs]);

  return scrollPosition;
}

/**
 * Hook to detect if user has scrolled past a threshold
 * @param threshold - Scroll threshold in pixels (default: 50)
 * @returns boolean indicating if scrolled past threshold
 */
export function useIsScrolled(threshold: number = 50): boolean {
  const { y } = useScrollPosition();
  return y > threshold;
}
