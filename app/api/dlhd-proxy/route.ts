/**
 * DLHD Stream Proxy API
 * 
 * Proxies DLHD.dad live streams with automatic server lookup.
 * 
 * Live Stream Strategy:
 *   - M3U8 playlists are fetched fresh every request (no caching)
 *   - Key URLs are proxied through /api/dlhd-proxy/key so HLS.js can fetch fresh keys
 *   - Segment URLs are proxied through /api/livetv/segment
 *   - Server keys (for CDN lookup) are cached for 30 minutes
 * 
 * Key Rotation:
 *   - The key URL contains a 'number' parameter that changes as the stream progresses
 *   - We DON'T embed keys - HLS.js fetches them through the key proxy
 *   - This allows HLS.js to get fresh keys when they rotate
 * 
 * NOTE: For reduced bandwidth costs, consider using the Cloudflare Worker proxy instead.
 * Set NEXT_PUBLIC_CF_TV_PROXY_URL to enable Cloudflare Workers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTvKeyProxyUrl, getTvSegmentProxyUrl } from '@/app/lib/proxy-config';

export const runtime = 'nodejs';
// CRITICAL: Live streams need fresh data - disable ISR caching
export const dynamic = 'force-dynamic'; // Don't cache at build time
export const revalidate = 0; // Always revalidate
export const maxDuration = 30;

const PLAYER_DOMAINS = ['epicplayplay.cfd', 'daddyhd.com'];

const CDN_PATTERNS = {
  standard: (serverKey: string, channelKey: string) => 
    `https://${serverKey}new.giokko.ru/${serverKey}/${channelKey}/mono.css`,
  top1cdn: (channelKey: string) => 
    `https://top1.giokko.ru/top1/cdn/${channelKey}/mono.css`,
};

// Server key cache - server keys (for CDN lookup) rarely change
interface CachedServerKey {
  serverKey: string;
  playerDomain: string;
  fetchedAt: number;
}
const serverKeyCache = new Map<string, CachedServerKey>();
const SERVER_KEY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes - server keys are very stable




async function fetchWithHeaders(url: string, headers: Record<string, string> = {}): Promise<Response> {
  // Full browser-like headers to avoid CDN blocks
  const browserHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    ...headers,
  };
  
  return fetch(url, {
    headers: browserHeaders,
    cache: 'no-store',
  });
}

async function getServerKey(channelKey: string): Promise<{ serverKey: string; playerDomain: string }> {
  // Check cache first
  const cached = serverKeyCache.get(channelKey);
  if (cached && (Date.now() - cached.fetchedAt) < SERVER_KEY_CACHE_TTL_MS) {
    console.log(`[DLHD] Server key cache hit for ${channelKey} (age: ${Math.round((Date.now() - cached.fetchedAt) / 1000)}s)`);
    return { serverKey: cached.serverKey, playerDomain: cached.playerDomain };
  }

  let lastError: Error | null = null;
  
  for (const domain of PLAYER_DOMAINS) {
    const lookupUrl = `https://${domain}/server_lookup.js?channel_id=${channelKey}`;
    try {
      const response = await fetchWithHeaders(lookupUrl, {
        'Referer': `https://${domain}/`,
        'Origin': `https://${domain}`,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.server_key) {
          console.log(`[DLHD] Server key: ${data.server_key} from ${domain}`);
          // Cache the server key
          serverKeyCache.set(channelKey, {
            serverKey: data.server_key,
            playerDomain: domain,
            fetchedAt: Date.now(),
          });
          return { serverKey: data.server_key, playerDomain: domain };
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  
  throw lastError || new Error('All server lookups failed');
}

function constructM3U8Url(serverKey: string, channelKey: string): string {
  if (serverKey === 'top1/cdn') return CDN_PATTERNS.top1cdn(channelKey);
  return CDN_PATTERNS.standard(serverKey, channelKey);
}


// Raspberry Pi proxy - fallback if direct fetch fails
const RPI_PROXY_URL = process.env.RPI_PROXY_URL;
const RPI_PROXY_KEY = process.env.RPI_PROXY_KEY;

async function fetchViaProxy(url: string): Promise<Response> {
  // Try direct fetch first - giokko.ru doesn't block based on IP, only headers!
  console.log(`[DLHD] Trying direct fetch: ${url}`);
  
  try {
    const directResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://epicplayplay.cfd/',
        'Origin': 'https://epicplayplay.cfd',
      },
      cache: 'no-store',
    });
    
    if (directResponse.ok) {
      console.log(`[DLHD] Direct fetch succeeded`);
      return directResponse;
    }
    
    console.log(`[DLHD] Direct fetch failed with status: ${directResponse.status}`);
  } catch (err) {
    console.log(`[DLHD] Direct fetch error:`, (err as Error).message);
  }

  // Fallback to RPI proxy if direct fetch fails
  if (!RPI_PROXY_URL || !RPI_PROXY_KEY) {
    throw new Error('Direct fetch failed and RPI_PROXY_URL/RPI_PROXY_KEY not configured');
  }

  console.log(`[DLHD] Falling back to RPI proxy`);
  const proxyUrl = `${RPI_PROXY_URL}/proxy?url=${encodeURIComponent(url)}`;
  
  try {
    const response = await fetch(proxyUrl, {
      headers: { 'X-API-Key': RPI_PROXY_KEY },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`RPI proxy failed: ${response.status} - ${text}`);
    }
    
    console.log(`[DLHD] RPI proxy success`);
    return response;
  } catch (err) {
    console.error(`[DLHD] RPI proxy fetch error:`, err);
    throw err;
  }
}

async function fetchM3U8(channelId: string): Promise<{ content: string; m3u8Url: string }> {
  const channelKey = `premium${channelId}`;
  const { serverKey } = await getServerKey(channelKey);
  const m3u8Url = constructM3U8Url(serverKey, channelKey);
  
  // Add cache-busting timestamp to force fresh playlist from upstream
  // This prevents CDN/intermediate caches from serving stale M3U8
  const cacheBustUrl = `${m3u8Url}?_t=${Date.now()}`;
  
  console.log(`[DLHD] Fetching M3U8 via proxy: ${m3u8Url}`);
  
  const response = await fetchViaProxy(cacheBustUrl);
  const content = await response.text();
  
  if (!content.includes('#EXTM3U') && !content.includes('#EXT-X-')) {
    throw new Error('Invalid M3U8 content received');
  }
  
  console.log(`[DLHD] M3U8 fetched for ${channelId}, length: ${content.length}`);
  return { content, m3u8Url };
}


function parseM3U8(content: string): { keyUrl: string | null; iv: string | null } {
  const keyMatch = content.match(/URI="([^"]+)"/);
  const ivMatch = content.match(/IV=0x([a-fA-F0-9]+)/);
  return { keyUrl: keyMatch?.[1] || null, iv: ivMatch?.[1] || null };
}

function generateProxiedM3U8(originalM3U8: string, keyProxyUrl: string, proxySegments: boolean): string {
  let modified = originalM3U8;
  
  // IMPORTANT: For live streams, DON'T embed the key as a data URI!
  // The key URL contains a 'number' parameter that changes as the stream progresses.
  // If we embed the key, HLS.js won't fetch new keys when they rotate, causing decryption failures.
  // Instead, proxy the key URL so HLS.js can fetch fresh keys when needed.
  if (keyProxyUrl) {
    modified = modified.replace(/URI="[^"]+"/, `URI="${keyProxyUrl}"`);
  }
  
  // IMPORTANT: Do NOT modify target duration for live streams!
  // HLS.js uses targetDuration to determine playlist refresh interval.
  // Increasing it causes the player to poll less frequently, leading to
  // playback stopping when the initial segments are exhausted.
  // Keep the original target duration from the source stream.
  
  // Remove any #EXT-X-ENDLIST tag if present - live streams should never have this
  // This tag tells the player the stream is over, which breaks live playback
  modified = modified.replace(/\n?#EXT-X-ENDLIST\s*$/m, '');
  
  // Proxy segment URLs through our segment proxy to avoid CDN blocks
  if (proxySegments) {
    // Replace segment URLs:
    // 1. URLs ending with .ts or .css (standard HLS segments)
    // 2. whalesignal.ai URLs (encoded segment paths without extensions)
    modified = modified.replace(
      /^(https?:\/\/(?:[^\s]+\.(ts|css)|whalesignal\.ai\/[^\s]+))$/gm,
      (segmentUrl) => {
        return getTvSegmentProxyUrl(segmentUrl);
      }
    );
  }
  
  return modified;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channel = searchParams.get('channel');

    if (!channel) {
      return NextResponse.json({
        error: 'Missing channel parameter',
        usage: 'GET /api/dlhd-proxy?channel=325',
        caching: { keyTTL: '10 minutes', m3u8TTL: '2 seconds' },
      }, { status: 400 });
    }

    console.log(`[DLHD] Request for channel ${channel}`);
    
    let m3u8Content: string;
    let m3u8Url: string;
    
    try {
      const result = await fetchM3U8(channel);
      m3u8Content = result.content;
      m3u8Url = result.m3u8Url;
    } catch (err) {
      console.error(`[DLHD] fetchM3U8 failed for ${channel}:`, err);
      return NextResponse.json(
        { error: 'Channel unavailable', details: err instanceof Error ? err.message : String(err) },
        { status: 404 }
      );
    }
    
    const { keyUrl, iv } = parseM3U8(m3u8Content);

    // Generate M3U8 with proxied key URL and proxied segments
    // Segments go through /api/livetv/segment (or Cloudflare Worker) to avoid CDN blocks
    // Key goes through /api/dlhd-proxy/key (or Cloudflare Worker) so HLS.js can fetch fresh keys when they rotate
    // NOTE: We don't fetch/embed the key here - HLS.js will fetch it through the proxy
    let proxiedM3U8: string;
    if (keyUrl) {
      // ALWAYS proxy the key URL for live streams - don't embed!
      // The key URL's 'number' parameter changes, and HLS.js needs to fetch fresh keys
      const proxiedKeyUrl = getTvKeyProxyUrl(keyUrl);
      proxiedM3U8 = generateProxiedM3U8(m3u8Content, proxiedKeyUrl, true);
    } else {
      proxiedM3U8 = generateProxiedM3U8(m3u8Content, '', true);
    }

    return new NextResponse(proxiedM3U8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        // NO CACHING for live streams - must be fresh every request
        // Any caching causes repeated segments
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-DLHD-IV': iv || '',
        'X-DLHD-Channel': channel,
        'X-DLHD-M3U8-URL': m3u8Url,
        'X-DLHD-Key-URL': keyUrl || '',
      },
    });

  } catch (error) {
    console.error('[DLHD] Error:', error);
    return NextResponse.json(
      { error: 'Proxy error', details: error instanceof Error ? error.message : String(error) },
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
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}
