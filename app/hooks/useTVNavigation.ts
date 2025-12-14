'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Focusable element selector
const FOCUSABLE_SELECTOR = '[data-focusable="true"], [data-tv-focusable="true"]';

export interface FocusableElement {
  element: HTMLElement;
  rect: DOMRect;
  group?: string;
  priority?: number;
}

export interface NavigationOptions {
  /** Enable/disable navigation */
  enabled?: boolean;
  /** Callback when focus changes */
  onFocusChange?: (element: HTMLElement | null) => void;
  /** Callback when element is selected (Enter pressed) */
  onSelect?: (element: HTMLElement) => void;
  /** Custom key handlers */
  customKeys?: Record<string, (e: KeyboardEvent) => void>;
  /** Enable wrap-around navigation */
  wrapAround?: boolean;
  /** Initial focused element selector */
  initialFocus?: string;
}

/**
 * Hook for TV remote / keyboard spatial navigation
 * Supports arrow keys, Enter/Space for selection, and Back/Escape for going back
 */
export function useTVNavigation(options: NavigationOptions = {}) {
  const {
    enabled = true,
    onFocusChange,
    onSelect,
    customKeys = {},
    wrapAround = true,
    initialFocus,
  } = options;

  const [currentFocused, setCurrentFocused] = useState<HTMLElement | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const lastNavigationTime = useRef(0);
  const navigationThrottle = 100; // ms between navigation events

  // Get all focusable elements
  const getFocusableElements = useCallback((): FocusableElement[] => {
    const elements = document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const focusables: FocusableElement[] = [];

    elements.forEach((element) => {
      // Skip hidden or disabled elements
      if (
        element.offsetParent === null ||
        element.hasAttribute('disabled') ||
        element.getAttribute('aria-hidden') === 'true' ||
        getComputedStyle(element).visibility === 'hidden' ||
        getComputedStyle(element).display === 'none'
      ) {
        return;
      }

      const rect = element.getBoundingClientRect();
      // Skip elements not in viewport
      if (rect.width === 0 || rect.height === 0) return;

      focusables.push({
        element,
        rect,
        group: element.dataset.focusGroup,
        priority: parseInt(element.dataset.focusPriority || '0', 10),
      });
    });

    return focusables;
  }, []);

  // Find the nearest element in a direction
  const findNearestElement = useCallback(
    (
      direction: 'up' | 'down' | 'left' | 'right',
      current: HTMLElement | null
    ): HTMLElement | null => {
      const focusables = getFocusableElements();
      if (focusables.length === 0) return null;

      // If no current element, return first focusable
      if (!current) {
        return focusables[0]?.element || null;
      }

      const currentRect = current.getBoundingClientRect();
      const currentCenterX = currentRect.left + currentRect.width / 2;
      const currentCenterY = currentRect.top + currentRect.height / 2;

      let bestCandidate: FocusableElement | null = null;
      let bestScore = Infinity;

      // Get current element's group for group-aware navigation
      const currentGroup = current.dataset.focusGroup;

      for (const candidate of focusables) {
        if (candidate.element === current) continue;

        const candidateRect = candidate.rect;
        const candidateCenterX = candidateRect.left + candidateRect.width / 2;
        const candidateCenterY = candidateRect.top + candidateRect.height / 2;

        // Check if candidate is in the correct direction
        let isInDirection = false;
        let primaryDistance = 0;
        let secondaryDistance = 0;

        switch (direction) {
          case 'up':
            isInDirection = candidateCenterY < currentCenterY - 10;
            primaryDistance = currentCenterY - candidateCenterY;
            secondaryDistance = Math.abs(candidateCenterX - currentCenterX);
            break;
          case 'down':
            isInDirection = candidateCenterY > currentCenterY + 10;
            primaryDistance = candidateCenterY - currentCenterY;
            secondaryDistance = Math.abs(candidateCenterX - currentCenterX);
            break;
          case 'left':
            isInDirection = candidateCenterX < currentCenterX - 10;
            primaryDistance = currentCenterX - candidateCenterX;
            secondaryDistance = Math.abs(candidateCenterY - currentCenterY);
            break;
          case 'right':
            isInDirection = candidateCenterX > currentCenterX + 10;
            primaryDistance = candidateCenterX - currentCenterX;
            secondaryDistance = Math.abs(candidateCenterY - currentCenterY);
            break;
        }

        if (!isInDirection) continue;

        // Calculate score (lower is better)
        // Prioritize elements in the same group
        const groupBonus = currentGroup && candidate.group === currentGroup ? 0 : 500;
        // Weight secondary distance more to prefer aligned elements
        const score = primaryDistance + secondaryDistance * 2 + groupBonus - candidate.priority * 100;

        if (score < bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      }

      // If no candidate found and wrap-around is enabled, find element on opposite edge
      if (!bestCandidate && wrapAround) {
        let edgeCandidate: FocusableElement | null = null;
        let edgeValue = direction === 'up' || direction === 'left' ? -Infinity : Infinity;

        for (const candidate of focusables) {
          if (candidate.element === current) continue;

          const candidateRect = candidate.rect;
          const candidateCenterX = candidateRect.left + candidateRect.width / 2;
          const candidateCenterY = candidateRect.top + candidateRect.height / 2;

          switch (direction) {
            case 'up':
              if (candidateCenterY > edgeValue) {
                edgeValue = candidateCenterY;
                edgeCandidate = candidate;
              }
              break;
            case 'down':
              if (candidateCenterY < edgeValue) {
                edgeValue = candidateCenterY;
                edgeCandidate = candidate;
              }
              break;
            case 'left':
              if (candidateCenterX > edgeValue) {
                edgeValue = candidateCenterX;
                edgeCandidate = candidate;
              }
              break;
            case 'right':
              if (candidateCenterX < edgeValue) {
                edgeValue = candidateCenterX;
                edgeCandidate = candidate;
              }
              break;
          }
        }

        bestCandidate = edgeCandidate;
      }

      return bestCandidate?.element || null;
    },
    [getFocusableElements, wrapAround]
  );

  // Focus an element
  const focusElement = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;

      // Remove focus from current
      if (currentFocused) {
        currentFocused.classList.remove('tv-focused');
        currentFocused.blur();
      }

      // Add focus to new element
      element.classList.add('tv-focused');
      element.focus({ preventScroll: false });
      
      // Scroll element into view if needed
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });

      setCurrentFocused(element);
      onFocusChange?.(element);
    },
    [currentFocused, onFocusChange]
  );

  // Navigate in a direction
  const navigate = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      const now = Date.now();
      if (now - lastNavigationTime.current < navigationThrottle) return;
      lastNavigationTime.current = now;

      const nextElement = findNearestElement(direction, currentFocused);
      if (nextElement) {
        focusElement(nextElement);
      }
    },
    [currentFocused, findNearestElement, focusElement]
  );

  // Select current element
  const selectCurrent = useCallback(() => {
    if (currentFocused) {
      // Trigger click event
      currentFocused.click();
      onSelect?.(currentFocused);
    }
  }, [currentFocused, onSelect]);

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for custom key handlers first
      if (customKeys[e.key]) {
        customKeys[e.key](e);
        return;
      }

      // Don't handle if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow navigation keys to escape from inputs
        if (!['Escape', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          return;
        }
      }

      setIsNavigating(true);

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigate('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigate('right');
          break;
        case 'Enter':
        case ' ':
          if (currentFocused && target.tagName !== 'BUTTON') {
            e.preventDefault();
            selectCurrent();
          }
          break;
        case 'Escape':
        case 'Backspace':
          // Go back - handled by browser or custom handler
          if (e.key === 'Backspace' && target.tagName !== 'INPUT') {
            e.preventDefault();
            window.history.back();
          }
          break;
      }
    };

    const handleMouseMove = () => {
      // Switch back to mouse mode
      setIsNavigating(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, navigate, selectCurrent, currentFocused, customKeys]);

  // Set initial focus
  useEffect(() => {
    if (!enabled) return;

    const setInitialFocus = () => {
      if (initialFocus) {
        const element = document.querySelector<HTMLElement>(initialFocus);
        if (element) {
          focusElement(element);
          return;
        }
      }

      // Focus first focusable element
      const focusables = getFocusableElements();
      if (focusables.length > 0) {
        focusElement(focusables[0].element);
      }
    };

    // Delay to allow DOM to settle
    const timer = setTimeout(setInitialFocus, 100);
    return () => clearTimeout(timer);
  }, [enabled, initialFocus, focusElement, getFocusableElements]);

  return {
    currentFocused,
    isNavigating,
    navigate,
    focusElement,
    selectCurrent,
    getFocusableElements,
  };
}

export default useTVNavigation;
