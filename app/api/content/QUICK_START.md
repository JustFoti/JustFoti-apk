# Content API Quick Start Guide

## Getting Started

The Content API provides three endpoints for fetching movie and TV show data from TMDB.

## Prerequisites

1. **TMDB API Key:** Set `NEXT_PUBLIC_TMDB_API_KEY` in your `.env.local` file
2. **Development Server:** Run `bun dev` to start the server

## Basic Usage

### 1. Fetch Trending Content

```typescript
// Get trending movies this week
const response = await fetch('/api/content/trending?mediaType=movie&timeWindow=week');
const { data } = await response.json();

console.log(data); // Array of MediaItem objects
```

### 2. Search for Content

```typescript
// Search for "inception"
const response = await fetch('/api/content/search?query=inception');
const { data, count } = await response.json();

console.log(`Found ${count} results`);
```

### 3. Get Content Details

```typescript
// Get details for Fight Club (ID: 550)
const response = await fetch('/api/content/details?id=550&mediaType=movie');
const { data } = await response.json();

console.log(data.title); // "Fight Club"
console.log(data.rating); // 8.4
```

## React Hook Example

```typescript
import { useState, useEffect } from 'react';

function useTrending(mediaType = 'all') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/content/trending?mediaType=${mediaType}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [mediaType]);

  return { data, loading, error };
}

// Usage in component
function TrendingMovies() {
  const { data, loading, error } = useTrending('movie');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
}
```

## Error Handling

```typescript
async function fetchContent() {
  try {
    const response = await fetch('/api/content/trending');
    
    // Check for rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Rate limited. Retry in ${retryAfter} seconds`);
      return;
    }
    
    // Check for other errors
    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error.message);
      return;
    }
    
    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

## Rate Limits

- **Trending/Details:** 100 requests per minute per IP
- **Search:** 30 requests per minute per IP

Check rate limit headers:
```typescript
const response = await fetch('/api/content/trending');
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

console.log(`${remaining} requests remaining until ${new Date(parseInt(reset))}`);
```

## Caching

All endpoints use aggressive caching:
- **Trending:** 5 minutes
- **Search:** 10 minutes
- **Details:** 1 hour

Cached responses are served instantly from memory/localStorage.

## TypeScript Types

```typescript
import type { MediaItem, SearchResult } from '@/types/media';

// Trending response
interface TrendingResponse {
  success: true;
  data: MediaItem[];
  count: number;
  mediaType: 'movie' | 'tv' | 'all';
  timeWindow: 'day' | 'week';
}

// Search response
interface SearchResponse {
  success: true;
  data: SearchResult[];
  count: number;
  query: string;
  page: number;
}

// Details response
interface DetailsResponse {
  success: true;
  data: MediaItem;
  prefetched: string[];
}

// Error response
interface ErrorResponse {
  error: string;
  message: string;
  retryAfter?: number;
}
```

## Testing

Run the test suite:
```bash
bun test app/api/content/__tests__/
```

## Common Issues

### 1. Missing API Key
**Error:** "Service is not properly configured"
**Solution:** Add `NEXT_PUBLIC_TMDB_API_KEY` to `.env.local`

### 2. Rate Limited
**Error:** "Rate limit exceeded"
**Solution:** Wait for the time specified in `Retry-After` header

### 3. Invalid Query
**Error:** "Validation error"
**Solution:** Check query parameters match the schema requirements

## Next Steps

- See [README.md](./README.md) for detailed API documentation
- See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for technical details
- Check [examples](../../components/content/examples.tsx) for component integration
