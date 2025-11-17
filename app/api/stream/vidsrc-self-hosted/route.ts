/**
 * VidSrc Self-Hosted Decoder API Route
 * 
 * Extracts M3U8 URLs using the self-hosted decoder
 * Runs entirely on Vercel's Node.js runtime
 * 
 * NO EXTERNAL SERVICES REQUIRED
 */

import { NextRequest, NextResponse } from 'next/server';
import { decode } from '@/app/lib/services/rcp/vercel-decoder';

// Node.js runtime (default) - required for JSDOM + VM
// DO NOT add: export const runtime = 'edge';

interface ExtractResponse {
  success: boolean;
  url?: string;
  source?: string;
  error?: string;
  metadata?: {
    executionTime: number;
    cached?: boolean;
  };
}

// Simple in-memory cache
const cache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Complete extraction flow using self-hosted decoder
 */
async function extractVidsrcSelfHosted(
  tmdbId: string,
  type: string,
  season?: string | null,
  episode?: string | null
): Promise<string> {
  // Step 1: Fetch embed page
  const embedUrl = type === 'movie'
    ? `https://vidsrc-embed.ru/embed/movie/${tmdbId}`
    : `https://vidsrc-embed.ru/embed/tv/${tmdbId}/${season}/${episode}`;

  console.log('[VidSrc API] Fetching embed page:', embedUrl);

  const embedResponse = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://vidsrc-embed.ru/'
    }
  });

  if (!embedResponse.ok) {
    throw new Error(`Failed to fetch embed page: ${embedResponse.status}`);
  }

  const embedHtml = await embedResponse.text();

  // Step 2: Extract RCP hash
  const rcpHashMatch = embedHtml.match(/\/rcp\/([a-zA-Z0-9+\/=]+)/);
  if (!rcpHashMatch) {
    throw new Error('Failed to extract RCP hash from embed page');
  }

  const rcpHash = rcpHashMatch[1];
  console.log('[VidSrc API] Extracted RCP hash');

  // Step 3: Fetch RCP page
  const rcpUrl = `https://cloudnestra.com/rcp/${rcpHash}`;
  console.log('[VidSrc API] Fetching RCP page');

  const rcpResponse = await fetch(rcpUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://vidsrc-embed.ru/'
    }
  });

  if (!rcpResponse.ok) {
    throw new Error(`Failed to fetch RCP page: ${rcpResponse.status}`);
  }

  const rcpHtml = await rcpResponse.text();

  // Step 4: Extract ProRCP hash
  const proRcpMatch = rcpHtml.match(/\/prorcp\/([a-zA-Z0-9+\/=]+)/);
  if (!proRcpMatch) {
    throw new Error('Failed to extract ProRCP hash from RCP page');
  }

  const proRcpHash = proRcpMatch[1];
  console.log('[VidSrc API] Extracted ProRCP hash');

  // Step 5: Fetch ProRCP page
  const proRcpUrl = `https://cloudnestra.com/prorcp/${proRcpHash}`;
  console.log('[VidSrc API] Fetching ProRCP page');

  const proRcpResponse = await fetch(proRcpUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://vidsrc-embed.ru/'
    }
  });

  if (!proRcpResponse.ok) {
    throw new Error(`Failed to fetch ProRCP page: ${proRcpResponse.status}`);
  }

  const proRcpHtml = await proRcpResponse.text();

  // Step 6: Extract hidden div
  const divMatch = proRcpHtml.match(
    /<div[^>]+id=["']([^"']+)["'][^>]*style=["'][^"']*display:\s*none[^"']*["'][^>]*>([^<]+)<\/div>/
  );
  if (!divMatch) {
    throw new Error('Failed to extract hidden div from ProRCP page');
  }

  const divId = divMatch[1];
  const divContent = divMatch[2];
  console.log('[VidSrc API] Extracted hidden div:', divId);

  // Step 7: Extract data-i attribute
  const dataIMatch = proRcpHtml.match(/data-i=["']([^"']+)["']/);
  if (!dataIMatch) {
    throw new Error('Failed to extract data-i attribute');
  }

  const dataI = dataIMatch[1];
  console.log('[VidSrc API] Extracted data-i:', dataI);

  // Step 8: Decode using self-hosted decoder (runs on Vercel)
  console.log('[VidSrc API] Decoding with self-hosted decoder');
  const m3u8Url = await decode(divContent, dataI, divId);

  if (!m3u8Url) {
    throw new Error('Decoder returned empty result');
  }

  console.log('[VidSrc API] Successfully extracted M3U8 URL');
  return m3u8Url;
}

