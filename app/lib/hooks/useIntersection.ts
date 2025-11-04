/**
 * useIntersection Hook
 * Provides Intersection Observer functionality for lazy loading and analytics
 */

import { useEffect, useRef, useState } from 'react';

export interface UseIntersectionOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
  onChange?: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void;
}

export function useIntersection<T extends HTMLElement = HTMLDivElement>(
  options: UseIntersectionOptions = {}
) {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
    onChange,
  } = options;

  const elementRef = useRef<T>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const [isIntersecting, setIsIntersecting] = useState(false);

  const frozen = freezeOnceVisible && isIntersecting;

  useEffect(() => {
    const element = elementRef.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !element) return;

    const observerCallback: IntersectionObserverCallback = (entries) => {
      const [entry] = entries;
      setEntry(entry);
      setIsIntersecting(entry.isIntersecting);
      onChange?.(entry.isIntersecting, entry);
    };

    const observerOptions: IntersectionObserverInit = {
      threshold,
      root,
      rootMargin,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, frozen, onChange]);

  return {
    ref: elementRef,
    entry,
    isIntersecting,
  };
}

export default useIntersection;
