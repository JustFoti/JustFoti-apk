# Stream API - Quick Start Guide

Get started with the Stream Extraction API in 5 minutes.

## Basic Usage

### 1. Extract Movie Stream

```typescript
const response = await fetch('/api/stream/extract?tmdbId=550&mediaType=movie');
const result = await response.json();

if (result.success) {
  const { sources, subtitles } = result.data;
  console.log('Stream URL:', sources[0].url);
  console.log('Quality:', sources[0].quality);
}
```

### 2. Extract TV Episode Stream

```typescript
const response = await fetch(
  '/api/stream/extract?tmdbId=1396&mediaType=tv&season=1&episode=1'
);
const result = await response.json();

if (result.success) {
  const { sources, subtitles } = result.data;
  console.log('Stream URL:', sources[0].url);
  console.log('Available subtitles:', subtitles.length);
}
```

### 3. Handle Errors

```typescript
const response = await fetch('/api/stream/extract?tmdbId=550&mediaType=movie');
const result = await response.json();

if (!result.success) {
  console.error('Error:', result.message);
  
  if (result.retryable) {
    console.log('This error is retryable, try again later');
  }
}
```

## React Hook Example

```typescript
import { useState } from 'react';
import type { VideoData } from '@/types/media';

function useStreamExtraction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VideoData | null>(null);

  const extract = async (
    tmdbId: string,
    mediaType: 'movie' | 'tv',
    season?: number,
    episode?: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        tmdbId,
        mediaType,
        ...(season && { season: season.toString() }),
        ...(episode && { episode: episode.toString() }),
      });

      const response = await fetch(`/api/stream/extract?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { extract, loading, error, data };
}

// Usage in component
function VideoPlayer({ tmdbId, mediaType }: Props) {
  const { extract, loading, error, data } = useStreamExtraction();

  useEffect(() => {
    extract(tmdbId, mediaType);
  }, [tmdbId, mediaType]);

  if (loading) return <div>Loading stream...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return <video src={data.sources[0].url} />;
}
```

## Common Patterns

### With Retry Logic

```typescript
async function extractWithRetry(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `/api/stream/extract?tmdbId=${tmdbId}&mediaType=${mediaType}`
      );
      const result = await response.json();

      if (result.success) {
        return result.data;
      }

      if (!result.retryable) {
        throw new Error(result.message);
      }

      if (attempt === maxRetries) {
        throw new Error('Max retries reached');
      }

      // Wait before retry
      await new Promise(resolve => 
        setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
      );
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }
}
```

### Quality Selection

```typescript
function selectQuality(sources: StreamSource[], preferredQuality: string) {
  // Try to find preferred quality
  const preferred = sources.find(s => s.quality === preferredQuality);
  if (preferred) return preferred;

  // Fallback to best available
  const qualityOrder = ['1080p', '720p', '480p', '360p', 'auto'];
  for (const quality of qualityOrder) {
    const source = sources.find(s => s.quality === quality);
    if (source) return source;
  }

  // Return first source
  return sources[0];
}

// Usage
const videoData = await extractStream(tmdbId, mediaType);
const source = selectQuality(videoData.sources, '720p');
```

### With Loading States

```typescript
function StreamLoader({ tmdbId, mediaType, onLoad }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');

      try {
        const response = await fetch(
          `/api/stream/extract?tmdbId=${tmdbId}&mediaType=${mediaType}`
        );
        const result = await response.json();

        if (cancelled) return;

        if (result.success) {
          setStatus('success');
          onLoad(result.data);
        } else {
          setStatus('error');
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [tmdbId, mediaType]);

  return (
    <div>
      {status === 'loading' && <Spinner />}
      {status === 'error' && <ErrorMessage />}
    </div>
  );
}
```

## Testing

### Manual Testing

```bash
# Test movie
curl "http://localhost:3000/api/stream/extract?tmdbId=550&mediaType=movie"

# Test TV episode
curl "http://localhost:3000/api/stream/extract?tmdbId=1396&mediaType=tv&season=1&episode=1"

# Test error handling
curl "http://localhost:3000/api/stream/extract?tmdbId=invalid&mediaType=movie"
```

### Integration Testing

```typescript
import { describe, test, expect } from 'bun:test';

describe('Stream API Integration', () => {
  test('should extract movie stream', async () => {
    const response = await fetch(
      'http://localhost:3000/api/stream/extract?tmdbId=550&mediaType=movie'
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.sources.length).toBeGreaterThan(0);
  });

  test('should handle validation errors', async () => {
    const response = await fetch(
      'http://localhost:3000/api/stream/extract?tmdbId=550'
    );
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toBe('Validation error');
  });
});
```

## Troubleshooting

### Issue: "Validation error"
**Solution:** Check that all required parameters are provided:
- `tmdbId` (always required)
- `mediaType` (always required)
- `season` and `episode` (required for TV shows)

### Issue: "Request timeout"
**Solution:** The extraction took longer than 30 seconds. This is retryable:
```typescript
if (result.retryable) {
  // Wait and retry
  await new Promise(resolve => setTimeout(resolve, 5000));
  // Retry the request
}
```

### Issue: "Service unavailable"
**Solution:** The extractor service is down. Check:
1. Extractor service is running
2. Network connectivity
3. Environment variable `NEXT_PUBLIC_VM_EXTRACTOR_URL` is set

### Issue: "Extraction failed"
**Solution:** Content may not be available:
1. Verify TMDB ID is correct
2. Check if content exists in extractor service
3. Try different season/episode

## Next Steps

- Read the [full API documentation](./README.md)
- Check out [error handling patterns](./README.md#error-handling)
- Learn about [caching strategies](./README.md#caching-strategy)
- Explore [performance optimization](./README.md#performance-optimization)
