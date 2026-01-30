/**
 * MAL-Based Anime Stream API
 * GET /api/anime/stream?malId=57658&episode=1
 * GET /api/anime/stream?malId=4107 (for movies, no episode needed)
 * 
 * This endpoint uses MAL ID directly without TMDB conversion
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractAnimeKaiStreams } from '@/app/lib/services/animekai-extractor';
import { malService } from '@/lib/services/mal';
import { getAnimeKaiProxyUrl } from '@/app/lib/proxy-config';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;

    const malId = searchParams.get('malId') ? parseInt(searchParams.get('malId')!) : undefined;
    const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!) : undefined;

    if (!malId) {
      return NextResponse.json(
        { error: 'MAL ID is required' },
        { status: 400 }
      );
    }

    console.log(`[ANIME-STREAM] Request: MAL ID ${malId}, Episode ${episode || 'N/A (movie)'}`);

    // Get MAL anime info
    const anime = await malService.getById(malId);
    if (!anime) {
      return NextResponse.json(
        { error: 'Anime not found on MAL' },
        { status: 404 }
      );
    }

    const isMovie = anime.type === 'Movie';
    console.log(`[ANIME-STREAM] Found anime: ${anime.title} (type: ${anime.type}, episodes: ${anime.episodes})`);

    // Extract streams using AnimeKai with MAL info
    // Use a dummy TMDB ID (0) since we're going MAL-direct
    const result = await extractAnimeKaiStreams(
      '0', // Dummy TMDB ID
      isMovie ? 'movie' : 'tv',
      isMovie ? undefined : 1, // Season 1 for TV (MAL entries are separate)
      isMovie ? undefined : (episode || 1),
      malId,
      anime.title
    );

    if (!result.success || result.sources.length === 0) {
      return NextResponse.json(
        { error: result.error || 'No streams found', success: false },
        { status: 404 }
      );
    }

    const executionTime = Date.now() - startTime;

    // Proxy the URLs through the animekai proxy (residential proxy)
    const sources = result.sources.map(source => ({
      ...source,
      url: getAnimeKaiProxyUrl(source.url),
    }));

    return NextResponse.json({
      success: true,
      sources,
      provider: 'animekai',
      anime: {
        malId: anime.mal_id,
        title: anime.title,
        titleEnglish: anime.title_english,
        episodes: anime.episodes,
        type: anime.type,
      },
      executionTime,
    });
  } catch (error) {
    console.error('[ANIME-STREAM] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anime stream', success: false },
      { status: 500 }
    );
  }
}
