import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const REFERER = 'https://cdn-live.tv/';
const ORIGIN = 'https://cdn-live.tv';

/**
 * Proxy for CDN-Live.tv streams
 * The edge.cdn-live-tv.ru server requires proper Referer header
 * This endpoint proxies the m3u8 and ts segments with correct headers
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    
    // Validate URL is from expected domain
    if (!decodedUrl.includes('cdn-live-tv.ru') && !decodedUrl.includes('cdn-live.tv')) {
      return NextResponse.json({ error: 'Invalid URL domain' }, { status: 400 });
    }

    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': REFERER,
        'Origin': ORIGIN,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}`, status: response.status },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // For m3u8 playlists, we need to rewrite URLs to go through our proxy
    if (contentType.includes('mpegurl') || decodedUrl.endsWith('.m3u8')) {
      const text = await response.text();
      
      // Get base URL for relative paths
      const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);
      
      // Rewrite URLs in the playlist
      const rewritten = text.split('\n').map(line => {
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (trimmed.startsWith('#') || trimmed === '') {
          // But check for URI in EXT-X-KEY
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              const fullUrl = uri.startsWith('http') ? uri : baseUrl + uri;
              return `URI="/api/livetv/cdn-live-proxy?url=${encodeURIComponent(fullUrl)}"`;
            });
          }
          return line;
        }
        
        // Rewrite segment URLs
        if (trimmed.startsWith('http')) {
          return `/api/livetv/cdn-live-proxy?url=${encodeURIComponent(trimmed)}`;
        } else if (trimmed.endsWith('.ts') || trimmed.endsWith('.m3u8') || trimmed.includes('.ts?') || trimmed.includes('.m3u8?')) {
          const fullUrl = baseUrl + trimmed;
          return `/api/livetv/cdn-live-proxy?url=${encodeURIComponent(fullUrl)}`;
        }
        
        return line;
      }).join('\n');

      return new NextResponse(rewritten, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // For binary content (ts segments), stream directly
    const data = await response.arrayBuffer();
    
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('CDN-Live proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy failed', details: String(error) },
      { status: 500 }
    );
  }
}
