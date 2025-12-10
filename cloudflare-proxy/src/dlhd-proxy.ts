/**
 * DLHD Proxy with Raspberry Pi Residential IP
 * 
 * Proxies DLHD.dad live streams through your Raspberry Pi's residential IP
 * to bypass CDN blocks on encryption keys.
 * 
 * Architecture:
 *   Cloudflare Worker → RPI Proxy (residential IP) → DLHD CDN
 * 
 * Routes:
 *   GET /?channel=<id>           - Get proxied M3U8 playlist
 *   GET /key?url=<encoded_url>   - Proxy encryption key
 *   GET /segment?url=<encoded_url> - Proxy video segment
 *   GET /health                  - Health check
 * 
 * Configuration (via wrangler secrets):
 *   - RPI_PROXY_URL: Your Raspberry Pi proxy URL
 *   - RPI_PROXY_KEY: API key for authentication
 */

import { createLogger, type LogLevel } from './logger';

export interface Env {
  LOG_LEVEL?: string;
  // Raspberry Pi proxy
  RPI_PROXY_URL?: string;
  RPI_PROXY_KEY?: string;
}

// DLHD player domains for server lookup
const PLAYER_DOMAINS = ['dlhd.dad', 'daddyhd.com', 'epicplayplay.cfd'];

// CDN URL patterns
const CDN_PATTERNS = {
  standard: (serverKey: string, channelKey: string) =>
    `https://${serverKey}new.giokko.ru/${serverKey}/${channelKey}/mono.css`,
  top1cdn: (channelKey: string) =>
    `https://top1.giokko.ru/top1/cdn/${channelKey}/mono.css`,
};

// In-memory cache for server keys
const serverKeyCache = new Map<string, { serverKey: string; playerDomain: string; fetchedAt: number }>();
const SERVER_KEY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function handleDLHDRequest(request: Request, env: Env): Promise<Response> {
  const logLevel = (env.LOG_LEVEL || 'info') as LogLevel;
  const logger = createLogger(request, logLevel);
  
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/dlhd/, '') || '/';
  const origin = request.headers.get('origin');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(origin) });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }

  try {
    if (path === '/health') {
      return handleHealthCheck(env, origin);
    }

    if (path === '/key') {
      return handleKeyProxy(url, env, logger, origin);
    }

    if (path === '/segment') {
      return handleSegmentProxy(url, env, logger, origin);
    }

    const channel = url.searchParams.get('channel');
    if (!channel) {
      return jsonResponse({
        error: 'Missing channel parameter',
        usage: 'GET /dlhd?channel=325',
      }, 400, origin);
    }

    return handlePlaylistRequest(channel, url.origin, env, logger, origin);

  } catch (error) {
    logger.error('DLHD Proxy error', error as Error);
    return jsonResponse({
      error: 'DLHD proxy error',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, 500, origin);
  }
}


function handleHealthCheck(env: Env, origin: string | null): Response {
  const hasRpiProxy = !!(env.RPI_PROXY_URL && env.RPI_PROXY_KEY);
  
  return jsonResponse({
    status: hasRpiProxy ? 'healthy' : 'misconfigured',
    rpiProxy: {
      configured: hasRpiProxy,
      url: env.RPI_PROXY_URL ? env.RPI_PROXY_URL.substring(0, 40) + '...' : 'not set',
    },
    timestamp: new Date().toISOString(),
  }, 200, origin);
}

