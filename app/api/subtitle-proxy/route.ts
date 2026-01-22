/**
 * Subtitle Proxy - Downloads and serves subtitles with proper CORS headers
 * Converts SRT to VTT format if needed
 * Handles various character encodings (UTF-8, Windows-1256 for Arabic, etc.)
 * 
 * Uses Node.js runtime for zlib decompression support
 */

import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';

// Use Node.js runtime for zlib support
export const runtime = 'nodejs';

// Common encodings for subtitles by language
const ENCODING_MAP: Record<string, string[]> = {
  'ar': ['windows-1256', 'iso-8859-6', 'utf-8'],  // Arabic
  'ara': ['windows-1256', 'iso-8859-6', 'utf-8'],
  'he': ['windows-1255', 'iso-8859-8', 'utf-8'],  // Hebrew
  'heb': ['windows-1255', 'iso-8859-8', 'utf-8'],
  'fa': ['windows-1256', 'utf-8'],                 // Persian/Farsi
  'per': ['windows-1256', 'utf-8'],
  'ru': ['windows-1251', 'koi8-r', 'utf-8'],      // Russian
  'rus': ['windows-1251', 'koi8-r', 'utf-8'],
  'el': ['windows-1253', 'iso-8859-7', 'utf-8'],  // Greek
  'gre': ['windows-1253', 'iso-8859-7', 'utf-8'],
  'tr': ['windows-1254', 'iso-8859-9', 'utf-8'],  // Turkish
  'tur': ['windows-1254', 'iso-8859-9', 'utf-8'],
  'pl': ['windows-1250', 'iso-8859-2', 'utf-8'],  // Polish
  'pol': ['windows-1250', 'iso-8859-2', 'utf-8'],
  'cs': ['windows-1250', 'iso-8859-2', 'utf-8'],  // Czech
  'cze': ['windows-1250', 'iso-8859-2', 'utf-8'],
  'th': ['windows-874', 'tis-620', 'utf-8'],      // Thai
  'tha': ['windows-874', 'tis-620', 'utf-8'],
  'vi': ['windows-1258', 'utf-8'],                 // Vietnamese
  'vie': ['windows-1258', 'utf-8'],
  'zh': ['gb2312', 'gbk', 'big5', 'utf-8'],       // Chinese
  'chi': ['gb2312', 'gbk', 'big5', 'utf-8'],
  'ja': ['shift_jis', 'euc-jp', 'utf-8'],         // Japanese
  'jpn': ['shift_jis', 'euc-jp', 'utf-8'],
  'ko': ['euc-kr', 'utf-8'],                       // Korean
  'kor': ['euc-kr', 'utf-8'],
};

/**
 * Detect if content looks like valid text (not garbled)
 */
function isValidText(text: string): boolean {
  // Check for replacement characters (indicates encoding issues)
  if (text.includes('\uFFFD')) return false;
  
  // Check for excessive question marks in a row (common sign of encoding issues)
  if (/\?{3,}/.test(text)) return false;
  
  // Check if there's actual readable content
  const readableChars = text.replace(/[\s\d\n\r\-\>\:\.]/g, '');
  if (readableChars.length === 0) return false;
  
  return true;
}

/**
 * Try to decode buffer with multiple encodings
 */
function decodeWithFallback(buffer: Buffer, langCode?: string): string {
  const encodingsToTry: string[] = ['utf-8'];
  
  // Add language-specific encodings first
  if (langCode) {
    const langEncodings = ENCODING_MAP[langCode.toLowerCase()];
    if (langEncodings) {
      encodingsToTry.unshift(...langEncodings);
    }
  }
  
  // Also try common encodings
  encodingsToTry.push('windows-1256', 'windows-1252', 'iso-8859-1', 'latin1');
  
  // Remove duplicates while preserving order
  const uniqueEncodings = [...new Set(encodingsToTry)];
  
  for (const encoding of uniqueEncodings) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      const decoded = decoder.decode(buffer);
      
      // Check if the decoded text looks valid
      if (isValidText(decoded)) {
        console.log(`[SUBTITLE-PROXY] Successfully decoded with encoding: ${encoding}`);
        return decoded;
      }
    } catch (e) {
      // Encoding not supported, try next
      continue;
    }
  }
  
  // Last resort: UTF-8 with replacement characters
  console.warn('[SUBTITLE-PROXY] All encodings failed, using UTF-8 with replacement');
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
}

/**
 * Decompress gzip data using Node.js zlib
 * Falls back to returning raw data if decompression fails
 */
async function decompressGzip(buffer: ArrayBuffer, langCode?: string): Promise<string> {
  try {
    const decompressed = gunzipSync(Buffer.from(buffer));
    return decodeWithFallback(decompressed, langCode);
  } catch (error) {
    console.warn('[SUBTITLE-PROXY] Gzip decompression failed, trying as raw text:', error);
    // If decompression fails, try to decode as raw text
    return decodeWithFallback(Buffer.from(buffer), langCode);
  }
}

function convertSrtToVtt(srtContent: string): string {
  // Check if already VTT
  if (srtContent.trim().startsWith('WEBVTT')) {
    return srtContent;
  }

  // Convert SRT to VTT
  let vttContent = 'WEBVTT\n\n';
  
  // Replace SRT timecode format (00:00:00,000 --> 00:00:00,000) with VTT format (00:00:00.000 --> 00:00:00.000)
  vttContent += srtContent
    .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4')
    .replace(/^\d+\n/gm, ''); // Remove subtitle numbers

  return vttContent;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const url = searchParams.get('url');
    const langCode = searchParams.get('lang'); // Language code for encoding detection

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    console.log('[SUBTITLE-PROXY] Fetching subtitle from:', url, 'lang:', langCode);

    // Fetch the subtitle file with proper headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Encoding': 'gzip, deflate',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error('[SUBTITLE-PROXY] Failed to fetch subtitle:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Failed to fetch subtitle: ${response.status}` },
        { status: response.status }
      );
    }

    let content: string;
    
    // Check if URL ends with .gz or if content-encoding is gzip
    const isGzipped = url.endsWith('.gz') || response.headers.get('content-encoding') === 'gzip';
    
    if (isGzipped) {
      console.log('[SUBTITLE-PROXY] Decompressing gzip content');
      const buffer = await response.arrayBuffer();
      content = await decompressGzip(buffer, langCode || undefined);
    } else {
      // For non-gzipped content, we still need to handle encoding properly
      const buffer = await response.arrayBuffer();
      content = decodeWithFallback(Buffer.from(buffer), langCode || undefined);
    }

    // Convert to VTT if needed
    content = convertSrtToVtt(content);

    console.log('[SUBTITLE-PROXY] Serving subtitle, length:', content.length);

    // Return with proper CORS headers and content type
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('[SUBTITLE-PROXY] Error:', error);
    return NextResponse.json(
      { error: `Failed to proxy subtitle: ${error instanceof Error ? error.message : 'Unknown error'}` },
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
