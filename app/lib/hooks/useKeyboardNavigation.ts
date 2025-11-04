/**
 * Keyboard Navigation Hook
 * Provides keyboard navigation utilities for interactive elements
 */

'use client';

import { useCallback, useRef } from 'react';
import { KeyboardKeys, isActivationKey } from '../utils/accessibility';

interface KeyboardNavigationOptions {
  onEnter?: () => void;
  onSpace?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    onEnter,
    onSpace,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onHome,
    onEnd,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      switch (e.key) {
        case KeyboardKeys.ENTER:
          if (onEnter) {
            e.preventDefault();
            onEnter();
          }
          break;
        case KeyboardKeys.SPACE:
          if (onSpace) {
            e.preventDefault();
            onSpace();
          }
          break;
        case KeyboardKeys.ESCAPE:
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;
        case KeyboardKeys.ARROW_UP:
          if (onArrowUp) {
            e.preventDefault();
            onArrowUp();
          }
          break;
        case KeyboardKeys.ARROW_DOWN:
          if (onArrowDown) {
            e.preventDefault();
            onArrowDown();
          }
          break;
        case KeyboardKeys.ARROW_LEFT:
          if (onArrowLeft) {
            e.preventDefault();
            onArrowLeft();
          }
          break;
        case KeyboardKeys.ARROW_RIGHT:
          if (onArrowRight) {
            e.preventDefault();
            onArrowRight();
          }
          break;
        case KeyboardKeys.HOME:
          if (onHome) {
            e.preventDefault();
            onHome();
          }
          break;
        case KeyboardKeys.END:
          if (onEnd) {
            e.preventDefault();
            onEnd();
          }
          break;
      }
    },
    [
      enabled,
      onEnter,
      onSpace,
      onEscape,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onHome,
      onEnd,
    ]
  );

  return { handleKeyDown };
}

/**
 * Hook for managing focus within a list of items
 */
interface UseFocusListOptions {
  itemCount: number;
  orientation?: 'vertical' | 'horizontal';
  loop?: boolean;
  onSelect?: (index: number) => void;
}

export function useFocusList(options: UseFocusListOptions) {
  const { itemCount, orientation = 'vertical', loop = true, onSelect } = options;
  const currentIndexRef = useRef(0);

  const moveFocus = useCallback(
    (direction: 'next' | 'prev') => {
      const increment = direction === 'next' ? 1 : -1;
      let newIndex = currentIndexRef.current + increment;

      if (loop) {
        // Loop around
        if (newIndex < 0) newIndex = itemCount - 1;
        if (newIndex >= itemCount) newIndex = 0;
      } else {
        // Clamp to bounds
        newIndex = Math.max(0, Math.min(itemCount - 1, newIndex));
      }

      currentIndexRef.current = newIndex;
      return newIndex;
    },
    [itemCount, loop]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isVertical = orientation === 'vertical';
      const nextKey = isVertical ? KeyboardKeys.ARROW_DOWN : KeyboardKeys.ARROW_RIGHT;
      const prevKey = isVertical ? KeyboardKeys.ARROW_UP : KeyboardKeys.ARROW_LEFT;

      if (e.key === nextKey) {
        e.preventDefault();
        const newIndex = moveFocus('next');
        // Focus the element at newIndex
        const items = document.querySelectorAll('[data-focus-item]');
        (items[newIndex] as HTMLElement)?.focus();
      } else if (e.key === prevKey) {
        e.preventDefault();
        const newIndex = moveFocus('prev');
        const items = document.querySelectorAll('[data-focus-item]');
        (items[newIndex] as HTMLElement)?.focus();
      } else if (e.key === KeyboardKeys.HOME) {
        e.preventDefault();
        currentIndexRef.current = 0;
        const items = document.querySelectorAll('[data-focus-item]');
        (items[0] as HTMLElement)?.focus();
      } else if (e.key === KeyboardKeys.END) {
        e.preventDefault();
        currentIndexRef.current = itemCount - 1;
        const items = document.querySelectorAll('[data-focus-item]');
        (items[itemCount - 1] as HTMLElement)?.focus();
      } else if (isActivationKey(e.key) && onSelect) {
        e.preventDefault();
        onSelect(currentIndexRef.current);
      }
    },
    [orientation, moveFocus, itemCount, onSelect]
  );

  const setCurrentIndex = useCallback((index: number) => {
    currentIndexRef.current = index;
  }, []);

  return {
    handleKeyDown,
    currentIndex: currentIndexRef.current,
    setCurrentIndex,
  };
}
