/**
 * CDN Live Events API (via Cinephage bypass)
 * 
 * GET /api/livetv/cdn-live-events - List all sports events
 * GET /api/livetv/cdn-live-events?sport=nfl - Filter by sport
 * GET /api/livetv/cdn-live-events?status=live - Filter by status (live, upcoming, finished)
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://api.cinephage.net/livetv';

export interface EventChannel {
  id: string;
  name: string;
  stream_url: string;
}

export interface SportEvent {
  id: string;
  sport: string;
  home_team: string;
  away_team: string;
  home_logo: string;
  away_logo: string;
  start: string;
  end: string;
  status: 'live' | 'upcoming' | 'finished';
  tournament: string;
  country: string;
  channels: EventChannel[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const status = searchParams.get('status');
    
    // Build URL
    let url = `${API_BASE}/events`;
    if (sport) {
      url = `${API_BASE}/events/${encodeURIComponent(sport)}`;
    }
    
    if (status) {
      url += `?status=${status}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 1 minute (events change frequently)
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch events', status: response.status },
        { status: response.status }
      );
    }

    const events: SportEvent[] = await response.json();
    
    // Group events by sport
    const eventsBySport: Record<string, SportEvent[]> = {};
    const liveEvents: SportEvent[] = [];
    const upcomingEvents: SportEvent[] = [];
    
    for (const event of events) {
      // Group by sport
      if (!eventsBySport[event.sport]) {
        eventsBySport[event.sport] = [];
      }
      eventsBySport[event.sport].push(event);
      
      // Separate live and upcoming
      if (event.status === 'live') {
        liveEvents.push(event);
      } else if (event.status === 'upcoming') {
        upcomingEvents.push(event);
      }
    }

    return NextResponse.json({
      total: events.length,
      live: liveEvents.length,
      upcoming: upcomingEvents.length,
      events,
      liveEvents,
      upcomingEvents,
      bySport: eventsBySport,
      sports: Object.keys(eventsBySport).sort(),
    });
  } catch (error) {
    console.error('CDN Live events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: String(error) },
      { status: 500 }
    );
  }
}
