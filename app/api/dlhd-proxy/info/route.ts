/**
 * DLHD Stream Info API
 * 
 * Returns M3U8 URL (constructed, not fetched) and cached decryption key.
 * Only the KEY is fetched server-side (requires Referer header).
 * M3U8 and segments are fetched directly by the browser.
 * 
 * GET /api/dlhd-proxy/info?channel=<id>
 * GET /api/dlhd-proxy/info?channel=<id>&invalidate=true
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLAYER_DOMAINS = ['epicplayplay.cfd', 'daddyhd.com'];
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CachedInfo {
  serverKey: string;
  m3u8Url: string;
  keyHex: string;
  keyBase64: string;
  iv: string;
  fetchedAt: number;
}

const cache = new Map<string, CachedInfo>();

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


async function fetchWithHeaders(url: string, referer: string): Promise<Response> {
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      'Referer': referer,
      'Origin': referer.replace(/\/$/, ''),
    },
    cache: 'no-store',
  });
}

async function getServerKey(channelKey: string): Promise<{ serverKey: string; playerDomain: string }> {
  for (const domain of PLAYER_DOMAINS) {
    try {
      const res = await fetchWithHeaders(
        `https://${domain}/server_lookup.js?channel_id=${channelKey}`,
        `https://${domain}/`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.server_key) return { serverKey: data.server_key, playerDomain: domain };
      }
    } catch { /* next */ }
  }
  throw new Error('Server lookup failed');
}

function constructM3U8Url(serverKey: string, channelKey: string): string {
  // Use kiko2.ru domain (current active CDN based on actual player page)
  if (serverKey === 'top1/cdn') return `https://top1.kiko2.ru/top1/cdn/${channelKey}/mono.css`;
  return `https://${serverKey}new.kiko2.ru/${serverKey}/${channelKey}/mono.css`;
}

async function fetchFreshInfo(channel: string): Promise<CachedInfo> {
  const channelKey = `premium${channel}`;
  const { serverKey, playerDomain } = await getServerKey(channelKey);
  const m3u8Url = constructM3U8Url(serverKey, channelKey);
  const referer = `https://${playerDomain}/`;

  // Fetch M3U8 to get key URL and IV (browser will also fetch this, but we need key URL)
  const m3u8Res = await fetchWithHeaders(m3u8Url, referer);
  if (!m3u8Res.ok) throw new Error(`M3U8 failed: ${m3u8Res.status}`);
  
  const m3u8 = await m3u8Res.text();
  const keyUrl = m3u8.match(/URI="([^"]+)"/)?.[1];
  const iv = m3u8.match(/IV=0x([a-fA-F0-9]+)/)?.[1] || '';

  if (!keyUrl) throw new Error('No key URL in M3U8');

  // Fetch key (this is the only thing that MUST be proxied)
  let keyHex = '', keyBase64 = '';
  for (let i = 0; i < 3; i++) {
    const keyRes = await fetchWithHeaders(keyUrl, referer);
    if (keyRes.status === 418) {
      await new Promise(r => setTimeout(r, 500));
      continue;
    }
    if (keyRes.ok) {
      const buf = await keyRes.arrayBuffer();
      if (buf.byteLength === 16) {
        keyHex = Buffer.from(buf).toString('hex');
        keyBase64 = Buffer.from(buf).toString('base64');
        break;
      }
    }
  }

  if (!keyBase64) throw new Error('Failed to fetch key');

  const info: CachedInfo = { serverKey, m3u8Url, keyHex, keyBase64, iv, fetchedAt: Date.now() };
  cache.set(channel, info);
  console.log(`[DLHD] Cached info for ${channel}`);
  return info;
}


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
