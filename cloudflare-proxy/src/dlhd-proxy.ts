/**
 * DLHD Proxy - January 2026 Update
 *
 * Proxies daddyhd.com live streams through Cloudflare Workers.
 * Domain changed from kiko2.ru to dvalna.ru.
 * Key requests now require Proof-of-Work nonce computation.
 *
 * Authentication Flow (January 2026):
 *   1. Fetch player page → Extract JWT token (eyJ...)
 *   2. Server lookup → Get server key (zeko, wind, etc.)
 *   3. Fetch M3U8 → Get playlist with key URLs
 *   4. Fetch key with PoW → Compute nonce, send with JWT
 *
 * Routes:
 *   GET /?channel=<id>           - Get proxied M3U8 playlist
 *   GET /key?url=<url>&jwt=<jwt> - Proxy encryption key (with PoW)
 *   GET /segment?url=<url>       - Proxy video segment
 *   GET /auth?channel=<id>       - Get fresh JWT token
 *   GET /health                  - Health check
 */

import { createLogger, type LogLevel } from './logger';

export interface Env {
  LOG_LEVEL?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const PARENT_DOMAIN = 'daddyhd.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/** New domain (January 2026) - was kiko2.ru */
const CDN_DOMAIN = 'dvalna.ru';

/** HMAC secret for PoW computation (extracted from obfuscated player JS) */
const HMAC_SECRET = '7f9e2a8b3c5d1e4f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7';

/** PoW threshold - hash prefix must be less than this */
const POW_THRESHOLD = 0x1000;

/** Maximum PoW iterations */
const POW_MAX_ITERATIONS = 100000;

/** Session cache TTL (4 hours - JWT valid for 5) */
const SESSION_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

// Session cache
interface SessionData {
  jwt: string;
  channelKey: string;
  country: string;
  iat: number;
  exp: number;
  fetchedAt: number;
}
const sessionCache = new Map<string, SessionData>();

// =============================================================================
// CRYPTO HELPERS
// =============================================================================

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compute HMAC-SHA256
 */
async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return bufferToHex(signature);
}

/**
 * Compute MD5 hash (pure JS implementation for CF Workers)
 */
function md5(input: string): string {
  const md5cycle = (x: number[], k: number[]) => {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    
    const ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => {
      const n = a + ((b & c) | (~b & d)) + x + t;
      return ((n << s) | (n >>> (32 - s))) + b;
    };
    const gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => {
      const n = a + ((b & d) | (c & ~d)) + x + t;
      return ((n << s) | (n >>> (32 - s))) + b;
    };
    const hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => {
      const n = a + (b ^ c ^ d) + x + t;
      return ((n << s) | (n >>> (32 - s))) + b;
    };
    const ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => {
      const n = a + (c ^ (b | ~d)) + x + t;
      return ((n << s) | (n >>> (32 - s))) + b;
    };
    
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    
    x[0] = (a + x[0]) >>> 0;
    x[1] = (b + x[1]) >>> 0;
    x[2] = (c + x[2]) >>> 0;
    x[3] = (d + x[3]) >>> 0;
  };
  
  const md5blk = (s: string) => {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  };
  
  let n = input.length;
  const state = [1732584193, -271733879, -1732584194, 271733878];
  let i: number;
  
  for (i = 64; i <= n; i += 64) {
    md5cycle(state, md5blk(input.substring(i - 64, i)));
  }
  
  input = input.substring(i - 64);
  const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (i = 0; i < input.length; i++) {
    tail[i >> 2] |= input.charCodeAt(i) << ((i % 4) << 3);
  }
  tail[i >> 2] |= 0x80 << ((i % 4) << 3);
  if (i > 55) {
    md5cycle(state, tail);
    for (i = 0; i < 16; i++) tail[i] = 0;
  }
  tail[14] = n * 8;
  md5cycle(state, tail);
  
  const hex = (x: number) => {
    const hc = '0123456789abcdef';
    let s = '';
    for (let j = 0; j < 4; j++) {
      s += hc.charAt((x >> (j * 8 + 4)) & 0xF) + hc.charAt((x >> (j * 8)) & 0xF);
    }
    return s;
  };
  
  return state.map(hex).join('');
}

