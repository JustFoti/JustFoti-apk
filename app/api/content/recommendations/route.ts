import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'movie';

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 });
  }

  try {
    // Fetch recommendations from TMDB
    const response = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      // If recommendations fail, try similar content
      const similarResponse = await fetch(
        `${TMDB_BASE_URL}/${type}/${id}/similar?api_key=${TMDB_API_KEY}&language=en-US&page=1`,
        { next: { revalidate: 3600 } }
      );

      if (!similarResponse.ok) {
        return NextResponse.json({ results: [] });
      }

      const similarData = await similarResponse.json();
      const results = (similarData.results || []).map((item: any) => ({
        ...item,
        mediaType: type,
        media_type: type,
      }));

      return NextResponse.json({ results });
    }

    const data = await response.json();
    const results = (data.results || []).map((item: any) => ({
      ...item,
      mediaType: type,
      media_type: type,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Recommendations API] Error:', error);
    return NextResponse.json({ results: [] });
  }
}
