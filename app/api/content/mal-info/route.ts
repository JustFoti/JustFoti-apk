/**
 * MAL Info API Route
 * GET /api/content/mal-info
 * Fetches MyAnimeList data for anime content
 * 
 * Query params:
 * - tmdbId: TMDB ID of the content
 * - type: 'movie' | 'tv'
 * - title: Title to search for (optional, will fetch from TMDB if not provided)
 * - season: TMDB season number (optional, defaults to 1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { malService, type MALAnimeDetails } from '@/lib/services/mal';

// Simple in-memory cache for MAL data (survives across requests in same process)
const malCache = new Map<string, { data: MALAnimeDetails | null; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tmdbId = searchParams.get('tmdbId');
  const type = searchParams.get('type') as 'movie' | 'tv';
  const seasonParam = searchParams.get('season');
  const season = seasonParam ? parseInt(seasonParam) : 1;
  let title = searchParams.get('title');

  if (!tmdbId || !type) {
    return NextResponse.json(
      { error: 'Missing required parameters: tmdbId and type' },
      { status: 400 }
    );
  }

  try {
    // If no title provided, fetch from TMDB
    if (!title) {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      if (apiKey) {
        const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}`;
        const tmdbResponse = await fetch(tmdbUrl);
        if (tmdbResponse.ok) {
          const tmdbData = await tmdbResponse.json();
          title = tmdbData.name || tmdbData.title;
        }
      }
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Could not determine title for MAL search' },
        { status: 400 }
      );
    }

    // Check cache - include season in cache key for season-specific MAL entries
    const cacheKey = `${tmdbId}-${type}-${season}-${title}`;
    const cached = malCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[mal-info] Cache hit for ${cacheKey}, seasons: ${cached.data?.allSeasons?.length || 0}`);
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      });
    }

    console.log(`[mal-info] Fetching MAL data for: "${title}" (TMDB ${tmdbId} S${season})`);
    
    // First, try to get ALL seasons for anime with complete mappings (like JJK)
    // This returns all MAL entries for the series, not just one season
    let malData = await malService.getAllMALSeasonsForTMDB(parseInt(tmdbId), title);
    
    // If no complete mapping exists, fall back to season-specific mapping
    if (!malData) {
      malData = await malService.getDataForTMDBWithSeasonMapping(parseInt(tmdbId), title, season);
    }

    console.log(`[mal-info] MAL result:`, {
      found: !!malData,
      mainEntry: malData?.mainEntry?.title,
      mainEntryMalId: malData?.mainEntry?.mal_id,
      seasonsCount: malData?.allSeasons?.length || 0,
      seasons: malData?.allSeasons?.map(s => ({ 
        title: s.title, 
        titleEnglish: s.titleEnglish,
        malId: s.malId,
        eps: s.episodes 
      })),
      totalEpisodes: malData?.totalEpisodes
    });

    // Cache the result
    malCache.set(cacheKey, { data: malData, timestamp: Date.now() });

    if (!malData) {
      return NextResponse.json({
        success: false,
        error: 'No MAL match found',
        searchedTitle: title,
      });
    }

    return NextResponse.json({
      success: true,
      data: malData,
      cached: false,
      debug: {
        searchedTitle: title,
        season,
        mainEntry: malData.mainEntry?.title,
        seasonsCount: malData.allSeasons?.length,
        totalEpisodes: malData.totalEpisodes
      }
    });
  } catch (error) {
    console.error('[mal-info] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MAL data' },
      { status: 500 }
    );
  }
}
