/**
 * DLHD Key Proxy API - Direct Fetch with Timestamp Fix
 * 
 * Fetches encryption keys directly from DLHD with PoW authentication.
 * Includes January 2026 timestamp fix (timestamp - 7 seconds).
 * 
 * Updated: January 21, 2026 - Added timestamp fix for PoW authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, createHash } from 'crypto';

export const dynamic = 'force-dynamic';

const PLAYER_DOMAIN = 'hitsplay.fun'; // UPDATED: epicplayplay.cfd is DEAD
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
// CORRECT SECRET - extracted from WASM module (January 2026)
const HMAC_SECRET = '444c44cc8888888844444444';
const POW_THRESHOLD = 0x1000;

/**
 * Compute PoW nonce for key authentication
 */
function computePoWNonce(resource: string, keyNumber: string, timestamp: number): number {
  const hmac = createHmac('sha256', HMAC_SECRET).update(resource).digest('hex');

  for (let nonce = 0; nonce < 100000; nonce++) {
    const data = `${hmac}${resource}${keyNumber}${timestamp}${nonce}`;
    const hash = createHash('md5').update(data).digest('hex');
    const prefix = parseInt(hash.substring(0, 4), 16);

    if (prefix < POW_THRESHOLD) {
      return nonce;
    }
  }

  return 99999;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyUrl = searchParams.get('url');
  const jwt = searchParams.get('jwt');

  if (!keyUrl) {
    return NextResponse.json({
      error: 'Missing url parameter',
      usage: 'GET /api/dlhd-proxy/key?url=<encoded_key_url>&jwt=<jwt>',
    }, { status: 400 });
  }

  if (!jwt) {
    return NextResponse.json({
      error: 'Missing jwt parameter',
    }, { status: 400 });
  }

  try {
    // Extract resource and key number from URL
    const keyMatch = keyUrl.match(/\/key\/([^/]+)\/(\d+)/);
    if (!keyMatch) {
      return NextResponse.json({
        error: 'Invalid key URL format',
      }, { status: 400 });
    }

    const resource = keyMatch[1];
    const keyNumber = keyMatch[2];

    // IMPORTANT: Use timestamp - 7 seconds (January 2026 security update)
    const timestamp = Math.floor(Date.now() / 1000) - 7;
    const nonce = computePoWNonce(resource, keyNumber, timestamp);

    // Fetch key with PoW authentication
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

    if (!keyRes.ok) {
      const errorText = await keyRes.text();
      console.error('[DLHD Key] Fetch failed:', keyRes.status, errorText);
      return NextResponse.json({
        error: 'Key fetch failed',
        status: keyRes.status,
        details: errorText,
      }, { status: 502 });
    }

    const keyBuffer = await keyRes.arrayBuffer();

    // Validate key size (AES-128 keys should be 16 bytes)
    if (keyBuffer.byteLength !== 16) {
      console.error('[DLHD Key] Invalid key size:', keyBuffer.byteLength);
      return NextResponse.json({
        error: 'Invalid key data',
        size: keyBuffer.byteLength,
        expected: 16,
      }, { status: 502 });
    }

    return new NextResponse(keyBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': '16',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Cache-Control': 'no-cache',
        'X-Proxied-Via': 'nextjs-direct',
      },
    });

  } catch (error) {
    console.error('[DLHD Key] Proxy error:', error);
    return NextResponse.json({
      error: 'Key proxy error',
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
