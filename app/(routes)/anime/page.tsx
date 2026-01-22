import { Metadata } from 'next';
import AnimePageClient from './AnimePageClient';
import { malListingsService, MAL_GENRES, type MALAnimeListItem } from '@/lib/services/mal-listings';

export const metadata: Metadata = {
  title: 'Anime | FlyX',
  description: 'Browse and stream the best anime on FlyX - powered by MyAnimeList',
};

// Revalidate every hour
export const revalidate = 3600;

interface AnimeData {
  airing: { items: MALAnimeListItem[]; total: number };
  popular: { items: MALAnimeListItem[]; total: number };
  topRated: { items: MALAnimeListItem[]; total: number };
  action: { items: MALAnimeListItem[]; total: number };
  fantasy: { items: MALAnimeListItem[]; total: number };
  romance: { items: MALAnimeListItem[]; total: number };
  movies: { items: MALAnimeListItem[]; total: number };
}

async function getAnimeData(): Promise<AnimeData | null> {
  try {
    // Fetch all anime data from MAL with rate limiting handled internally
    // We stagger the requests to avoid hitting rate limits
    const airing = await malListingsService.getAiringAnime(1, 25);
    const popular = await malListingsService.getPopularAnime(1, 25);
    const topRated = await malListingsService.getTopRatedAnime(1, 25);
    const action = await malListingsService.getAnimeByGenre(MAL_GENRES.ACTION, 1, 25);
    const fantasy = await malListingsService.getAnimeByGenre(MAL_GENRES.FANTASY, 1, 25);
    const romance = await malListingsService.getAnimeByGenre(MAL_GENRES.ROMANCE, 1, 25);
    const movies = await malListingsService.getAnimeMovies(1, 25);

    return {
      airing: { items: airing.items, total: airing.pagination.items.total },
      popular: { items: popular.items, total: popular.pagination.items.total },
      topRated: { items: topRated.items, total: topRated.pagination.items.total },
      action: { items: action.items, total: action.pagination.items.total },
      fantasy: { items: fantasy.items, total: fantasy.pagination.items.total },
      romance: { items: romance.items, total: romance.pagination.items.total },
      movies: { items: movies.items, total: movies.pagination.items.total },
    };
  } catch (error) {
    console.error('[AnimePage] Error fetching anime data:', error);
    return null;
  }
}

export default async function AnimePage() {
  const data = await getAnimeData();

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Failed to load anime. Please try again later.</p>
      </div>
    );
  }

  return <AnimePageClient {...data} />;
}
