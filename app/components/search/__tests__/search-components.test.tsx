/**
 * Search Components Tests
 * Tests for SearchBar, SearchResults, SearchSuggestions, and SearchContainer
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  SearchBar,
  SearchResults,
  SearchSuggestions,
  saveRecentSearch,
  clearRecentSearches,
} from '../index';
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

describe('SearchBar', () => {
  it('renders search bar', () => {
    const onSearch = mock(() => {});
    render(<SearchBar onSearch={onSearch} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeTruthy();
  });

  it('calls onSearch with debounced value', async () => {
    const onSearch = mock(() => {});
    render(<SearchBar onSearch={onSearch} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'matrix' } });
    
    // Should not call immediately
    expect(onSearch).not.toHaveBeenCalled();
    
    // Should call after debounce delay (150ms)
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('matrix');
    }, { timeout: 200 });
  });

  it('shows clear button when query exists', () => {
    const onSearch = mock(() => {});
    render(<SearchBar onSearch={onSearch} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    
    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeTruthy();
  });

  it('clears query when clear button is clicked', () => {
    const onSearch = mock(() => {});
    render(<SearchBar onSearch={onSearch} />);
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });
    
    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);
    
    expect(input.value).toBe('');
  });

  it('expands on focus', () => {
    const onSearch = mock(() => {});
    const onExpandChange = mock(() => {});
    render(<SearchBar onSearch={onSearch} onExpandChange={onExpandChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    
    expect(onExpandChange).toHaveBeenCalledWith(true);
  });
});

describe('SearchResults', () => {
  it('renders search results', () => {
    const onSelect = mock(() => {});
    render(
      <SearchResults
        results={mockResults}
        loading={false}
        query="matrix"
        onSelect={onSelect}
      />
    );
    
    expect(screen.getByText('The Matrix')).toBeTruthy();
    expect(screen.getByText('Breaking Bad')).toBeTruthy();
  });

  it('shows loading state', () => {
    const onSelect = mock(() => {});
    render(
      <SearchResults
        results={[]}
        loading={true}
        query="test"
        onSelect={onSelect}
      />
    );
    
    expect(screen.getByText('Searching...')).toBeTruthy();
  });

  it('shows empty state when no results', () => {
    const onSelect = mock(() => {});
    render(
      <SearchResults
        results={[]}
        loading={false}
        query="nonexistent"
        onSelect={onSelect}
      />
    );
    
    expect(screen.getByText(/No results found/i)).toBeTruthy();
  });

  it('calls onSelect when result is clicked', () => {
    const onSelect = mock(() => {});
    render(
      <SearchResults
        results={mockResults}
        loading={false}
        query="matrix"
        onSelect={onSelect}
      />
    );
    
    const firstResult = screen.getByText('The Matrix').closest('button');
    fireEvent.click(firstResult!);
    
    expect(onSelect).toHaveBeenCalledWith('1', 'movie');
  });

  it('displays result count', () => {
    const onSelect = mock(() => {});
    render(
      <SearchResults
        results={mockResults}
        loading={false}
        query="test"
        onSelect={onSelect}
      />
    );
    
    expect(screen.getByText('2 results')).toBeTruthy();
  });

  it('displays media type badges', () => {
    const onSelect = mock(() => {});
    render(
      <SearchResults
        results={mockResults}
        loading={false}
        query="test"
        onSelect={onSelect}
      />
    );
    
    expect(screen.getByText('Movie')).toBeTruthy();
    expect(screen.getByText('TV Show')).toBeTruthy();
  });
});

describe('SearchSuggestions', () => {
  beforeEach(() => {
    clearRecentSearches();
  });

  afterEach(() => {
    clearRecentSearches();
  });

  it('renders suggestions', () => {
    const onSelect = mock(() => {});
    render(<SearchSuggestions query="" onSelect={onSelect} />);
    
    // Should show popular searches when no query
    const suggestions = screen.getAllByRole('button');
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('calls onSelect when suggestion is clicked', () => {
    const onSelect = mock(() => {});
    render(<SearchSuggestions query="" onSelect={onSelect} />);
    
    const firstSuggestion = screen.getAllByRole('button')[0];
    fireEvent.click(firstSuggestion);
    
    expect(onSelect).toHaveBeenCalled();
  });

  it('shows recent searches header when recent searches exist', () => {
    saveRecentSearch('test query');
    
    const onSelect = mock(() => {});
    render(<SearchSuggestions query="" onSelect={onSelect} />);
    
    expect(screen.getByText('Recent Searches')).toBeTruthy();
  });

  it('filters suggestions based on query', () => {
    const onSelect = mock(() => {});
    const { rerender } = render(<SearchSuggestions query="" onSelect={onSelect} />);
    
    const initialCount = screen.getAllByRole('button').length;
    
    rerender(<SearchSuggestions query="action" onSelect={onSelect} />);
    
    const filteredCount = screen.getAllByRole('button').length;
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });
});

describe('Recent Searches', () => {
  beforeEach(() => {
    clearRecentSearches();
  });

  afterEach(() => {
    clearRecentSearches();
  });

  it('saves recent search to localStorage', () => {
    saveRecentSearch('test query');
    
    const stored = localStorage.getItem('flyx_recent_searches');
    expect(stored).toBeTruthy();
    
    const parsed = JSON.parse(stored!);
    expect(parsed).toContain('test query');
  });

  it('limits recent searches to 5 items', () => {
    for (let i = 0; i < 10; i++) {
      saveRecentSearch(`query ${i}`);
    }
    
    const stored = localStorage.getItem('flyx_recent_searches');
    const parsed = JSON.parse(stored!);
    
    expect(parsed.length).toBe(5);
  });

  it('removes duplicates and moves to top', () => {
    saveRecentSearch('query 1');
    saveRecentSearch('query 2');
    saveRecentSearch('query 1'); // Duplicate
    
    const stored = localStorage.getItem('flyx_recent_searches');
    const parsed = JSON.parse(stored!);
    
    expect(parsed[0]).toBe('query 1');
    expect(parsed.length).toBe(2);
  });

  it('clears recent searches', () => {
    saveRecentSearch('test query');
    clearRecentSearches();
    
    const stored = localStorage.getItem('flyx_recent_searches');
    expect(stored).toBeNull();
  });
});

describe('Fuzzy Matching', () => {
  it('matches exact queries', () => {
    const onSelect = mock(() => {});
    render(<SearchSuggestions query="action" onSelect={onSelect} />);
    
    // Should show suggestions containing "action"
    const suggestions = screen.getAllByRole('button');
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('matches partial queries', () => {
    const onSelect = mock(() => {});
    render(<SearchSuggestions query="act" onSelect={onSelect} />);
    
    // Should show suggestions matching "act"
    const suggestions = screen.getAllByRole('button');
    expect(suggestions.length).toBeGreaterThan(0);
  });
});
