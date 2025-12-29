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

    // Check for "not live" or "offline" messages first
    if (html.includes('not live') || html.includes('offline') || html.includes('coming soon') || 
        html.includes('Event has ended') || html.includes('not available')) {
      return { success: false, error: 'Stream is not currently live' };
    }

    // Pattern 1: const src = atob("base64_string");
    const atobPattern = /const\s+src\s*=\s*atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/;
    const atobMatch = html.match(atobPattern);

    if (atobMatch) {
      const base64 = atobMatch[1];
      try {
        const decoded = Buffer.from(base64, 'base64').toString('utf-8');
        // Validate it's actually an m3u8 URL, not an image or other garbage
        if (decoded.includes('.m3u8') && (decoded.startsWith('http://') || decoded.startsWith('https://'))) {
          return { success: true, streamUrl: decoded, method: 'atob' };
        }
      } catch {}
    }

    // Pattern 2: var src = atob("base64_string");
    const varAtobPattern = /var\s+src\s*=\s*atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/;
    const varAtobMatch = html.match(varAtobPattern);

    if (varAtobMatch) {
      const base64 = varAtobMatch[1];
      try {
        const decoded = Buffer.from(base64, 'base64').toString('utf-8');
        if (decoded.includes('.m3u8') && (decoded.startsWith('http://') || decoded.startsWith('https://'))) {
          return { success: true, streamUrl: decoded, method: 'atob_var' };
        }
      } catch {}
    }

    // Pattern 3: Direct file URL in JWPlayer setup
    const filePattern = /file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/;
    const fileMatch = html.match(filePattern);

    if (fileMatch && fileMatch[1].startsWith('http')) {
      return { success: true, streamUrl: fileMatch[1], method: 'direct' };
    }

    // Pattern 4: source src attribute with m3u8
    const sourcePattern = /<source[^>]+src=["']([^"']+\.m3u8[^"']*)["']/i;
    const sourceMatch = html.match(sourcePattern);

    if (sourceMatch && sourceMatch[1].startsWith('http')) {
      return { success: true, streamUrl: sourceMatch[1], method: 'source_tag' };
    }

    // Pattern 5: Look for any m3u8 URL in the page (but validate it's not an image)
    const m3u8Pattern = /["'](https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*)["']/g;
    let m3u8Match;
    while ((m3u8Match = m3u8Pattern.exec(html)) !== null) {
      const url = m3u8Match[1];
      // Skip if it looks like an image URL or other non-stream content
      if (!url.includes('.png') && !url.includes('.jpg') && !url.includes('.jpeg') && 
          !url.includes('.gif') && !url.includes('.webp') && !url.includes('image')) {
        return { success: true, streamUrl: url, method: 'regex' };
      }
    }

    // Pattern 6: Look for base64 encoded URLs in data attributes
    const dataAttrPattern = /data-[a-z]+="([A-Za-z0-9+/=]{20,})"/gi;
    let dataMatch;
    while ((dataMatch = dataAttrPattern.exec(html)) !== null) {
      try {
        const decoded = Buffer.from(dataMatch[1], 'base64').toString('utf-8');
        if (decoded.includes('.m3u8') && (decoded.startsWith('http://') || decoded.startsWith('https://'))) {
          return { success: true, streamUrl: decoded, method: 'data_attr' };
        }
      } catch {}
    }

    return { success: false, error: 'Could not extract stream URL from embed page - stream may be offline or page structure changed' };

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
