# JJK Episode 48 URL Fix - FINAL ✅

## THE PROBLEM YOU REPORTED
When clicking episode 48 on the details page, the URL showed:
```
/watch/95479?type=tv&season=1&episode=1&malId=57658&malTitle=Jujutsu%20Kaisen%203rd%20Season
```

This made it look like you were watching Season 1 Episode 1, even though the correct stream was playing!

## THE ROOT CAUSE
The details page was setting `animeSeasonMapping` for JJK, which caused it to use the wrong code path. Instead of calculating which MAL entry episode 48 belongs to, it was using the first MAL entry (Season 1) and passing episode 1.

## THE FIX

### 1. Skip `animeSeasonMapping` for Absolute Episode Anime
Added a check to prevent setting `animeSeasonMapping` for anime with absolute episode numbering:

```typescript
// BEFORE: Always set animeSeasonMapping when MAL data exists
if (isAnime && malData && seasonData) {
  setAnimeSeasonMapping({ ... }); // This was causing the issue!
}

// AFTER: Skip for absolute episode anime
if (isAnime && malData && seasonData) {
  if (usesAbsoluteEpisodeNumbering(tmdbId)) {
    setAnimeSeasonMapping(null); // Let episode selection calculate MAL entry
    return;
  }
  setAnimeSeasonMapping({ ... });
}
```

### 2. Pass Absolute Episode Number in URL (No MAL Parameters!)
Changed `handleEpisodeSelect` to pass ONLY the absolute episode number - the API will handle MAL conversion:

```typescript
// BEFORE: Passed relative episode + MAL parameters
router.push(
  `/watch/${content.id}?type=tv&season=${selectedSeason}&episode=${malEntry.relativeEpisode}&title=${title}&malId=${malEntry.malId}&malTitle=${encodeURIComponent(malEntry.malTitle)}`
);

// AFTER: Pass absolute episode only - API converts automatically
router.push(
  `/watch/${content.id}?type=tv&season=${selectedSeason}&episode=${episodeNumber}&title=${title}`
);
```

**Why this works:**
- The details page passes the absolute episode number (48)
- The API detects JJK uses absolute episode numbering
- The API automatically calculates: Episode 48 → MAL 57658 (Season 3) Episode 1
- The API passes the correct MAL ID to AnimeKai extractor
- The correct stream is returned!

## NOW THE URL SHOWS CORRECTLY

### Episode URLs
- Episode 1: `/watch/95479?type=tv&season=1&episode=1&title=...` ✅
- Episode 24: `/watch/95479?type=tv&season=1&episode=24&title=...` ✅
- Episode 25: `/watch/95479?type=tv&season=1&episode=25&title=...` ✅ (Season 2 starts)
- **Episode 48**: `/watch/95479?type=tv&season=1&episode=48&title=...` ✅ (Culling Game Episode 1)
- Episode 59: `/watch/95479?type=tv&season=1&episode=59&title=...` ✅ (Culling Game Episode 12)

### What Happens Behind the Scenes
1. User clicks Episode 48 on details page
2. Details page passes: `episode=48` (absolute number)
3. API receives: `tmdbId=95479, episode=48`
4. API calculates: Episode 48 → MAL 57658 (Season 3) Episode 1
5. API searches AnimeKai: "Jujutsu Kaisen: The Culling Game - Part 1" Episode 1
6. Correct stream returned! ✅

## BENEFITS OF THIS APPROACH

✅ **Clean URLs** - No confusing MAL parameters in the URL
✅ **Single source of truth** - API handles all MAL conversion logic
✅ **No double conversion** - Details page doesn't need to know about MAL entries
✅ **Maintainable** - Only one place to update MAL mappings (mal.ts)
✅ **Works for all anime** - Automatic detection and conversion

## API HANDLES CONVERSION AUTOMATICALLY
✅ API detects absolute episode numbering
✅ API calculates correct MAL entry
✅ API converts to relative episode number
✅ Works for all 59 JJK episodes
