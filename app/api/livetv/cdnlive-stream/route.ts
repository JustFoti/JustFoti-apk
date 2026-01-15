/**
 * CDN Live Stream API - Direct extraction from cdn-live.tv
 * 
 * GET /api/livetv/cdnlive-stream?channel={name}&code={country}
 * 
 * Fetches player page, decodes obfuscated JavaScript, and extracts real m3u8 URL
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const CDN_LIVE_PLAYER_BASE = 'https://cdn-live.tv/api/v1/channels/player/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Decoder constants from cdn-live.tv
const _0xc18e: string[] = ["", "split", "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/", "slice", "indexOf", "", "", ".", "pow", "reduce", "reverse", "0"];

function _0xe11c(d: string, e: number, f: number): string {
  const g = _0xc18e[2].split(_0xc18e[0]);
  const h = g.slice(0, e);
  const i = g.slice(0, f);
  let j = d.split(_0xc18e[0]).reverse().reduce(function(a: number, b: string, c: number) {
    if (h.indexOf(b) !== -1) {
      return a + h.indexOf(b) * Math.pow(e, c);
    }
    return a;
  }, 0);
  let k = _0xc18e[0];
  while (j > 0) {
    k = i[j % f] + k;
    j = (j - (j % f)) / f;
  }
  return k || _0xc18e[11];
}

function decode(h: string, n: string, t: number, e: number): string {
  let r = "";
  for (let i = 0, len = h.length; i < len; i++) {
    let s = "";
    while (i < len && h[i] !== n[e]) {
      s += h[i];
      i++;
    }
    for (let j = 0; j < n.length; j++) {
      s = s.replace(new RegExp(n[j], "g"), j.toString());
    }
    const charCode = parseInt(_0xe11c(s, e, 10), 10) - t;
    r += String.fromCharCode(charCode);
  }
  try {
    // Use encodeURIComponent instead of deprecated escape
    return decodeURIComponent(r);
  } catch {
    return r;
  }
}

function decodeUrl(obfuscated: string): string {
  let decoded = '';
  for (let c of obfuscated) {
    const code = c.charCodeAt(0);
    
    // Special character mappings
    if (c === '7') decoded += ':';
    else if (c === ',') decoded += '/';
    else if (c === '*') decoded += '-';
    else if (c === '+') decoded += '.';
    else if (c === '<') decoded += '?';
    else if (c === '>') decoded += '&';
    else if (c === '^') decoded += '=';
    // ASCII shift +3 for all other printable characters
    else if (code >= 33 && code <= 126) {
      decoded += String.fromCharCode(code + 3);
    }
    else decoded += c;
  }
  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channel = searchParams.get('channel');
    const code = searchParams.get('code') || 'us';
    
    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'channel parameter is required' },
        { status: 400 }
      );
    }
    
    // Fetch player page from cdn-live.tv
    const playerUrl = `${CDN_LIVE_PLAYER_BASE}?name=${encodeURIComponent(channel)}&code=${code}&user=cdnlivetv&plan=free`;
    
    const response = await fetch(playerUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Channel not found: ${response.status}`,
      }, { status: response.status });
    }
    
    const html = await response.text();
    
    // Extract obfuscated code
    const evalMatch = html.match(/eval\(function\(h,u,n,t,e,r\)\{[\s\S]+?\}\("([^"]+)",(\d+),"([^"]+)",(\d+),(\d+),(\d+)\)\)/);
    
    if (!evalMatch) {
      return NextResponse.json({
        success: false,
        error: 'Could not extract stream data',
      }, { status: 500 });
    }
    
    const [, encodedData, , charset, , eStr, offsetStr] = evalMatch;
    const e = parseInt(eStr);
    const offset = parseInt(offsetStr);
    
    // Decode JavaScript
    const decoded = decode(encodedData, charset, offset, e);
    
    // Extract obfuscated URL (starts with eqqmp7 which is https:)
    const urlMatch = decoded.match(/[$"'](eqqmp7[,/]+[\w*+.,/<>^-]{30,})[$"']/);
    
    if (!urlMatch) {
      return NextResponse.json({
        success: false,
        error: 'Could not extract stream URL',
      }, { status: 500 });
    }
    
    // Decode URL
    const streamUrl = decodeUrl(urlMatch[1]);
    
    // Log the extracted URL for validation
    console.log('[CDN Live] ✅ Extracted stream URL:', streamUrl);
    
    // HONEYPOT PROTECTION: Block flyx.m3u8
    if (streamUrl.toLowerCase().includes('flyx.m3u8')) {
      console.warn('[CDN Live] ⚠️ Honeypot URL detected and blocked:', streamUrl.substring(0, 80));
      return NextResponse.json({
        success: false,
        error: 'Channel stream unavailable',
      }, { status: 404 });
    }
    
    // Validate URL format
    if (!streamUrl.startsWith('https://') || !streamUrl.includes('.m3u8')) {
      console.error('[CDN Live] ❌ Invalid stream URL format:', streamUrl);
      return NextResponse.json({
        success: false,
        error: 'Invalid stream URL format',
      }, { status: 500 });
    }
    
    console.log('[CDN Live] ✅ Valid stream URL ready for channel:', channel);
    
    return NextResponse.json({
      success: true,
      streamUrl,
      channelName: channel,
      country: code,
      method: 'direct-extraction',
      isLive: true,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
    
  } catch (error: unknown) {
    console.error('[CDN Live Stream API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get stream' },
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
