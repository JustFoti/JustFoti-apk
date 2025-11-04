# Stream API

API routes for video stream extraction with quality detection, caching, and error handling.

## Routes

### GET /api/stream/extract

Extracts video stream URLs for movies and TV episodes with automatic quality detection and caching.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tmdbId` | string | Yes | TMDB content ID |
| `mediaType` | `'movie' \| 'tv'` | Yes | Type of content |
| `season` | number | Conditional | Season number (required for TV shows) |
| `episode` | number | Conditional | Episode number (required for TV shows) |

#### Example Requests

**Movie:**
```bash
GET /api/stream/extract?tmdbId=550&mediaType=movie
```

**TV Episode:**
```bash
GET /api/stream/extract?tmdbId=1396&mediaType=tv&season=1&episode=1
```

#### Response Format

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "url": "https://example.com/stream.m3u8",
        "quality": "1080p",
        "type": "hls"
      },
      {
        "url": "https://example.com/720p.m3u8",
        "quality": "720p",
        "type": "hls"
      }
    ],
    "subtitles": [
      {
        "label": "English",
        "language": "en",
        "url": "https://example.com/en.vtt"
      }
    ],
    "poster": "https://example.com/poster.jpg",
    "duration": 7200
  },
  "metadata": {
    "tmdbId": "550",
    "mediaType": "movie",
    "sourceCount": 2,
    "subtitleCount": 1,
    "bestQuality": "1080p",
    "responseTime": "1234ms"
  }
}
```

**Error Response (4xx/5xx):**
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "retryable": true
}
```

#### Error Codes

| Status | Error | Description | Retryable |
|--------|-------|-------------|-----------|
| 400 | Validation error | Invalid query parameters | No |
| 404 | Extraction failed | Content not available | No |
| 429 | Too many requests | Rate limit exceeded | Yes |
| 503 | Service unavailable | Extractor service down | Yes |
| 504 | Request timeout | Extraction took > 30s | Yes |
| 500 | Internal server error | Unexpected error | Maybe |

#### Response Headers

- `Cache-Control`: Caching directives (30 min cache, 1 hour stale-while-revalidate)
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when rate limit resets
- `X-Response-Time`: Time taken to process request
- `Retry-After`: Seconds to wait before retrying (on 429/503)

## Features

### 1. Quality Detection

Automatically detects stream quality from:
- URL patterns (1080, 720, 480, 360)
- Quality indicators (fhd, hd, sd)
- Stream type (HLS adaptive vs fixed MP4)

Quality priority order:
1. 1080p (Full HD)
2. 720p (HD)
3. 480p (SD)
4. 360p (Low)
5. auto (Adaptive HLS)

### 2. Caching Strategy

**Multi-tier caching:**
- Memory cache (fastest, volatile)
- LocalStorage (persistent, client-side)
- Database cache (server-side, shared)

**Cache TTL:**
- Stream URLs: 30 minutes
- Stale-while-revalidate: 1 hour

**Cache invalidation:**
- Automatic expiration after TTL
- Manual invalidation via cache manager

### 3. Error Handling

**Retry Logic:**
- Exponential backoff (1s, 2s, 4s, max 10s)
- Maximum 3 retry attempts
- Only retries on retryable errors

**Timeout Handling:**
- 30 second timeout for stream extraction
- Graceful timeout error response
- Suggests retry to client

**Error Classification:**
- Retryable: Network errors, timeouts, 5xx errors
- Non-retryable: Validation errors, 404s, 400s

### 4. Rate Limiting

- 100 requests per IP per time window
- Shared rate limiter with content API
- Returns 429 with Retry-After header
- Rate limit info in response headers

### 5. Performance Optimization

**Request Optimization:**
- Parallel source processing
- Efficient quality detection
- Minimal data transformation

**Response Optimization:**
- Compressed JSON responses
- Optimized cache headers
- Response time tracking

## Usage Examples

### Basic Usage (Client-side)

```typescript
import type { VideoData } from '@/types/media';

async function getStreamURL(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<VideoData> {
  const params = new URLSearchParams({
    tmdbId,
    mediaType,
    ...(season && { season: season.toString() }),
    ...(episode && { episode: episode.toString() }),
  });

  const response = await fetch(`/api/stream/extract?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const result = await response.json();
  return result.data;
}

// Usage
const movieStream = await getStreamURL('550', 'movie');
const tvStream = await getStreamURL('1396', 'tv', 1, 1);
```

### With Error Handling

```typescript
async function getStreamWithRetry(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number,
  maxRetries = 3
): Promise<VideoData> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getStreamURL(tmdbId, mediaType, season, episode);
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      if (!error.retryable || attempt === maxRetries) {
        throw error;
      }

      // Wait before retry
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

### With Loading States

```typescript
import { useState } from 'react';

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
      const result = await getStreamURL(tmdbId, mediaType, season, episode);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { extract, loading, error, data };
}
```

## Testing

### Manual Testing

```bash
# Test movie extraction
curl "http://localhost:3000/api/stream/extract?tmdbId=550&mediaType=movie"

# Test TV episode extraction
curl "http://localhost:3000/api/stream/extract?tmdbId=1396&mediaType=tv&season=1&episode=1"

# Test validation error
curl "http://localhost:3000/api/stream/extract?tmdbId=550"

# Test TV without season/episode
curl "http://localhost:3000/api/stream/extract?tmdbId=1396&mediaType=tv"
```

### Integration Testing

See `__tests__/stream-api.test.ts` for comprehensive test suite.

## Performance Considerations

### Optimization Strategies

1. **Caching**: Aggressive caching reduces upstream requests
2. **Quality Detection**: Fast pattern matching for quality detection
3. **Parallel Processing**: Process multiple sources concurrently
4. **Response Compression**: Gzip/Brotli compression enabled
5. **Connection Pooling**: Reuse HTTP connections to extractor service

### Performance Targets

- Response time: < 2s (cached), < 5s (uncached)
- Timeout: 30s maximum
- Cache hit rate: > 80%
- Error rate: < 1%

## Security Considerations

1. **Rate Limiting**: Prevents abuse and DoS attacks
2. **Input Validation**: Zod schemas validate all inputs
3. **Error Sanitization**: No sensitive data in error messages
4. **CORS**: Configured for same-origin requests only
5. **Timeout Protection**: Prevents long-running requests

## Monitoring

### Key Metrics

- Request count and rate
- Response times (p50, p95, p99)
- Error rates by type
- Cache hit/miss ratio
- Upstream service health

### Logging

All errors are logged with:
- Timestamp
- Request parameters
- Error type and message
- Response time
- Client IP (hashed)

## Troubleshooting

### Common Issues

**Issue: Timeout errors**
- Check extractor service health
- Verify network connectivity
- Increase timeout if needed

**Issue: Rate limit exceeded**
- Implement client-side rate limiting
- Add request queuing
- Use caching to reduce requests

**Issue: No sources returned**
- Content may not be available
- Check TMDB ID is correct
- Verify extractor service has content

**Issue: Poor quality streams**
- Quality detection may need tuning
- Check source URL patterns
- Verify extractor service quality

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Multi-source fallback logic
- [ ] Quality preference per user
- [ ] Bandwidth-aware quality selection
- [ ] Stream health monitoring
- [ ] CDN integration for stream URLs
- [ ] Analytics for stream quality usage
