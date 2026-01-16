/**
 * DLHD Stream Info API - January 2026 Update
 * 
 * Returns M3U8 URL and cached decryption key with PoW authentication.
 * Domain changed from kiko2.ru to dvalna.ru.
 * 
 * GET /api/dlhd-proxy/info?channel=<id>
 * GET /api/dlhd-proxy/info?channel=<id>&invalidate=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// =============================================================================
// CONSTANTS
// =============================================================================

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const PARENT_DOMAIN = 'daddyhd.com';
const CDN_DOMAIN = 'dvalna.ru';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/** HMAC secret for PoW computation */
const HMAC_SECRET = '7f9e2a8b3c5d1e4f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7';
const POW_THRESHOLD = 0x1000;
const POW_MAX_ITERATIONS = 100000;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CachedInfo {
  serverKey: string;
  m3u8Url: string;
  keyHex: string;
  keyBase64: string;
  iv: string;
  jwt: string;
  fetchedAt: number;
}

const cache = new Map<string, CachedInfo>();

// =============================================================================
// CRYPTO HELPERS
// =============================================================================

/**
 * Compute PoW nonce for key request
 */
function computePoWNonce(resource: string, keyNumber: string, timestamp: number): number {
  const hmac = createHmac('sha256', HMAC_SECRET).update(resource).digest('hex');
  
  for (let i = 0; i < POW_MAX_ITERATIONS; i++) {
    const data = `${hmac}${resource}${keyNumber}${timestamp}${i}`;
    const hash = createHash('md5').update(data).digest('hex');
    const prefix = parseInt(hash.substring(0, 4), 16);
    
    if (prefix < POW_THRESHOLD) {
      return i;
    }
  }
  return POW_MAX_ITERATIONS - 1;
}

// =============================================================================
// FETCH HELPERS
// =============================================================================

function getCached(channelId: string): CachedInfo | null {
  const c = cache.get(channelId);
  if (c && (Date.now() - c.fetchedAt) < CACHE_TTL_MS) return c;
  return null;
}

function invalidate(channelId: string): void {
  if (cache.has(channelId)) {
    console.log(`[DLHD] Cache invalidated: ${channelId}`);
    cache.delete(channelId);
  }
}

async function fetchWithHeaders(url: string, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
      ...headers,
    },
    cache: 'no-store',
  });
}

/**
 * Fetch JWT from player page
 */
async function fetchJWT(channel: string): Promise<{ jwt: string; channelKey: string } | null> {
  const url = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channel}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': `https://${PARENT_DOMAIN}/`,
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  const html = await response.text();
  const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  
  if (!jwtMatch) return null;

  const jwt = jwtMatch[0];
  let channelKey = `premium${channel}`;
  
  try {
    const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    channelKey = payload.sub || channelKey;
  } catch {}

  return { jwt, channelKey };
}

/**
 * Fetch server key from lookup endpoint
 */
async function fetchServerKey(channelKey: string): Promise<string> {
  const url = `https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${channelKey}`;
  
  const response = await fetchWithHeaders(url);
  if (!response.ok) throw new Error(`Server lookup failed: ${response.status}`);
  
  const data = await response.json() as { server_key?: string };
  return data.server_key || 'zeko';
}

function constructM3U8Url(serverKey: string, channelKey: string): string {
  if (serverKey === 'top1/cdn') {
    return `https://top1.${CDN_DOMAIN}/top1/cdn/${channelKey}/mono.css`;
  }
  return `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
}

/**
 * Fetch fresh info for a channel
 */
async function fetchFreshInfo(channel: string): Promise<CachedInfo> {
  // Step 1: Get JWT
  const auth = await fetchJWT(channel);
  if (!auth) throw new Error('Failed to fetch JWT');
  
  const { jwt, channelKey } = auth;

  // Step 2: Get server key
  const serverKey = await fetchServerKey(channelKey);
  const m3u8Url = constructM3U8Url(serverKey, channelKey);

  // Step 3: Fetch M3U8 to get key URL and IV
  const m3u8Res = await fetchWithHeaders(m3u8Url);
  if (!m3u8Res.ok) throw new Error(`M3U8 failed: ${m3u8Res.status}`);
  
  const m3u8 = await m3u8Res.text();
  const keyUrlMatch = m3u8.match(/URI="([^"]+)"/);
  const ivMatch = m3u8.match(/IV=0x([a-fA-F0-9]+)/);

  if (!keyUrlMatch) throw new Error('No key URL in M3U8');
  
  const keyUrl = keyUrlMatch[1];
  const iv = ivMatch?.[1] || '';

  // Step 4: Extract key number and compute PoW
  const keyNumMatch = keyUrl.match(/\/key\/[^/]+\/(\d+)/);
  const keyNumber = keyNumMatch?.[1] || '0';
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = computePoWNonce(channelKey, keyNumber, timestamp);

  // Step 5: Fetch key with PoW auth
  let keyHex = '', keyBase64 = '';
  
  for (let i = 0; i < 3; i++) {
    const keyRes = await fetch(keyUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
        'Authorization': `Bearer ${jwt}`,
        'X-Key-Timestamp': timestamp.toString(),
        'X-Key-Nonce': nonce.toString(),
      },
    });

    if (keyRes.ok) {
      const buf = await keyRes.arrayBuffer();
      if (buf.byteLength === 16) {
        keyHex = Buffer.from(buf).toString('hex');
        keyBase64 = Buffer.from(buf).toString('base64');
        break;
      }
    }
    
    // Wait before retry
    await new Promise(r => setTimeout(r, 500));
  }

  if (!keyBase64) throw new Error('Failed to fetch key');

  const info: CachedInfo = {
    serverKey,
    m3u8Url,
    keyHex,
    keyBase64,
    iv,
    jwt,
    fetchedAt: Date.now(),
  };
  
  cache.set(channel, info);
  console.log(`[DLHD] Cached info for ${channel}`);
  return info;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const channel = request.nextUrl.searchParams.get('channel');
    const inv = request.nextUrl.searchParams.get('invalidate') === 'true';

    if (!channel) {
      return NextResponse.json({ error: 'Missing channel' }, { status: 400 });
    }

    if (inv) invalidate(channel);

    let info = getCached(channel);
    const fromCache = !!info;

    if (!info) {
      console.log(`[DLHD] Fetching fresh for ${channel}`);
      info = await fetchFreshInfo(channel);
    } else {
      console.log(`[DLHD] Cache hit: ${channel} (${Math.round((Date.now() - info.fetchedAt) / 1000)}s old)`);
    }

    return NextResponse.json({
      channel,
      urls: { original: { m3u8: info.m3u8Url } },
      encryption: { keyBase64: info.keyBase64, keyHex: info.keyHex, iv: info.iv },
      auth: { jwt: info.jwt },
      cache: {
        hit: fromCache,
        ageSeconds: Math.round((Date.now() - info.fetchedAt) / 1000),
        ttlSeconds: Math.round((CACHE_TTL_MS - (Date.now() - info.fetchedAt)) / 1000),
      },
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('[DLHD] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
