/**
 * VIPRow Schedule API
 * 
 * GET /api/livetv/viprow-schedule
 * 
 * Fetches and parses the VIPRow schedule from their big-games page.
 * Events are extracted from the server-rendered HTML.
 */

import { NextResponse } from 'next/server';

export const runtime = 'edge';

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface ViprowEvent {
  id: string;
  title: string;
  sport: string;
  time: string;
  isoTime: string;
  url: string;
  isLive: boolean;
}

export async function GET() {
  try {
    // Fetch the big-games schedule page
    const response = await fetch(`${VIPROW_BASE}/sports-big-games`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch schedule: ${response.status}`,
      }, { status: response.status });
    }

    const html = await response.text();
    
    // Parse events from HTML
    // Pattern: <a ... href="/sport/event-online-stream" ... title="Event Title">
    //          <span class="... vipbox {sport}"></span>
    //          <span content="ISO_TIME" ...>HH:MM</span> Event Title</a>
    const eventPattern = /href="([^"]+online-stream)"[^>]*role="button"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*vipbox\s+([^"]+)"[^>]*><\/span>[\s\S]*?<span[^>]*content="([^"]+)"[^>]*>(\d{2}:\d{2})<\/span>/g;
    
    const events: ViprowEvent[] = [];
    let match;
    
    while ((match = eventPattern.exec(html)) !== null) {
      const [, url, title, sport, isoTime, time] = match;
      
      // Determine if event is live (started but not ended)
      const eventTime = new Date(isoTime);
      const now = new Date();
      const isLive = eventTime <= now && (now.getTime() - eventTime.getTime()) < 4 * 60 * 60 * 1000; // Within 4 hours
      
      events.push({
        id: `viprow-${url.replace(/[^a-z0-9]/gi, '-')}`,
        title: title.trim(),
        sport: sport.trim(),
        time,
        isoTime,
        url,
        isLive,
      });
    }

    // Group events by sport
    const bySport: Record<string, ViprowEvent[]> = {};
    for (const event of events) {
      if (!bySport[event.sport]) {
        bySport[event.sport] = [];
      }
      bySport[event.sport].push(event);
    }

    return NextResponse.json({
      success: true,
      count: events.length,
      events,
      bySport,
      fetchedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });

  } catch (error: unknown) {
    console.error('[VIPRow Schedule] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch schedule',
    }, { status: 500 });
  }
}
