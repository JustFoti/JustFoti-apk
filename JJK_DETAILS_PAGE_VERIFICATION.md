# JJK Details Page - Episode Selection Verification

## How It Works

### Episode Display
- TMDB episodes are displayed with their **absolute episode numbers** (1-59)
- Episode 48 shows as "Episode 48" in the UI ✅
- Episode 59 shows as "Episode 59" in the UI ✅

### Episode Selection Flow

When user clicks **Episode 48** on the details page:

1. **EpisodeList component** calls `onEpisodeSelect(48)`
   - Passes the absolute episode number from TMDB

2. **handleEpisodeSelect(48)** in DetailsPageClient:
   ```typescript
   // Detects JJK uses absolute episode numbering
   if (isAnime && usesAbsoluteEpisodeNumbering(tmdbId)) {
     const malEntry = getMALEntryForAbsoluteEpisode(tmdbId, 48);
     // Returns: { malId: 57658, malTitle: "Jujutsu Kaisen 3rd Season", relativeEpisode: 1 }
     
     router.push(
       `/watch/${content.id}?type=tv&season=1&episode=1&malId=57658&malTitle=Jujutsu%20Kaisen%203rd%20Season`
     );
   }
   ```

3. **Watch page** receives:
   - `episode=1` (relative to MAL entry)
   - `malId=57658` (Season 3)
   - `malTitle=Jujutsu Kaisen 3rd Season`

4. **API route** (`/api/stream/extract`):
   ```typescript
   // malId is provided, so skip automatic calculation
   if (type === 'tv' && episode && !malId) {
     // This block is SKIPPED because malId=57658 is provided
   }
   
   // Uses malId=57658 and episode=1 directly
   extractAnimeKaiStreams(tmdbId, type, season, 1, 57658, "Jujutsu Kaisen 3rd Season")
   ```

5. **AnimeKai extractor**:
   - Searches for "Jujutsu Kaisen 3rd Season"
   - Fetches episode 1 of that entry
   - Returns Culling Game Episode 1 stream ✅

## Verification Checklist

✅ **Episode numbers display correctly** (1-59 absolute numbering)
✅ **Episode 48 converts to MAL 57658 Episode 1**
✅ **Episode 52 converts to MAL 57658 Episode 5**
✅ **Episode 59 converts to MAL 57658 Episode 12**
✅ **malId is passed to API** (prevents double conversion)
✅ **Relative episode number is used** (1, not 48)

## Code Locations

### Details Page Client
`app/(routes)/details/[id]/DetailsPageClient.tsx`
- Lines 23-58: `TMDB_ABSOLUTE_EPISODE_ANIME` mapping
- Lines 36-56: `getMALEntryForAbsoluteEpisode()` function
- Lines 540-560: `handleEpisodeSelect()` with conversion logic

### API Route
`app/api/stream/extract/route.ts`
- Lines 135-152: Automatic MAL calculation (only when malId NOT provided)

## Test Scenarios

### Scenario 1: Click Episode 48 from Details Page
```
User Action: Click "Episode 48" on JJK details page
Expected URL: /watch/95479?type=tv&season=1&episode=1&malId=57658&malTitle=Jujutsu%20Kaisen%203rd%20Season
Expected Stream: Culling Game Episode 1 ✅
```

### Scenario 2: Direct API Call (No malId)
```
API Call: GET /api/stream/extract?tmdbId=95479&type=tv&season=1&episode=48
API Converts: episode 48 → MAL 57658 episode 1
Expected Stream: Culling Game Episode 1 ✅
```

### Scenario 3: Direct API Call (With malId)
```
API Call: GET /api/stream/extract?tmdbId=95479&type=tv&season=1&episode=1&malId=57658
API Uses: malId 57658, episode 1 directly (no conversion)
Expected Stream: Culling Game Episode 1 ✅
```

## Summary

**The details page is working correctly!** It properly converts absolute episode numbers to MAL entries before navigating to the watch page. The API also has a fallback to do this conversion if malId is not provided.

Both paths lead to the correct stream:
- **Details Page Path**: User clicks → Convert → Navigate with malId → API uses malId
- **Direct API Path**: API call without malId → API converts → Uses malId

✅ **Episode 48 will play Culling Game Episode 1**
✅ **No double conversion issues**
✅ **All 59 JJK episodes are accessible**
