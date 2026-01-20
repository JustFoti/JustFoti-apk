# MAL-Based Anime System

## Overview
Created a completely separate anime system that uses MyAnimeList (MAL) as the primary data source instead of TMDB. This eliminates all the conversion issues with absolute episode numbering.

## New Routes

### 1. Anime Details Page
**URL**: `/anime/[malId]`
**Example**: `/anime/57658` (JJK Season 3)

**Features**:
- Shows MAL anime details (title, synopsis, rating, genres)
- Lists all seasons (if anime has multiple MAL entries)
- Episode grid for selected season
- Direct links to watch episodes

**Files**:
- `app/(routes)/anime/[malId]/page.tsx` - Server component with metadata generation
- `app/(routes)/anime/[malId]/AnimeDetailsClient.tsx` - Client component with interactivity
- `app/(routes)/anime/[malId]/AnimeDetails.module.css` - Styling

**Implementation Details**:
- Uses Next.js 13+ async params pattern
- Fetches anime data via `malService.getSeriesSeasons(malId)`
- Optimized to avoid duplicate API calls (getById is called inside getSeriesSeasons)
- Revalidates every 24 hours (anime data is mostly static)
- Includes comprehensive metadata for SEO and social sharing

### 2. Anime Watch Page
**URL**: `/anime/[malId]/watch?episode=1`
**Example**: `/anime/57658/watch?episode=1` (JJK S3E1)

**Features**:
- Plays anime using MAL ID directly
- No TMDB conversion needed
- Uses AnimeKai extractor with MAL info
- Integrated with MobileVideoPlayer component

**Files**:
- `app/(routes)/anime/[malId]/watch/page.tsx` - Server component
- `app/(routes)/anime/[malId]/watch/AnimeWatchClient.tsx` - Client component with video player

**Implementation Details**:
- Passes MAL ID and episode directly to stream API
- Stream URL format: `/api/stream/extract?malId={malId}&episode={episode}&provider=animekai`
- Uses MobileVideoPlayer with required props: tmdbId, mediaType, season, episode, title, streamUrl

### 3. MAL Stream API
**URL**: `/api/anime/stream?malId=57658&episode=1`

**Features**:
- Takes MAL ID and episode number directly
- No TMDB ID needed
- Returns AnimeKai streams
- Includes anime metadata in response

**Files**:
- `app/api/anime/stream/route.ts`

**Response Format**:
```json
{
  "success": true,
  "sources": [
    {
      "quality": "1080p",
      "url": "/api/stream/proxy?url=...",
      "type": "hls"
    }
  ],
  "anime": {
    "malId": 57658,
    "title": "Jujutsu Kaisen 3rd Season",
    "titleEnglish": "Jujutsu Kaisen Season 3",
    "episodes": 12
  },
  "executionTime": 1234
}
```

## How to Use

### For JJK Season 3 (Culling Game):
1. Go to `/anime/57658` (MAL ID for JJK Season 3)
2. Click on episode 1
3. Plays Culling Game Episode 1 ✅

### For JJK Season 1:
1. Go to `/anime/40748` (MAL ID for JJK Season 1)
2. Click on any episode
3. Plays correct episode ✅

### For JJK Season 2:
1. Go to `/anime/51009` (MAL ID for JJK Season 2)
2. Click on any episode
3. Plays correct episode ✅

## Benefits

✅ **No TMDB conversion** - Uses MAL IDs directly
✅ **No absolute episode numbering issues** - Each season is separate
✅ **Correct episode mapping** - Episode 1 is always episode 1
✅ **Clean URLs** - `/anime/57658/watch?episode=1`
✅ **Works for all anime** - Not just JJK

## MAL IDs for Popular Anime

- **Jujutsu Kaisen S1**: 40748 (24 episodes)
- **Jujutsu Kaisen S2**: 51009 (23 episodes)
- **Jujutsu Kaisen S3**: 57658 (12 episodes)
- **Demon Slayer S1**: 38000 (26 episodes)
- **Demon Slayer S2**: 47778 (18 episodes)
- **Attack on Titan S1**: 16498 (25 episodes)
- **My Hero Academia S1**: 31964 (13 episodes)

## Next Steps

1. Update the `/anime` browse page to link to MAL details pages
2. Add search functionality for MAL anime
3. Add "Continue Watching" for MAL anime
4. Migrate existing TMDB anime links to MAL links

## Migration Path

Users can still use the old TMDB-based system at `/details/[tmdbId]`, but for anime, they should use `/anime/[malId]` for a better experience.
