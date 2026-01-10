/**
 * VIPRow/Casthill Stream Proxy
 * 
 * Routes:
 *   GET /viprow/stream?url=<viprow_event_url>&link=<1-10> - Extract and proxy m3u8
 *   GET /viprow/manifest?url=<encoded_manifest_url> - Proxy manifest with URL rewriting
 *   GET /viprow/key?url=<encoded_key_url> - Proxy decryption key
 *   GET /viprow/segment?url=<encoded_segment_url> - Proxy video segment
 *   GET /viprow/health - Health check
 * 
 * This proxy forwards extraction to RPI residential proxy (boanki.net blocks CF Workers)
 * and handles key/segment proxying directly.
 */

import { createLogger, type LogLevel } from './logger';

export interface Env {
  LOG_LEVEL?: string;
  RPI_PROXY_URL?: string;
  RPI_PROXY_KEY?: string;
}

const CASTHILL_ORIGIN = 'https://casthill.net';
const CASTHILL_REFERER = 'https://casthill.net/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Allowed domains for proxying
const ALLOWED_DOMAINS = [
  'peulleieo.net',  // Manifest/segment server
  'boanki.net',     // Token/key server
];

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
  };
}

function jsonResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Rewrite manifest URLs to go through proxy
 * Handles both master playlists (variant streams) and media playlists (segments)
 */
function rewriteManifestUrls(manifest: string, baseUrl: string, proxyBase: string): string {
  const lines = manifest.split('\n');
  const rewritten: string[] = [];
  
  // Detect if this is a master playlist (contains #EXT-X-STREAM-INF)
  const isMasterPlaylist = manifest.includes('#EXT-X-STREAM-INF');
  
  for (const line of lines) {
    let newLine = line;
    const trimmed = line.trim();
    
    // Skip empty lines
    if (trimmed === '') {
      rewritten.push(line);
      continue;
    }
    
    // Rewrite key URLs (in media playlists)
    if (trimmed.includes('URI="')) {
      newLine = trimmed.replace(/URI="([^"]+)"/, (_, url) => {
        const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).toString();
        return `URI="${proxyBase}/key?url=${encodeURIComponent(fullUrl)}"`;
      });
    }
    // Skip other comments/tags
    else if (trimmed.startsWith('#')) {
      rewritten.push(line);
      continue;
    }
    // Rewrite URLs (variant streams in master, segments in media)
    else if (trimmed.length > 0) {
      const fullUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).toString();
      
      if (isMasterPlaylist) {
        // Variant stream URL - route through manifest proxy
        newLine = `${proxyBase}/manifest?url=${encodeURIComponent(fullUrl)}`;
      } else if (trimmed.includes('.ts') || trimmed.includes('?') || !trimmed.includes('.')) {
        // Segment URL - route through segment proxy
        newLine = `${proxyBase}/segment?url=${encodeURIComponent(fullUrl)}`;
      } else {
        // Unknown URL type - assume it's a manifest
        newLine = `${proxyBase}/manifest?url=${encodeURIComponent(fullUrl)}`;
      }
    }
    
    rewritten.push(newLine);
  }
  
  return rewritten.join('\n');
}

