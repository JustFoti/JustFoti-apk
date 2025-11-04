/**
 * Analytics Metrics API Route
 * GET /api/analytics/metrics - Fetch dashboard metrics
 * Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db/queries';
import { withAuth } from '@/lib/middleware/auth';
import { validateQuery, metricsQuerySchema } from '@/lib/validation/analytics-schemas';

export const dynamic = 'force-dynamic';

interface DashboardMetrics {
  overview: {
    activeUsers: number;
    totalViews: number;
    totalWatchTime: number;
    avgSessionDuration: number;
  };
  topContent: Array<{
    contentId: string;
    title: string;
    contentType: 'movie' | 'tv';
    viewCount: number;
    totalWatchTime: number;
    completionRate: number;
    posterPath?: string;
  }>;
  liveSessions: Array<{
    sessionId: string;
    lastActivity: number;
    currentContent?: {
      title: string;
      contentType: 'movie' | 'tv';
    };
    eventsCount: number;
  }>;
  trends: Array<{
    timestamp: number;
    value: number;
    label?: string;
  }>;
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

function calculateActiveSessions(events: any[]): number {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  const recentSessions = new Set(
    events
      .filter(e => e.timestamp > fiveMinutesAgo)
      .map(e => e.sessionId)
  );
  return recentSessions.size;
}

function getLiveSessions(events: any[]): DashboardMetrics['liveSessions'] {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  const sessionMap = new Map<string, any>();
  
  // Group events by session
  events
    .filter(e => e.timestamp > fiveMinutesAgo)
    .forEach(event => {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, {
          sessionId: event.sessionId,
          lastActivity: event.timestamp,
          events: [],
        });
      }
      
      const session = sessionMap.get(event.sessionId);
      session.events.push(event);
      session.lastActivity = Math.max(session.lastActivity, event.timestamp);
    });
  
  // Convert to array and extract current content
  return Array.from(sessionMap.values()).map(session => {
    const playEvent = session.events
      .filter((e: any) => e.eventType === 'play' || e.eventType === 'content_view')
      .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
    
    return {
      sessionId: session.sessionId,
      lastActivity: session.lastActivity,
      currentContent: playEvent?.metadata?.title ? {
        title: playEvent.metadata.title,
        contentType: playEvent.metadata.contentType,
      } : undefined,
      eventsCount: session.events.length,
    };
  }).sort((a, b) => b.lastActivity - a.lastActivity);
}

function generateTrends(events: any[], range: string): DashboardMetrics['trends'] {
  const { start, end } = getTimeRange(range);
  const buckets = range === '24h' ? 24 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const bucketSize = (end - start) / buckets;
  
  const trendData: Record<number, number> = {};
  
  // Initialize buckets
  for (let i = 0; i < buckets; i++) {
    const timestamp = start + (i * bucketSize);
    trendData[timestamp] = 0;
  }
  
  // Count events per bucket
  events.forEach(event => {
    const bucketIndex = Math.floor((event.timestamp - start) / bucketSize);
    const bucketTimestamp = start + (bucketIndex * bucketSize);
    if (trendData[bucketTimestamp] !== undefined) {
      trendData[bucketTimestamp]++;
    }
  });
  
  return Object.entries(trendData)
    .map(([timestamp, value]) => ({
      timestamp: parseInt(timestamp),
      value,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export const GET = withAuth(async (request: NextRequest) => {
  try {
    // Get and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const validation = validateQuery(metricsQuerySchema, searchParams);
    
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
    
    const { range } = validation.data;
    
    // Get time range
    const { start, end } = getTimeRange(range);
    
    // Fetch events from database
    const events = queries.analytics.getEventsByTimeRange(start, end);
    
    // Calculate active users (unique sessions in last 5 minutes)
    const activeUsers = calculateActiveSessions(events);
    
    // Get aggregated metrics
    const startDate = getDateString(start);
    const endDate = getDateString(end);
    const aggregated = queries.metrics.getAggregatedMetrics(startDate, endDate);
    
    // Get top content
    const topContentStats = queries.contentStats.getTopContent(10);
    
    // Fetch content details from TMDB (simplified - just use stored data)
    const topContent = topContentStats.map(stat => ({
      contentId: stat.contentId,
      title: `Content ${stat.contentId}`, // In real implementation, fetch from TMDB
      contentType: stat.contentType,
      viewCount: stat.viewCount,
      totalWatchTime: stat.totalWatchTime,
      completionRate: stat.completionRate,
    }));
    
    // Get live sessions
    const liveSessions = getLiveSessions(events);
    
    // Generate trends
    const trends = generateTrends(events, range);
    
    // Build response
    const metrics: DashboardMetrics = {
      overview: {
        activeUsers,
        totalViews: aggregated.totalViews,
        totalWatchTime: aggregated.totalWatchTime,
        avgSessionDuration: aggregated.avgSessionDuration,
      },
      topContent,
      liveSessions,
      trends,
    };
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { 
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch metrics',
        }
      },
      { status: 500 }
    );
  }
});
