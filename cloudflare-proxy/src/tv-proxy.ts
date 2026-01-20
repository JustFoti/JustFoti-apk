/**
 * TV Proxy Cloudflare Worker
 *
 * DLHD ONLY - NO IPTV/STALKER PROVIDERS!
 * 
 * Proxies DLHD live streams with automatic server lookup.
 * Uses proper channel routing to differentiate from other providers.
 *
 * Routes:
 *   GET /?channel=<id>           - Get proxied M3U8 playlist (DLHD channels only)
 *   GET /key?url=<encoded_url>   - Proxy encryption key (with PoW auth)
 *   GET /segment?url=<encoded_url> - Proxy video segment
 *   GET /health                  - Health check
 * 
 * KEY FETCHING (January 2026 Update):
 * - Domain changed from kiko2.ru to dvalna.ru
 * - Key requests now require Proof-of-Work (PoW) authentication
 * - PoW: HMAC-SHA256 + MD5 nonce computation with threshold check
 * - New dvalna.ru domain does NOT block Cloudflare IPs (no RPI needed)
 */

import { createLogger, type LogLevel } from './logger';

export interface Env {
  LOG_LEVEL?: string;
  RPI_PROXY_URL?: string;
  RPI_PROXY_KEY?: string;
}

const ALLOWED_ORIGINS = [
  'https://tv.vynx.cc',
  'https://flyx.tv',
  'https://www.flyx.tv',
  'http://localhost:3000',
  'http://localhost:3001',
  '*',
];

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const ALL_SERVER_KEYS = ['zeko', 'wind', 'nfs', 'ddy6', 'chevy', 'top1/cdn'];
const CDN_DOMAIN = 'dvalna.ru';

const HMAC_SECRET = '7f9e2a8b3c5d1e4f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7';
const POW_THRESHOLD = 0x1000;
const MAX_NONCE_ITERATIONS = 100000;