async function handlePlaylistRequest(
  channel: string, 
  proxyOrigin: string, 
  env: Env, 
  logger: any,
  origin: string | null
): Promise<Response> {
  const channelKey = `premium${channel}`;
  
  // Get server key (may fall back to known keys if lookup is blocked)
  const { serverKey: initialServerKey, playerDomain } = await getServerKey(channelKey, logger);
  logger.info('Server key found', { serverKey: initialServerKey, playerDomain });
  
  // Try the initial server key, then fall back to other known keys
  const serverKeysToTry = [initialServerKey, ...KNOWN_SERVER_KEYS.filter(k => k !== initialServerKey)];
  
  let lastError = '';
  for (const serverKey of serverKeysToTry) {
    try {
      // Fetch M3U8 via RPI proxy (giokko.ru blocks Cloudflare IPs)
      const m3u8Url = constructM3U8Url(serverKey, channelKey);
      logger.info('Trying M3U8 URL', { serverKey, url: m3u8Url });
      
      const response = await fetchViaRpiProxy(`${m3u8Url}?_t=${Date.now()}`, env, logger);
      const content = await response.text();
      
      if (content.includes('#EXTM3U') || content.includes('#EXT-X-')) {
        // Valid M3U8 found - cache this server key for future requests
        serverKeyCache.set(channelKey, {
          serverKey,
          playerDomain,
          fetchedAt: Date.now(),
        });
        
        // Rewrite M3U8 to proxy key and segments
        const { keyUrl, iv } = parseM3U8(content);
        const proxiedM3U8 = generateProxiedM3U8(content, keyUrl, proxyOrigin);

        return new Response(proxiedM3U8, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            ...corsHeaders(origin),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-DLHD-Channel': channel,
            'X-DLHD-Server-Key': serverKey,
            'X-DLHD-IV': iv || '',
          },
        });
      }
      
      lastError = `Invalid M3U8 from ${serverKey}: ${content.substring(0, 100)}`;
      logger.warn('Invalid M3U8 content, trying next server key', { serverKey, preview: content.substring(0, 100) });
    } catch (err) {
      lastError = `Error from ${serverKey}: ${(err as Error).message}`;
      logger.warn('M3U8 fetch failed, trying next server key', { serverKey, error: (err as Error).message });
    }
  }
  
  // All server keys failed
  logger.error('All server keys failed', { lastError });
  return jsonResponse({ 
    error: 'Failed to fetch M3U8 from any server', 
    details: lastError,
    triedKeys: serverKeysToTry 
  }, 502, origin);
}

async function handleKeyProxy(url: URL, env: Env, logger: any, origin: string | null): Promise<Response> {
  const keyUrl = url.searchParams.get('url');
  if (!keyUrl) {
    return jsonResponse({ error: 'Missing url parameter' }, 400, origin);
  }

  try {
    // Keys MUST go through RPI proxy (blocked from datacenter IPs)
    const response = await fetchViaRpiProxy(decodeURIComponent(keyUrl), env, logger);
    const keyData = await response.arrayBuffer();
    
    // Validate key size (AES-128 keys should be 16 bytes)
    if (keyData.byteLength !== 16) {
      logger.warn('Invalid key size', { size: keyData.byteLength, expected: 16 });
      return jsonResponse({ 
        error: 'Invalid key data', 
        size: keyData.byteLength,
        expected: 16,
        hint: 'RPI proxy may need session refresh'
      }, 502, origin);
    }
    
    logger.info('Key fetched', { size: keyData.byteLength });

    return new Response(keyData, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        ...corsHeaders(origin),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error('Key proxy failed', error as Error);
    return jsonResponse({
      error: 'Key fetch failed',
      message: error instanceof Error ? error.message : String(error),
      hint: 'Check if RPI proxy is running and accessible',
      timestamp: new Date().toISOString(),
    }, 502, origin);
  }
}

async function handleSegmentProxy(url: URL, env: Env, logger: any, origin: string | null): Promise<Response> {
  const segmentUrl = url.searchParams.get('url');
  if (!segmentUrl) {
    return jsonResponse({ error: 'Missing url parameter' }, 400, origin);
  }

  const decodedUrl = decodeURIComponent(segmentUrl);
  
  // Try direct fetch first for segments (CDNs like DigitalOcean/Google don't block)
  const response = await fetchSegment(decodedUrl, env, logger);
  const segmentData = await response.arrayBuffer();

  return new Response(segmentData, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp2t',
      ...corsHeaders(origin),
      'Cache-Control': 'public, max-age=300',
      'Content-Length': segmentData.byteLength.toString(),
    },
  });
}

// Known server keys - fallback when lookup fails (anti-bot protection)
const KNOWN_SERVER_KEYS = ['top1/cdn', 'top2', 'top3'];

async function getServerKey(channelKey: string, logger: any): Promise<{ serverKey: string; playerDomain: string }> {
  // Check cache
  const cached = serverKeyCache.get(channelKey);
  if (cached && (Date.now() - cached.fetchedAt) < SERVER_KEY_CACHE_TTL_MS) {
    return { serverKey: cached.serverKey, playerDomain: cached.playerDomain };
  }

  // Try server lookup from each domain
  for (const domain of PLAYER_DOMAINS) {
    try {
      const response = await fetch(`https://${domain}/server_lookup.js?channel_id=${channelKey}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `https://${domain}/`,
        },
      });

      if (response.ok) {
        const text = await response.text();
        
        // Check if we got HTML (anti-bot challenge) instead of JSON
        if (text.startsWith('<') || text.includes('<!DOCTYPE')) {
          logger.warn('Server lookup returned HTML challenge', { domain });
          continue;
        }
        
        try {
          const data = JSON.parse(text) as { server_key?: string };
          if (data.server_key) {
            serverKeyCache.set(channelKey, {
              serverKey: data.server_key,
              playerDomain: domain,
              fetchedAt: Date.now(),
            });
            return { serverKey: data.server_key, playerDomain: domain };
          }
        } catch (parseErr) {
          logger.warn('Server lookup JSON parse failed', { domain, error: (parseErr as Error).message });
        }
      }
    } catch (err) {
      logger.warn('Server lookup failed', { domain, error: (err as Error).message });
    }
  }

  // Fallback to known server keys (most channels use top1/cdn)
  logger.warn('Server lookup blocked, using fallback server key', { fallback: KNOWN_SERVER_KEYS[0] });
  return { serverKey: KNOWN_SERVER_KEYS[0], playerDomain: PLAYER_DOMAINS[0] };
}

