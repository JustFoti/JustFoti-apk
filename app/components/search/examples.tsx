/**
 * Search Components Examples
 * Demonstrates usage of all search components
 */

'use client';

import React, { useState } from 'react';
import {
  SearchBar,
  SearchResults,
  SearchSuggestions,
  SearchContainer,
} from './index';
import type { SearchResult } from '@/types/media';

// Mock search results
const mockResults: SearchResult[] = [
  {
    id: '1',
    title: 'The Matrix',
    posterPath: 'https://image.tmdb.org/t/p/w500/path.jpg',
    mediaType: 'movie',
    releaseDate: '1999-03-31',
    rating: 8.7,
  },
  {
    id: '2',
    title: 'Breaking Bad',
    posterPath: 'https://image.tmdb.org/t/p/w500/path.jpg',
    mediaType: 'tv',
    releaseDate: '2008-01-20',
    rating: 9.5,
  },
];

/**
 * Example 1: Basic SearchBar
 */
export function SearchBarExample() {
  const [query, setQuery] = useState('');

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h2>SearchBar Example</h2>
      <SearchBar
        onSearch={(q) => {
          console.log('Search query:', q);
          setQuery(q);
        }}
        placeholder="Search for movies..."
        autoFocus={false}
      />
      {query && <p style={{ marginTop: '1rem', color: 'white' }}>Query: {query}</p>}
    </div>
  );
}

/**
 * Example 2: SearchResults with mock data
 */
export function SearchResultsExample() {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', position: 'relative' }}>
      <h2>SearchResults Example</h2>
      <SearchResults
        results={mockResults}
        loading={false}
        query="matrix"
        onSelect={(id, mediaType) => {
          console.log('Selected:', id, mediaType);
        }}
        selectedIndex={selectedIndex}
        onKeyboardNavigate={setSelectedIndex}
      />
    </div>
  );
}

/**
 * Example 3: SearchResults loading state
 */
export function SearchResultsLoadingExample() {
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', position: 'relative' }}>
      <h2>SearchResults Loading Example</h2>
      <SearchResults
        results={[]}
        loading={true}
        query="action"
        onSelect={() => {}}
      />
    </div>
  );
}

/**
 * Example 4: SearchResults empty state
 */
export function SearchResultsEmptyExample() {
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', position: 'relative' }}>
      <h2>SearchResults Empty Example</h2>
      <SearchResults
        results={[]}
        loading={false}
        query="nonexistent movie"
        onSelect={() => {}}
      />
    </div>
  );
}

/**
 * Example 5: SearchSuggestions
 */
export function SearchSuggestionsExample() {
  const [query, setQuery] = useState('');

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h2>SearchSuggestions Example</h2>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type to see suggestions..."
        style={{
          width: '100%',
          padding: '0.75rem',
          marginBottom: '1rem',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '0.5rem',
          color: 'white',
        }}
      />
      <div style={{ position: 'relative' }}>
        <SearchSuggestions
          query={query}
          onSelect={(suggestion) => {
            console.log('Selected suggestion:', suggestion);
            setQuery(suggestion);
          }}
          maxSuggestions={5}
        />
      </div>
    </div>
  );
}

/**
 * Example 6: Complete SearchContainer
 */
export function SearchContainerExample() {
  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h2>SearchContainer Example</h2>
      <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
        Complete search experience with all features integrated
      </p>
      <SearchContainer
        autoFocus={false}
        onClose={() => console.log('Search closed')}
      />
    </div>
  );
}

/**
 * Example 7: SearchContainer with auto-focus
 */
export function SearchContainerAutoFocusExample() {
  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h2>SearchContainer Auto-Focus Example</h2>
      <SearchContainer
        autoFocus={true}
        onClose={() => console.log('Search closed')}
      />
    </div>
  );
}

/**
 * Example 8: Custom integration
 */
export function CustomSearchIntegrationExample() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setResults(mockResults);
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', position: 'relative' }}>
      <h2>Custom Search Integration Example</h2>
      <SearchBar
        onSearch={(q) => {
          setQuery(q);
          handleSearch(q);
        }}
      />
      {(query || loading) && (
        <SearchResults
          results={results}
          loading={loading}
          query={query}
          onSelect={(id, mediaType) => {
            console.log('Navigate to:', `/details/${mediaType}/${id}`);
          }}
        />
      )}
    </div>
  );
}

/**
 * Demo page with all examples
 */
export default function SearchExamplesPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: '2rem',
      }}
    >
      <h1 style={{ color: 'white', marginBottom: '2rem' }}>Search Components Examples</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <SearchBarExample />
        <SearchSuggestionsExample />
        <SearchResultsExample />
        <SearchResultsLoadingExample />
        <SearchResultsEmptyExample />
        <SearchContainerExample />
        <SearchContainerAutoFocusExample />
        <CustomSearchIntegrationExample />
      </div>
    </div>
  );
}
