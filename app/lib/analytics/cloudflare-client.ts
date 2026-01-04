/**
 * Cloudflare Analytics Client
 * 
 * Provides analytics tracking functions that communicate with the Cloudflare Analytics Worker.
 * Implements graceful degradation when the worker is unavailable.
 * 
 * Features:
 * - Page view tracking
 * - Watch session tracking
 * - Heartbeat/presence updates
 * - Graceful degradation (non-blocking failures)
 * - Retry logic with exponential backoff
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.5
 */

// Configuration
const CF_ANALYTICS_WORKER_URL = process.env.NEXT_PUBLIC_CF_ANALYTICS_WORKER_URL || 'https://flyx-analytics.vynx.workers.dev';
const REQUEST_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

// Types
export interface PageViewData {
  userId: string;
  sessionId?: string;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  entryTime?: number;
  deviceType?: string;
}

export interface WatchSessionData {
  userId: string;
  sessionId?: string;
  contentId: string;
  contentType: 'movie' | 'tv' | 'livetv';
  contentTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  startedAt?: number;
  totalWatchTime: number;
  lastPosition: number;
  duration: number;
  completionPercentage: number;
  isCompleted?: boolean;
  quality?: string;
}

export interface HeartbeatData {
  userId: string;
  sessionId?: string;
  activityType: 'browsing' | 'watching' | 'livetv';
  contentId?: string;
  contentTitle?: string;
  contentType?: 'movie' | 'tv' | 'livetv';
  seasonNumber?: number;
  episodeNumber?: number;
  isActive: boolean;
  isVisible: boolean;
  isLeaving?: boolean;
  validation?: {
    isBot: boolean;
    botConfidence?: number;
    botReasons?: string[];
    fingerprint?: string;
  };
}

export interface AnalyticsSyncData {
  userId: string;
  sessionId: string;
  timestamp: number;
  activityType: 'browsing' | 'watching' | 'livetv';
  isActive: boolean;
  isVisible: boolean;
  currentContent?: {
    contentId: string;
    contentType: 'movie' | 'tv' | 'livetv';
    contentTitle?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    position: number;
    duration: number;
  };
  watchProgress?: Array<{
    contentId: string;
    contentType: 'movie' | 'tv' | 'livetv';
    contentTitle?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    position: number;
    duration: number;
    startedAt: number;
    lastUpdate: number;
  }>;
  pageViews?: Array<{
    path: string;
    title?: string;
    referrer?: string;
    timestamp: number;
  }>;
  botDetection?: {
    isBot: boolean;
    confidence: number;
    reasons: string[];
    fingerprint?: string;
  };
  device?: {
    type: string;
    screen: string;
    timezone: string;
    language: string;
  };
}

export interface AnalyticsResponse {
  success: boolean;
  tracked?: boolean;
  error?: string;
  timestamp?: number;
}

// Track worker availability for graceful degradation
let workerAvailable = true;
let lastFailureTime = 0;
const FAILURE_COOLDOWN = 30000; // 30 seconds before retrying after failure

/**
 * Check if the analytics worker is currently available
 */
export function isAnalyticsWorkerAvailable(): boolean {
  if (!workerAvailable) {
    // Check if cooldown period has passed
    if (Date.now() - lastFailureTime > FAILURE_COOLDOWN) {
      workerAvailable = true;
    }
  }
  return workerAvailable;
}

/**
 * Mark the worker as unavailable (for graceful degradation)
 */
function markWorkerUnavailable(): void {
  workerAvailable = false;
  lastFailureTime = Date.now();
  console.warn('[CloudflareAnalytics] Worker marked as unavailable, will retry after cooldown');
}

/**
 * Reset worker availability (for testing or manual recovery)
 */
export function resetWorkerAvailability(): void {
  workerAvailable = true;
  lastFailureTime = 0;
}

/**
 * Make a request to the analytics worker with timeout and retry logic
 */
async function makeRequest(
  endpoint: string,
  data: unknown,
  options: { retries?: number; useBeacon?: boolean } = {}
): Promise<AnalyticsResponse> {
  const { retries = MAX_RETRIES, useBeacon = false } = options;
  
  // Check if worker is available (graceful degradation)
  if (!isAnalyticsWorkerAvailable()) {
    return { success: true, tracked: false, error: 'Worker temporarily unavailable' };
  }
  
  const url = `${CF_ANALYTICS_WORKER_URL}${endpoint}`;
  const body = JSON.stringify(data);
  
  // Use sendBeacon for leaving/unload scenarios (more reliable)
  if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      const sent = navigator.sendBeacon(url, body);
      return { success: sent, tracked: sent };
    } catch {
      // Fallback to fetch if beacon fails
    }
  }
  
  // Standard fetch with timeout and retry
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
        keepalive: useBeacon, // Keep connection alive for page unload
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      return result as AnalyticsResponse;
      
    } catch (error) {
      const isLastAttempt = attempt === retries;
      
      if (isLastAttempt) {
        // Mark worker as unavailable after all retries fail
        markWorkerUnavailable();
        console.error('[CloudflareAnalytics] Request failed after retries:', error);
        return { success: true, tracked: false, error: String(error) };
      }
      
      // Exponential backoff before retry
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { success: true, tracked: false, error: 'Unknown error' };
}

