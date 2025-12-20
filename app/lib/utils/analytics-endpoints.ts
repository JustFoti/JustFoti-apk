/**
 * Analytics Endpoints Configuration
 * 
 * Routes analytics through Cloudflare Worker when NEXT_PUBLIC_CF_ANALYTICS_URL is set.
 * This reduces Vercel Edge function costs by leveraging CF's free tier (100k req/day).
 * 
 * Usage:
 *   import { getAnalyticsEndpoint } from '@/lib/utils/analytics-endpoints';
 *   const url = getAnalyticsEndpoint('presence'); // Returns CF or Vercel URL
 */

// Cache the CF URL to avoid repeated env lookups
let cachedCfUrl: string | null | undefined = undefined;

function getCfAnalyticsUrl(): string | null {
  if (cachedCfUrl !== undefined) return cachedCfUrl;
  
  if (typeof window === 'undefined') {
    cachedCfUrl = null;
    return null;
  }
  
  // Check for CF analytics URL
  cachedCfUrl = process.env.NEXT_PUBLIC_CF_ANALYTICS_URL || null;
  return cachedCfUrl;
}

/**
 * Get the appropriate analytics endpoint URL
 * Routes through Cloudflare Worker if configured, otherwise falls back to Vercel
 * 
 * @param endpoint - The endpoint name (presence, pageview, event, watch-session)
 * @returns The full URL to use for the analytics request
 */
export function getAnalyticsEndpoint(endpoint: 'presence' | 'pageview' | 'event' | 'watch-session' | 'live-activity'): string {
  const cfUrl = getCfAnalyticsUrl();
  
  if (cfUrl) {
    // Route through Cloudflare Worker
    // Map endpoint names to CF routes
    const cfEndpoints: Record<string, string> = {
      'presence': '/presence',
      'pageview': '/pageview',
      'event': '/event',
      'watch-session': '/watch-session',
      'live-activity': '/live-activity',
    };
    return `${cfUrl}${cfEndpoints[endpoint] || `/${endpoint}`}`;
  }
  
  // Fallback to Vercel Edge
  const vercelEndpoints: Record<string, string> = {
    'presence': '/api/analytics/presence',
    'pageview': '/api/analytics/page-view',
    'event': '/api/analytics/track',
    'watch-session': '/api/analytics/watch-session',
    'live-activity': '/api/analytics/live-activity',
  };
  return vercelEndpoints[endpoint] || `/api/analytics/${endpoint}`;
}

/**
 * Check if analytics is routed through Cloudflare
 */
export function isUsingCloudflareAnalytics(): boolean {
  return getCfAnalyticsUrl() !== null;
}

/**
 * Get analytics configuration info (for debugging)
 */
export function getAnalyticsConfig(): {
  provider: 'cloudflare' | 'vercel';
  baseUrl: string | null;
} {
  const cfUrl = getCfAnalyticsUrl();
  return {
    provider: cfUrl ? 'cloudflare' : 'vercel',
    baseUrl: cfUrl,
  };
}
