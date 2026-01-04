/**
 * Watch Session Tracking API
 * POST /api/analytics/watch-session - Track detailed watch sessions
 * GET /api/analytics/watch-session - Get watch session analytics
 * 
 * This route forwards requests to the Cloudflare Analytics Worker.
 * Falls back to local handling if the worker is unavailable.
 * 
 * Requirements: 2.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLocationFromHeaders } from '@/app/lib/utils/geolocation';

// Cloudflare Analytics Worker URL
const CF_ANALYTICS_WORKER_URL = process.env.NEXT_PUBLIC_CF_ANALYTICS_WORKER_URL || 'https://flyx-analytics.vynx.workers.dev';
const REQUEST_TIMEOUT = 5000; // 5 seconds

interface WatchSessionData {
  id: string;
  sessionId: string;
  userId: string;
  contentId: string;
  contentType: string;
  contentTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  startedAt: number;
  endedAt?: number;
  totalWatchTime: number;
  lastPosition: number;
  duration: number;
  completionPercentage: number;
  quality?: string;
  deviceType?: string;
  isCompleted: boolean;
  pauseCount: number;
  seekCount: number;
}

function generateId() {
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else if (ua.includes('smart-tv') || ua.includes('smarttv')) {
    return 'tv';
  }
  return 'desktop';
}

/**
 * Forward request to Cloudflare Analytics Worker
 */
async function forwardToWorker(
  endpoint: string,
  data: unknown,
  method: 'GET' | 'POST' = 'POST'
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const url = method === 'GET' && typeof data === 'object' && data !== null
      ? `${CF_ANALYTICS_WORKER_URL}${endpoint}?${new URLSearchParams(data as Record<string, string>).toString()}`
      : `${CF_ANALYTICS_WORKER_URL}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    console.error('[WatchSession] Failed to forward to worker:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: Partial<WatchSessionData> = await request.json();

    // Validate required fields
    if (!data.contentId || !data.userId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, contentId' },
        { status: 400 }
      );
    }

    // Extract device type from user agent
    const userAgent = request.headers.get('user-agent') || '';
    const deviceType = data.deviceType || getDeviceType(userAgent);

    // Get geo data from request headers
    const locationData = getLocationFromHeaders(request);
    const now = Date.now();

    // Prepare payload for Analytics Worker
    const payload = {
      id: data.id || generateId(),
      sessionId: data.sessionId || 'unknown',
      userId: data.userId,
      contentId: data.contentId,
      contentType: data.contentType || 'movie',
      contentTitle: data.contentTitle,
      seasonNumber: data.seasonNumber,
      episodeNumber: data.episodeNumber,
      startedAt: data.startedAt || now,
      endedAt: data.endedAt,
      totalWatchTime: data.totalWatchTime || 0,
      lastPosition: data.lastPosition || 0,
      duration: data.duration || 0,
      completionPercentage: data.completionPercentage || 0,
      quality: data.quality,
      deviceType,
      isCompleted: data.isCompleted || false,
      pauseCount: data.pauseCount || 0,
      seekCount: data.seekCount || 0,
      country: locationData.countryCode,
      city: locationData.city,
      region: locationData.region,
    };

    // Forward to Cloudflare Analytics Worker
    const workerResponse = await forwardToWorker('/watch-session', payload);
    
    if (workerResponse && workerResponse.ok) {
      const result = await workerResponse.json();
      return NextResponse.json({ success: true, ...result });
    }

    // Worker unavailable - return success to prevent client-side spam
    console.warn('[WatchSession] Worker unavailable, request skipped');
    return NextResponse.json({ success: true, skipped: true });

  } catch (error) {
    console.error('Failed to track watch session:', error);
    // Return success to prevent client-side error spam - analytics is non-critical
    return NextResponse.json({ success: true, skipped: true });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const contentId = searchParams.get('contentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit') || '50';

    // Build query params
    const params: Record<string, string> = { limit };
    if (userId) params.userId = userId;
    if (contentId) params.contentId = contentId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    // Forward to Cloudflare Analytics Worker
    const workerResponse = await forwardToWorker('/watch-session', params, 'GET');
    
    if (workerResponse && workerResponse.ok) {
      const result = await workerResponse.json();
      return NextResponse.json(result);
    }

    // Worker unavailable - return empty data
    console.warn('[WatchSession] Worker unavailable for GET request');
    return NextResponse.json({
      success: true,
      sessions: [],
      analytics: {
        totalSessions: 0,
        totalWatchTime: 0,
        averageWatchTime: 0,
        averageCompletionRate: 0,
        totalPauses: 0,
        totalSeeks: 0,
        completedSessions: 0,
        deviceBreakdown: {},
        qualityBreakdown: {},
      },
      workerUnavailable: true,
    });

  } catch (error) {
    console.error('Failed to get watch sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get watch sessions' },
      { status: 500 }
    );
  }
}