/**
 * Track a page view
 * 
 * @param data - Page view data
 * @returns Promise resolving to analytics response
 * 
 * Requirements: 8.1
 */
export async function trackPageView(data: PageViewData): Promise<AnalyticsResponse> {
  if (!data.userId || !data.pagePath) {
    return { success: false, error: 'Missing required fields: userId, pagePath' };
  }
  
  const payload = {
    ...data,
    entryTime: data.entryTime || Date.now(),
  };
  
  return makeRequest('/page-view', payload);
}

/**
 * Track a watch session
 * 
 * @param data - Watch session data
 * @returns Promise resolving to analytics response
 * 
 * Requirements: 8.2
 */
export async function trackWatchSession(data: WatchSessionData): Promise<AnalyticsResponse> {
  if (!data.userId || !data.contentId) {
    return { success: false, error: 'Missing required fields: userId, contentId' };
  }
  
  const payload = {
    ...data,
    startedAt: data.startedAt || Date.now(),
  };
  
  return makeRequest('/watch-session', payload);
}

/**
 * Send a heartbeat/presence update
 * 
 * @param data - Heartbeat data
 * @param isLeaving - Whether the user is leaving (uses sendBeacon for reliability)
 * @returns Promise resolving to analytics response
 * 
 * Requirements: 8.3
 */
export async function sendHeartbeat(
  data: HeartbeatData,
  isLeaving = false
): Promise<AnalyticsResponse> {
  if (!data.userId) {
    return { success: false, error: 'Missing required field: userId' };
  }
  
  const payload = {
    ...data,
    isLeaving,
    timestamp: Date.now(),
  };
  
  return makeRequest('/presence', payload, { useBeacon: isLeaving });
}

/**
 * Send a batch sync of all analytics data
 * This is the primary method used by the unified analytics client
 * 
 * @param data - Complete sync data including presence, page views, and watch progress
 * @param isLeaving - Whether the user is leaving
 * @returns Promise resolving to analytics response
 * 
 * Requirements: 8.1, 8.2, 8.3
 */
export async function syncAnalytics(
  data: AnalyticsSyncData,
  isLeaving = false
): Promise<AnalyticsResponse> {
  if (!data.userId || !data.sessionId) {
    return { success: false, error: 'Missing required fields: userId, sessionId' };
  }
  
  return makeRequest('/sync', data, { useBeacon: isLeaving });
}

/**
 * Track a LiveTV session
 * 
 * @param data - LiveTV session data
 * @returns Promise resolving to analytics response
 */
export async function trackLiveTVSession(data: {
  userId: string;
  sessionId?: string;
  channelId: string;
  channelName?: string;
  action: 'start' | 'stop' | 'heartbeat';
  watchDuration?: number;
}): Promise<AnalyticsResponse> {
  if (!data.userId || !data.channelId) {
    return { success: false, error: 'Missing required fields: userId, channelId' };
  }
  
  return makeRequest('/livetv-session', data);
}

/**
 * Get live activity data (for admin dashboard)
 * 
 * @returns Promise resolving to live activity data
 */
export async function getLiveActivity(): Promise<{
  success: boolean;
  data?: {
    total: number;
    watching: number;
    browsing: number;
    livetv: number;
    users: Array<{
      userId: string;
      activityType: string;
      contentTitle?: string;
      country?: string;
    }>;
  };
  error?: string;
}> {
  if (!isAnalyticsWorkerAvailable()) {
    return { success: false, error: 'Worker temporarily unavailable' };
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const response = await fetch(`${CF_ANALYTICS_WORKER_URL}/live-activity`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('[CloudflareAnalytics] Failed to get live activity:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get unified stats (for admin dashboard)
 * 
 * @param params - Query parameters
 * @returns Promise resolving to stats data
 */
export async function getUnifiedStats(params?: {
  days?: number;
  startDate?: string;
  endDate?: string;
}): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  if (!isAnalyticsWorkerAvailable()) {
    return { success: false, error: 'Worker temporarily unavailable' };
  }
  
  try {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.set('days', String(params.days));
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    
    const url = `${CF_ANALYTICS_WORKER_URL}/unified-stats${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('[CloudflareAnalytics] Failed to get unified stats:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Health check for the analytics worker
 * 
 * @returns Promise resolving to health status
 */
export async function checkHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const response = await fetch(`${CF_ANALYTICS_WORKER_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      return { healthy: false, latency, error: `HTTP ${response.status}` };
    }
    
    // Reset availability on successful health check
    resetWorkerAvailability();
    
    return { healthy: true, latency };
  } catch (error) {
    return { healthy: false, error: String(error) };
  }
}
