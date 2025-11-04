# Content API Routes

This directory contains API routes for fetching content information from TMDB.

## Routes

### GET /api/content/trending

Fetches trending movies and TV shows.

**Query Parameters:**
- `mediaType` (optional): `'movie' | 'tv' | 'all'` - Default: `'all'`
- `timeWindow` (optional): `'day' | 'week'` - Default: `'week'`

**Example:**
```bash
GET /api/content/trending?mediaType=movie&timeWindow=week
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 20,
  "mediaType": "movie",
  "timeWindow": "week"
}
```

**Caching:** 5 minutes (300s)
**Rate Limit:** 100 requests per minute per IP

---

### GET /api/content/search

Searches for movies and TV shows.

**Query Parameters:**
- `query` (required): Search query string (1-100 characters)
- `page` (optional): Page number (1-100) - Default: `1`

**Example:**
```bash
GET /api/content/search?query=inception&page=1
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 15,
  "query": "inception",
  "page": 1
}
```

**Caching:** 10 minutes (600s)
**Rate Limit:** 30 requests per minute per IP

---

### GET /api/content/details

Fetches detailed information about a specific movie or TV show.

**Query Parameters:**
- `id` (required): TMDB content ID
- `mediaType` (required): `'movie' | 'tv'`

**Example:**
```bash
GET /api/content/details?id=550&mediaType=movie
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550",
    "title": "Fight Club",
    "overview": "...",
    "posterPath": "...",
    "backdropPath": "...",
    "releaseDate": "1999-10-15",
    "rating": 8.4,
    "voteCount": 25000,
    "mediaType": "movie",
    "genres": [...],
    "runtime": 139
  },
  "prefetched": []
}
```

**Prefetching:**
For TV shows, the first season's episodes are automatically prefetched and included in the response.

**Caching:** 1 hour (3600s)
**Rate Limit:** 100 requests per minute per IP

---

## Error Responses

All routes return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Validation error",
  "message": "query: Search query is required"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Content not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

**Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when the limit resets
- `Retry-After`: Seconds until retry is allowed

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Failed to fetch content"
}
```

---

## Features

### ✅ Request Validation
All query parameters are validated using Zod schemas to ensure type safety and proper error messages.

### ✅ Rate Limiting
IP-based rate limiting prevents abuse:
- Content/Details: 100 requests/minute
- Search: 30 requests/minute (stricter to prevent spam)

### ✅ Caching
Multi-tier caching system:
- Memory cache (fastest)
- LocalStorage cache (client-side)
- HTTP cache headers for CDN/browser caching

### ✅ Error Handling
Comprehensive error handling with:
- Proper HTTP status codes
- User-friendly error messages
- Retry information for rate limits
- Logging for debugging

### ✅ Prefetching
The details endpoint automatically prefetches related data (e.g., first season for TV shows) to reduce subsequent requests.

---

## Implementation Details

### Rate Limiter
Located in `app/lib/utils/api-rate-limiter.ts`
- In-memory storage with automatic cleanup
- Per-IP tracking
- Configurable limits per endpoint

### Validation Schemas
Located in `app/lib/validation/content-schemas.ts`
- Zod-based validation
- Type-safe query parameters
- Detailed error messages

### TMDB Service
Located in `app/lib/services/tmdb.ts`
- Handles all TMDB API interactions
- Built-in caching and retry logic
- Error handling with exponential backoff

---

## Usage Example

```typescript
// Fetch trending movies
const response = await fetch('/api/content/trending?mediaType=movie');
const { data } = await response.json();

// Search for content
const searchResponse = await fetch('/api/content/search?query=batman&page=1');
const { data: results } = await searchResponse.json();

// Get content details
const detailsResponse = await fetch('/api/content/details?id=550&mediaType=movie');
const { data: details } = await detailsResponse.json();
```

---

## Testing

Test the endpoints using curl:

```bash
# Trending
curl "http://localhost:3000/api/content/trending?mediaType=all&timeWindow=week"

# Search
curl "http://localhost:3000/api/content/search?query=inception"

# Details
curl "http://localhost:3000/api/content/details?id=550&mediaType=movie"

# Test rate limiting (run multiple times quickly)
for i in {1..35}; do curl "http://localhost:3000/api/content/search?query=test"; done
```
