/**
 * CDN Live Stream API (via Cinephage bypass)
 * 
 * GET /api/livetv/cdnlive-stream?channel={name}&code={country}
 * 
 * Uses the Cinephage API which returns stream URLs directly - no decoding needed!
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const API_BASE = 'https://api.cinephage.net/livetv';
const REFERER = 'https://cdn-live.tv/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface CinephageStreamResponse {
  channel: {
    id: string;
    name: string;
    country: string;
  };
  stream: {
    url: string;
    type: string;
    resolution: string;
    expires_at: number;
  };
  playback: {
    headers: {
      Referer: string;
      'User-Agent': string;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channel = searchParams.get('channel');
    const code = searchParams.get('code') || 'us';
    const eventId = searchParams.get('eventId'); // Legacy support
    
    // Use eventId as channel name if provided (legacy support)
    const channelName = channel || eventId;
    
    if (!channelName) {
      return NextResponse.json(
        { success: false, error: 'channel parameter is required' },
        { status: 400 }
      );
    }
    
    // Call Cinephage API directly - it returns the stream URL!
    const streamUrl = `${API_BASE}/stream/${code}/${encodeURIComponent(channelName)}`;
    
    const response = await fetch(streamUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `Channel not found or offline: ${response.status}`,
        details: errorText,
      }, { status: response.status });
    }
    
    const data: CinephageStreamResponse = await response.json();
    
    // Calculate TTL from expiration
    const now = Math.floor(Date.now() / 1000);
    const ttl = data.stream.expires_at ? Math.max(0, data.stream.expires_at - now) : 3600;
    
    return NextResponse.json({
      success: true,
      streamUrl: data.stream.url,
      channelId: data.channel.id,
      channelName: data.channel.name,
      country: data.channel.country,
      resolution: data.stream.resolution,
      type: data.stream.type,
      method: 'cinephage-api',
      isLive: true,
      expiresAt: data.stream.expires_at,
      ttl,
      headers: {
        'Referer': REFERER,
        'Origin': 'https://cdn-live.tv',
      },
    }, {
      headers: {
        'Cache-Control': `public, s-maxage=${Math.min(ttl, 300)}, stale-while-revalidate=${Math.min(ttl * 2, 600)}`,
      },
    });
    
  } catch (error: unknown) {
    console.error('[CDN Live Stream API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get stream' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