// ============================================================================
// MD5 Implementation for Cloudflare Workers (crypto.subtle doesn't support MD5)
// ============================================================================
function md5(string: string): string {
  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift));
  }

  function addUnsigned(x: number, y: number): number {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function F(x: number, y: number, z: number): number { return (x & y) | ((~x) & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & (~z)); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | (~z)); }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str: string): number[] {
    const lWordCount: number[] = [];
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    
    for (let i = 0; i < lNumberOfWords; i++) lWordCount[i] = 0;
    
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      const lWordIndex = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordCount[lWordIndex] = lWordCount[lWordIndex] | (str.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    const lWordIndex = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordCount[lWordIndex] = lWordCount[lWordIndex] | (0x80 << lBytePosition);
    lWordCount[lNumberOfWords - 2] = lMessageLength << 3;
    lWordCount[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordCount;
  }

  function wordToHex(value: number): string {
    let hex = '';
    for (let i = 0; i <= 3; i++) {
      const byte = (value >>> (i * 8)) & 255;
      hex += ('0' + byte.toString(16)).slice(-2);
    }
    return hex;
  }

  const x = convertToWordArray(string);
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
}

// ============================================================================
// HMAC-SHA256 using Web Crypto API
// ============================================================================
async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// PoW Computation
// ============================================================================
async function computePoWNonce(resource: string, keyNumber: string, timestamp: number): Promise<number | null> {
  const hmac = await hmacSha256(resource, HMAC_SECRET);
  for (let nonce = 0; nonce < MAX_NONCE_ITERATIONS; nonce++) {
    const data = `${hmac}${resource}${keyNumber}${timestamp}${nonce}`;
    const hash = md5(data);
    if (parseInt(hash.substring(0, 4), 16) < POW_THRESHOLD) return nonce;
  }
  return null;
}

// ============================================================================
// Caches
// ============================================================================
const serverKeyCache = new Map<string, { serverKey: string; fetchedAt: number }>();
const SERVER_KEY_CACHE_TTL_MS = 10 * 60 * 1000;

// JWT cache - stores JWT tokens fetched from player page
interface JWTCacheEntry {
  jwt: string;
  channelKey: string;
  exp: number;
  fetchedAt: number;
}
const jwtCache = new Map<string, JWTCacheEntry>();
const JWT_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (JWT valid for 5)

/**
 * Fetch JWT from player page - this is the REAL auth token needed for key requests
 * Uses RPI proxy if configured since player page blocks Cloudflare IPs
 */
async function fetchPlayerJWT(channel: string, logger: any, env?: Env): Promise<string | null> {
  const cacheKey = channel;
  const cached = jwtCache.get(cacheKey);
  
  // Check cache - use if not expired
  if (cached && Date.now() - cached.fetchedAt < JWT_CACHE_TTL_MS) {
    const now = Math.floor(Date.now() / 1000);
    if (cached.exp > now + 300) { // At least 5 min remaining
      logger.info('JWT cache hit', { channel, expiresIn: cached.exp - now });
      return cached.jwt;
    }
  }
  
  logger.info('Fetching fresh JWT from player page', { channel });
  
  try {
    const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channel}`;
    let html: string;
    
    // Try RPI proxy first if configured (player page blocks CF IPs)
    if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
      logger.info('Fetching JWT via RPI proxy', { channel });
      const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(playerUrl)}&key=${env.RPI_PROXY_KEY}`;
      const res = await fetch(rpiUrl);
      
      if (!res.ok) {
        logger.warn('RPI proxy JWT fetch failed', { status: res.status });
        // Fall through to direct fetch
      } else {
        html = await res.text();
        logger.info('JWT fetched via RPI', { htmlLength: html.length });
      }
    }
    
    // Direct fetch fallback (may fail if CF IPs blocked)
    if (!html!) {
      const res = await fetch(playerUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': 'https://daddyhd.com/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      
      if (!res.ok) {
        logger.warn('Player page fetch failed', { status: res.status });
        return null;
      }
      
      html = await res.text();
    }
    
    // Extract JWT token (eyJ...)
    const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (!jwtMatch) {
      logger.warn('No JWT found in player page', { channel, htmlLength: html.length, preview: html.substring(0, 200) });
      return null;
    }
    
    const jwt = jwtMatch[0];
    
    // Decode payload to get expiry
    let channelKey = `premium${channel}`;
    let exp = Math.floor(Date.now() / 1000) + 18000; // Default 5 hours
    
    try {
      const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(payloadB64));
      channelKey = payload.sub || channelKey;
      exp = payload.exp || exp;
      logger.info('JWT decoded', { channelKey, exp, expiresIn: exp - Math.floor(Date.now() / 1000) });
    } catch (e) {
      logger.warn('JWT decode failed, using defaults');
    }
    
    // Cache it
    jwtCache.set(cacheKey, { jwt, channelKey, exp, fetchedAt: Date.now() });
    
    return jwt;
  } catch (err) {
    logger.error('JWT fetch error', { error: (err as Error).message });
    return null;
  }
}

async function getServerKey(channelKey: string, logger: any): Promise<string> {
  const cached = serverKeyCache.get(channelKey);
  if (cached && Date.now() - cached.fetchedAt < SERVER_KEY_CACHE_TTL_MS) return cached.serverKey;
  try {
    const res = await fetch(`https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${channelKey}`, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': `https://${PLAYER_DOMAIN}/` },
    });
    if (res.ok) {
      const text = await res.text();
      if (!text.startsWith('<')) {
        const data = JSON.parse(text);
        if (data.server_key) {
          serverKeyCache.set(channelKey, { serverKey: data.server_key, fetchedAt: Date.now() });
          return data.server_key;
        }
      }
    }
  } catch {}
  return 'zeko';
}

