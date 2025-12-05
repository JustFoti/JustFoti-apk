/**
 * Stream Proxy Cloudflare Worker
 * 
 * Proxies HLS streams and their segments with proper referer headers.
 * Essential for 2embed streams which require the referer header on ALL requests.
 * 
 * GET /?url=<encoded_url>&source=2embed&referer=<encoded_referer>
 */

export interface Env {
  API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders(),
      });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url');
      const source = url.searchParams.get('source') || '2embed';
      const referer = url.searchParams.get('referer') || 'https://www.2embed.cc';

      if (!targetUrl) {
        return jsonResponse({ error: 'Missing url parameter' }, 400);
      }

      const decodedUrl = decodeURIComponent(targetUrl);

      // Fetch with proper headers
      const headers: HeadersInit = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
        'Referer': referer,
        'Origin': new URL(referer).origin,
      };

      let response = await fetch(decodedUrl, {
        headers,
        redirect: 'manual',
      });

      // Handle redirects
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          const redirectUrl = new URL(location, decodedUrl).toString();
          response = await fetch(redirectUrl, { headers, redirect: 'follow' });
          
          if (!response.ok) {
            return jsonResponse({ error: `Redirect target error: ${response.status}` }, response.status);
          }
          
          return handleStreamResponse(response, decodedUrl, source, referer, url.origin);
        }
      }

      if (!response.ok) {
        return jsonResponse({ error: `Upstream error: ${response.status}` }, response.status);
      }

      return handleStreamResponse(response, decodedUrl, source, referer, url.origin);

    } catch (error) {
      return jsonResponse({
        error: 'Proxy error',
        details: error instanceof Error ? error.message : String(error),
      }, 500);
    }
  },
};

async function handleStreamResponse(
  response: Response,
  decodedUrl: string,
  source: string,
  referer: string,
  proxyOrigin: string
): Promise<Response> {
  const contentType = response.headers.get('content-type') || '';
  const arrayBuffer = await response.arrayBuffer();
  
  // Check if this is video data
  const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
  const isMpegTs = firstBytes[0] === 0x47;
  const isFmp4 = firstBytes[0] === 0x00 && firstBytes[1] === 0x00 && firstBytes[2] === 0x00;
  const isVideoData = isMpegTs || isFmp4;

  const isPlaylist = !isVideoData && (
    contentType.includes('mpegurl') ||
    decodedUrl.includes('.m3u8') ||
    decodedUrl.includes('.txt') ||
    (contentType.includes('text') && !decodedUrl.includes('.html'))
  );

  if (isPlaylist) {
    const text = new TextDecoder().decode(arrayBuffer);
    const rewrittenPlaylist = rewritePlaylistUrls(text, decodedUrl, source, referer, proxyOrigin);
    
    return new Response(rewrittenPlaylist, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        ...corsHeaders(),
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  // Return video segment
  let actualContentType = 'video/mp2t';
  if (isMpegTs) actualContentType = 'video/mp2t';
  else if (isFmp4) actualContentType = 'video/mp4';

  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': actualContentType,
      ...corsHeaders(),
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': arrayBuffer.byteLength.toString(),
    },
  });
}


function rewritePlaylistUrls(
  playlist: string,
  baseUrl: string,
  source: string,
  referer: string,
  proxyOrigin: string
): string {
  const lines = playlist.split('\n');
  const rewritten: string[] = [];
  
  const base = new URL(baseUrl);
  const basePath = base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1);
  
  const proxyUrl = (url: string): string => {
    let absoluteUrl: string;
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      absoluteUrl = url;
    } else if (url.startsWith('/')) {
      absoluteUrl = `${base.origin}${url}`;
    } else {
      absoluteUrl = `${base.origin}${basePath}${url}`;
    }
    
    // proxyOrigin is the worker's origin (e.g., https://media-proxy.xxx.workers.dev)
    // We need to include /stream/ path since that's how the main router routes to us
    return `${proxyOrigin}/stream/?url=${encodeURIComponent(absoluteUrl)}&source=${source}&referer=${encodeURIComponent(referer)}`;
  };
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Handle HLS tags with URIs
    if (line.startsWith('#EXT-X-MEDIA:') || line.startsWith('#EXT-X-I-FRAME-STREAM-INF:')) {
      const uriMatch = line.match(/URI="([^"]+)"/);
      if (uriMatch) {
        const originalUri = uriMatch[1];
        const proxiedUri = proxyUrl(originalUri);
        rewritten.push(line.replace(`URI="${originalUri}"`, `URI="${proxiedUri}"`));
      } else {
        rewritten.push(line);
      }
      continue;
    }
    
    // Keep comments and empty lines
    if (line.startsWith('#') || trimmedLine === '') {
      rewritten.push(line);
      continue;
    }

    if (!trimmedLine) {
      rewritten.push(line);
      continue;
    }
    
    try {
      rewritten.push(proxyUrl(trimmedLine));
    } catch {
      rewritten.push(line);
    }
  }

  return rewritten.join('\n');
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
  };
}

function jsonResponse(data: object, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}
