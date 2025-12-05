/**
 * Live TV Stream API
 * 
 * Redirects to the existing DLHD proxy which handles all the stream proxying.
 * This is a thin wrapper that maps stream IDs to the dlhd-proxy API.
 * 
 * NOTE: For reduced bandwidth costs, consider using the Cloudflare Worker proxy instead.
 * Set NEXT_PUBLIC_CF_TV_PROXY_URL to enable Cloudflare Workers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTvPlaylistUrl, getTvProxyBaseUrl } from '@/app/lib/proxy-config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const streamId = searchParams.get('id');

    if (!streamId) {
      return NextResponse.json(
        { error: 'Missing stream ID parameter' },
        { status: 400 }
      );
    }

    // Check if using Cloudflare Worker proxy
    const cfProxyBase = getTvProxyBaseUrl();
    
    // If using Cloudflare Worker, redirect to it
    if (cfProxyBase) {
      const cfUrl = getTvPlaylistUrl(streamId);
      return NextResponse.redirect(cfUrl);
    }
    
    // Otherwise use the local DLHD proxy
    const proxyUrl = `${request.nextUrl.origin}/api/dlhd-proxy?channel=${streamId}`;
    
    // Fetch from the existing proxy
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LiveTV Stream] Proxy error for channel ${streamId}:`, errorText);
      return NextResponse.json(
        { error: 'Stream unavailable', details: `Channel ${streamId} is not available` },
        { status: response.status }
      );
    }

    const m3u8Content = await response.text();

    // Return the proxied M3U8
    return new NextResponse(m3u8Content, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Cache-Control': 'no-cache',
        'X-Stream-ID': streamId,
      },
    });

  } catch (error) {
    console.error('[LiveTV Stream] Error:', error);
    return NextResponse.json(
      {
        error: 'Stream error',
        details: error instanceof Error ? error.message : String(error),
      },
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
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}