/**
 * Compute Proof-of-Work nonce for key request
 */
async function computePoWNonce(resource: string, keyNumber: string, timestamp: number): Promise<number> {
  const hmac = await hmacSha256(HMAC_SECRET, resource);
  
  for (let i = 0; i < POW_MAX_ITERATIONS; i++) {
    const data = `${hmac}${resource}${keyNumber}${timestamp}${i}`;
    const hash = md5(data);
    const prefix = parseInt(hash.substring(0, 4), 16);
    
    if (prefix < POW_THRESHOLD) {
      return i;
    }
  }
  
  return POW_MAX_ITERATIONS - 1;
}

// =============================================================================
// AUTH HELPERS
// =============================================================================

/**
 * Fetch JWT token from player page
 */
async function fetchAuthData(channel: string, logger: any): Promise<SessionData | null> {
  // Check cache first
  const cached = sessionCache.get(channel);
  if (cached && Date.now() - cached.fetchedAt < SESSION_CACHE_TTL_MS) {
    logger.debug('Session cache hit', { channel });
    return cached;
  }

  logger.info('Fetching fresh JWT', { channel });

  try {
    const url = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channel}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': `https://${PARENT_DOMAIN}/`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const html = await response.text();
    
    // Find JWT token
    const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (!jwtMatch) {
      logger.warn('No JWT found in page', { channel });
      return null;
    }

    const jwt = jwtMatch[0];
    
    // Decode payload
    let channelKey = `premium${channel}`;
    let country = 'US';
    let iat = Math.floor(Date.now() / 1000);
    let exp = iat + 18000;
    
    try {
      const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(payloadB64));
      channelKey = payload.sub || channelKey;
      country = payload.country || country;
      iat = payload.iat || iat;
      exp = payload.exp || exp;
    } catch {}

    const session: SessionData = {
      jwt,
      channelKey,
      country,
      iat,
      exp,
      fetchedAt: Date.now(),
    };

    sessionCache.set(channel, session);
    logger.info('JWT fetched and cached', { channel, channelKey, exp });
    
    return session;
  } catch (error) {
    logger.error('Auth fetch failed', { channel, error: (error as Error).message });
    return null;
  }
}

/**
 * Fetch server key from lookup endpoint
 */
