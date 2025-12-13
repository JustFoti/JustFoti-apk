import { Metadata } from 'next';
import AnimePageClient from './AnimePageClient';
import { fetchTMDBData } from '@/app/lib/services/tmdb';

export const metadata: Metadata = {
  title: 'Anime | FlyX',
  description: 'Browse and stream the best anime on FlyX',
};

export const revalidate = 3600;

async function getAnimeData() {
  try {
    const [popularAnime, topRatedAnime, airingAnime, actionAnime, fantasyAnime, romanceAnime, animeMovies] = await Promise.all([
      fetchTMDBData('/discover/tv', { with_genres: '16', with_origin_country: 'JP', sort_by: 'popularity.desc', page: '1' }),
      fetchTMDBData('/discover/tv', { with_genres: '16', with_origin_country: 'JP', sort_by: 'vote_average.desc', 'vote_count.gte': '100', page: '1' }),
      fetchTMDBData('/discover/tv', { with_genres: '16', with_origin_country: 'JP', 'air_date.gte': new Date(Date.now() - 60*24*60*60*1000).toISOString().split('T')[0], sort_by: 'popularity.desc' }),
      fetchTMDBData('/discover/tv', { with_genres: '16,10759', with_origin_country: 'JP', sort_by: 'popularity.desc' }),
      fetchTMDBData('/discover/tv', { with_genres: '16,10765', with_origin_country: 'JP', sort_by: 'popularity.desc' }),
      fetchTMDBData('/discover/tv', { with_genres: '16', with_keywords: '210024', with_origin_country: 'JP', sort_by: 'popularity.desc' }),
      fetchTMDBData('/discover/movie', { with_genres: '16', with_origin_country: 'JP', sort_by: 'popularity.desc', page: '1' }),
    ]);

    const addMediaType = (items: any[], type: 'tv' | 'movie') => items?.map((item: any) => ({ ...item, mediaType: type })) || [];

    return {
      popular: { items: addMediaType(popularAnime?.results, 'tv'), total: popularAnime?.total_results || 0 },
      topRated: { items: addMediaType(topRatedAnime?.results, 'tv'), total: topRatedAnime?.total_results || 0 },
      airing: { items: addMediaType(airingAnime?.results, 'tv'), total: airingAnime?.total_results || 0 },
      action: { items: addMediaType(actionAnime?.results, 'tv'), total: actionAnime?.total_results || 0 },
      fantasy: { items: addMediaType(fantasyAnime?.results, 'tv'), total: fantasyAnime?.total_results || 0 },
      romance: { items: addMediaType(romanceAnime?.results, 'tv'), total: romanceAnime?.total_results || 0 },
      movies: { items: addMediaType(animeMovies?.results, 'movie'), total: animeMovies?.total_results || 0 },
    };
  } catch (error) {
    console.error('Error fetching anime:', error);
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
