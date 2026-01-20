# JJK Hardcoded Override - Implementation Improvement

**Date:** January 19, 2026  
**Status:** ✅ Improved and Active

## What Changed

The hardcoded override for JJK Season 3 (episodes 48-59) was **improved** to use a more robust trigger condition.

### Old Implementation (Before)
```typescript
// Checked absolute episode range
if (tmdbId === '95479' && episode && episode >= 48 && episode <= 59) {
  const cullingGameEpisode = episode - 47; // Manual offset calculation
  // ...
}
```

**Problems:**
- Hardcoded episode range (48-59)
- Required manual episode offset calculation (`episode - 47`)
- Didn't leverage the API's MAL conversion

### New Implementation (After)
```typescript
// Checks MAL ID directly
if (tmdbId === '95479' && malId === 57658 && episode) {
  // Episode is already converted to relative number by the API
  // No manual offset needed!
  // ...
}
```

**Benefits:**
- ✅ Checks **MAL ID** instead of episode range
- ✅ Leverages the API's automatic MAL conversion
- ✅ No manual episode offset calculation needed
- ✅ More robust and maintainable
- ✅ Cleaner code

## How It Works Now

### Data Flow
```
User clicks Episode 48
  ↓
API receives: tmdbId=95479, episode=48
  ↓
API calculates: Episode 48 → MAL 57658, episode 1
  ↓
AnimeKai extractor receives: tmdbId=95479, malId=57658, episode=1
  ↓
Override triggers: tmdbId === '95479' && malId === 57658 ✓
  ↓
Uses content_id=792m, episode=1 (already converted!)
  ↓
Returns correct stream ✅
```

### Key Insight
The API route (`/api/stream/extract/route.ts`) **already converts** absolute episode numbers to MAL entries:
- Episode 48 → MAL ID 57658, relative episode 1
- Episode 52 → MAL ID 57658, relative episode 5
- Episode 59 → MAL ID 57658, relative episode 12

The override now **leverages this conversion** instead of duplicating the logic!

## Code Comparison

### Episode Offset Calculation

**Before:**
```typescript
const cullingGameEpisode = episode - 47; // Manual calculation
// Episode 48 → 1
// Episode 49 → 2
// Episode 59 → 12
```

**After:**
```typescript
// No calculation needed!
// The API already converted:
// Episode 48 arrives as episode=1
// Episode 52 arrives as episode=5
// Episode 59 arrives as episode=12
```

### Trigger Condition

**Before:**
```typescript
if (tmdbId === '95479' && episode && episode >= 48 && episode <= 59)
```
- Checks episode range
- Brittle if episode count changes
- Doesn't validate MAL entry

**After:**
```typescript
if (tmdbId === '95479' && malId === 57658 && episode)
```
- Checks MAL ID directly
- Robust to episode count changes
- Validates correct MAL entry

## Console Output Comparison

### Before
```
[AnimeKai] *** HARDCODED OVERRIDE: JJK Episode 48 → Culling Game Part 1 Episode 1 ***
```
- Showed absolute episode (48)
- Showed conversion (→ Episode 1)

### After
```
[AnimeKai] *** HARDCODED OVERRIDE: JJK Culling Game Episode 1 (MAL ID 57658) ***
```
- Shows relative episode (1) - already converted by API
- Shows MAL ID for clarity
- More concise and accurate

## Why This Matters

### Maintainability
- **Single source of truth**: MAL conversion logic is only in the API route
- **No duplication**: Override doesn't duplicate episode offset calculation
- **Easier to update**: If episode counts change, only update `mal.ts`

### Robustness
- **Validates MAL entry**: Ensures we're working with the correct season
- **Type-safe**: Uses MAL ID (number) instead of episode range
- **Future-proof**: Works even if TMDB episode numbering changes

### Clarity
- **Clear intent**: "If this is JJK Season 3 (MAL 57658)..."
- **Better logs**: Shows MAL ID in console output
- **Easier debugging**: Can verify MAL ID is correct

## Impact on Documentation

Updated files:
- ✅ `JJK_HARDCODED_OVERRIDE.md` - Updated trigger condition and examples
- ✅ `JJK_SEASON_3_FIX.md` - Updated implementation details
- ✅ `JJK_FIX_SUMMARY.md` - Updated override description
- ✅ `JJK_DOCUMENTATION_INDEX.md` - Updated line numbers and status

## Testing

The override still works exactly the same from a user perspective:

```bash
# Episode 48 - Still works!
curl "http://localhost:3000/api/stream/extract?tmdbId=95479&type=tv&season=1&episode=48"

# Episode 52 - Still works!
curl "http://localhost:3000/api/stream/extract?tmdbId=95479&type=tv&season=1&episode=52"

# Episode 59 - Still works!
curl "http://localhost:3000/api/stream/extract?tmdbId=95479&type=tv&season=1&episode=59"
```

**Expected behavior:**
- API converts absolute episode to MAL entry
- Override triggers on MAL ID 57658
- Correct stream returned
- No user-facing changes

## Removal Instructions

When removing the override in the future, the process is the same:

1. Delete the override block in `animekai-extractor.ts` (lines ~1295-1410)
2. Test episodes 48-59 still work via normal MAL search
3. Update documentation

The improved implementation makes removal easier because:
- No manual episode offset logic to clean up
- Clear trigger condition to identify and remove
- Better separation of concerns

## Summary

This is a **quality improvement** to the existing hardcoded override:
- ✅ More robust trigger condition (MAL ID instead of episode range)
- ✅ Leverages API's MAL conversion (no duplication)
- ✅ Cleaner code (no manual offset calculation)
- ✅ Better maintainability (single source of truth)
- ✅ Same functionality (no user-facing changes)

The override is still **temporary** and should be removed when MAL search improves, but it's now implemented in a much better way!

---

**Last Updated:** January 19, 2026  
**Status:** Active and Improved ✨
