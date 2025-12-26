/**
 * PPV.to Stream Extractor API
 * 
 * Extracts the actual m3u8 stream URL from ppv.to embed pages.
 * The stream URL is base64-encoded in the embed page's JWPlayer setup.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const EMBED_BASE = 'https://pooembed.top';

interface StreamResult {
  success: boolean;
  streamUrl?: string;
  method?: string;
  error?: string;
  streamInfo?: {
    id: string;
    name: string;
    uriName: string;
  };
}

/**
 * Extract m3u8 URL from embed page
 */
async function extractM3U8(uriName: string): Promise<StreamResult> {
  const embedUrl = `${EMBED_BASE}/embed/${uriName}`;

  try {
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://ppv.to/',
      },
    });

    if (!response.ok) {
      return { success: false, error: `Embed page returned ${response.status}` };
    }

    const html = await response.text();

    // Pattern 1: const src = atob("base64_string");
    const atobPattern = /const\s+src\s*=\s*atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/;
    const atobMatch = html.match(atobPattern);

    if (atobMatch) {
      const base64 = atobMatch[1];
      const m3u8Url = Buffer.from(base64, 'base64').toString('utf-8');
      return { success: true, streamUrl: m3u8Url, method: 'atob' };
    }

    // Pattern 2: Direct file URL in JWPlayer setup
    const filePattern = /file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/;
    const fileMatch = html.match(filePattern);

    if (fileMatch) {
      return { success: true, streamUrl: fileMatch[1], method: 'direct' };
    }

    // Pattern 3: Look for any m3u8 URL in the page
    const m3u8Pattern = /["'](https?:\/\/[^"']*\.m3u8[^"']*)["']/;
    const m3u8Match = html.match(m3u8Pattern);

    if (m3u8Match) {
      return { success: true, streamUrl: m3u8Match[1], method: 'regex' };
    }

    // Pattern 4: Check for "not live" or "offline" messages
    if (html.includes('not live') || html.includes('offline') || html.includes('coming soon')) {
      return { success: false, error: 'Stream is not currently live' };
    }

    return { success: false, error: 'Could not extract stream URL from embed page' };

  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch embed page' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uriName = searchParams.get('uri');
    const streamId = searchParams.get('id');
    const streamName = searchParams.get('name');

    if (!uriName) {
      return NextResponse.json(
        { success: false, error: 'URI parameter is required' },
        { status: 400 }
      );
    }

    const result = await extractM3U8(uriName);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          uriName,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      streamUrl: result.streamUrl,
      method: result.method,
      streamInfo: {
        id: streamId || uriName,
        name: streamName || uriName,
        uriName,
      },
      // Headers needed for playback
      playbackHeaders: {
        'Referer': 'https://pooembed.top/',
        'Origin': 'https://pooembed.top',
      },
    }, {
      headers: {
        // Short cache since streams can change
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });

  } catch (error: any) {
    console.error('[PPV Stream API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to extract stream' },
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
