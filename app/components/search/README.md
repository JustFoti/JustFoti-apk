# Search Components

Futuristic search functionality with expanding animations, glassmorphism panels, fuzzy matching, and intelligent caching.

## Features

- ✨ **Expanding Search Bar**: Smooth animation with glassmorphism effect
- ⚡ **Debounced Search**: 150ms delay to reduce API calls
- 🎯 **Fuzzy Matching**: Intelligent suggestions based on partial matches
- 💾 **Result Caching**: Eliminates redundant API calls (10-minute TTL)
- 🕐 **Recent Searches**: Stored in localStorage for quick access
- ⌨️ **Keyboard Navigation**: Arrow keys, Enter, and Escape support
- 📱 **Responsive Design**: Optimized for mobile and desktop
- ♿ **Accessible**: ARIA labels and keyboard navigation

## Components

### SearchContainer

The main component that integrates all search functionality.

```tsx
import { SearchContainer } from '@/components/search';

function MyPage() {
  return (
    <SearchContainer
      autoFocus={false}
      onClose={() => console.log('Search closed')}
    />
  );
}
```

**Props:**
- `onClose?: () => void` - Callback when search is closed
- `autoFocus?: boolean` - Auto-focus search input on mount

### SearchBar

Expanding search input with smooth animations.

```tsx
import { SearchBar } from '@/components/search';

function MyComponent() {
  const handleSearch = (query: string) => {
    console.log('Searching for:', query);
  };

  return (
    <SearchBar
      onSearch={handleSearch}
      placeholder="Search movies and TV shows..."
      autoFocus={false}
    />
  );
}
```

**Props:**
- `onSearch: (query: string) => void` - Callback when search query changes (debounced)
- `placeholder?: string` - Input placeholder text
- `autoFocus?: boolean` - Auto-focus on mount
- `expanded?: boolean` - Controlled expanded state
- `onExpandChange?: (expanded: boolean) => void` - Callback when expanded state changes

**Features:**
- Expands on focus/click
- Collapses when empty and blurred
- Clear button when query exists
- Escape key to clear or collapse

### SearchResults

Displays search results in a glassmorphism panel.

```tsx
import { SearchResults } from '@/components/search';

function MyComponent() {
  const results = [/* SearchResult[] */];
  
  const handleSelect = (id: string, mediaType: 'movie' | 'tv') => {
    console.log('Selected:', id, mediaType);
  };

  return (
    <SearchResults
      results={results}
      loading={false}
      query="action"
      onSelect={handleSelect}
      selectedIndex={0}
      onKeyboardNavigate={(index) => console.log('Navigate to:', index)}
    />
  );
}
```

**Props:**
- `results: SearchResult[]` - Array of search results
- `loading?: boolean` - Loading state
- `query: string` - Current search query
- `onSelect: (id: string, mediaType: 'movie' | 'tv') => void` - Callback when result is selected
- `selectedIndex?: number` - Currently selected result index
- `onKeyboardNavigate?: (index: number) => void` - Callback for keyboard navigation

**Features:**
- Smooth animations
- Loading spinner
- Empty state with suggestions
- Keyboard navigation (arrows, enter)
- Scroll selected item into view
- Result count display

### SearchSuggestions

Displays search suggestions with fuzzy matching and recent searches.

```tsx
import { SearchSuggestions, saveRecentSearch, clearRecentSearches } from '@/components/search';

function MyComponent() {
  const handleSelect = (suggestion: string) => {
    console.log('Selected suggestion:', suggestion);
  };

  return (
    <SearchSuggestions
      query=""
      onSelect={handleSelect}
      maxSuggestions={5}
    />
  );
}
```

**Props:**
- `query: string` - Current search query
- `onSelect: (suggestion: string) => void` - Callback when suggestion is selected
- `maxSuggestions?: number` - Maximum number of suggestions to show (default: 5)

**Features:**
- Recent searches from localStorage
- Popular search terms
- Fuzzy matching algorithm
- Clear recent searches button
- Smooth hover animations

**Utility Functions:**
- `saveRecentSearch(query: string)` - Save a search to recent searches
- `clearRecentSearches()` - Clear all recent searches

## Keyboard Navigation

- **Arrow Down**: Navigate to next result
- **Arrow Up**: Navigate to previous result
- **Enter**: Select current result
- **Escape**: Clear query or collapse search

## Caching Strategy

Search results are cached in memory with a 10-minute TTL to eliminate redundant API calls:

```typescript
// Cache structure
{
  [query: string]: {
    results: SearchResult[];
    timestamp: number;
  }
}
```

## Recent Searches

Recent searches are stored in localStorage with a maximum of 5 entries:

```typescript
// localStorage key
'flyx_recent_searches'

// Format
string[] // Array of recent search queries
```

## Styling

All components use CSS Modules with futuristic glassmorphism effects:

- Backdrop blur for depth
- Smooth transitions and animations
- Hover effects with transforms
- Focus indicators for accessibility
- Responsive breakpoints

## Integration Example

```tsx
'use client';

import { SearchContainer } from '@/components/search';
import { Navigation } from '@/components/layout';

export default function HomePage() {
  return (
    <div>
      <Navigation>
        <SearchContainer />
      </Navigation>
      
      {/* Rest of your page */}
    </div>
  );
}
```

## Requirements Satisfied

- ✅ 3.1: Search results within 100ms (debounced + cached)
- ✅ 3.2: Debounced search with optimistic UI
- ✅ 3.3: Maximum 20 results with infinite scroll capability
- ✅ 3.4: Cache search results to eliminate redundant API calls
- ✅ 3.5: Intelligent suggestions with fuzzy matching

## Performance

- **Debouncing**: 150ms delay reduces API calls
- **Caching**: 10-minute TTL eliminates redundant requests
- **Lazy Loading**: Images loaded on demand
- **Virtual Scrolling**: Ready for large result sets
- **Optimistic UI**: Instant feedback on user input

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- Semantic HTML

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)