/**
 * GET /api/stream/vidsrc-self-hosted
 * 
 * Query params:
 * - tmdbId: TMDB ID (required)
 * - type: 'movie' or 'tv' (required)
 * - season: Season number (required for TV)
 * - episode: Episode number (required for TV)
 */
export async function GET(request: NextRequest): Promise<NextResponse<ExtractResponse>> {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const tmdbId = searchParams.get('tmdbId');
    const type = searchParams.get('type') || 'movie';
    const season = searchParams.get('season');
    const episode = searchParams.get('episode');

    // Validate input
    if (!tmdbId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing tmdbId parameter'
        },
        { status: 400 }
      );
    }

    if (type === 'tv' && (!season || !episode)) {
      return NextResponse.json(
        {
          success: false,
          error: 'TV shows require season and episode parameters'
        },
        { status: 400 }
      );
    }

    console.log('[VidSrc API] Extracting:', { tmdbId, type, season, episode });

    // Check cache
    const cacheKey = `${tmdbId}-${type}-${season || ''}-${episode || ''}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[VidSrc API] Cache hit');
      return NextResponse.json({
        success: true,
        url: cached.url,
        source: 'vidsrc-self-hosted',
        metadata: {
          executionTime: Date.now() - startTime,
          cached: true
        }
      });
    }

    // Extract M3U8 URL
    const m3u8Url = await extractVidsrcSelfHosted(tmdbId, type, season, episode);

    // Cache result
    cache.set(cacheKey, {
      url: m3u8Url,
      timestamp: Date.now()
    });

    const executionTime = Date.now() - startTime;
    console.log(`[VidSrc API] Success in ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      url: m3u8Url,
      source: 'vidsrc-self-hosted',
      metadata: {
        executionTime,
        cached: false
      }
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[VidSrc API] Failed in ${executionTime}ms:`, errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        metadata: {
          executionTime
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stream/vidsrc-self-hosted
 * 
 * Body:
 * {
 *   "tmdbId": "550",
 *   "type": "movie",
 *   "season": 1,  // optional, for TV
 *   "episode": 1  // optional, for TV
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<ExtractResponse>> {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { tmdbId, type, season, episode } = body;

    // Validate input
    if (!tmdbId || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: tmdbId, type'
        },
        { status: 400 }
      );
    }

    if (type === 'tv' && (season === undefined || episode === undefined)) {
      return NextResponse.json(
        {
          success: false,
          error: 'TV shows require season and episode'
        },
        { status: 400 }
      );
    }

    console.log('[VidSrc API] Extracting:', { tmdbId, type, season, episode });

    // Check cache
    const cacheKey = `${tmdbId}-${type}-${season || ''}-${episode || ''}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[VidSrc API] Cache hit');
      return NextResponse.json({
        success: true,
        url: cached.url,
        source: 'vidsrc-self-hosted',
        metadata: {
          executionTime: Date.now() - startTime,
          cached: true
        }
      });
    }

    // Extract M3U8 URL
    const m3u8Url = await extractVidsrcSelfHosted(
      tmdbId,
      type,
      season?.toString(),
      episode?.toString()
    );

    // Cache result
    cache.set(cacheKey, {
      url: m3u8Url,
      timestamp: Date.now()
    });

    const executionTime = Date.now() - startTime;
    console.log(`[VidSrc API] Success in ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      url: m3u8Url,
      source: 'vidsrc-self-hosted',
      metadata: {
        executionTime,
        cached: false
      }
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[VidSrc API] Failed in ${executionTime}ms:`, errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        metadata: {
          executionTime
        }
      },
      { status: 500 }
    );
  }
}