function constructM3U8Url(serverKey: string, channelKey: string): string {
  if (serverKey === 'top1/cdn') return `https://top1.${CDN_DOMAIN}/top1/cdn/${channelKey}/mono.css`;
  return `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
}


// ============================================================================
// MAIN HANDLER
// ============================================================================
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const logLevel = (env.LOG_LEVEL || 'debug') as LogLevel;
    const logger = createLogger(request, logLevel);
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    const url = new URL(request.url);
    const path = url.pathname;
    
    logger.info('TV Proxy request', { 
      path, 
      search: url.search,
      channel: url.searchParams.get('channel'),
      fullUrl: request.url 
    });

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders(origin) });
    }
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin);
    }

    if (!isAllowedOrigin(origin, referer)) {
      return jsonResponse({ error: 'Access denied' }, 403, origin);
    }

    try {
      if (path === '/health' || path === '/' && !url.searchParams.has('channel')) {
        return jsonResponse({ status: 'healthy', domain: CDN_DOMAIN, method: 'pow-auth' }, 200, origin);
      }
      if (path === '/key') return handleKeyProxy(url, logger, origin, env);
      if (path === '/segment') return handleSegmentProxy(url, logger, origin, env);

      const channel = url.searchParams.get('channel');
      logger.info('Channel param', { channel, hasChannel: !!channel });
      
      if (!channel || !/^\d+$/.test(channel)) {
        return jsonResponse({ 
          error: 'Missing or invalid channel parameter',
          path,
          search: url.search,
          receivedChannel: channel 
        }, 400, origin);
      }
      return handlePlaylistRequest(channel, url.origin, logger, origin, env);
    } catch (error) {
      logger.error('TV Proxy error', error as Error);
      return jsonResponse({ error: 'Proxy error', details: (error as Error).message }, 500, origin);
    }
  },
};

async function handlePlaylistRequest(channel: string, proxyOrigin: string, logger: any, origin: string | null, env?: Env): Promise<Response> {
  const channelKey = `premium${channel}`;
  
  // First try to get server key (this endpoint doesn't block CF IPs)
  let serverKey: string;
  try {
    serverKey = await getServerKey(channelKey, logger);
    logger.info('Got server key', { serverKey, channelKey });
  } catch (err) {
    logger.error('Server key fetch failed', { error: (err as Error).message });
    serverKey = 'zeko';
  }
  
  const serverKeysToTry = [serverKey, ...ALL_SERVER_KEYS.filter(k => k !== serverKey)];
  const errors: string[] = [];

  for (const sk of serverKeysToTry) {
    const m3u8Url = constructM3U8Url(sk, channelKey);
    logger.info('Trying M3U8', { serverKey: sk, url: m3u8Url });
    
    try {
      let content: string;
      let fetchedVia = 'direct';
      
      // Try direct fetch first (dvalna.ru may not block CF IPs anymore)
      try {
        const directRes = await fetch(`${m3u8Url}?_t=${Date.now()}`, {
          headers: { 'User-Agent': USER_AGENT, 'Referer': `https://${PLAYER_DOMAIN}/` },
        });
        
        if (!directRes.ok) {
          throw new Error(`HTTP ${directRes.status}`);
        }
        content = await directRes.text();
        
        if (!content.includes('#EXTM3U') && !content.includes('#EXT-X-')) {
          throw new Error(`Not M3U8: ${content.substring(0, 50)}`);
        }
        
        logger.info('Direct M3U8 fetch succeeded', { serverKey: sk });
      } catch (directError) {
        logger.warn('Direct M3U8 failed, trying RPI', { serverKey: sk, error: (directError as Error).message });
        
        // Fall back to RPI proxy if configured
        if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
          const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(m3u8Url)}&key=${env.RPI_PROXY_KEY}`;
          const rpiRes = await fetch(rpiUrl);
          
          if (!rpiRes.ok) {
            errors.push(`${sk}: direct=${(directError as Error).message}, RPI HTTP ${rpiRes.status}`);
            continue;
          }
          content = await rpiRes.text();
          fetchedVia = 'rpi-proxy';
        } else {
          errors.push(`${sk}: ${(directError as Error).message}`);
          continue;
        }
      }
      
      logger.info('M3U8 content', { length: content.length, isM3U8: content.includes('#EXTM3U') });

      if (content.includes('#EXTM3U') || content.includes('#EXT-X-')) {
        serverKeyCache.set(channelKey, { serverKey: sk, fetchedAt: Date.now() });
        logger.info('Found working server', { serverKey: sk, fetchedVia });
        const proxied = rewriteM3U8(content, proxyOrigin, m3u8Url);
        return new Response(proxied, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            ...corsHeaders(origin),
            'Cache-Control': 'no-store',
            'X-DLHD-Channel': channel,
            'X-DLHD-Server': sk,
            'X-Fetched-Via': fetchedVia,
          },
        });
      } else {
        errors.push(`${sk}: Not M3U8 (${content.substring(0, 50)})`);
      }
    } catch (err) {
      const errMsg = (err as Error).message;
      errors.push(`${sk}: ${errMsg}`);
      logger.warn('M3U8 fetch failed', { serverKey: sk, error: errMsg });
    }
  }
  
  const useRpi = env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY;
  return jsonResponse({ 
    error: 'Failed to fetch M3U8', 
    tried: serverKeysToTry.length,
    errors,
    channelKey,
    domain: CDN_DOMAIN,
    rpiConfigured: !!useRpi,
    hint: 'Both direct and RPI proxy failed - check if dvalna.ru is up'
  }, 502, origin);
}

async function handleKeyProxy(url: URL, logger: any, origin: string | null, env?: Env): Promise<Response> {
  const keyUrlParam = url.searchParams.get('url');
  if (!keyUrlParam) return jsonResponse({ error: 'Missing url parameter' }, 400, origin);

  let keyUrl = decodeURIComponent(keyUrlParam);
  logger.info('Key proxy request', { keyUrl: keyUrl.substring(0, 80) });

  // Extract channel and key number from URL
  const channelMatch = keyUrl.match(/premium(\d+)/);
  const keyNumMatch = keyUrl.match(/\/key\/premium\d+\/(\d+)/);
  if (!channelMatch) return jsonResponse({ error: 'Could not extract channel' }, 400, origin);

  const channel = channelMatch[1];
  const keyNumber = keyNumMatch ? keyNumMatch[1] : '1';
  const channelKey = `premium${channel}`;

  // Fetch the REAL JWT from player page
  const jwt = await fetchPlayerJWT(channel, logger, env);
  if (!jwt) {
    return jsonResponse({ 
      error: 'Failed to fetch JWT from player page',
      channel,
      hint: 'Player page may be down'
    }, 502, origin);
  }

  // Compute PoW nonce
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = await computePoWNonce(channelKey, keyNumber, timestamp);
  if (nonce === null) {
    return jsonResponse({ error: 'Failed to compute PoW nonce' }, 500, origin);
  }

  logger.info('Key fetch with PoW', { channel, keyNumber, timestamp, nonce });

  const newKeyUrl = `https://chevy.${CDN_DOMAIN}/key/${channelKey}/${keyNumber}`;

  try {
    let data: ArrayBuffer;
    let fetchedVia = 'direct';
    
    // Try direct fetch first (dvalna.ru may not block CF IPs anymore)
    try {
      const directRes = await fetch(newKeyUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Origin': `https://${PLAYER_DOMAIN}`,
          'Referer': `https://${PLAYER_DOMAIN}/`,
          'Authorization': `Bearer ${jwt}`,
          'X-Key-Timestamp': timestamp.toString(),
          'X-Key-Nonce': nonce.toString(),
        },
      });
      
      data = await directRes.arrayBuffer();
      const text = new TextDecoder().decode(data);
      
      if (data.byteLength === 16 && !text.startsWith('{') && !text.startsWith('[') && !text.startsWith('E')) {
        logger.info('Direct key fetch succeeded');
      } else {
        throw new Error(`Invalid response: ${data.byteLength} bytes, preview: ${text.substring(0, 50)}`);
      }
    } catch (directError) {
      logger.warn('Direct key fetch failed, trying RPI', { error: (directError as Error).message });
      
      // Fall back to RPI proxy if configured
      if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
        const rpiKeyUrl = `${env.RPI_PROXY_URL}/dlhd-key?url=${encodeURIComponent(newKeyUrl)}&key=${env.RPI_PROXY_KEY}`;
        const rpiRes = await fetch(rpiKeyUrl);
        
        if (!rpiRes.ok) {
          const errText = await rpiRes.text();
          logger.warn('RPI key fetch also failed', { status: rpiRes.status, error: errText });
          return jsonResponse({ 
            error: 'Key fetch failed (both direct and RPI)', 
            directError: (directError as Error).message,
            rpiStatus: rpiRes.status,
            rpiError: errText.substring(0, 200)
          }, 502, origin);
        }
        
        data = await rpiRes.arrayBuffer();
        fetchedVia = 'rpi-proxy';
      } else {
        return jsonResponse({ 
          error: 'Key fetch failed (direct)', 
          details: (directError as Error).message,
          hint: 'Configure RPI_PROXY_URL and RPI_PROXY_KEY if dvalna.ru blocks CF IPs',
        }, 502, origin);
      }
    }

    if (data.byteLength === 16) {
      const text = new TextDecoder().decode(data);
      // Make sure it's not an error message
      if (!text.startsWith('{') && !text.startsWith('[') && !text.startsWith('E')) {
        logger.info('Key fetched successfully', { size: 16, fetchedVia });
        return new Response(data, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': '16',
            ...corsHeaders(origin),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Fetched-Via': fetchedVia,
          },
        });
      }
    }

    const text = new TextDecoder().decode(data);
    logger.warn('Invalid key response', { size: data.byteLength, preview: text.substring(0, 100) });
    return jsonResponse({ 
      error: 'Invalid key response', 
      size: data.byteLength,
      preview: text.substring(0, 100),
      channel,
      keyNumber,
    }, 502, origin);
  } catch (error) {
    return jsonResponse({ error: 'Key fetch failed', details: (error as Error).message }, 502, origin);
  }
}

