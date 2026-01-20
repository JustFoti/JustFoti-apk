# JJK Season 3 Hardcoded Override - Temporary Workaround

> **⚠️ TEMPORARY WORKAROUND**  
> This document describes a hardcoded override for JJK episodes 48-59.  
> **This should be removed** once the MAL search can reliably find "The Culling Game - Part 1".

## What Is This?

A hardcoded override in `app/lib/services/animekai-extractor.ts` that bypasses the normal MAL search for JJK Season 3 episodes (48-59) and directly uses the AnimeKai content ID.

## Why Is It Needed?

The MAL title for JJK Season 3 is "Jujutsu Kaisen: The Culling Game - Part 1", but AnimeKai's search doesn't reliably find this entry. The override ensures episodes 48-59 always work correctly.

## How It Works

```typescript
// In extractAnimeKaiStreamsLocal() function
// The API route already converts episode 48 → malId 57658, episode 1
if (tmdbId === '95479' && malId === 57658 && episode) {
  console.log(`[AnimeKai] *** HARDCODED OVERRIDE: JJK Culling Game Episode ${episode} (MAL ID ${malId}) ***`);
  
  const cullingGameContentId = '792m'; // AnimeKai content ID
  
  // Episode is already converted to relative number by the API
  // No need for manual offset calculation!
  
  // Directly fetch streams using content_id, bypassing search
  // ...
}
```

**Key Improvement:**
- The API route (`/api/stream/extract`) already converts absolute episode numbers to MAL entries
- Episode 48 → MAL ID 57658, relative episode 1
- The override now checks **MAL ID** instead of absolute episode range
- No manual episode offset calculation needed (`episode - 47` removed)
- More robust and cleaner implementation

## Location

**File:** `app/lib/services/animekai-extractor.ts`  
**Function:** `extractAnimeKaiStreamsLocal()`  
**Lines:** ~1295-1410  
**Search for:** `"HARDCODED OVERRIDE FOR JJK SEASON 3"`

**Trigger Condition:**
```typescript
if (tmdbId === '95479' && malId === 57658 && episode)
```

This checks:
- TMDB ID 95479 (Jujutsu Kaisen)
- MAL ID 57658 (The Culling Game - Part 1)
- Episode number exists

The API route already converts absolute episodes to MAL entries, so:
- Episode 48 arrives as: `malId=57658, episode=1`
- Episode 52 arrives as: `malId=57658, episode=5`
- Episode 59 arrives as: `malId=57658, episode=12`

## When to Remove

Remove this override when **ANY** of the following is true:

1. ✅ **AnimeKai search improved** - Can find "The Culling Game - Part 1" by title
2. ✅ **Better title matching implemented** - Fuzzy matching or alternative search strategies
3. ✅ **Season structure changes** - Part 2 releases or AnimeKai reorganizes content
4. ✅ **Content ID changes** - AnimeKai updates their database

## How to Remove

### Step 1: Delete the Override Block
Remove lines ~1295-1410 in `app/lib/services/animekai-extractor.ts`:

```typescript
// DELETE THIS ENTIRE BLOCK:
// *** HARDCODED OVERRIDE FOR JJK SEASON 3 (CULLING GAME) ***
if (tmdbId === '95479' && malId === 57658 && episode) {
  // ... entire override logic ...
}
```

### Step 2: Test Episodes 48-59
```bash
# Test episode 48 (Culling Game Episode 1)
curl "http://localhost:3000/api/stream/extract?tmdbId=95479&type=tv&season=1&episode=48"

# Test episode 52 (Culling Game Episode 5)
curl "http://localhost:3000/api/stream/extract?tmdbId=95479&type=tv&season=1&episode=52"

# Test episode 59 (Culling Game Episode 12)
curl "http://localhost:3000/api/stream/extract?tmdbId=95479&type=tv&season=1&episode=59"
```

**Expected behavior after removal:**
- API still calculates: Episode 48 → MAL 57658 Episode 1
- AnimeKai search finds "The Culling Game - Part 1" by MAL title
- Streams work correctly without hardcoded override

### Step 3: Update Documentation
After successful removal, update these files:
- `JJK_SEASON_3_FIX.md` - Remove hardcoded override section
- `JJK_FIX_SUMMARY.md` - Remove hardcoded override notes
- `JJK_HARDCODED_OVERRIDE.md` - Mark as REMOVED or delete file

## Console Output

### With Override Active (Current)
```
[EXTRACT] Absolute episode anime detected: TMDB ep 48 → MAL 57658 (Jujutsu Kaisen: The Culling Game - Part 1) ep 1
[AnimeKai] MAL override: ID=57658, Title="Jujutsu Kaisen: The Culling Game - Part 1"
[AnimeKai] *** HARDCODED OVERRIDE: JJK Culling Game Episode 1 (MAL ID 57658) ***
[AnimeKai] Using hardcoded content_id: 792m, episode: 1
[AnimeKai] ✓ Found hardcoded episode token for Culling Game E1
[AnimeKai] Processing 4 servers for hardcoded Culling Game...
[AnimeKai] ✓ Got SUB source from Server 1 (sub)
[AnimeKai] *** HARDCODED OVERRIDE SUCCESS: Returning 2 sources for JJK Culling Game ***
```

**Note:** The episode number shown is already the **relative episode** (1-12), not the absolute episode (48-59), because the API route converted it before calling the extractor.

### After Removal (Expected)
```
[EXTRACT] Absolute episode anime detected: TMDB ep 48 → MAL 57658 (Jujutsu Kaisen: The Culling Game - Part 1) ep 1
[AnimeKai] MAL override: ID=57658, Title="Jujutsu Kaisen: The Culling Game - Part 1"
[AnimeKai] MAL title provided - searching for: "Jujutsu Kaisen: The Culling Game - Part 1"
[AnimeKai] ✓ Found with MAL title: "Jujutsu Kaisen: The Culling Game - Part 1"
[AnimeKai] *** FOUND ANIME: "Jujutsu Kaisen: The Culling Game - Part 1" (content_id: 792m) ***
```

## Impact

### User-Facing
- ✅ **No impact** - Episodes 48-59 work correctly with or without override
- ✅ **Transparent** - Users don't see any difference in behavior

### Developer-Facing
- ⚠️ **Maintenance burden** - Hardcoded values need updating if AnimeKai changes
- ⚠️ **Code smell** - Bypasses normal search logic
- ⚠️ **Scalability** - Not a pattern to repeat for other anime

## Alternative Solutions

If the override needs to stay longer than expected, consider:

1. **Content ID Mapping Table**
   ```typescript
   const ANIMEKAI_CONTENT_ID_OVERRIDES: Record<string, string> = {
     '95479_48-59': '792m', // JJK Season 3
     // Add more as needed
   };
   ```

2. **Fuzzy Title Matching**
   - Implement Levenshtein distance or similar algorithm
   - Match "Culling Game" even if exact title differs

3. **AnimeKai API Enhancement**
   - Request AnimeKai to improve search
   - Add MAL ID search parameter

4. **Manual Content ID Cache**
   - Build a database of TMDB → AnimeKai content ID mappings
   - Update via admin panel or script

## Related Documentation

- `JJK_SEASON_3_FIX.md` - Complete fix documentation
- `JJK_FIX_SUMMARY.md` - Quick summary
- `JJK_URL_FIX.md` - URL parameter fix
- `MAL_ANIME_SYSTEM.md` - Overall anime system architecture

## Changelog

- **2026-01-19**: Override added to fix episodes 48-59 playback
- **TBD**: Override removed after MAL search improvement

---

**Remember:** This is a **temporary workaround**. The goal is to remove it as soon as possible!
