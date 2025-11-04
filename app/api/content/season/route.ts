import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/services/tmdb';

/**
 * GET /api/content/season
 * Fetch TV show season details with episodes
 * Query params: tvId, seasonNumber
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tvId = searchParams.get('tvId');
    const seasonNumber = searchParams.get('seasonNumber');

    if (!tvId || !seasonNumber) {
      return NextResponse.json(
        { error: 'Missing required parameters: tvId and seasonNumber' },
        { status: 400 }
      );
    }

    const seasonData = await tmdbService.getSeasonDetails(
      tvId,
      parseInt(seasonNumber, 10)
    );

    return NextResponse.json(seasonData);
  } catch (error) {
    console.error('Error fetching season details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season details' },
      { status: 500 }
    );
  }
}