function constructM3U8Url(serverKey: string, channelKey: string): string {
  if (serverKey === 'top1/cdn') return CDN_PATTERNS.top1cdn(channelKey);
  return CDN_PATTERNS.standard(serverKey, channelKey);
}


/**
 * Fetch via Raspberry Pi proxy (residential IP)
 * Required for M3U8 playlists and encryption keys
 */
async function fetchViaRpiProxy(url: string, env: Env, logger: any): Promise<Response> {
  if (!env.RPI_PROXY_URL || !env.RPI_PROXY_KEY) {
    throw new Error('RPI proxy not configured. Set RPI_PROXY_URL and RPI_PROXY_KEY secrets.');
  }

  let rpiBaseUrl = env.RPI_PROXY_URL;
  if (!rpiBaseUrl.startsWith('http://') && !rpiBaseUrl.startsWith('https://')) {
    rpiBaseUrl = `http://${rpiBaseUrl}`;
  }

  logger.debug('Fetching via RPI proxy', { url: url.substring(0, 80) });

  const proxyUrl = `${rpiBaseUrl}/proxy?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl, {
    headers: { 'X-API-Key': env.RPI_PROXY_KEY },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('RPI proxy failed', { status: response.status, error: errorText.substring(0, 200) });
    throw new Error(`RPI proxy error: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  logger.info('RPI proxy succeeded');
  return response;
}

/**
 * Fetch video segment - try direct first, fallback to RPI proxy
 * Segments on public CDNs (DigitalOcean, Google Cloud) usually work direct
 */
async function fetchSegment(url: string, env: Env, logger: any): Promise<Response> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Referer': 'https://epicplayplay.cfd/',
  };

  // Try direct fetch first (works for CDN-hosted segments)
  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      logger.debug('Segment fetched direct');
      return response;
    }
    logger.warn('Direct segment fetch failed', { status: response.status });
  } catch (err) {
    logger.warn('Direct segment fetch error', { error: (err as Error).message });
  }

  // Fallback to RPI proxy
  return fetchViaRpiProxy(url, env, logger);
}

function parseM3U8(content: string): { keyUrl: string | null; iv: string | null } {
  const keyMatch = content.match(/URI="([^"]+)"/);
  const ivMatch = content.match(/IV=0x([a-fA-F0-9]+)/);
  return { keyUrl: keyMatch?.[1] || null, iv: ivMatch?.[1] || null };
}

function generateProxiedM3U8(originalM3U8: string, keyUrl: string | null, proxyOrigin: string): string {
  let modified = originalM3U8;

  // Proxy the key URL (MUST go through RPI proxy)
  if (keyUrl) {
    const proxiedKeyUrl = `${proxyOrigin}/dlhd/key?url=${encodeURIComponent(keyUrl)}`;
    modified = modified.replace(/URI="[^"]+"/, `URI="${proxiedKeyUrl}"`);
  }

  // Remove ENDLIST for live streams
  modified = modified.replace(/\n?#EXT-X-ENDLIST\s*$/m, '');

  // Proxy segment URLs
  modified = modified.replace(
    /^(https?:\/\/(?:whalesignal\.ai\/[^\s]+|redirect\.giokko\.ru\/[^\s]+|[^\s]+\.ts|[^\s]+\.css))$/gm,
    (segmentUrl) => {
      // Don't proxy the M3U8 playlist URL itself
      if (segmentUrl.includes('mono.css')) return segmentUrl;
      return `${proxyOrigin}/dlhd/segment?url=${encodeURIComponent(segmentUrl)}`;
    }
  );

  return modified;
}

function corsHeaders(origin?: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
  };
}

function jsonResponse(data: object, status: number, origin?: string | null): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  fetch: handleDLHDRequest,
};
