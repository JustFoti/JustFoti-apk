/**
 * Touch Optimization Hook
 * Optimizes touch interactions for mobile devices
 */

import { useEffect, useRef, useCallback } from 'react';

export interface TouchOptimizationOptions {
  preventDoubleTapZoom?: boolean;
  preventContextMenu?: boolean;
  enableFastClick?: boolean;
  hapticFeedback?: boolean;
}

export function useTouchOptimization(options: TouchOptimizationOptions = {}) {
  const {
    preventDoubleTapZoom = true,
    preventContextMenu = true,
    enableFastClick = true,
    hapticFeedback = true,
  } = options;

  const lastTouchEnd = useRef<number>(0);

  // Trigger haptic feedback (if supported)
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (!hapticFeedback) return;

      if ('vibrate' in navigator) {
        const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
        navigator.vibrate(duration);
      }
    },
    [hapticFeedback]
  );

  useEffect(() => {
    // Prevent double-tap zoom on iOS
    if (preventDoubleTapZoom) {
      const handleTouchEnd = (e: TouchEvent) => {
        const now = Date.now();
        if (now - lastTouchEnd.current <= 300) {
          e.preventDefault();
        }
        lastTouchEnd.current = now;
      };

      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      return () => document.removeEventListener('touchend', handleTouchEnd);
    }
  }, [preventDoubleTapZoom]);

  useEffect(() => {
    // Prevent context menu on long press
    if (preventContextMenu) {
      const handleContextMenu = (e: Event) => {
        e.preventDefault();
      };

      document.addEventListener('contextmenu', handleContextMenu);
      return () => document.removeEventListener('contextmenu', handleContextMenu);
    }
  }, [preventContextMenu]);

  // Add touch-action CSS to prevent default behaviors
  useEffect(() => {
    if (enableFastClick) {
      document.body.style.touchAction = 'manipulation';
      return () => {
        document.body.style.touchAction = '';
      };
    }
  }, [enableFastClick]);

  return {
    triggerHaptic,
  };
}
