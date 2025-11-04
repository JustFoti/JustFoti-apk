/**
 * Analytics Track API Route
 * POST /api/analytics/track - Ingest analytics events with batch processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db/queries';
import { validateBody, trackEventsSchema } from '@/lib/validation/analytics-schemas';
import type { AnalyticsEvent } from '@/types/analytics';

export const dynamic = 'force-dynamic';

/**
 * Rate limiting map to prevent abuse
 * Key: IP address, Value: { count, resetTime }
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limit configuration
 */
const RATE_LIMIT = {
  maxRequests: 100, // Max requests per window
  windowMs: 60 * 1000, // 1 minute window
};

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Check rate limit for IP
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  // Clean up expired entries periodically
  if (rateLimitMap.size > 1000) {
    const entries = Array.from(rateLimitMap.entries());
    for (const [key, value] of entries) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  if (!record || record.resetTime < now) {
    // Create new record or reset expired one
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 };
  }
  
  if (record.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT.maxRequests - record.count };
}

/**
 * Validate event data
 */
function validateEvents(events: AnalyticsEvent[]): { valid: boolean; error?: string } {
  // Check for duplicate IDs
  const ids = new Set<string>();
  for (const event of events) {
    if (ids.has(event.id)) {
      return { valid: false, error: 'Duplicate event IDs detected' };
    }
    ids.add(event.id);
  }
  
  // Validate timestamps (not too far in the future or past)
  const now = Date.now();
  const maxPast = now - (24 * 60 * 60 * 1000); // 24 hours ago
  const maxFuture = now + (60 * 1000); // 1 minute in future
  
  for (const event of events) {
    if (event.timestamp < maxPast || event.timestamp > maxFuture) {
      return { valid: false, error: 'Invalid event timestamp' };
    }
  }
  
  return { valid: true };
}

/**
 * Update content stats based on events
 */
function updateContentStats(events: AnalyticsEvent[]): void {
  for (const event of events) {
    try {
      if (event.eventType === 'content_view') {
        const { contentId, contentType } = event.metadata;
        if (contentId && contentType) {
          queries.contentStats.incrementViewCount(contentId, contentType);
        }
      } else if (event.eventType === 'complete') {
        const { contentId, duration, currentTime } = event.metadata;
        if (contentId && duration && currentTime) {
          const watchTime = Math.min(currentTime, duration);
          queries.contentStats.updateWatchTime(contentId, watchTime, true);
        }
      } else if (event.eventType === 'pause' || event.eventType === 'seek') {
        const { contentId, currentTime } = event.metadata;
        if (contentId && currentTime) {
          // Update watch time without marking as complete
          queries.contentStats.updateWatchTime(contentId, currentTime, false);
        }
      }
    } catch (error) {
      console.error('Error updating content stats:', error);
      // Continue processing other events
    }
  }
}

/**
 * POST handler - Track analytics events
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          }
        }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validation = validateBody(trackEventsSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error,
          }
        },
        { status: 400 }
      );
    }
    
    const { events } = validation.data;
    
    // Additional validation
    const eventValidation = validateEvents(events);
    if (!eventValidation.valid) {
      return NextResponse.json(
        { 
          error: {
            code: 'INVALID_EVENTS',
            message: eventValidation.error,
          }
        },
        { status: 400 }
      );
    }
    
    // Batch insert events into database
    queries.analytics.insertEventsBatch(events);
    
    // Update content stats asynchronously (don't block response)
    // In production, this could be done in a background job
    setImmediate(() => {
      try {
        updateContentStats(events);
      } catch (error) {
        console.error('Error updating content stats:', error);
      }
    });
    
    // Return success response
    return NextResponse.json(
      { 
        success: true,
        processed: events.length,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        }
      }
    );
  } catch (error) {
    console.error('Error tracking analytics events:', error);
    
    // Check if it's a JSON parse error
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body',
          }
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process analytics events',
        }
      },
      { status: 500 }
    );
  }
}
