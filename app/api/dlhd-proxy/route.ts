/**
 * DLHD Stream Proxy API - Direct Fetch with Timestamp Fix
 * 
 * Fetches DLHD streams directly from their servers with proper authentication.
 * Includes January 2026 timestamp fix (timestamp - 7 seconds).
 * 
 * This route handles:
 *   - JWT token extraction from player page
 *   - Server key lookup
 *   - M3U8 playlist fetching and rewriting
 *   - Proxying keys and segments through this API
 * 
 * Updated: January 21, 2026 - Added timestamp fix for PoW authentication
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const CDN_DOMAIN = 'dvalna.ru';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const channel = searchParams.get('channel');

  if (!channel) {
    return NextResponse.json({
      error: 'Missing channel parameter',
      usage: 'GET /api/dlhd-proxy?channel=325',
    }, { status: 400 });
  }

  try {
    // Step 1: Fetch JWT from player page
    const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channel}`;
    const playerRes = await fetch(playerUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://daddyhd.com/',
      },
    });

    if (!playerRes.ok) {
      return NextResponse.json({
        error: 'Failed to fetch player page',
        status: playerRes.status,
      }, { status: 502 });
    }

    const html = await playerRes.text();
    const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);

    if (!jwtMatch) {
      return NextResponse.json({
        error: 'No JWT found in player page',
      }, { status: 502 });
    }

    const jwt = jwtMatch[0];
    
    // Decode JWT payload
    const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    const channelKey = payload.sub || `premium${channel}`;

    // Step 2: Get server key
    const lookupUrl = `https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${channelKey}`;
    const lookupRes = await fetch(lookupUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });

    let serverKey = 'zeko';
    if (lookupRes.ok) {
      const lookupText = await lookupRes.text();
      if (lookupText.startsWith('{')) {
        const lookupData = JSON.parse(lookupText);
        serverKey = lookupData.server_key || 'zeko';
      }
    }

    // Step 3: Fetch M3U8
    const m3u8Url = serverKey === 'top1/cdn'
      ? `https://top1.${CDN_DOMAIN}/top1/cdn/${channelKey}/mono.css`
      : `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;

    const m3u8Res = await fetch(m3u8Url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });

    if (!m3u8Res.ok) {
      return NextResponse.json({
        error: 'Failed to fetch M3U8',
        status: m3u8Res.status,
      }, { status: 502 });
    }

    let m3u8Content = await m3u8Res.text();

    // Step 4: Rewrite M3U8 to proxy keys and segments through this API
    const origin = request.nextUrl.origin;
    
    // Rewrite key URLs
    m3u8Content = m3u8Content.replace(/URI="([^"]+)"/g, (_, keyUrl) => {
      return `URI="${origin}/api/dlhd-proxy/key?url=${encodeURIComponent(keyUrl)}&jwt=${encodeURIComponent(jwt)}"`;
    });

    // Join multi-line segment URLs and proxy them
    const lines = m3u8Content.split('\n');
    const joinedLines: string[] = [];
    let currentLine = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        if (currentLine) {
          joinedLines.push(currentLine);
          currentLine = '';
        }
        joinedLines.push(line);
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        if (currentLine) {
          joinedLines.push(currentLine);
        }
        currentLine = trimmed;
      } else {
        currentLine += trimmed;
      }
    }

    if (currentLine) {
      joinedLines.push(currentLine);
    }

    // Proxy segment URLs
    const processedLines = joinedLines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      if (trimmed.includes('/api/dlhd-proxy/')) return line;

      const isAbsoluteUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
      const isDlhdSegment = trimmed.includes(`.${CDN_DOMAIN}/`);

      if (isAbsoluteUrl && isDlhdSegment && !trimmed.includes('mono.css')) {
        return `${origin}/api/dlhd-proxy/segment?url=${encodeURIComponent(trimmed)}`;
      }

      return line;
    });

    const proxiedM3U8 = processedLines.join('\n');

    return new NextResponse(proxiedM3U8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-DLHD-Channel': channel,
        'X-DLHD-Server': serverKey,
        'X-Proxied-Via': 'nextjs-direct',
      },
    });

  } catch (error) {
    console.error('[DLHD] Proxy error:', error);
    return NextResponse.json({
      error: 'Proxy error',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
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