async function fetchServerKey(channelKey: string, logger: any): Promise<string | null> {
  try {
    const url = `https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${channelKey}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });

    if (!response.ok) {
      logger.warn('Server lookup failed', { status: response.status });
      return null;
    }

    const data = await response.json() as { server_key?: string };
    logger.info('Server lookup success', { channelKey, serverKey: data.server_key });
    return data.server_key || null;
  } catch (error) {
    logger.error('Server lookup error', { error: (error as Error).message });
    return null;
  }
}

/**
 * Construct M3U8 URL for a channel
 */
function constructM3U8Url(serverKey: string, channelKey: string): string {
  if (serverKey === 'top1/cdn') {
    return `https://top1.${CDN_DOMAIN}/top1/cdn/${channelKey}/mono.css`;
  }
  return `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
}

/**
 * Rewrite M3U8 to proxy keys and segments through our worker
 */
function rewriteM3U8(content: string, proxyOrigin: string, m3u8BaseUrl: string, jwt: string): string {
  let modified = content;

  // Rewrite key URLs to proxy through us with JWT
  modified = modified.replace(/URI="([^"]+)"/g, (_, originalKeyUrl) => {
    let absoluteKeyUrl = originalKeyUrl;

    if (!absoluteKeyUrl.startsWith('http')) {
      try {
        const base = new URL(m3u8BaseUrl);
        absoluteKeyUrl = new URL(
          absoluteKeyUrl,
          base.origin + base.pathname.replace(/\/[^/]*$/, '/')
        ).toString();
      } catch {
        const baseWithoutFile = m3u8BaseUrl.replace(/\/[^/]*$/, '/');
        absoluteKeyUrl = baseWithoutFile + absoluteKeyUrl;
      }
    }

    const params = new URLSearchParams({ url: absoluteKeyUrl, jwt });
    return `URI="${proxyOrigin}/dlhd/key?${params.toString()}"`;
  });

  // Remove ENDLIST for live streams
  modified = modified.replace(/\n?#EXT-X-ENDLIST\s*$/m, '');

  // Proxy segment URLs
  const lines = modified.split('\n');
  const processedLines = lines.map((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) return line;
    if (trimmed.includes('/dlhd/segment?')) return line;

    const isAbsoluteUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const isDlhdSegment = trimmed.includes(`.${CDN_DOMAIN}/`);

    if (isAbsoluteUrl && isDlhdSegment && !trimmed.includes('mono.css')) {
      return `${proxyOrigin}/dlhd/segment?url=${encodeURIComponent(trimmed)}`;
    }

    return line;
  });

  return processedLines.join('\n');
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

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

// =============================================================================
// REQUEST HANDLERS
// =============================================================================

/**
 * Handle health check
 */
function handleHealthCheck(origin: string | null): Response {
  return jsonResponse({
    status: 'healthy',
    provider: 'dlhd',
    version: '2.0.0',
    domain: CDN_DOMAIN,
    security: 'pow-auth',
    description: 'DLHD proxy with PoW authentication (January 2026)',
    timestamp: new Date().toISOString(),
  }, 200, origin);
}

/**
 * Handle auth request - returns fresh JWT for a channel
 */
async function handleAuthRequest(channel: string, logger: any, origin: string | null): Promise<Response> {
  const session = await fetchAuthData(channel, logger);
  
  if (!session) {
    return jsonResponse({ error: 'Failed to fetch auth data' }, 502, origin);
  }

  return jsonResponse({
    jwt: session.jwt,
    channelKey: session.channelKey,
    country: session.country,
    iat: session.iat,
    exp: session.exp,
    expiresIn: session.exp - Math.floor(Date.now() / 1000),
  }, 200, origin);
}

/**
 * Handle playlist request
 */
async function handlePlaylistRequest(
  channel: string,
  proxyOrigin: string,
  logger: any,
  origin: string | null
): Promise<Response> {
  // Step 1: Get auth data
  const session = await fetchAuthData(channel, logger);
  if (!session) {
    return jsonResponse({ error: 'Failed to fetch auth data' }, 502, origin);
  }

  // Step 2: Get server key
  const serverKey = await fetchServerKey(session.channelKey, logger);
  if (!serverKey) {
    return jsonResponse({ error: 'Failed to fetch server key' }, 502, origin);
  }

  // Step 3: Fetch M3U8
  const m3u8Url = constructM3U8Url(serverKey, session.channelKey);
  logger.info('Fetching M3U8', { m3u8Url });
  
  try {
    const response = await fetch(`${m3u8Url}?_t=${Date.now()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });

    const content = await response.text();

    if (!content.includes('#EXTM3U') && !content.includes('#EXT-X-')) {
      return jsonResponse({ error: 'Invalid M3U8 response' }, 502, origin);
    }

    // Rewrite M3U8 to proxy keys and segments
    const proxiedM3U8 = rewriteM3U8(content, proxyOrigin, m3u8Url, session.jwt);

    return new Response(proxiedM3U8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-DLHD-Channel': channel,
        'X-DLHD-Server': serverKey,
        ...corsHeaders(origin),
      },
    });
  } catch (error) {
    logger.error('M3U8 fetch failed', { error: (error as Error).message });
    return jsonResponse({ error: 'M3U8 fetch failed', details: (error as Error).message }, 502, origin);
  }
}

/**
 * Handle key proxy request with PoW authentication
 */
