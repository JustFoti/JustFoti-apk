/**
 * DLHD Segment Proxy API - Direct Fetch
 * 
 * Proxies video segments from DLHD servers.
 * Segments are encrypted with AES-128 and decrypted by the player using the key.
 * 
 * Updated: January 21, 2026
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const PLAYER_DOMAIN = 'epicplayplay.cfd';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const segmentUrl = searchParams.get('url');

  if (!segmentUrl) {
    return NextResponse.json({
      error: 'Missing url parameter',
      usage: 'GET /api/dlhd-proxy/segment?url=<encoded_segment_url>',
    }, { status: 400 });
  }

  try {
    // Fetch segment from DLHD
    const segmentRes = await fetch(segmentUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });

    if (!segmentRes.ok) {
      console.error('[DLHD Segment] Fetch failed:', segmentRes.status);
      return NextResponse.json({
        error: 'Segment fetch failed',
        status: segmentRes.status,
      }, { status: 502 });
    }

    const segmentData = await segmentRes.arrayBuffer();

    return new NextResponse(segmentData, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        'Cache-Control': 'public, max-age=300',
        'X-Proxied-Via': 'nextjs-direct',
      },
    });

  } catch (error) {
    console.error('[DLHD Segment] Proxy error:', error);
    return NextResponse.json({
      error: 'Segment proxy error',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
    },
  });
}