// Known DLHD CDN domains that block Cloudflare IPs
const DLHD_DOMAINS = ['dvalna.ru', 'kiko2.ru', 'giokko.ru'];

/**
 * Check if a URL is from a DLHD CDN domain that blocks CF IPs
 */
function isDLHDDomain(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return DLHD_DOMAINS.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

async function handleSegmentProxy(url: URL, logger: any, origin: string | null, env?: Env): Promise<Response> {
  const segmentUrl = url.searchParams.get('url');
  if (!segmentUrl) return jsonResponse({ error: 'Missing url parameter' }, 400, origin);

  const decodedUrl = decodeURIComponent(segmentUrl);
  const isDlhd = isDLHDDomain(decodedUrl);
  logger.info('Segment proxy request', { url: decodedUrl.substring(0, 80), isDlhd });

  try {
    let data: ArrayBuffer;
    let fetchedVia = 'direct';
    
    // Always try direct fetch first for segments - they may not be blocked
    // Only fall back to RPI if direct fails
    try {
      const directRes = await fetch(decodedUrl, {
        headers: { 'User-Agent': USER_AGENT, 'Referer': `https://${PLAYER_DOMAIN}/` },
      });
      
      if (!directRes.ok) {
        throw new Error(`HTTP ${directRes.status}`);
      }
      
      data = await directRes.arrayBuffer();
      
      // Check if response is an error (JSON) - small responses are suspicious
      if (data.byteLength < 1000) {
        const text = new TextDecoder().decode(data);
        if (text.startsWith('{') || text.includes('"error"') || text.includes('"msg"')) {
          throw new Error(`Server error: ${text}`);
        }
      }
      
      logger.info('Direct segment fetch succeeded', { size: data.byteLength });
    } catch (directError) {
      // Only use RPI for DLHD domains when direct fails
      if (isDlhd && env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
        logger.warn('Direct segment fetch failed, trying RPI', { error: (directError as Error).message });
        
        const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(decodedUrl)}&key=${env.RPI_PROXY_KEY}`;
        const rpiRes = await fetch(rpiUrl);
        
        if (!rpiRes.ok) {
          const errText = await rpiRes.text();
          logger.warn('RPI segment fetch failed', { status: rpiRes.status, error: errText.substring(0, 100) });
          return jsonResponse({ 
            error: 'Segment fetch failed (both direct and RPI)', 
            directError: (directError as Error).message,
            rpiStatus: rpiRes.status,
          }, 502, origin);
        }
        
        data = await rpiRes.arrayBuffer();
        fetchedVia = 'rpi-proxy';
        logger.info('RPI segment fetch succeeded', { size: data.byteLength });
      } else {
        // Non-DLHD domain or RPI not configured - return direct error
        return jsonResponse({ 
          error: 'Segment fetch failed', 
          details: (directError as Error).message,
        }, 502, origin);
      }
    }

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp2t',
        ...corsHeaders(origin),
        'Cache-Control': 'public, max-age=300',
        'X-Fetched-Via': fetchedVia,
      },
    });
  } catch (error) {
    logger.error('Segment proxy error', { error: (error as Error).message });
    return jsonResponse({ error: 'Segment fetch failed', details: (error as Error).message }, 502, origin);
  }
}

function rewriteM3U8(content: string, proxyOrigin: string, m3u8BaseUrl: string): string {
  let modified = content;

  // Rewrite key URLs
  modified = modified.replace(/URI="([^"]+)"/g, (_, originalKeyUrl) => {
    let absoluteKeyUrl = originalKeyUrl;
    if (!absoluteKeyUrl.startsWith('http')) {
      const base = new URL(m3u8BaseUrl);
      absoluteKeyUrl = new URL(originalKeyUrl, base.origin + base.pathname.replace(/\/[^/]*$/, '/')).toString();
    }
    const keyPathMatch = absoluteKeyUrl.match(/\/key\/premium\d+\/\d+/);
    if (keyPathMatch) absoluteKeyUrl = `https://chevy.${CDN_DOMAIN}${keyPathMatch[0]}`;
    return `URI="${proxyOrigin}/tv/key?url=${encodeURIComponent(absoluteKeyUrl)}"`;
  });

  modified = modified.replace(/\n?#EXT-X-ENDLIST\s*$/m, '');

  // Fix: DLHD now splits long segment URLs across multiple lines
  // Join lines that are continuations of URLs (don't start with # or http)
  const rawLines = modified.split('\n');
  const joinedLines: string[] = [];
  let currentLine = '';
  
  for (const line of rawLines) {
    const trimmed = line.trim();
    
    // If line starts with # or is empty, flush current and add this line
    if (!trimmed || trimmed.startsWith('#')) {
      if (currentLine) {
        joinedLines.push(currentLine);
        currentLine = '';
      }
      joinedLines.push(line);
    }
    // If line starts with http, it's a new URL
    else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (currentLine) {
        joinedLines.push(currentLine);
      }
      currentLine = trimmed;
    }
    // Otherwise it's a continuation of the previous URL
    else {
      currentLine += trimmed;
    }
  }
  
  // Don't forget the last line
  if (currentLine) {
    joinedLines.push(currentLine);
  }

  // Proxy segment URLs
  const lines = joinedLines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.includes('/tv/segment?')) return line;
    if (trimmed.startsWith('http') && trimmed.includes(`.${CDN_DOMAIN}/`) && !trimmed.includes('mono.css')) {
      return `${proxyOrigin}/tv/segment?url=${encodeURIComponent(trimmed)}`;
    }
    return line;
  });

  return lines.join('\n');
}

function isAllowedOrigin(origin: string | null, referer: string | null): boolean {
  if (ALLOWED_ORIGINS.includes('*')) return true;
  const check = (o: string) => ALLOWED_ORIGINS.some(a => {
    if (a.includes('localhost')) return o.includes('localhost');
    try { return new URL(o).hostname === new URL(a).hostname; } catch { return false; }
  });
  if (origin && check(origin)) return true;
  if (referer) try { return check(new URL(referer).origin); } catch {}
  return false;
}

function corsHeaders(origin?: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
  };
}

function jsonResponse(data: object, status: number, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}
