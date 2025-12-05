/**
 * TV Proxy Cloudflare Worker
 * 
 * Proxies DLHD.dad live streams with automatic server lookup.
 * Handles M3U8 playlists, encryption keys, and video segments.
 * 
 * Routes:
 *   GET /?channel=<id>           - Get proxied M3U8 playlist
 *   GET /key?url=<encoded_url>   - Proxy encryption key
 *   GET /segment?url=<encoded_url> - Proxy video segment
 */

export interface Env {
  RPI_PROXY_URL?: string;
  RPI_PROXY_KEY?: string;
}

const PLAYER_DOMAINS = ['epicplayplay.cfd', 'daddyhd.com'];

const CDN_PATTERNS = {
  standard: (serverKey: string, channelKey: string) =>
    `https://${serverKey}new.giokko.ru/${serverKey}/${channelKey}/mono.css`,
  top1cdn: (channelKey: string) =>
    `https://top1.giokko.ru/top1/cdn/${channelKey}/mono.css`,
};

// In-memory cache for server keys (Workers have limited memory, but this is fine)
const serverKeyCache = new Map<string, { serverKey: string; playerDomain: string; fetchedAt: number }>();
const SERVER_KEY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders() });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route: /key - Proxy encryption key
      if (path === '/key') {
        return handleKeyProxy(url, env);
      }

      // Route: /segment - Proxy video segment
      if (path === '/segment') {
        return handleSegmentProxy(url, env);
      }

      // Route: / - Get M3U8 playlist
      const channel = url.searchParams.get('channel');
      if (!channel) {
        return jsonResponse({
          error: 'Missing channel parameter',
          usage: 'GET /?channel=325',
          routes: {
            playlist: '/?channel=<id>',
            key: '/key?url=<encoded_url>',
            segment: '/segment?url=<encoded_url>',
          },
        }, 400);
      }

      return handlePlaylistRequest(channel, url.origin, env);

    } catch (error) {
      console.error('[TV Proxy] Error:', error);
      return jsonResponse({
        error: 'Proxy error',
        details: error instanceof Error ? error.message : String(error),
      }, 500);
    }
  },
};

async function handlePlaylistRequest(channel: string, proxyOrigin: string, env: Env): Promise<Response> {
  const channelKey = `premium${channel}`;
  
  // Get server key
  const { serverKey } = await getServerKey(channelKey, env);
  const m3u8Url = constructM3U8Url(serverKey, channelKey);
  
  // Fetch M3U8 with cache-busting
  const cacheBustUrl = `${m3u8Url}?_t=${Date.now()}`;
  const response = await fetchViaProxy(cacheBustUrl, env);
  const content = await response.text();
  
  if (!content.includes('#EXTM3U') && !content.includes('#EXT-X-')) {
    return jsonResponse({ error: 'Invalid M3U8 content' }, 502);
  }

  // Parse and rewrite M3U8
  const { keyUrl, iv } = parseM3U8(content);
  const proxiedM3U8 = generateProxiedM3U8(content, keyUrl, proxyOrigin);

  return new Response(proxiedM3U8, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      ...corsHeaders(),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-DLHD-Channel': channel,
      'X-DLHD-IV': iv || '',
    },
  });
}

async function handleKeyProxy(url: URL, env: Env): Promise<Response> {
  const keyUrl = url.searchParams.get('url');
  if (!keyUrl) {
    return jsonResponse({ error: 'Missing url parameter' }, 400);
  }

  const decodedUrl = decodeURIComponent(keyUrl);
  const response = await fetchViaProxy(decodedUrl, env);
  const keyData = await response.arrayBuffer();

  return new Response(keyData, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      ...corsHeaders(),
      'Cache-Control': 'no-store',
    },
  });
}

async function handleSegmentProxy(url: URL, env: Env): Promise<Response> {
  const segmentUrl = url.searchParams.get('url');
  if (!segmentUrl) {
    return jsonResponse({ error: 'Missing url parameter' }, 400);
  }

  const decodedUrl = decodeURIComponent(segmentUrl);
  const response = await fetchViaProxy(decodedUrl, env);
  const segmentData = await response.arrayBuffer();

  return new Response(segmentData, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp2t',
      ...corsHeaders(),
      'Cache-Control': 'public, max-age=300',
      'Content-Length': segmentData.byteLength.toString(),
    },
  });
}


async function getServerKey(channelKey: string, env: Env): Promise<{ serverKey: string; playerDomain: string }> {
  // Check cache
  const cached = serverKeyCache.get(channelKey);
  if (cached && (Date.now() - cached.fetchedAt) < SERVER_KEY_CACHE_TTL_MS) {
    return { serverKey: cached.serverKey, playerDomain: cached.playerDomain };
  }

  for (const domain of PLAYER_DOMAINS) {
    const lookupUrl = `https://${domain}/server_lookup.js?channel_id=${channelKey}`;
    try {
      const response = await fetch(lookupUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `https://${domain}/`,
          'Origin': `https://${domain}`,
        },
      });

      if (response.ok) {
        const data = await response.json() as { server_key?: string };
        if (data.server_key) {
          serverKeyCache.set(channelKey, {
            serverKey: data.server_key,
            playerDomain: domain,
            fetchedAt: Date.now(),
          });
          return { serverKey: data.server_key, playerDomain: domain };
        }
      }
    } catch {
      // Try next domain
    }
  }

  throw new Error('All server lookups failed');
}

function constructM3U8Url(serverKey: string, channelKey: string): string {
  if (serverKey === 'top1/cdn') return CDN_PATTERNS.top1cdn(channelKey);
  return CDN_PATTERNS.standard(serverKey, channelKey);
}

async function fetchViaProxy(url: string, env: Env): Promise<Response> {
  if (env.RPI_PROXY_URL && env.RPI_PROXY_KEY) {
    const proxyUrl = `${env.RPI_PROXY_URL}/proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, {
      headers: { 'X-API-Key': env.RPI_PROXY_KEY },
    });
    
    if (!response.ok) {
      throw new Error(`RPI proxy failed: ${response.status}`);
    }
    return response;
  }

  // Direct fetch fallback
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://epicplayplay.cfd/',
      'Origin': 'https://epicplayplay.cfd',
    },
  });
}

function parseM3U8(content: string): { keyUrl: string | null; iv: string | null } {
  const keyMatch = content.match(/URI="([^"]+)"/);
  const ivMatch = content.match(/IV=0x([a-fA-F0-9]+)/);
  return { keyUrl: keyMatch?.[1] || null, iv: ivMatch?.[1] || null };
}

function generateProxiedM3U8(originalM3U8: string, keyUrl: string | null, proxyOrigin: string): string {
  let modified = originalM3U8;

  // proxyOrigin is the worker's origin (e.g., https://media-proxy.xxx.workers.dev)
  // We need to include /tv/ path since that's how the main router routes to us

  // Proxy the key URL
  if (keyUrl) {
    const proxiedKeyUrl = `${proxyOrigin}/tv/key?url=${encodeURIComponent(keyUrl)}`;
    modified = modified.replace(/URI="[^"]+"/, `URI="${proxiedKeyUrl}"`);
  }

  // Remove ENDLIST for live streams
  modified = modified.replace(/\n?#EXT-X-ENDLIST\s*$/m, '');

  // Proxy segment URLs
  modified = modified.replace(
    /^(https?:\/\/(?:[^\s]+\.(ts|css)|whalesignal\.ai\/[^\s]+))$/gm,
    (segmentUrl) => `${proxyOrigin}/tv/segment?url=${encodeURIComponent(segmentUrl)}`
  );

  return modified;
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
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
