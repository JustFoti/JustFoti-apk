/**
 * Content Components Examples
 * Demonstrates usage of content display components
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ContentCard, ContentGrid, HeroSection, CategoryRow } from './index';
import { tmdbService } from '@/lib/services/tmdb';
import type { MediaItem } from '@/types/media';

/**
 * Example 1: Single ContentCard
 */
export function ContentCardExample() {
  const [movie, setMovie] = useState<MediaItem | null>(null);

  useEffect(() => {
    tmdbService.getTrending('movie', 'week')
      .then(movies => setMovie(movies[0]))
      .catch(console.error);
  }, []);

  if (!movie) return <div>Loading...</div>;

  return (
    <div className="p-8 bg-black">
      <h2 className="text-2xl font-bold text-white mb-4">ContentCard Example</h2>
      <div className="max-w-xs">
        <ContentCard
          item={movie}
          onSelect={(id) => console.log('Selected:', id)}
        />
      </div>
    </div>
  );
}

/**
 * Example 2: ContentGrid with infinite scroll
 */
export function ContentGridExample() {
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const newMovies = await tmdbService.getTrending('movie', 'week');
      setMovies(prev => [...prev, ...newMovies]);
      setPage(prev => prev + 1);
      setHasMore(newMovies.length > 0);
    } catch (error) {
      console.error('Failed to load movies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-black min-h-screen">
      <h2 className="text-2xl font-bold text-white mb-6">ContentGrid Example</h2>
      <ContentGrid
        items={movies}
        onItemSelect={(id) => console.log('Selected:', id)}
        onLoadMore={loadMovies}
        hasMore={hasMore}
        loading={loading}
      />
    </div>
  );
}

/**
 * Example 3: HeroSection
 */
export function HeroSectionExample() {
  const [featured, setFeatured] = useState<MediaItem | null>(null);

  useEffect(() => {
    tmdbService.getTrending('movie', 'week')
      .then(movies => setFeatured(movies[0]))
      .catch(console.error);
  }, []);

  if (!featured) return <div>Loading...</div>;

  return (
    <div className="bg-black">
      <h2 className="text-2xl font-bold text-white p-8">HeroSection Example</h2>
      <HeroSection
        item={featured}
        onPlay={(id) => console.log('Play:', id)}
        onMoreInfo={(id) => console.log('More info:', id)}
      />
    </div>
  );
}

/**
 * Example 4: CategoryRow
 */
export function CategoryRowExample() {
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [tvShows, setTvShows] = useState<MediaItem[]>([]);

  useEffect(() => {
    Promise.all([
      tmdbService.getTrending('movie', 'week'),
      tmdbService.getTrending('tv', 'week'),
    ]).then(([movieData, tvData]) => {
      setMovies(movieData);
      setTvShows(tvData);
    }).catch(console.error);
  }, []);

  return (
    <div className="bg-black min-h-screen space-y-8 py-8">
      <h2 className="text-2xl font-bold text-white px-8">CategoryRow Example</h2>
      
      <CategoryRow
        title="Trending Movies"
        items={movies}
        onItemSelect={(id) => console.log('Selected movie:', id)}
        onViewAll={() => console.log('View all movies')}
      />

      <CategoryRow
        title="Trending TV Shows"
        items={tvShows}
        onItemSelect={(id) => console.log('Selected TV show:', id)}
        onViewAll={() => console.log('View all TV shows')}
      />
    </div>
  );
}

/**
 * Example 5: Complete page layout
 */
export function CompletePageExample() {
  const [featured, setFeatured] = useState<MediaItem | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [trendingTV, setTrendingTV] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [movies, tv, popular] = await Promise.all([
          tmdbService.getTrending('movie', 'week'),
          tmdbService.getTrending('tv', 'week'),
          tmdbService.getPopularMovies(),
        ]);

        setFeatured(movies[0]);
        setTrendingMovies(movies.slice(1));
        setTrendingTV(tv);
        setPopularMovies(popular);
      } catch (error) {
        console.error('Failed to load content:', error);
      }
    };

    loadContent();
  }, []);

  if (!featured) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      {/* Hero Section */}
      <HeroSection
        item={featured}
        onPlay={(id) => console.log('Play:', id)}
        onMoreInfo={(id) => console.log('More info:', id)}
      />

      {/* Content Rows */}
      <div className="space-y-12 py-12">
        <CategoryRow
          title="Trending Movies"
          items={trendingMovies}
          onItemSelect={(id) => console.log('Selected:', id)}
          onViewAll={() => console.log('View all trending movies')}
        />

        <CategoryRow
          title="Trending TV Shows"
          items={trendingTV}
          onItemSelect={(id) => console.log('Selected:', id)}
          onViewAll={() => console.log('View all trending TV')}
        />

        <CategoryRow
          title="Popular Movies"
          items={popularMovies}
          onItemSelect={(id) => console.log('Selected:', id)}
          onViewAll={() => console.log('View all popular movies')}
        />
      </div>
    </div>
  );
}

/**
 * Example 6: Grid with search/filter
 */
export function SearchableGridExample() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await tmdbService.search(query);
        // Convert SearchResult to MediaItem (simplified)
        const items: MediaItem[] = searchResults.map(r => ({
          ...r,
          overview: '',
          backdropPath: '',
          voteCount: 0,
          genres: [],
        }));
        setResults(items);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  return (
    <div className="p-8 bg-black min-h-screen">
      <h2 className="text-2xl font-bold text-white mb-6">Searchable Grid Example</h2>
      
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movies and TV shows..."
        className="w-full max-w-2xl px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-8"
      />

      <ContentGrid
        items={results}
        onItemSelect={(id) => console.log('Selected:', id)}
        loading={loading}
        emptyMessage={query ? 'No results found' : 'Start typing to search'}
      />
    </div>
  );
}
