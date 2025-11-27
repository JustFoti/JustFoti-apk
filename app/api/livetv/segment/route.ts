/**
 * Live TV Segment Proxy
 * 
 * Proxies video segments from DLHD CDN with proper headers.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DLHD_CONFIG = {
  segmentReferer: 'https://zekonew.giokko.ru/',
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      );
    }

    const decodedUrl = decodeURIComponent(url);

    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': DLHD_CONFIG.segmentReferer,
        'Origin': 'https://zekonew.giokko.ru',
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Cache-Control': 'public, max-age=300',
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('[LiveTV Segment] Error:', error);
    return NextResponse.json(
      { error: 'Segment proxy error' },
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
