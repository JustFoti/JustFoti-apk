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
 */
async function fetchCategoryAnime(categoryId: string, limit: number = 20): Promise<MALAnime[]> {
  const malIds = getCategoryIds(categoryId).slice(0, limit);
  const results = await Promise.allSettled(
    malIds.map((id: number) => malService.getById(id))
  );
  
  const successful = results
    .filter((result): result is PromiseFulfilledResult<MALAnime> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map((result: PromiseFulfilledResult<MALAnime>) => result.value);
  
  const failed = results
    .map((result: PromiseSettledResult<MALAnime | null>, index: number) => ({ result, malId: malIds[index] }))
    .filter(({ result }: { result: PromiseSettledResult<MALAnime | null> }) => result.status === 'rejected' || (result.status === 'fulfilled' && result.value === null));
  
  if (failed.length > 0) {
    console.warn(`[AnimePage] Failed to fetch ${failed.length} anime in category "${categoryId}":`, 
      failed.map((f: { malId: number }) => f.malId)
    );
  }
  
  return successful;
}

/**
 * Fetch all anime data for the browse page
 * Uses curated MAL IDs from anime-categories.ts
 */
async function getMALAnimeData() {
  try {
    console.log('[AnimePage] Fetching anime data for all categories...');
    const startTime = Date.now();
    
    // Fetch all categories in parallel
    const [popular, topRated, action, fantasy, romance] = await Promise.all([
      fetchCategoryAnime('popular', 20),
      fetchCategoryAnime('top-rated', 20),
      fetchCategoryAnime('action', 20),
      fetchCategoryAnime('fantasy', 20),
      fetchCategoryAnime('romance', 20),
    ]);

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
