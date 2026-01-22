import { NextRequest, NextResponse } from 'next/server';
import { getAllMALAnimeEpisodes, type MALEpisode } from '@/lib/services/mal';

export const runtime = 'edge';

// Cache episodes for 1 hour
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const malId = searchParams.get('malId');
  
  if (!malId) {
    return NextResponse.json({ success: false, error: 'Missing malId parameter' }, { status: 400 });
  }
  
  const malIdNum = parseInt(malId);
  if (isNaN(malIdNum)) {
    return NextResponse.json({ success: false, error: 'Invalid malId parameter' }, { status: 400 });
  }
  
  try {
    const episodes = await getAllMALAnimeEpisodes(malIdNum);
    
    return NextResponse.json({
      success: true,
      data: {
        malId: malIdNum,
        episodes: episodes.map((ep: MALEpisode) => ({
          number: ep.mal_id,
          title: ep.title,
          titleJapanese: ep.title_japanese,
          aired: ep.aired,
          score: ep.score,
          filler: ep.filler,
          recap: ep.recap,
        })),
        totalEpisodes: episodes.length,
      },
    });
  } catch (error) {
    console.error('[MAL Episodes API] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch episodes' }, { status: 500 });
  }
}
