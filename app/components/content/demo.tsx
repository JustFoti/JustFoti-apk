/**
 * Content Components Demo
 * Quick visual test to verify all components render correctly
 */

'use client';

import React from 'react';
import { ContentCard, ContentGrid, HeroSection, CategoryRow } from './index';
import type { MediaItem } from '@/types/media';

// Mock data for demo
const mockMovie: MediaItem = {
  id: '1',
  title: 'Futuristic Adventure',
  overview: 'An epic journey through space and time with stunning visuals and groundbreaking special effects.',
  posterPath: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  backdropPath: 'https://image.tmdb.org/t/p/original/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  releaseDate: '2024-01-15',
  rating: 8.7,
  voteCount: 15420,
  mediaType: 'movie',
  genres: [
    { id: 1, name: 'Action' },
    { id: 2, name: 'Sci-Fi' },
    { id: 3, name: 'Adventure' },
  ],
  runtime: 142,
};

const mockMovies: MediaItem[] = Array.from({ length: 12 }, (_, i) => ({
  ...mockMovie,
  id: `${i + 1}`,
  title: `${mockMovie.title} ${i + 1}`,
  rating: 7 + Math.random() * 2,
}));

export function ContentDisplayDemo() {
  const handleSelect = (id: string) => {
    console.log('Selected item:', id);
  };

  const handlePlay = (id: string) => {
    console.log('Play item:', id);
  };

  const handleMoreInfo = (id: string) => {
    console.log('More info:', id);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section Demo */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white px-8 py-4">Hero Section</h2>
        <HeroSection
          item={mockMovie}
          onPlay={handlePlay}
          onMoreInfo={handleMoreInfo}
        />
      </section>

      {/* Category Row Demo */}
      <section className="mb-12">
        <CategoryRow
          title="Trending Movies"
          items={mockMovies}
          onItemSelect={handleSelect}
          onViewAll={() => console.log('View all')}
        />
      </section>

      {/* Content Grid Demo */}
      <section className="mb-12 px-8">
        <h2 className="text-3xl font-bold text-white mb-6">Content Grid</h2>
        <ContentGrid
          items={mockMovies}
          onItemSelect={handleSelect}
        />
      </section>

      {/* Single Card Demo */}
      <section className="mb-12 px-8">
        <h2 className="text-3xl font-bold text-white mb-6">Single Content Card</h2>
        <div className="max-w-xs">
          <ContentCard
            item={mockMovie}
            onSelect={handleSelect}
          />
        </div>
      </section>
    </div>
  );
}

export default ContentDisplayDemo;