export async function handleVIPRowRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/viprow/, '');
  const logLevel = (env.LOG_LEVEL || 'info') as LogLevel;
  const logger = createLogger(request, logLevel);
  
  // Get the full proxy base URL for rewriting manifest URLs
  const proxyBaseUrl = `${url.protocol}//${url.host}/viprow`;
  
  // RPI proxy configuration
  const rpiProxyUrl = env.RPI_PROXY_URL;
  const rpiProxyKey = env.RPI_PROXY_KEY;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Health check
  if (path === '/health' || path === '') {
    return jsonResponse({
      status: 'ok',
      service: 'viprow-proxy',
      rpiConfigured: !!rpiProxyUrl,
      timestamp: new Date().toISOString(),
    });
  }

  // Stream extraction - forwards to RPI proxy for extraction
  if (path === '/stream') {
    const eventUrl = url.searchParams.get('url');
    const linkNum = url.searchParams.get('link') || '1';
    
    if (!eventUrl) {
      return jsonResponse({ error: 'url parameter required (e.g., /nba/event-online-stream)' }, 400);
    }
    
    if (!rpiProxyUrl) {
      return jsonResponse({ error: 'RPI_PROXY_URL not configured - VIPRow requires residential IP' }, 500);
    }
    
    logger.info('Forwarding VIPRow extraction to RPI proxy', { url: eventUrl, link: linkNum });
    
    try {
      // Forward to RPI proxy for extraction
      const rpiUrl = `${rpiProxyUrl}/viprow/stream?url=${encodeURIComponent(eventUrl)}&link=${linkNum}&cf_proxy=${encodeURIComponent(proxyBaseUrl)}&key=${rpiProxyKey || ''}`;
      
      const rpiResponse = await fetch(rpiUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });
      
      if (!rpiResponse.ok) {
        const errorText = await rpiResponse.text();
        logger.error('RPI proxy extraction failed', { status: rpiResponse.status, error: errorText });
        return jsonResponse({ error: `RPI proxy error: ${rpiResponse.status}`, details: errorText.substring(0, 200) }, rpiResponse.status);
      }
      
      // RPI returns the m3u8 manifest directly
      const manifest = await rpiResponse.text();
      
      logger.info('Stream extracted successfully via RPI proxy');
      
      return new Response(manifest, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache',
          ...corsHeaders(),
        },
      });
    } catch (error) {
      logger.error('RPI proxy request failed', error as Error);
      return jsonResponse({ error: 'RPI proxy request failed', details: (error as Error).message }, 502);
    }
  }

  // Manifest proxy - for refreshing manifest
  if (path === '/manifest') {
    const manifestUrl = url.searchParams.get('url');
    
    if (!manifestUrl) {
      return jsonResponse({ error: 'url parameter required' }, 400);
    }
    
    const decodedUrl = decodeURIComponent(manifestUrl);
    
    if (!isAllowedUrl(decodedUrl)) {
      return jsonResponse({ error: 'URL not allowed' }, 403);
    }
    
    logger.info('Proxying manifest', { url: decodedUrl.substring(0, 80) });
    
    try {
      const response = await fetch(decodedUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Origin': CASTHILL_ORIGIN,
          'Referer': CASTHILL_REFERER,
        },
        redirect: 'follow',
      });
      
      if (!response.ok) {
        return jsonResponse({ error: `Upstream error: ${response.status}` }, response.status);
      }
      
      const manifest = await response.text();
      const finalUrl = response.url || decodedUrl;
      const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
      const rewritten = rewriteManifestUrls(manifest, baseUrl, proxyBaseUrl);
      
      return new Response(rewritten, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache',
          ...corsHeaders(),
        },
      });
    } catch (error) {
      logger.error('Manifest proxy error', error as Error);
      return jsonResponse({ error: 'Proxy failed' }, 500);
    }
  }

  // Key proxy
  if (path === '/key') {
    const keyUrl = url.searchParams.get('url');
    
    if (!keyUrl) {
      return jsonResponse({ error: 'url parameter required' }, 400);
    }
    
    const decodedUrl = decodeURIComponent(keyUrl);
    
    if (!isAllowedUrl(decodedUrl)) {
      return jsonResponse({ error: 'URL not allowed' }, 403);
    }
    
    logger.info('Proxying key', { url: decodedUrl.substring(0, 80) });
    
    try {
      const response = await fetch(decodedUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Origin': CASTHILL_ORIGIN,
          'Referer': CASTHILL_REFERER,
        },
        redirect: 'follow',
      });
      
      if (!response.ok) {
        return jsonResponse({ error: `Upstream error: ${response.status}` }, response.status);
      }
      
      const buffer = await response.arrayBuffer();
      
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'max-age=300',
          ...corsHeaders(),
        },
      });
    } catch (error) {
      logger.error('Key proxy error', error as Error);
      return jsonResponse({ error: 'Proxy failed' }, 500);
    }
  }

  // Segment proxy
  if (path === '/segment') {
    const segmentUrl = url.searchParams.get('url');
    
    if (!segmentUrl) {
      return jsonResponse({ error: 'url parameter required' }, 400);
    }
    
    const decodedUrl = decodeURIComponent(segmentUrl);
    
    if (!isAllowedUrl(decodedUrl)) {
      return jsonResponse({ error: 'URL not allowed' }, 403);
    }
    
    logger.debug('Proxying segment', { url: decodedUrl.substring(0, 80) });
    
    try {
      const response = await fetch(decodedUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Origin': CASTHILL_ORIGIN,
          'Referer': CASTHILL_REFERER,
        },
        redirect: 'follow',
      });
      
      if (!response.ok) {
        return jsonResponse({ error: `Upstream error: ${response.status}` }, response.status);
      }
      
      const buffer = await response.arrayBuffer();
      
      return new Response(buffer, {
        headers: {
          'Content-Type': 'video/mp2t',
          'Cache-Control': 'max-age=60',
          ...corsHeaders(),
        },
      });
    } catch (error) {
      logger.error('Segment proxy error', error as Error);
      return jsonResponse({ error: 'Proxy failed' }, 500);
    }
  }

  return jsonResponse({ error: 'Not found', path }, 404);
}
