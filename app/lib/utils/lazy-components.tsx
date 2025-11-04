/**
 * Lazy Component Loader
 * 
 * Utilities for code splitting and lazy loading components
 */

import { lazy, ComponentType, LazyExoticComponent, Suspense } from 'react';

/**
 * Loading fallback component
 */
export function LoadingFallback({ 
  height = '400px',
  message = 'Loading...' 
}: { 
  height?: string;
  message?: string;
}) {
  return (
    <div 
      className="flex items-center justify-center"
      style={{ minHeight: height }}
    >
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
}

/**
 * Create a lazy component with automatic suspense boundary
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFn);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || <LoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Preload a lazy component
 */
export function preloadComponent<T extends ComponentType<any>>(
  component: LazyExoticComponent<T>
): void {
  // Access the _payload to trigger the import
  const payload = (component as any)._payload;
  if (payload && typeof payload._result === 'undefined') {
    payload._result;
  }
}

/**
 * Lazy load components on interaction (hover, focus)
 */
export function useLazyLoadOnInteraction<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  let component: LazyExoticComponent<T> | null = null;
  let isLoading = false;

  const load = () => {
    if (!component && !isLoading) {
      isLoading = true;
      component = lazy(importFn);
    }
    return component;
  };

  const handlers = {
    onMouseEnter: load,
    onFocus: load,
  };

  return { load, handlers };
}

/**
 * Lazy load on viewport intersection
 */
export function useLazyLoadOnVisible<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: IntersectionObserverInit = {}
) {
  let component: LazyExoticComponent<T> | null = null;
  let observer: IntersectionObserver | null = null;

  const load = () => {
    if (!component) {
      component = lazy(importFn);
    }
    return component;
  };

  const observe = (element: HTMLElement | null) => {
    if (!element || typeof IntersectionObserver === 'undefined') return;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            load();
            observer?.disconnect();
          }
        });
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(element);
  };

  const disconnect = () => {
    observer?.disconnect();
  };

  return { load, observe, disconnect };
}

/**
 * Route-based code splitting helpers
 */
export const LazyRoutes = {
  // Admin routes
  AdminDashboard: createLazyComponent(
    () => import('@/app/admin/page').then(m => ({ default: m.default })),
    <LoadingFallback message="Loading dashboard..." />
  ),
  AdminAnalytics: createLazyComponent(
    () => import('@/app/admin/analytics/AnalyticsClient').then(m => ({ default: m.default })),
    <LoadingFallback message="Loading analytics..." />
  ),
  
  // Player
  VideoPlayer: createLazyComponent(
    () => import('@/app/components/player/VideoPlayer').then(m => ({ default: m.VideoPlayer })),
    <LoadingFallback height="600px" message="Loading player..." />
  ),
  
  // Search
  SearchContainer: createLazyComponent(
    () => import('@/app/components/search/SearchContainer').then(m => ({ default: m.default })),
    <LoadingFallback height="200px" message="Loading search..." />
  ),
  
  // Charts (heavy dependency)
  UsageChart: createLazyComponent(
    () => import('@/app/components/admin/UsageChart').then(m => ({ default: m.default })),
    <LoadingFallback height="300px" message="Loading chart..." />
  ),
};

/**
 * Prefetch a route
 */
export function prefetchRoute(href: string): void {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Preconnect to external domains
 */
export function preconnectDomain(domain: string): void {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = domain;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

// Preconnect to TMDB images on app load
if (typeof window !== 'undefined') {
  preconnectDomain('https://image.tmdb.org');
}
