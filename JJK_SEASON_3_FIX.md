# JJK Season 3 (Culling Game) Fix - January 2026

> **✅ STATUS: FULLY IMPLEMENTED**  
> Automatic MAL entry calculation is now live in production. No manual `malId` parameters needed!

## Problem
1. Jujutsu Kaisen Season 3 (The Culling Game: Part 1) was incorrectly mapped with 24 episodes when it actually has 12 episodes for Part 1.
2. **CRITICAL**: When requesting episode 48 (S3E1), the API was playing episode 1 of Season 1 instead because the MAL entry wasn't being calculated automatically.

## Solution
1. Updated the MAL mapping to correctly reflect Season 3's episode count (12 episodes)
2. **Added automatic MAL entry calculation** in the stream extraction API to convert absolute episode numbers to the correct MAL entry + relative episode

## Changes Made

### 1. Updated `app/lib/services/mal.ts`
Fixed three mapping constants:

#### TMDB_TO_MAL_SEASON_MAPPING
```typescript
95479: {
  1: { malId: 40748, episodes: 24, title: 'Jujutsu Kaisen' },
  2: { malId: 51009, episodes: 23, title: 'Jujutsu Kaisen 2nd Season' },
  3: { malId: 57658, episodes: 12, title: 'Jujutsu Kaisen 3rd Season' }, // ✓ Fixed: 24 → 12
}
```

#### TMDB_ABSOLUTE_EPISODE_ANIME
```typescript
95479: [
  { malId: 40748, episodes: 24, title: 'Jujutsu Kaisen' },
  { malId: 51009, episodes: 23, title: 'Jujutsu Kaisen 2nd Season' },
  { malId: 57658, episodes: 12, title: 'Jujutsu Kaisen 3rd Season' }, // ✓ Fixed: 24 → 12
]
```

#### TMDB_TO_MAL_ALL_SEASONS
```typescript
95479: [
  { malId: 40748, episodes: 24, title: 'Jujutsu Kaisen' },
  { malId: 51009, episodes: 23, title: 'Jujutsu Kaisen 2nd Season' },
  { malId: 57658, episodes: 12, title: 'Jujutsu Kaisen 3rd Season' }, // ✓ Fixed: 24 → 12
]
```

### 2. Updated `app/(routes)/details/[id]/DetailsPageClient.tsx`
Fixed the client-side mapping:

```typescript
const TMDB_ABSOLUTE_EPISODE_ANIME = {
  95479: [
    { malId: 40748, episodes: 24, title: 'Jujutsu Kaisen' },
    { malId: 51009, episodes: 23, title: 'Jujutsu Kaisen 2nd Season' },
    { malId: 57658, episodes: 12, title: 'Jujutsu Kaisen 3rd Season' }, // ✓ Fixed: 24 → 12
  ],
};
```

### 3. **NEW: Added Automatic MAL Entry Calculation in `app/api/stream/extract/route.ts`**

This is the critical fix that makes episode 48 work correctly!

```typescript
// IMPORTANT: For anime with absolute episode numbering (like JJK), calculate the correct MAL entry
if (type === 'tv' && episode && !malId) {
  const { malService } = await import('@/lib/services/mal');
  const tmdbIdNum = parseInt(tmdbId);
  
  if (malService.usesAbsoluteEpisodeNumbering(tmdbIdNum)) {
    const malEntry = malService.getMALEntryForAbsoluteEpisode(tmdbIdNum, episode);
    if (malEntry) {
      malId = malEntry.malId;
      malTitle = malEntry.malTitle;
      episode = malEntry.relativeEpisode;
      console.log(`[EXTRACT] Absolute episode anime detected: TMDB ep ${originalEpisode} → MAL ${malId} (${malTitle}) ep ${episode}`);
    }
  }
}
```

**What this does:**
- Detects when an anime uses absolute episode numbering (JJK does)
- Calculates which MAL entry the episode belongs to
- Converts absolute episode to relative episode within that MAL entry
- Passes the correct MAL ID and episode to AnimeKai extractor

**Example for Episode 48:**
```
Input:  tmdbId=95479, episode=48
Output: malId=57658, malTitle="Jujutsu Kaisen 3rd Season", episode=1
```

## Episode Mapping

### Current State (as of January 2026)
- **Season 1**: Episodes 1-24 (MAL ID: 40748)
- **Season 2**: Episodes 25-47 (MAL ID: 51009) - Shibuya Incident
- **Season 3**: Episodes 48-59 (MAL ID: 57658) - Culling Game Part 1
- **Total**: 59 episodes

### Absolute Episode Numbering
TMDB uses absolute episode numbering (all episodes in Season 1), so:
- Episode 1-24 → Season 1
- Episode 25-47 → Season 2
- Episode 48-59 → Season 3 Part 1

## API Endpoints

### Stream Extraction
```
GET /api/stream/extract?tmdbId=95479&type=tv&season=1&episode=48
→ Maps to MAL 57658 (Season 3) Episode 1
```

### MAL Info
```
GET /api/content/mal-info?tmdbId=95479&type=tv
→ Returns all 3 seasons with correct episode counts
```

## Verification

All changes have been tested and verified:
- ✅ Episode mapping logic works correctly
- ✅ All 3 seasons are accessible via API
- ✅ **Episode 48 now correctly plays Season 3 Episode 1 (Culling Game)**
- ✅ **Automatic MAL entry calculation is LIVE in production**
- ✅ No manual `malId` parameter needed - fully automatic
- ✅ Total episode count: 59 episodes
- ✅ No TypeScript errors
- ✅ Client and server mappings are synchronized

### Console Output Example (Episode 48)
```
[EXTRACT] Absolute episode anime detected: TMDB ep 48 → MAL 57658 (Jujutsu Kaisen 3rd Season) ep 1
[AnimeKai] MAL override: ID=57658, Title="Jujutsu Kaisen 3rd Season"
[AnimeKai] MAL title provided - searching for: "Jujutsu Kaisen 3rd Season"
[AnimeKai] ✓ Found with MAL title: "Jujutsu Kaisen 3rd Season"
```

### API Usage
The API now handles absolute episode numbering automatically:
```bash
# Just pass the TMDB episode number - no malId needed!
curl "http://localhost:3000/api/stream/extract?tmdbId=95479&type=tv&season=1&episode=48"

# The API automatically:
# 1. Detects JJK uses absolute episode numbering
# 2. Calculates: Episode 48 = MAL 57658 (Season 3) Episode 1
# 3. Passes correct MAL ID to AnimeKai extractor
# 4. Returns the correct stream!
```

## Future Updates

When Season 3 Part 2 is released, update the episode count for MAL ID 57658 or add a new MAL entry if it's released as a separate season.

## MAL Reference
- MAL ID 57658: https://myanimelist.net/anime/57658/Jujutsu_Kaisen__Shimetsu_Kaiyuu_-_Zenpen
- Status: Currently Airing (as of Jan 2026)
- Episodes: 12 (Part 1)
- Broadcast: Fridays at 00:26 JST
