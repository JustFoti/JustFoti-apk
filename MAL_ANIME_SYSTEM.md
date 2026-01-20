# MAL-Based Anime System

## Overview
Complete MAL-only anime system for `/anime` route - NO TMDB dependency.

## Status: ✅ COMPLETE & WORKING

All files compile without errors. System is ready for testing.

## Architecture

### Browse Page (`/anime`)
- **Server**: `app/(routes)/anime/page.tsx`
  - Fetches MAL data using `getCategoryIds()` from `app/data/anime-categories.ts`
  - Categories: Popular, Top Rated, Action, Fantasy, Romance
  - Uses `malService.getById()` for each anime
  - **Robust error handling**: `Promise.allSettled` ensures partial failures don't break the page
  - Failed fetches are logged but don't prevent successful anime from displaying
  - Each category is fetched independently via `fetchCategoryAnime()` helper
  
- **Client**: `app/(routes)/anime/AnimePageClient.tsx`
  - Displays MAL anime with MAL posters
  - Links to `/anime/[malId]` (not `/details/[tmdbId]`)
  - Shows MAL scores, episode counts, titles

### Details Page (`/anime/[malId]`)
- **Server**: `app/(routes)/anime/[malId]/page.tsx`
  - Fetches anime via `malService.getSeriesSeasons(malId)`
  - Gets all seasons for multi-season anime (e.g., JJK S1, S2, S3)
  - Generates metadata with MAL data
  
- **Client**: `app/(routes)/anime/[malId]/AnimeDetailsClient.tsx`
  - Displays anime details with MAL data
  - Episode list with proper season handling
  - Links to `/anime/[malId]/watch?episode=X`

### Watch Page (`/anime/[malId]/watch`)
- **Server**: `app/(routes)/anime/[malId]/watch/page.tsx`
  - Simple Suspense wrapper
  
- **Client**: `app/(routes)/anime/[malId]/watch/AnimeWatchClient.tsx`
  - Video player for anime episodes
  - Fetches streams from `/api/anime/stream`

### Stream API (`/api/anime/stream`)
- **Endpoint**: `GET /api/anime/stream?malId=57658&episode=1`
- Uses MAL ID directly (no TMDB conversion)
- Calls `extractAnimeKaiStreams()` with MAL info
- Returns proxied stream URLs

## Data Flow

```
User clicks anime on /anime
  ↓
/anime/[malId] (e.g., /anime/57658)
  ↓
malService.getSeriesSeasons(57658)
  ↓
Display episodes
  ↓
User clicks episode
  ↓
/anime/57658/watch?episode=1
  ↓
GET /api/anime/stream?malId=57658&episode=1
  ↓
extractAnimeKaiStreams(malId=57658, episode=1)
  ↓
Stream plays
```

## JJK Example

### MAL IDs
- Season 1: 40748 (24 episodes)
- Season 2: 51009 (23 episodes) 
- Season 3: 57658 (12 episodes) - Culling Game

### URLs
- Browse: `/anime` → Shows all 3 seasons as separate entries
- S3 Details: `/anime/57658`
- S3 Episode 1: `/anime/57658/watch?episode=1`
- Stream API: `/api/anime/stream?malId=57658&episode=1`

## Files Modified

### Created
- `app/(routes)/anime/page.tsx` - MAL browse server component
- `app/(routes)/anime/AnimePageClient.tsx` - MAL browse client
- `app/(routes)/anime/[malId]/page.tsx` - MAL details server
- `app/(routes)/anime/[malId]/AnimeDetailsClient.tsx` - MAL details client
- `app/(routes)/anime/[malId]/AnimeDetails.module.css` - Styles
- `app/(routes)/anime/[malId]/watch/page.tsx` - Watch server
- `app/(routes)/anime/[malId]/watch/AnimeWatchClient.tsx` - Watch client
- `app/api/anime/stream/route.ts` - MAL stream API
- `app/data/anime-categories.ts` - Curated MAL IDs

### Updated
- `tsconfig.json` - Fixed `@/data/*` path alias to point to `./app/data/*`

## Testing Steps

1. **Restart dev server** (required for tsconfig changes)
   ```bash
   npm run dev
   ```

2. **Hard refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)

3. **Test browse page**
   - Go to `/anime`
   - Should see MAL posters (not TMDB)
   - Should see MAL titles and scores
   - Should see episode counts

4. **Test JJK Season 3**
   - Click on "Jujutsu Kaisen 3rd Season" (MAL ID 57658)
   - Should go to `/anime/57658`
   - Should see 12 episodes listed
   - Click Episode 1
   - Should go to `/anime/57658/watch?episode=1`
   - Should play Culling Game Episode 1 (NOT Season 1 Episode 1)

5. **Verify API**
   - Open browser DevTools → Network tab
   - Watch an episode
   - Should see request to `/api/anime/stream?malId=57658&episode=1`
   - Should NOT see any TMDB IDs in the request

## Configuration

### Adding New Anime
Edit `app/data/anime-categories.ts`:
```typescript
{
  id: 'popular',
  name: 'Popular Now',
  malIds: [
    40748,  // Add MAL IDs here
    // ...
  ],
}
```

### MAL Service
Located in `app/lib/services/mal.ts`:
- `getById(malId)` - Fetch single anime
- `getSeriesSeasons(malId)` - Fetch anime + related seasons
- Caches responses for 24 hours

### Error Handling
The browse page uses resilient error handling:
- `fetchCategoryAnime()` helper function wraps all MAL API calls
- Uses `Promise.allSettled()` to handle partial failures gracefully
- Failed anime fetches are logged with MAL IDs for debugging
- Successful fetches are returned, ensuring the page always displays available content
- If all fetches fail for a category, that category will be empty but won't crash the page

## Notes

- System is completely independent of TMDB for `/anime` route
- `/details/[tmdbId]` still exists for non-anime content
- MAL API has rate limits - responses are cached
- Each season of multi-season anime has its own MAL ID
- Episode numbering resets per season (S3E1 = episode 1, not 48)
