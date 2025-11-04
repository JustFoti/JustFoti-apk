/**
 * Touch Gesture Hook
 * Handles swipe, pinch, and tap gestures for mobile devices
 */

import { useRef, useCallback, useState } from 'react';

export interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: (scale: number) => void;
  onPinchOut?: (scale: number) => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

export interface GestureOptions {
  swipeThreshold?: number;
  pinchThreshold?: number;
  doubleTapDelay?: number;
  longPressDelay?: number;
}

export interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  initialDistance: number;
}

export function useGestures(
  handlers: GestureHandlers,
  options: GestureOptions = {}
) {
  const {
    swipeThreshold = 50,
    pinchThreshold = 0.1,
    doubleTapDelay = 300,
    longPressDelay = 500,
  } = options;

  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    initialDistance: 0,
  });

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const now = Date.now();

      touchState.current = {
        ...touchState.current,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: now,
      };

      // Handle multi-touch for pinch
      if (e.touches.length === 2) {
        touchState.current.initialDistance = getDistance(e.touches[0], e.touches[1]);
      }

      // Long press detection
      if (handlers.onLongPress) {
        longPressTimer.current = setTimeout(() => {
          setIsLongPressing(true);
          handlers.onLongPress?.();
        }, longPressDelay);
      }
    },
    [handlers, longPressDelay]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Cancel long press on move
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      // Handle pinch gesture
      if (e.touches.length === 2 && touchState.current.initialDistance > 0) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / touchState.current.initialDistance;

        if (Math.abs(scale - 1) > pinchThreshold) {
          if (scale > 1 && handlers.onPinchOut) {
            handlers.onPinchOut(scale);
          } else if (scale < 1 && handlers.onPinchIn) {
            handlers.onPinchIn(scale);
          }
        }
      }
    },
    [handlers, pinchThreshold]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Clear long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (isLongPressing) {
        setIsLongPressing(false);
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchState.current.startX;
      const deltaY = touch.clientY - touchState.current.startY;
      const deltaTime = Date.now() - touchState.current.startTime;

      // Check for swipe gestures
      if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (deltaX > 0 && handlers.onSwipeRight) {
            handlers.onSwipeRight();
          } else if (deltaX < 0 && handlers.onSwipeLeft) {
            handlers.onSwipeLeft();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && handlers.onSwipeDown) {
            handlers.onSwipeDown();
          } else if (deltaY < 0 && handlers.onSwipeUp) {
            handlers.onSwipeUp();
          }
        }
        return;
      }

      // Check for double tap
      const now = Date.now();
      if (
        deltaTime < 200 &&
        now - touchState.current.lastTapTime < doubleTapDelay &&
        handlers.onDoubleTap
      ) {
        handlers.onDoubleTap();
        touchState.current.lastTapTime = 0; // Reset to prevent triple tap
      } else {
        touchState.current.lastTapTime = now;
      }
    },
    [handlers, swipeThreshold, doubleTapDelay, isLongPressing]
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isLongPressing,
  };
}
