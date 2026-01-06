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
 * This proxy:
 *   1. Extracts stream parameters from VIPRow/Casthill embed pages
 *   2. Refreshes tokens via boanki.net
 *   3. Fetches manifest with proper Origin/Referer headers
 *   4. Rewrites manifest URLs to go through this proxy
 *   5. Proxies keys and segments with required headers
 */

import { createLogger, type LogLevel } from './logger';

export interface Env {
  LOG_LEVEL?: string;
}

const VIPROW_BASE = 'https://www.viprow.nu';
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
 * Extract m3u8 from VIPRow/Casthill embed
 */
async function extractM3U8(streamPageUrl: string): Promise<{
  success: boolean;
  m3u8Url?: string;
  manifest?: string;
  streamId?: string;
  deviceId?: string;
  hostId?: string;
  keyUrl?: string;
  error?: string;
}> {
  try {
    // Step 1: Fetch VIPRow stream page
    const streamRes = await fetch(streamPageUrl, {
      headers: { 
        'User-Agent': USER_AGENT, 
        'Referer': VIPROW_BASE 
      }
    });
    
    if (!streamRes.ok) {
      return { success: false, error: `Failed to fetch stream page: ${streamRes.status}` };
    }
    
    const streamHtml = await streamRes.text();
    
    // Extract embed parameters
    const zmidMatch = streamHtml.match(/const\s+zmid\s*=\s*"([^"]+)"/);
    const pidMatch = streamHtml.match(/const\s+pid\s*=\s*(\d+)/);
    const edmMatch = streamHtml.match(/const\s+edm\s*=\s*"([^"]+)"/);
    const configMatch = streamHtml.match(/const siteConfig = (\{[^;]+\});/);
    
    if (!zmidMatch || !pidMatch || !edmMatch) {
      return { success: false, error: 'Failed to extract embed parameters' };
    }
    
    const zmid = zmidMatch[1];
    const pid = pidMatch[1];
    const edm = edmMatch[1];
    
    let csrf = '', csrf_ip = '', category = '';
    if (configMatch) {
      try {
        const config = JSON.parse(configMatch[1]);
        csrf = config.csrf || '';
        csrf_ip = config.csrf_ip || '';
        category = config.linkAppendUri || '';
      } catch {
        // Fallback regex
        csrf = streamHtml.match(/"csrf"\s*:\s*"([^"]+)"/)?.[1] || '';
        csrf_ip = streamHtml.match(/"csrf_ip"\s*:\s*"([^"]+)"/)?.[1] || '';
        category = streamHtml.match(/"linkAppendUri"\s*:\s*"([^"]+)"/)?.[1] || '';
      }
    }
    
    // Step 2: Fetch Casthill embed
    const embedParams = new URLSearchParams({
      pid, gacat: '', gatxt: category, v: zmid, csrf, csrf_ip,
    });
    const embedUrl = `https://${edm}/sd0embed/${category}?${embedParams}`;
    
    const embedRes = await fetch(embedUrl, {
      headers: { 
        'User-Agent': USER_AGENT, 
        'Referer': streamPageUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    if (!embedRes.ok) {
      return { success: false, error: `Failed to fetch embed: ${embedRes.status}` };
    }
    
    const embedHtml = await embedRes.text();
    
    // Find player script
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let embedScript: string | null = null;
    let match;
    while ((match = scriptPattern.exec(embedHtml)) !== null) {
      if (match[1].includes('isPlayerLoaded') && match[1].includes('scode')) {
        embedScript = match[1];
        break;
      }
    }
    
    if (!embedScript) {
      return { success: false, error: 'Player script not found' };
    }
    
    // Extract variables
    const deviceId = embedScript.match(/r="([a-z0-9]+)"/)?.[1];
    const streamId = embedScript.match(/s="([a-z0-9]+)"/)?.[1];
    const hostId = embedScript.match(/m="([a-z0-9-]+)"/)?.[1];
    const timestamp = embedScript.match(/a=parseInt\("(\d+)"/)?.[1];
    
    // Extract initial scode (char code array)
    const iMatch = embedScript.match(/i=e\(\[([0-9,]+)\]\)/);
    let initialScode = '';
    if (iMatch) {
      const charCodes = JSON.parse('[' + iMatch[1] + ']');
      initialScode = String.fromCharCode(...charCodes);
    }
    
    // Extract base URL (base64)
    const cMatch = embedScript.match(/c=t\("([^"]+)"\)/);
    let baseUrl = '';
    if (cMatch) {
      baseUrl = atob(cMatch[1]);
    }
    
    // Extract X-CSRF-Auth (double base64)
    const lMatch = embedScript.match(/l=t\("([^"]+)"\)/);
    let csrfAuth = '';
    if (lMatch) {
      const decoded1 = atob(lMatch[1]);
      csrfAuth = atob(decoded1);
    }
    
    // Extract manifest URL (double base64 via char codes)
    const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
    let manifestUrl = '';
    if (dMatch) {
      const charCodes = JSON.parse('[' + dMatch[1] + ']');
      const dString = String.fromCharCode(...charCodes);
      const dDecoded = atob(dString);
      manifestUrl = atob(dDecoded);
    }
    
    if (!deviceId || !streamId || !baseUrl || !manifestUrl) {
      return { success: false, error: 'Failed to extract stream variables' };
    }
    
    // Step 3: Refresh token via boanki.net
    const tokenUrl = `${baseUrl}?scode=${encodeURIComponent(initialScode)}&stream=${encodeURIComponent(streamId)}&expires=${encodeURIComponent(timestamp || '')}&u_id=${encodeURIComponent(deviceId)}&host_id=${encodeURIComponent(hostId || '')}`;
    
    const tokenRes = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'X-CSRF-Auth': csrfAuth,
        'Origin': CASTHILL_ORIGIN,
        'Referer': CASTHILL_REFERER,
      },
    });
    
    if (!tokenRes.ok) {
      return { success: false, error: `Token refresh failed: ${tokenRes.status}` };
    }
    
    const tokenData = await tokenRes.json() as { success: boolean; device_id?: string };
    
    if (!tokenData.success) {
      return { success: false, error: 'Token refresh unsuccessful' };
    }
    
    // Step 4: Fetch manifest
    const url = new URL(manifestUrl);
    url.searchParams.set('u_id', tokenData.device_id || deviceId);
    
    const manifestRes = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': CASTHILL_ORIGIN,
        'Referer': CASTHILL_REFERER,
      },
    });
    
    if (!manifestRes.ok) {
      return { success: false, error: `Manifest fetch failed: ${manifestRes.status}` };
    }
    
    const manifest = await manifestRes.text();
    
    // Extract key URL
    const keyMatch = manifest.match(/URI="([^"]+)"/);
    const keyUrl = keyMatch?.[1];
    
    return {
      success: true,
      m3u8Url: url.toString(),
      manifest,
      streamId,
      deviceId: tokenData.device_id || deviceId,
      hostId: hostId || undefined,
      keyUrl,
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Rewrite manifest URLs to go through proxy
 */
function rewriteManifestUrls(manifest: string, baseUrl: string, proxyBase: string): string {
  const lines = manifest.split('\n');
  const rewritten: string[] = [];
  
  for (const line of lines) {
    let newLine = line;
    const trimmed = line.trim();
    
    // Skip empty lines
    if (trimmed === '') {
      rewritten.push(line);
      continue;
    }
    
    // Rewrite key URLs
    if (trimmed.includes('URI="')) {
      newLine = trimmed.replace(/URI="([^"]+)"/, (_, url) => {
        const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).toString();
        return `URI="${proxyBase}/key?url=${encodeURIComponent(fullUrl)}"`;
      });
    }
    // Skip other comments
    else if (trimmed.startsWith('#')) {
      rewritten.push(line);
      continue;
    }
    // Rewrite segment URLs
    else if (trimmed.includes('.ts') || trimmed.includes('?')) {
      const fullUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).toString();
      newLine = `${proxyBase}/segment?url=${encodeURIComponent(fullUrl)}`;
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
  // This ensures hls.js can load keys/segments from the correct origin
  const proxyBaseUrl = `${url.protocol}//${url.host}/viprow`;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Health check
  if (path === '/health' || path === '') {
    return jsonResponse({
      status: 'ok',
      service: 'viprow-proxy',
      timestamp: new Date().toISOString(),
    });
  }

  // Stream extraction - extracts m3u8 from VIPRow event URL
  if (path === '/stream') {
    const eventUrl = url.searchParams.get('url');
    const linkNum = url.searchParams.get('link') || '1';
    
    if (!eventUrl) {
      return jsonResponse({ error: 'url parameter required (e.g., /nba/event-online-stream)' }, 400);
    }
    
    // Construct full stream page URL
    const streamPageUrl = eventUrl.startsWith('http') 
      ? eventUrl 
      : `${VIPROW_BASE}${eventUrl}-${linkNum}`;
    
    logger.info('Extracting VIPRow stream', { url: streamPageUrl });
    
    const result = await extractM3U8(streamPageUrl);
    
    if (!result.success) {
      logger.error('Extraction failed', { error: result.error });
      return jsonResponse({ error: result.error }, 500);
    }
    
    // Rewrite manifest URLs to go through proxy with FULL URL
    const baseUrl = result.m3u8Url!.substring(0, result.m3u8Url!.lastIndexOf('/') + 1);
    const rewrittenManifest = rewriteManifestUrls(result.manifest!, baseUrl, proxyBaseUrl);
    
    logger.info('Stream extracted successfully', { streamId: result.streamId });
    
    return new Response(rewrittenManifest, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
        ...corsHeaders(),
      },
    });
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
      });
      
      if (!response.ok) {
        return jsonResponse({ error: `Upstream error: ${response.status}` }, response.status);
      }
      
      const manifest = await response.text();
      const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);
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
