/**
 * Analytics Export API Route
 * GET /api/analytics/export - Export analytics data in CSV or JSON format
 * Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db/queries';
import { withAuth } from '@/lib/middleware/auth';
import { validateQuery, exportQuerySchema } from '@/lib/validation/analytics-schemas';

export const dynamic = 'force-dynamic';

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  // Convert rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

function getTimeRange(start?: string, end?: string): { start: number; end: number } {
  const now = Date.now();
  const defaultStart = now - (30 * 24 * 60 * 60 * 1000); // 30 days ago
  
  return {
    start: start ? parseInt(start) : defaultStart,
    end: end ? parseInt(end) : now,
  };
}

function getDateString(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

export const GET = withAuth(async (request: NextRequest) => {
  try {
    // Get and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const validation = validateQuery(exportQuerySchema, searchParams);
    
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
    
    const { format, type: dataType, start: startParam, end: endParam } = validation.data;
    
    // Get time range
    const { start, end } = getTimeRange(startParam || undefined, endParam || undefined);
    
    let exportData: any[] = [];
    let filename = '';
    
    // Fetch data based on type
    switch (dataType) {
      case 'events':
        const events = queries.analytics.getEventsByTimeRange(start, end);
        exportData = events.map(event => ({
          id: event.id,
          sessionId: event.sessionId,
          timestamp: event.timestamp,
          date: new Date(event.timestamp).toISOString(),
          eventType: event.eventType,
          ...event.metadata,
        }));
        filename = `analytics-events-${getDateString(start)}-to-${getDateString(end)}`;
        break;
        
      case 'metrics':
        const startDate = getDateString(start);
        const endDate = getDateString(end);
        const metrics = queries.metrics.getMetricsRange(startDate, endDate);
        exportData = metrics.map(metric => ({
          date: metric.date,
          totalViews: metric.totalViews,
          totalWatchTime: metric.totalWatchTime,
          uniqueSessions: metric.uniqueSessions,
          avgSessionDuration: metric.avgSessionDuration,
          topContent: metric.topContent,
        }));
        filename = `analytics-metrics-${startDate}-to-${endDate}`;
        break;
        
      case 'content':
        const contentStats = queries.contentStats.getTopContent(100);
        exportData = contentStats.map(stat => ({
          contentId: stat.contentId,
          contentType: stat.contentType,
          viewCount: stat.viewCount,
          totalWatchTime: stat.totalWatchTime,
          completionRate: (stat.completionRate * 100).toFixed(2) + '%',
          avgWatchTime: stat.avgWatchTime,
          lastViewed: new Date(stat.lastViewed * 1000).toISOString(),
        }));
        filename = `content-stats-${getDateString(Date.now())}`;
        break;
        
      default:
        return NextResponse.json(
          { 
            error: {
              code: 'INVALID_TYPE',
              message: 'Invalid data type',
            }
          },
          { status: 400 }
        );
    }
    
    // Format response based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(exportData);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      // JSON format
      const json = JSON.stringify(exportData, null, 2);
      
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    return NextResponse.json(
      { 
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to export data',
        }
      },
      { status: 500 }
    );
  }
});
