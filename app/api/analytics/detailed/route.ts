/**
 * Detailed Analytics API Route
 * GET /api/analytics/detailed - Fetch detailed analytics data
 * Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db/queries';
import { withAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema for detailed analytics query
const detailedQuerySchema = z.object({
  range: z.enum(['24h', '7d', '30d', '90d']).optional().default('7d'),
  timezone: z.string().optional().default('UTC'),
});

function validateQuery(searchParams: URLSearchParams) {
  const params: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  const result = detailedQuerySchema.safeParse(params);
  
  if (!result.success) {
    const errors = result.error.issues
      .map((e: any) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    return { success: false, error: errors };
  }
  
  return { success: true, data: result.data };
}

interface DetailedAnalytics {
  completionRates: Array<{
    contentId: string;
    title: string;
    contentType: 'movie' | 'tv';
    completionRate: number;
    viewCount: number;
    avgWatchTime: number;
  }>;
  peakUsageHours: Array<{
    hour: number;
    count: number;
    label: string;
  }>;
  dropOffAnalysis: Array<{
    contentId: string;
    title: string;
    contentType: 'movie' | 'tv';
    dropOffPoints: Array<{
      timestamp: number;
      percentage: number;
    }>;
  }>;
  retentionMetrics: {
    dailyActiveUsers: Array<{
      date: string;
      count: number;
    }>;
    avgSessionDuration: number;
    returnRate: number;
    churnRate: number;
  };
}

function getTimeRange(range: string): { start: number; end: number } {
  const now = Date.now();
  const ranges: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  };
  
  const duration = ranges[range] || ranges['7d'];
  return {
    start: now - duration,
    end: now,
  };
}

function getDateString(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

function calculatePeakUsageHours(events: any[], _timezone: string = 'UTC'): DetailedAnalytics['peakUsageHours'] {
  const hourCounts: Record<number, number> = {};
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourCounts[i] = 0;
  }
  
  // Count events per hour
  events.forEach(event => {
    const date = new Date(event.timestamp);
    const hour = date.getUTCHours(); // Use UTC for now, can be enhanced with timezone support
    hourCounts[hour]++;
  });
  
  // Convert to array and format
  return Object.entries(hourCounts).map(([hour, count]) => {
    const hourNum = parseInt(hour);
    const label = `${hourNum.toString().padStart(2, '0')}:00`;
    return {
      hour: hourNum,
      count,
      label,
    };
  }).sort((a, b) => a.hour - b.hour);
}

function calculateDropOffAnalysis(events: any[]): DetailedAnalytics['dropOffAnalysis'] {
  // Group playback events by content
  const contentEvents = new Map<string, any[]>();
  
  events
    .filter(e => ['play', 'pause', 'seek', 'complete'].includes(e.eventType))
    .forEach(event => {
      const contentId = event.metadata?.contentId;
      if (!contentId) return;
      
      if (!contentEvents.has(contentId)) {
        contentEvents.set(contentId, []);
      }
      contentEvents.get(contentId)!.push(event);
    });
  
  // Analyze drop-off points for each content
  const dropOffData: DetailedAnalytics['dropOffAnalysis'] = [];
  
  contentEvents.forEach((contentEventList, contentId) => {
    // Sort events by timestamp
    contentEventList.sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate drop-off points (where users pause/stop watching)
    const dropOffPoints: Array<{ timestamp: number; percentage: number }> = [];
    const pauseEvents = contentEventList.filter(e => e.eventType === 'pause');
    
    // Group pause events by time percentage
    const timePercentages: Record<number, number> = {};
    pauseEvents.forEach(event => {
      const currentTime = event.metadata?.currentTime || 0;
      const duration = event.metadata?.duration || 1;
      const percentage = Math.floor((currentTime / duration) * 100);
      
      timePercentages[percentage] = (timePercentages[percentage] || 0) + 1;
    });
    
    // Convert to array
    Object.entries(timePercentages).forEach(([percentage, count]) => {
      dropOffPoints.push({
        timestamp: parseInt(percentage),
        percentage: (count / pauseEvents.length) * 100,
      });
    });
    
    if (dropOffPoints.length > 0) {
      dropOffData.push({
        contentId,
        title: `Content ${contentId}`, // In real implementation, fetch from TMDB
        contentType: contentEventList[0]?.metadata?.contentType === 'episode' ? 'tv' : 'movie',
        dropOffPoints: dropOffPoints.sort((a, b) => a.timestamp - b.timestamp),
      });
    }
  });
  
  return dropOffData.slice(0, 10); // Return top 10
}

function calculateRetentionMetrics(events: any[], range: string): DetailedAnalytics['retentionMetrics'] {
  // Get time range for potential future use
  getTimeRange(range);
  
  // Calculate daily active users
  const dailyUsers = new Map<string, Set<string>>();
  
  events.forEach(event => {
    const date = getDateString(event.timestamp);
    if (!dailyUsers.has(date)) {
      dailyUsers.set(date, new Set());
    }
    dailyUsers.get(date)!.add(event.sessionId);
  });
  
  const dailyActiveUsers = Array.from(dailyUsers.entries())
    .map(([date, sessions]) => ({
      date,
      count: sessions.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Calculate average session duration
  const sessionDurations = new Map<string, { start: number; end: number }>();
  
  events.forEach(event => {
    if (!sessionDurations.has(event.sessionId)) {
      sessionDurations.set(event.sessionId, {
        start: event.timestamp,
        end: event.timestamp,
      });
    } else {
      const session = sessionDurations.get(event.sessionId)!;
      session.end = Math.max(session.end, event.timestamp);
    }
  });
  
  const durations = Array.from(sessionDurations.values()).map(
    s => (s.end - s.start) / 1000 // Convert to seconds
  );
  const avgSessionDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  
  // Calculate return rate (users who came back)
  const uniqueSessions = new Set(events.map(e => e.sessionId));
  const returningUsers = Array.from(uniqueSessions).filter(sessionId => {
    const userEvents = events.filter(e => e.sessionId === sessionId);
    const dates = new Set(userEvents.map(e => getDateString(e.timestamp)));
    return dates.size > 1;
  });
  
  const returnRate = uniqueSessions.size > 0
    ? (returningUsers.length / uniqueSessions.size) * 100
    : 0;
  
  const churnRate = 100 - returnRate;
  
  return {
    dailyActiveUsers,
    avgSessionDuration,
    returnRate,
    churnRate,
  };
}

export const GET = withAuth(async (request: NextRequest) => {
  try {
    // Get and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const validation = validateQuery(searchParams);
    
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
    
    const { range, timezone } = validation.data!;
    
    // Get time range
    const timeRange = getTimeRange(range);
    const { start, end } = timeRange;
    
    // Fetch events from database
    const events = queries.analytics.getEventsByTimeRange(start, end);
    
    // Get top content with completion rates
    const topContentStats = queries.contentStats.getTopContent(20);
    const completionRates = topContentStats.map(stat => ({
      contentId: stat.contentId,
      title: `Content ${stat.contentId}`, // In real implementation, fetch from TMDB
      contentType: stat.contentType,
      completionRate: stat.completionRate * 100,
      viewCount: stat.viewCount,
      avgWatchTime: stat.avgWatchTime,
    }));
    
    // Calculate peak usage hours
    const peakUsageHours = calculatePeakUsageHours(events, timezone);
    
    // Calculate drop-off analysis
    const dropOffAnalysis = calculateDropOffAnalysis(events);
    
    // Calculate retention metrics
    const retentionMetrics = calculateRetentionMetrics(events, range);
    
    // Build response
    const analytics: DetailedAnalytics = {
      completionRates,
      peakUsageHours,
      dropOffAnalysis,
      retentionMetrics,
    };
    
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    return NextResponse.json(
      { 
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch detailed analytics',
        }
      },
      { status: 500 }
    );
  }
});
