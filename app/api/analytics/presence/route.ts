/**
 * Presence API - Real-time user presence tracking
 * 
 * POST /api/analytics/presence - Update user presence heartbeat
 * GET /api/analytics/presence - Get current active users count
 * 
 * This route forwards requests to the Cloudflare Analytics Worker.
 * Falls back gracefully if the worker is unavailable.
 * 
 * Features:
 * - Client-side bot detection validation
 * - User interaction validation
 * - Tab visibility tracking
 * - Behavioral analysis validation
 * - Accurate "truly active" user counts
 * - Deduplication to prevent counting same user multiple times
 * 
 * Requirements: 2.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLocationFromHeaders } from '@/app/lib/utils/geolocation';

// Cloudflare Analytics Worker URL
const CF_ANALYTICS_WORKER_URL = process.env.NEXT_PUBLIC_CF_ANALYTICS_WORKER_URL || 'https://flyx-analytics.vynx.workers.dev';
const REQUEST_TIMEOUT = 5000; // 5 seconds

interface PresencePayload {
  userId: string;
  sessionId: string;
  activityType: 'browsing' | 'watching' | 'livetv';
  contentId?: string;
  contentTitle?: string;
  contentType?: 'movie' | 'tv';
  seasonNumber?: number;
  episodeNumber?: number;
  isActive: boolean;
  isVisible: boolean;
  isLeaving?: boolean;
  referrer?: string;
  entryPage?: string;
  validation?: {
    isBot: boolean;
    botConfidence?: number;
    botReasons?: string[];
    fingerprint?: string;
    hasInteracted: boolean;
    interactionCount: number;
    timeSinceLastInteraction?: number | null;
    behaviorIsBot?: boolean;
    behaviorConfidence?: number;
    behaviorReasons?: string[];
    mouseEntropy?: number;
    mouseSamples?: number;
    scrollSamples?: number;
    screenResolution?: string;
    timezone?: string;
    language?: string;
  };
  timestamp: number;
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

    const url = method === 'GET'
      ? `${CF_ANALYTICS_WORKER_URL}${endpoint}`
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
    console.error('[Presence] Failed to forward to worker:', error);
    return null;
  }
}

// POST - Update presence heartbeat
export async function POST(request: NextRequest) {
  try {
    const data: PresencePayload = await request.json();
    
    // Validate required fields
    if (!data.userId || !data.sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const userAgent = request.headers.get('user-agent') || '';
    const serverReferrer = request.headers.get('referer') || data.referrer;
    
    // Validate client-side bot detection results
    const clientBotConfidence = data.validation?.botConfidence || 0;
    const behaviorBotConfidence = data.validation?.behaviorConfidence || 0;
    const combinedConfidence = Math.max(clientBotConfidence, behaviorBotConfidence);
    
    // Only reject if client-side detection is highly confident
    if (combinedConfidence >= 70) {
      console.log('[Presence] Bot detected by client:', {
        botConfidence: clientBotConfidence,
        behaviorConfidence: behaviorBotConfidence,
        reasons: [...(data.validation?.botReasons || []), ...(data.validation?.behaviorReasons || [])],
      });
      return NextResponse.json({ 
        success: true, 
        tracked: false, 
        reason: 'bot-detected',
        confidence: combinedConfidence,
      });
    }
    
    // Get location data
    const locationData = getLocationFromHeaders(request);
    
    // Determine device type
    const deviceType = userAgent.includes('Mobile') ? 'mobile' : 
                       userAgent.includes('Tablet') ? 'tablet' : 'desktop';
    
    // Prepare payload for Analytics Worker
    const payload = {
      ...data,
      userAgent,
      referrer: serverReferrer,
      country: locationData.countryCode,
      city: locationData.city,
      region: locationData.region,
      deviceType,
      timestamp: data.timestamp || Date.now(),
    };

    // Forward to Cloudflare Analytics Worker
    const workerResponse = await forwardToWorker('/presence', payload);
    
    if (workerResponse && workerResponse.ok) {
      const result = await workerResponse.json();
      return NextResponse.json(result);
    }

    // Worker unavailable - return success to prevent client-side spam
    console.warn('[Presence] Worker unavailable, request skipped');
    return NextResponse.json({
      success: true,
      tracked: false,
      reason: 'worker-unavailable',
    });
    
  } catch (error) {
    console.error('[Presence] Error:', error);
    // Return success to prevent client-side error spam - analytics is non-critical
    return NextResponse.json({
      success: true,
      tracked: false,
      reason: 'error',
    });
  }
}

// GET - Get current active users
export async function GET(_request: NextRequest) {
  try {
    // Forward to Cloudflare Analytics Worker
    const workerResponse = await forwardToWorker('/presence', null, 'GET');
    
    if (workerResponse && workerResponse.ok) {
      const result = await workerResponse.json();
      return NextResponse.json(result);
    }

    // Worker unavailable - return empty data
    console.warn('[Presence] Worker unavailable for GET request');
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      active: {
        total: 0,
        trulyActive: 0,
        breakdown: {},
      },
      geographic: [],
      workerUnavailable: true,
    });
    
  } catch (error) {
    console.error('[Presence] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get presence data' },
      { status: 500 }
    );
  }
}
