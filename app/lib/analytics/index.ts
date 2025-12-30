/**
 * Analytics Module - Unified batched analytics
 * 
 * Usage:
 *   import { trackPageView, updateWatchProgress } from '@/lib/analytics';
 */

export {
  getAnalyticsClient,
  trackPageView,
  updateWatchProgress,
  clearWatchProgress,
  setActivity,
  getUserId,
  getSessionId,
  forceAnalyticsSync,
} from './unified-analytics-client';

export { AnalyticsProvider } from './AnalyticsProvider';
