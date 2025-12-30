'use client';

/**
 * Analytics Provider - Initializes unified analytics client
 * 
 * Wrap your app with this to enable batched analytics (60s sync)
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getAnalyticsClient, trackPageView } from './unified-analytics-client';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize client on mount
  useEffect(() => {
    getAnalyticsClient();
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      trackPageView(pathname, document.title);
    }
  }, [pathname]);

  return <>{children}</>;
}

export default AnalyticsProvider;