async function handleKeyProxy(url: URL, logger: any, origin: string | null): Promise<Response> {
  const keyUrlParam = url.searchParams.get('url');
  const jwt = url.searchParams.get('jwt');
  
  if (!keyUrlParam) {
    return jsonResponse({ error: 'Missing url parameter' }, 400, origin);
  }
  if (!jwt) {
    return jsonResponse({ error: 'Missing jwt parameter' }, 400, origin);
  }

  let keyUrl: string;
  try {
    keyUrl = decodeURIComponent(keyUrlParam);
  } catch {
    keyUrl = keyUrlParam;
  }

  // Extract resource and key number from URL
  const keyMatch = keyUrl.match(/\/key\/([^/]+)\/(\d+)/);
  if (!keyMatch) {
    return jsonResponse({ error: 'Invalid key URL format' }, 400, origin);
  }

  const resource = keyMatch[1];
  const keyNumber = keyMatch[2];
  const timestamp = Math.floor(Date.now() / 1000);

  // Compute PoW nonce
  const nonce = await computePoWNonce(resource, keyNumber, timestamp);
  logger.info('Key fetch with PoW', { resource, keyNumber, timestamp, nonce });

  try {
    const response = await fetch(keyUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
        'Authorization': `Bearer ${jwt}`,
        'X-Key-Timestamp': timestamp.toString(),
        'X-Key-Nonce': nonce.toString(),
      },
    });

    const data = await response.arrayBuffer();
    const text = new TextDecoder().decode(data);

    // Valid key is exactly 16 bytes (AES-128)
    if (data.byteLength === 16 && !text.startsWith('{') && !text.startsWith('[')) {
      logger.info('Key fetched successfully');
      
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': '16',
          'Cache-Control': 'private, max-age=30',
          ...corsHeaders(origin),
        },
      });
    }

    logger.warn('Invalid key response', { length: data.byteLength, preview: text.substring(0, 50) });
    return jsonResponse({
      error: 'Invalid key response',
      length: data.byteLength,
      preview: text.substring(0, 100),
    }, 502, origin);
  } catch (error) {
    logger.error('Key fetch failed', { error: (error as Error).message });
    return jsonResponse({ error: 'Key fetch failed', details: (error as Error).message }, 502, origin);
  }
}

/**
 * Handle segment proxy request
 */
async function handleSegmentProxy(url: URL, logger: any, origin: string | null): Promise<Response> {
  const segmentUrl = url.searchParams.get('url');
  
  if (!segmentUrl) {
    return jsonResponse({ error: 'Missing url parameter' }, 400, origin);
  }

  const decodedUrl = decodeURIComponent(segmentUrl);

  try {
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });

    const data = await response.arrayBuffer();

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp2t',
        'Cache-Control': 'public, max-age=300',
        'Content-Length': data.byteLength.toString(),
        ...corsHeaders(origin),
      },
    });
  } catch (error) {
    logger.error('Segment fetch failed', { error: (error as Error).message });
    return jsonResponse({ error: 'Segment fetch failed' }, 502, origin);
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

/**
 * Handle DLHD provider requests
 */
export async function handleDLHDRequest(request: Request, env: Env): Promise<Response> {
  const logLevel = (env.LOG_LEVEL || 'info') as LogLevel;
  const logger = createLogger(request, logLevel);

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/dlhd/, '') || '/';
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(origin) });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }

  try {
    if (path === '/health') {
      return handleHealthCheck(origin);
    }

    if (path === '/auth') {
      const channel = url.searchParams.get('channel');
      if (!channel) {
        return jsonResponse({ error: 'Missing channel parameter' }, 400, origin);
      }
      return handleAuthRequest(channel, logger, origin);
    }

    if (path === '/key') {
      return handleKeyProxy(url, logger, origin);
    }

    if (path === '/segment') {
      return handleSegmentProxy(url, logger, origin);
    }

    // Main playlist request
    const channel = url.searchParams.get('channel');
    if (!channel) {
      return jsonResponse({
        error: 'Missing channel parameter',
        usage: 'GET /dlhd?channel=51',
      }, 400, origin);
    }

    return handlePlaylistRequest(channel, url.origin, logger, origin);
  } catch (error) {
    logger.error('DLHD Proxy error', error as Error);
    return jsonResponse({
      error: 'Proxy error',
      message: error instanceof Error ? error.message : String(error),
    }, 500, origin);
  }
}
