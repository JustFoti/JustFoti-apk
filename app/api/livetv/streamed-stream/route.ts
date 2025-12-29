/**
 * Streamed.pk Stream Extractor API
 * 
 * Returns stream information including embed URL.
 * The client-side player will handle the embed directly.
 * 
 * For direct m3u8 extraction, a separate service with browser automation is needed.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const API_BASE = 'https://streamed.pk/api';
const EMBED_BASE = 'https://embedsports.top';

interface StreamedStream {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
  viewers?: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Encode protobuf request body for /fetch endpoint
 */
function encodeProtobuf(source: string, id: string, streamNo: string): Uint8Array {
  const sourceBytes = new TextEncoder().encode(source);
  const idBytes = new TextEncoder().encode(id);
  const streamNoBytes = new TextEncoder().encode(streamNo);
  
  const result: number[] = [];
  result.push(0x0a, sourceBytes.length, ...sourceBytes);
  result.push(0x12, idBytes.length, ...idBytes);
  result.push(0x1a, streamNoBytes.length, ...streamNoBytes);
  
  return new Uint8Array(result);
}

/**
 * Try to extract m3u8 URL from the /fetch endpoint
 * This is a best-effort attempt - the encoding is complex
 */
async function tryExtractM3U8(source: string, id: string, streamNo: string): Promise<string | null> {
  try {
    const protoBody = encodeProtobuf(source, id, streamNo);
    
    const response = await fetch(`${EMBED_BASE}/fetch`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Content-Type': 'application/octet-stream',
        'Origin': EMBED_BASE,
        'Referer': `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`,
      },
      body: Buffer.from(protoBody),
    });

    const whatHeader = response.headers.get('what');
    if (!whatHeader || !response.ok) {
      return null;
    }

    // The response is encoded - we return the embed URL instead
    // A browser-based solution is needed for full extraction
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source');
    const id = searchParams.get('id');
    const streamNo = searchParams.get('streamNo') || '1';

    if (!source || !id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: source and id',
      }, { status: 400 });
    }

    // Fetch streams from API
    const streams = await fetchJson<StreamedStream[]>(`${API_BASE}/stream/${source}/${id}`);

    if (!streams || streams.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No streams available for this match',
      }, { status: 404 });
    }

    // Find requested stream
    const streamIndex = parseInt(streamNo, 10) - 1;
    const stream = streams[streamIndex] || streams[0];

    // Try to extract m3u8 (best effort)
    const streamUrl = await tryExtractM3U8(source, id, streamNo);

    return NextResponse.json({
      success: true,
      stream: {
        id: stream.id,
        streamNo: stream.streamNo,
        language: stream.language,
        hd: stream.hd,
        source: stream.source,
        viewers: stream.viewers,
        embedUrl: stream.embedUrl,
        streamUrl, // Will be null - client should use embed
        // Provide embed info for client-side handling
        embedInfo: {
          url: stream.embedUrl,
          referer: 'https://streamed.pk/',
        },
      },
      allStreams: streams.map(s => ({
        streamNo: s.streamNo,
        language: s.language,
        hd: s.hd,
        source: s.source,
        embedUrl: s.embedUrl,
      })),
    });

  } catch (error: any) {
    console.error('[Streamed Stream API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch stream',
    }, { status: 500 });
  }
}
