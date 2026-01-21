# JJK Season 3 (Culling Game) Fix - January 2026

> **⚠️ STATUS: HARDCODED OVERRIDE ACTIVE**  
> A temporary hardcoded override is now in place for JJK episodes 48-59 to ensure correct playback.  
> This bypasses the automatic MAL search and directly uses the AnimeKai content ID.

## Problem
1. Jujutsu Kaisen Season 3 (The Culling Game: Part 1) was incorrectly mapped with 24 episodes when it actually has 12 episodes for Part 1.
2. **CRITICAL**: When requesting episode 48 (S3E1), the API was playing episode 1 of Season 1 instead because the MAL entry wasn't being calculated automatically.

## Solution
1. Updated the MAL mapping to correctly reflect Season 3's episode count (12 episodes)
2. **Added automatic MAL entry calculation** in the stream extraction API to convert absolute episode numbers to the correct MAL entry + relative episode
3. **⚠️ TEMPORARY WORKAROUND**: Added hardcoded override in AnimeKai extractor for episodes 48-59 to bypass MAL search issues

## Changes Made

### 1. Updated `app/lib/services/mal.ts`
Fixed three mapping constants:

#### TMDB_TO_MAL_SEASON_MAPPING
```typescript
95479: {
  1: { malId: 40748, episodes: 24, title: 'Jujutsu Kaisen' },
  2: { malId: 51009, episodes: 23, title: 'Jujutsu Kaisen 2nd Season' },
  3: { malId: 57658, episodes: 12, title: 'Jujutsu Kaisen: The Culling Game - Part 1' }, // ✓ Fixed: 24 → 12
}
```

#### TMDB_ABSOLUTE_EPISODE_ANIME
```typescript
95479: [
  { malId: 40748, episodes: 24, title: 'Jujutsu Kaisen' },
  { malId: 51009, episodes: 23, title: 'Jujutsu Kaisen 2nd Season' },
  { malId: 57658, episodes: 12, title: 'Jujutsu Kaisen: The Culling Game - Part 1' }, // ✓ Fixed: 24 → 12
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
    { malId: 57658, episodes: 12, title: 'Jujutsu Kaisen: The Culling Game - Part 1' }, // ✓ Fixed: 24 → 12
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
Output: malId=57658, malTitle="Jujutsu Kaisen: The Culling Game - Part 1", episode=1
```

### 4. **⚠️ TEMPORARY: Added Hardcoded Override in `app/lib/services/animekai-extractor.ts`**

Due to MAL search issues with "The Culling Game - Part 1" title, a hardcoded override was added:

```typescript
// *** HARDCODED OVERRIDE FOR JJK SEASON 3 (CULLING GAME) ***
// TMDB ID 95479 + MAL ID 57658 = The Culling Game Part 1
// The API route already converts episode 48 → malId 57658, episode 1
if (tmdbId === '95479' && malId === 57658 && episode) {
  console.log(`[AnimeKai] *** HARDCODED OVERRIDE: JJK Culling Game Episode ${episode} (MAL ID ${malId}) ***`);
  console.log(`[AnimeKai] *** THIS WILL BYPASS ALL SEARCH LOGIC AND USE DIRECT CONTENT_ID ***`);
  
  const cullingGameContentId = '792m'; // From the AnimeKai URL
  
  // Episode is already converted to relative number by the API
  // Directly fetch streams using content_id, bypassing search
  // With improved error handling and early returns
  // ...
}
```

**Why this is needed:**
- The MAL title "Jujutsu Kaisen: The Culling Game - Part 1" doesn't match AnimeKai's listing
- AnimeKai uses content ID `792m` for this season
- This override bypasses the search and directly uses the correct content ID
- **This is a temporary workaround** until the MAL search logic can be improved

**Key Improvements (Jan 19, 2026):**
- The override now checks **MAL ID** (57658) instead of absolute episode range (48-59)
- The API route already converts absolute episodes to MAL entries
- No manual episode offset calculation needed
- **Enhanced error handling** with early returns and clear error messages
- **Better logging** with ❌ CRITICAL markers for debugging
- **No fallback to search** - returns immediately on failure for clarity
- More robust and maintainable implementation

**When to remove:**
- When AnimeKai's search can reliably find "The Culling Game - Part 1"
- When a better title matching algorithm is implemented
- When the season completes and Part 2 is released (may need different handling)

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
- ✅ **Hardcoded override is ACTIVE for episodes 48-59**
- ⚠️ **Automatic MAL search bypassed for JJK Season 3** (temporary workaround)
- ✅ Total episode count: 59 episodes
- ✅ No TypeScript errors
- ✅ Client and server mappings are synchronized

