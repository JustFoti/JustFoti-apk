/**
 * Content Components Tests
 * Tests for ContentCard, ContentGrid, HeroSection, and CategoryRow
 */

import { describe, test, expect, mock } from 'bun:test';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { MediaItem } from '@/types/media';

// Mock Framer Motion to avoid animation issues in tests
mock.module('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (target, prop) => {
      const Component = ({ children, ...props }: any) => 
        React.createElement(prop as string, props, children);
      return Component;
    }
  }),
  AnimatePresence: ({ children }: any) => children,
  useMotionValue: () => ({ set: () => {}, get: () => 0 }),
  useSpring: (value: any) => value,
  useTransform: (value: any, input: any, output: any) => value,
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
}));

// Mock Next.js Image component
mock.module('next/image', () => ({
  default: ({ src, alt, ...props }: any) => 
    React.createElement('img', { src, alt, ...props }),
}));

// Sample test data
const mockMediaItem: MediaItem = {
  id: '123',
  title: 'Test Movie',
  overview: 'This is a test movie overview',
  posterPath: '/test-poster.jpg',
  backdropPath: '/test-backdrop.jpg',
  releaseDate: '2024-01-01',
  rating: 8.5,
  voteCount: 1000,
  mediaType: 'movie',
  genres: [
    { id: 1, name: 'Action' },
    { id: 2, name: 'Adventure' },
  ],
  runtime: 120,
};

const mockMediaItems: MediaItem[] = [
  mockMediaItem,
  { ...mockMediaItem, id: '124', title: 'Test Movie 2' },
  { ...mockMediaItem, id: '125', title: 'Test Movie 3' },
];

describe('Content Components', () => {
  describe('ContentCard', () => {
    test('renders media item correctly', () => {
      const { ContentCard } = require('../ContentCard');
      render(<ContentCard item={mockMediaItem} />);
      
      expect(screen.getByText('Test Movie')).toBeDefined();
      expect(screen.getByText('8.5')).toBeDefined();
    });

    test('calls onSelect when clicked', () => {
      const { ContentCard } = require('../ContentCard');
      const onSelect = mock(() => {});
      
      const { container } = render(
        <ContentCard item={mockMediaItem} onSelect={onSelect} />
      );
      
      const card = container.querySelector('[role="article"]');
      card?.click();
      
      expect(onSelect).toHaveBeenCalledWith('123');
    });

    test('displays correct media type badge', () => {
      const { ContentCard } = require('../ContentCard');
      render(<ContentCard item={mockMediaItem} />);
      
      expect(screen.getByText('MOVIE')).toBeDefined();
    });

    test('displays genres', () => {
      const { ContentCard } = require('../ContentCard');
      render(<ContentCard item={mockMediaItem} />);
      
      const genreText = screen.getByText(/Action/);
      expect(genreText).toBeDefined();
    });
  });

  describe('ContentGrid', () => {
    test('renders multiple items', () => {
      const { ContentGrid } = require('../ContentGrid');
      render(<ContentGrid items={mockMediaItems} />);
      
      expect(screen.getByText('Test Movie')).toBeDefined();
      expect(screen.getByText('Test Movie 2')).toBeDefined();
      expect(screen.getByText('Test Movie 3')).toBeDefined();
    });

    test('shows empty message when no items', () => {
      const { ContentGrid } = require('../ContentGrid');
      render(<ContentGrid items={[]} emptyMessage="No content" />);
      
      expect(screen.getByText('No content')).toBeDefined();
    });

    test('shows loading skeletons', () => {
      const { ContentGrid } = require('../ContentGrid');
      const { container } = render(
        <ContentGrid items={[]} loading={true} />
      );
      
      const skeletons = container.querySelectorAll('.content-card-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('calls onItemSelect when item is clicked', () => {
      const { ContentGrid } = require('../ContentGrid');
      const onItemSelect = mock(() => {});
      
      const { container } = render(
        <ContentGrid items={mockMediaItems} onItemSelect={onItemSelect} />
      );
      
      const firstCard = container.querySelector('[role="article"]');
      firstCard?.click();
      
      expect(onItemSelect).toHaveBeenCalled();
    });
  });

  describe('HeroSection', () => {
    test('renders featured item', () => {
      const { HeroSection } = require('../HeroSection');
      render(<HeroSection item={mockMediaItem} />);
      
      expect(screen.getByText('Test Movie')).toBeDefined();
      expect(screen.getByText(/This is a test movie overview/)).toBeDefined();
    });

    test('displays rating and metadata', () => {
      const { HeroSection } = require('../HeroSection');
      render(<HeroSection item={mockMediaItem} />);
      
      expect(screen.getByText('8.5')).toBeDefined();
      expect(screen.getByText('2024')).toBeDefined();
      expect(screen.getByText(/2h 0m/)).toBeDefined();
    });

    test('calls onPlay when play button clicked', () => {
      const { HeroSection } = require('../HeroSection');
      const onPlay = mock(() => {});
      
      render(<HeroSection item={mockMediaItem} onPlay={onPlay} />);
      
      const playButton = screen.getByText('Play Now').closest('button');
      playButton?.click();
      
      expect(onPlay).toHaveBeenCalledWith('123');
    });

    test('calls onMoreInfo when info button clicked', () => {
      const { HeroSection } = require('../HeroSection');
      const onMoreInfo = mock(() => {});
      
      render(<HeroSection item={mockMediaItem} onMoreInfo={onMoreInfo} />);
      
      const infoButton = screen.getByText('More Info').closest('button');
      infoButton?.click();
      
      expect(onMoreInfo).toHaveBeenCalledWith('123');
    });
  });

  describe('CategoryRow', () => {
    test('renders title and items', () => {
      const { CategoryRow } = require('../CategoryRow');
      render(
        <CategoryRow title="Trending Movies" items={mockMediaItems} />
      );
      
      expect(screen.getByText('Trending Movies')).toBeDefined();
      expect(screen.getByText('Test Movie')).toBeDefined();
    });

    test('shows View All button when onViewAll provided', () => {
      const { CategoryRow } = require('../CategoryRow');
      const onViewAll = mock(() => {});
      
      render(
        <CategoryRow 
          title="Trending Movies" 
          items={mockMediaItems}
          onViewAll={onViewAll}
        />
      );
      
      const viewAllButton = screen.getByText('View All');
      expect(viewAllButton).toBeDefined();
      
      viewAllButton.click();
      expect(onViewAll).toHaveBeenCalled();
    });

    test('does not render when items array is empty', () => {
      const { CategoryRow } = require('../CategoryRow');
      const { container } = render(
        <CategoryRow title="Empty Row" items={[]} />
      );
      
      expect(container.querySelector('.category-row')).toBeNull();
    });

    test('calls onItemSelect when item clicked', () => {
      const { CategoryRow } = require('../CategoryRow');
      const onItemSelect = mock(() => {});
      
      const { container } = render(
        <CategoryRow 
          title="Trending Movies" 
          items={mockMediaItems}
          onItemSelect={onItemSelect}
        />
      );
      
      const firstCard = container.querySelector('[role="article"]');
      firstCard?.click();
      
      expect(onItemSelect).toHaveBeenCalled();
    });
  });
});
