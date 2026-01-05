/**
 * CDN Live Channels API (via Cinephage bypass)
 * 
 * GET /api/livetv/cdn-live-channels - List all channels
 * GET /api/livetv/cdn-live-channels?country=us - Filter by country
 * GET /api/livetv/cdn-live-channels?status=online - Filter by status
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://api.cinephage.net/livetv';

export interface CinephageChannel {
  id: string;
  name: string;
  country: string;
  country_name: string;
  logo: string | null;
  status: 'online' | 'offline';
  viewers: number;
  stream_url: string;
}

export interface CinephageChannelsResponse {
  total: number;
  online: number;
  channels: CinephageChannel[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    // Build URL with optional filters
    let url = `${API_BASE}/channels`;
    if (country) {
      url = `${API_BASE}/channels/${country}`;
    }
    
    const queryParams = new URLSearchParams();
    if (status) queryParams.set('status', status);
    if (search) queryParams.set('search', search);
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch channels', status: response.status },
        { status: response.status }
      );
    }

    const data: CinephageChannelsResponse = await response.json();
    
    // Group channels by country for easier filtering
    const channelsByCountry: Record<string, CinephageChannel[]> = {};
    for (const channel of data.channels) {
      const countryCode = channel.country || 'other';
      if (!channelsByCountry[countryCode]) {
        channelsByCountry[countryCode] = [];
      }
      channelsByCountry[countryCode].push(channel);
    }

    return NextResponse.json({
      total: data.total,
      online: data.online,
      channels: data.channels,
      byCountry: channelsByCountry,
      countries: Object.keys(channelsByCountry).sort(),
    });
  } catch (error) {
    console.error('CDN Live channels error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels', details: String(error) },
      { status: 500 }
    );
  }
}
