/**
 * Page View Tracking API
 * POST /api/analytics/page-view - Track detailed page view metrics
 * GET /api/analytics/page-view - Get page view analytics
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

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
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
    console.error('[PageView] Failed to forward to worker:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    let data;
    try {
      data = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    if (!data.userId || !data.pagePath) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, pagePath' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || '';
    const deviceType = data.deviceType || getDeviceType(userAgent);
    const location = getLocationFromHeaders(request);
    const now = Date.now();
    
    const pageViewId = data.id || generateId();

    // Prepare payload for Analytics Worker
    const payload = {
      id: pageViewId,
      userId: data.userId,
      sessionId: data.sessionId,
      pagePath: data.pagePath,
      pageTitle: data.pageTitle || '',
      referrer: data.referrer || '',
      entryTime: data.entryTime || now,
      exitTime: data.exitTime || null,
      timeOnPage: data.timeOnPage || 0,
      scrollDepth: data.scrollDepth || 0,
      interactions: data.interactions || 0,
      deviceType,
      country: location.countryCode,
      isBounce: data.isBounce || false,
      isFirstPage: data.isFirstPage || false,
      isExit: data.isExit || false,
    };

    // Forward to Cloudflare Analytics Worker
    const workerResponse = await forwardToWorker('/page-view', payload);
    
    if (workerResponse && workerResponse.ok) {
      const result = await workerResponse.json();
      return NextResponse.json({ success: true, id: pageViewId, ...result });
    }

    // Worker unavailable - return success to prevent client-side spam
    // Analytics is non-critical, so we gracefully degrade
    console.warn('[PageView] Worker unavailable, request skipped');
    return NextResponse.json({ success: true, id: pageViewId, skipped: true });

  } catch (error) {
    // Log detailed error for debugging
    console.error('Failed to track page view:', error instanceof Error ? error.message : error);
    
    // Return success to prevent client-side error spam - analytics is non-critical
    return NextResponse.json({ success: true, skipped: true });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '7';
    const limit = searchParams.get('limit') || '50';

    // Forward to Cloudflare Analytics Worker
    const workerResponse = await forwardToWorker('/page-view', { days, limit }, 'GET');
    
    if (workerResponse && workerResponse.ok) {
      const result = await workerResponse.json();
      return NextResponse.json(result);
    }

    // Worker unavailable - return empty data
    console.warn('[PageView] Worker unavailable for GET request');
    return NextResponse.json({
      success: true,
      pageMetrics: [],
      recentViews: [],
      overallStats: {},
      period: { days: parseInt(days), startTime: Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000) },
      workerUnavailable: true,
    });

  } catch (error) {
    console.error('Failed to get page view analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get page view analytics' },
      { status: 500 }
    );
  }
}