### Quick Test Script
You can verify the MAL conversion logic works correctly:
```bash
bun run test-mal-conversion.ts
```

Expected output:
```
✅ CORRECT! Episode 48 → Season 3 Episode 1
  MAL ID: 57658
  MAL Title: Jujutsu Kaisen: The Culling Game - Part 1
  Relative Episode: 1
```

### Console Output Example (Episode 48)
```
[EXTRACT] *** MAL ABSOLUTE EPISODE CONVERSION ***
{
  tmdbId: '95479',
  originalEpisode: 48,
  converted: {
    malId: 57658,
    malTitle: 'Jujutsu Kaisen: The Culling Game - Part 1',
    relativeEpisode: 1
  }
}
[EXTRACT] *** JJK DETECTED: Will pass malId=57658, malTitle="Jujutsu Kaisen: The Culling Game - Part 1", episode=1 to AnimeKai extractor ***
[AnimeKai] MAL override: ID=57658, Title="Jujutsu Kaisen: The Culling Game - Part 1"
[AnimeKai] *** HARDCODED OVERRIDE: JJK Culling Game Episode 1 (MAL ID 57658) ***
[AnimeKai] *** THIS WILL BYPASS ALL SEARCH LOGIC AND USE DIRECT CONTENT_ID ***
[AnimeKai] Using hardcoded content_id: 792m, episode: 1
[AnimeKai] ✓ Got episodes for Culling Game, looking for episode 1...
[AnimeKai] ✓ Found hardcoded episode token for Culling Game E1
[AnimeKai] Processing 4 servers for hardcoded Culling Game...
[AnimeKai] ✓ Got SUB source from Server 1 (sub)
[AnimeKai] *** HARDCODED OVERRIDE SUCCESS: Returning 2 sources for JJK Culling Game E1 ***
```

**Note:** The hardcoded override logs show the **relative episode number** (1-12), not the absolute episode (48-59), because the API route already performed the conversion.

**Error handling examples:**
```
# Episode not available
[AnimeKai] ❌ CRITICAL: Episode 13 not found in Culling Game episodes
[AnimeKai] Available episodes: [ '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12' ]

# All servers failed
[AnimeKai] ❌ CRITICAL: All servers failed for Culling Game episode 1
```

### API Usage
The API now handles absolute episode numbering automatically with a hardcoded override for JJK Season 3:
```bash
# Just pass the TMDB episode number - no malId needed!
curl "http://localhost:3000/api/stream/extract?tmdbId=95479&type=tv&season=1&episode=48"

# The API automatically:
# 1. Detects JJK uses absolute episode numbering
# 2. Calculates: Episode 48 = MAL 57658 (Season 3) Episode 1
# 3. ⚠️ HARDCODED OVERRIDE: Bypasses MAL search, uses content_id=792m directly
# 4. Fetches episode 1 from AnimeKai's Culling Game entry
# 5. Returns the correct stream!
```

**Important:** The hardcoded override is transparent to the API consumer - the endpoint works the same way.

## Future Updates

### When Season 3 Part 2 is Released
Update the episode count for MAL ID 57658 or add a new MAL entry if it's released as a separate season.

### Removing the Hardcoded Override
The hardcoded override in `animekai-extractor.ts` should be removed when:
1. **AnimeKai's search improves** - Can reliably find "The Culling Game - Part 1" by title
2. **Better title matching** - Implement fuzzy matching or alternative search strategies
3. **Season completes** - Part 2 releases and may need different handling
4. **Content ID changes** - If AnimeKai updates their database structure

**To remove the override:**
1. Delete the hardcoded block in `extractAnimeKaiStreamsLocal()` (lines ~1276-1393)
2. Test that episodes 48-59 still work via normal MAL search
3. Update this documentation to reflect the removal

**Location of hardcoded override:**
```
File: app/lib/services/animekai-extractor.ts
Function: extractAnimeKaiStreamsLocal()
Lines: ~1295-1443
Search for: "HARDCODED OVERRIDE FOR JJK SEASON 3"
Trigger: tmdbId === '95479' && malId === 57658 && episode
```

**How it works:**
- The API route converts absolute episodes to MAL entries first
- Episode 48 arrives as: `malId=57658, episode=1`
- The override checks MAL ID instead of episode range
- No manual episode offset calculation needed
- **Enhanced error handling** with early returns
- **Clear error messages** with ❌ CRITICAL markers
- **No fallback** - returns immediately on failure

## MAL Reference
- MAL ID 57658: https://myanimelist.net/anime/57658/Jujutsu_Kaisen__Shimetsu_Kaiyuu_-_Zenpen
- Status: Currently Airing (as of Jan 2026)
- Episodes: 12 (Part 1)
- Broadcast: Fridays at 00:26 JST
