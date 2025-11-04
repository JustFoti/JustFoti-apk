/**
 * Accessibility Hook
 * Provides accessibility state and utilities for components
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  prefersReducedMotion,
  prefersHighContrast,
  announceToScreenReader,
} from '../utils/accessibility';

interface AccessibilityState {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderActive: boolean;
}

interface UseAccessibilityReturn extends AccessibilityState {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  shouldAnimate: boolean;
}

export function useAccessibility(): UseAccessibilityReturn {
  const [state, setState] = useState<AccessibilityState>({
    reducedMotion: false,
    highContrast: false,
    screenReaderActive: false,
  });

  useEffect(() => {
    // Check initial preferences
    setState({
      reducedMotion: prefersReducedMotion(),
      highContrast: prefersHighContrast(),
      screenReaderActive: detectScreenReader(),
    });

    // Listen for changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setState((prev) => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setState((prev) => ({ ...prev, highContrast: e.matches }));
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announceToScreenReader(message, priority);
    },
    []
  );

  return {
    ...state,
    announce,
    shouldAnimate: !state.reducedMotion,
  };
}

/**
 * Detect if a screen reader is likely active
 * This is a heuristic and not 100% accurate
 */
function detectScreenReader(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for common screen reader indicators
  const hasAriaLive = document.querySelectorAll('[aria-live]').length > 0;
  const hasScreenReaderClass = document.body.classList.contains('screen-reader');

  return hasAriaLive || hasScreenReaderClass;
}
