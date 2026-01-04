/**
 * Analytics Module - Unified batched analytics
 * 
 * Usage:
 *   import { trackPageView, updateWatchProgress } from '@/lib/analytics';
 * 
 * For direct Cloudflare Worker communication:
 *   import { trackPageView as cfTrackPageView } from '@/lib/analytics/cloudflare-client';
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

// Cloudflare Analytics Client exports (for direct worker communication)
export {
  trackPageView as cfTrackPageView,
  trackWatchSession as cfTrackWatchSession,
  sendHeartbeat as cfSendHeartbeat,
  syncAnalytics as cfSyncAnalytics,
  trackLiveTVSession as cfTrackLiveTVSession,
  getLiveActivity as cfGetLiveActivity,
  getUnifiedStats as cfGetUnifiedStats,
  checkHealth as cfCheckHealth,
  isAnalyticsWorkerAvailable,
  resetWorkerAvailability,
} from './cloudflare-client';

export type {
  PageViewData,
  WatchSessionData,
  HeartbeatData,
  AnalyticsSyncData,
  AnalyticsResponse,
} from './cloudflare-client';
