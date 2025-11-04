import React from 'react';
import { tmdbService } from '@/lib/services/tmdb';
import type { MediaItem } from '@/types/media';
import HomePageClient from './HomePageClient';

/**
 * Home Page - Server Component
 * Fetches initial trending content on the server for optimal performance
 */
export default async function HomePage() {
  let trendingToday: MediaItem[] = [];
  let trendingWeek: MediaItem[] = [];
  let popularMovies: MediaItem[] = [];
  let popularTV: MediaItem[] = [];
  let error: string | null = null;

  try {
    // Fetch all trending content in parallel for optimal performance
    const [todayData, weekData, moviesData, tvData] = await Promise.all([
      tmdbService.getTrending('all', 'day').catch(() => []),
      tmdbService.getTrending('all', 'week').catch(() => []),
      tmdbService.getPopularMovies(1).catch(() => []),
      tmdbService.getPopularTV(1).catch(() => []),
    ]);

    trendingToday = todayData;
    trendingWeek = weekData;
    popularMovies = moviesData;
    popularTV = tvData;
  } catch (err) {
    console.error('Error fetching home page data:', err);
    error = 'Failed to load content. Please try again later.';
  }

  return (
    <HomePageClient
      trendingToday={trendingToday}
      trendingWeek={trendingWeek}
      popularMovies={popularMovies}
      popularTV={popularTV}
      error={error}
    />
  );
}
