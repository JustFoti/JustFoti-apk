import { Metadata } from 'next';
import AnimePageClient from './AnimePageClient';
import { malService, type MALAnime } from '@/lib/services/mal';
import { getCategoryIds } from '../../data/anime-categories';

export const metadata: Metadata = {
  title: 'Anime | FlyX',
  description: 'Browse and stream the best anime on FlyX',
};

export const revalidate = 3600; // Revalidate every hour

/**
 * Fetch anime data for a specific category with error handling
 * Returns only successfully fetched anime, logs failures
 * Fetches sequentially to respect MAL API rate limits
 */
async function fetchCategoryAnime(categoryId: string, limit: number = 20): Promise<MALAnime[]> {
  const malIds = getCategoryIds(categoryId).slice(0, limit);
  const successful: MALAnime[] = [];
  const failed: number[] = [];
  
  // Fetch sequentially to respect rate limits (350ms between requests)
  for (const id of malIds) {
    try {
      const anime = await malService.getById(id);
      if (anime) {
        successful.push(anime);
      } else {
        failed.push(id);
      }
    } catch (error) {
      console.error(`[AnimePage] Failed to fetch MAL ID ${id}:`, error);
      failed.push(id);
    }
  }
  
  if (failed.length > 0) {
    console.warn(`[AnimePage] Failed to fetch ${failed.length} anime in category "${categoryId}":`, failed);
  }
  
  console.log(`[AnimePage] Category "${categoryId}": ${successful.length}/${malIds.length} successful`);
  return successful;
}

/**
 * Fetch all anime data for the browse page
 * Uses curated MAL IDs from anime-categories.ts
 * Fetches categories sequentially to respect rate limits
 */
async function getMALAnimeData() {
  try {
    console.log('[AnimePage] Fetching anime data for all categories...');
    const startTime = Date.now();
    
    // Fetch categories sequentially to avoid overwhelming the API
    // Reduced to 10 per category for faster loading
    const popular = await fetchCategoryAnime('popular', 10);
    const topRated = await fetchCategoryAnime('top-rated', 10);
    const action = await fetchCategoryAnime('action', 7);
    const fantasy = await fetchCategoryAnime('fantasy', 5);
    const romance = await fetchCategoryAnime('romance', 4);

    const executionTime = Date.now() - startTime;
    console.log(`[AnimePage] Fetched anime data in ${executionTime}ms`);
    console.log(`[AnimePage] Results: popular=${popular.length}, topRated=${topRated.length}, action=${action.length}, fantasy=${fantasy.length}, romance=${romance.length}`);

    return {
      popular,
      topRated,
      action,
      fantasy,
      romance,
    };
  } catch (error) {
    console.error('[AnimePage] Error fetching MAL anime:', error);
    return null;
  }
}

export default async function AnimePage() {
  const data = await getMALAnimeData();
  
  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Failed to load anime. Please try again later.</p>
      </div>
    );
  }

  return <AnimePageClient {...data} />;
}
