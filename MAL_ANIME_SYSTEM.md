# Hybrid Anime System (TMDB Browse + MAL Details)

## Overview
Hybrid anime system that uses TMDB for browsing and MAL for accurate episode information.

## Status: ✅ ACTIVE

The system uses TMDB for the browse page (fast, reliable) and MAL for details/streaming (accurate episode data).

## Architecture

### Browse Page (`/anime`)
- **Server**: `app/(routes)/anime/page.tsx`
  - **Uses TMDB API** for fast, reliable anime discovery
  - Fetches anime using TMDB discover endpoints with Japanese origin country filter
  - Categories: Popular, Top Rated, Currently Airing, Action, Fantasy, Romance, Movies
  - Uses `fetchTMDBData()` with genre 16 (Animation) + origin country JP
  - All categories fetched in parallel with `Promise.all()`
  
- **Client**: `app/(routes)/anime/AnimePageClient.tsx`
  - Displays anime with TMDB posters and metadata
  - Links to `/details/[tmdbId]` (standard details page)
  - Shows TMDB scores, release years, titles

### Details Page (`/details/[tmdbId]`)
- **Server**: `app/(routes)/details/[id]/page.tsx`
  - Detects if content is anime via `/api/content/check-anime`
  - For anime: fetches MAL data via `/api/content/mal-info`
  - Gets all seasons for multi-season anime (e.g., JJK S1, S2, S3)
  - Generates metadata with TMDB data
  
- **Client**: `app/(routes)/details/[id]/DetailsPageClient.tsx`
  - Displays anime details with TMDB posters/backdrops
  - Uses MAL data for accurate episode counts and season mapping
  - Episode list with proper MAL season handling
  - Links to `/watch/[tmdbId]?episode=X` with MAL metadata

### Watch Page (`/watch/[tmdbId]`)
- Uses standard watch page with MAL episode mapping
- Passes MAL ID and episode info to stream extraction API
- For absolute episode anime (like JJK), automatically calculates correct MAL entry

### Stream API (`/api/stream/extract`)
- **Endpoint**: `GET /api/stream/extract?tmdbId=95479&type=tv&season=1&episode=48`
- Automatically detects anime with absolute episode numbering
- Calculates correct MAL entry and relative episode number
- Calls `extractAnimeKaiStreams()` with MAL info
- Returns proxied stream URLs
- ⚠️ **Note**: JJK episodes 48-59 use a hardcoded override (see `JJK_HARDCODED_OVERRIDE.md`)

## Data Flow

```
User browses /anime (TMDB data)
  ↓
Clicks anime → /details/[tmdbId] (e.g., /details/95479)
  ↓
Page detects anime → fetches MAL data
  ↓
Display episodes with MAL episode counts
  ↓
User clicks episode 48
  ↓
/watch/95479?type=tv&season=1&episode=48
  ↓
GET /api/stream/extract?tmdbId=95479&episode=48
  ↓
API calculates: Episode 48 → MAL 57658 (Season 3) Episode 1
  ↓
extractAnimeKaiStreams(malId=57658, episode=1)
  ↓
Stream plays
```

## JJK Example

### TMDB vs MAL
- **TMDB ID**: 95479 (Jujutsu Kaisen)
- **MAL IDs**: 
  - Season 1: 40748 (24 episodes)
  - Season 2: 51009 (23 episodes) 
  - Season 3: 57658 (12 episodes) - The Culling Game - Part 1

### URLs
- Browse: `/anime` → Shows anime from TMDB
- Click JJK: `/details/95479?type=tv`
- Details page detects anime → fetches MAL data
- Click Episode 48: `/watch/95479?type=tv&season=1&episode=48`
- API converts: Episode 48 → MAL 57658 Episode 1
- Stream API: `/api/stream/extract?tmdbId=95479&episode=48` (auto-converts to MAL)

## Files in Use

### Browse Page (TMDB)
- `app/(routes)/anime/page.tsx` - TMDB-based browse server component
- `app/(routes)/anime/AnimePageClient.tsx` - Browse client component

### Details & Watch (MAL)
- `app/(routes)/details/[id]/page.tsx` - Standard details page
- `app/(routes)/details/[id]/DetailsPageClient.tsx` - Detects anime, uses MAL data
- `app/(routes)/watch/[id]/page.tsx` - Standard watch page
- `app/api/stream/extract/route.ts` - Auto-converts TMDB episodes to MAL

### MAL Services
- `app/lib/services/mal.ts` - MAL API service with episode mapping
- `app/api/content/check-anime` - Detects if TMDB content is anime
- `app/api/content/mal-info` - Fetches MAL data for TMDB anime

### Legacy MAL-Only Routes (Not Currently Used)
- `app/(routes)/anime/[malId]/page.tsx` - Direct MAL details page
- `app/(routes)/anime/[malId]/AnimeDetailsClient.tsx` - MAL details client
- `app/(routes)/anime/[malId]/watch/AnimeWatchClient.tsx` - MAL watch client
- `app/api/anime/stream/route.ts` - Direct MAL stream API
- `app/data/anime-categories.ts` - Curated MAL IDs (not used in browse)

## Testing Steps

1. **Test browse page**
   - Go to `/anime`
   - Should see TMDB posters and data
   - Should see categories: Popular, Top Rated, Currently Airing, Action, Fantasy, Romance, Movies
   - Should load quickly (TMDB is fast)

2. **Test anime details**
   - Click any anime → goes to `/details/[tmdbId]`
   - Page should detect it's anime
   - Should fetch MAL data for accurate episode counts
   - Should display correct number of episodes per season

3. **Test JJK Season 3**
   - Go to `/details/95479` (Jujutsu Kaisen)
   - Should see 59 episodes total (24 + 23 + 12)
   - Click Episode 48
   - Should go to `/watch/95479?type=tv&season=1&episode=48`
   - Should play Culling Game Episode 1 (NOT Season 1 Episode 1)

4. **Verify API conversion**
   - Open browser DevTools → Network tab
   - Watch episode 48
   - Should see request to `/api/stream/extract?tmdbId=95479&episode=48`
   - Console should show: `[EXTRACT] Absolute episode anime detected: TMDB ep 48 → MAL 57658 (Jujutsu Kaisen: The Culling Game - Part 1) ep 1`

## Configuration

### Browse Page Categories
Edit `app/(routes)/anime/page.tsx` to modify TMDB discover queries:
```typescript
// Example: Change popularity threshold
fetchTMDBData('/discover/tv', { 
  with_genres: '16', 
  with_origin_country: 'JP', 
  sort_by: 'popularity.desc',
  'vote_count.gte': '50' // Add minimum vote threshold
})
```

### MAL Episode Mapping
Edit `app/lib/services/mal.ts` to add new anime with absolute episode numbering:
```typescript
const TMDB_ABSOLUTE_EPISODE_ANIME: Record<number, Array<...>> = {
  95479: [...], // JJK
  // Add new anime here
}
```

### MAL Service
Located in `app/lib/services/mal.ts`:
- `getById(malId)` - Fetch single anime from MAL
- `getSeriesSeasons(malId)` - Fetch anime + related seasons
- `usesAbsoluteEpisodeNumbering(tmdbId)` - Check if anime uses absolute numbering
- `getMALEntryForAbsoluteEpisode(tmdbId, episode)` - Convert absolute to MAL episode
- Caches responses for 24 hours

### Anime Detection
The details page automatically detects anime content:
1. Checks if TMDB content has Japanese origin country
2. Checks if it's in the Animation genre
3. If both true, fetches MAL data for accurate episode information

## Benefits of Hybrid Approach

✅ **Fast Browse**: TMDB API is faster and more reliable than MAL for discovery
✅ **Accurate Episodes**: MAL provides correct episode counts and season splits
✅ **Automatic Conversion**: API automatically maps TMDB episodes to MAL entries
✅ **No Manual Curation**: Browse page updates automatically with new anime
✅ **Best of Both**: Combines TMDB's speed with MAL's accuracy

## Notes

- Browse page uses TMDB for fast, reliable anime discovery
- Details/watch pages use MAL for accurate episode information
- API automatically converts TMDB episode numbers to MAL entries
- Works seamlessly for anime with absolute episode numbering (like JJK)
- `/anime/[malId]` routes still exist but are not currently used by the browse page
- MAL API has rate limits - responses are cached for 24 hours
- ⚠️ **JJK Season 3 (episodes 48-59)** uses a hardcoded override - see `JJK_HARDCODED_OVERRIDE.md` for details
