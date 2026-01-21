# JJK Hardcoded Override - Implementation Improvements

**Date:** January 19, 2026  
**Status:** ✅ Improved and Active

## Latest Update: Enhanced Error Handling (Jan 19, 2026)

The hardcoded override was further improved with better error handling and control flow.

### Changes Made

#### 1. Early Returns Instead of Nested Conditionals
**Before:**
```typescript
const episodes = await getEpisodes(cullingGameContentId);
if (episodes) {
  // ... nested logic ...
  if (episodeToken) {
    // ... more nested logic ...
    if (servers) {
      // ... even more nesting ...
    }
  }
}

console.log(`[AnimeKai] Hardcoded override failed, falling back to normal search...`);
```

**After:**
```typescript
const episodes = await getEpisodes(cullingGameContentId);
if (!episodes) {
  console.log(`[AnimeKai] ❌ CRITICAL: Failed to get episodes...`);
  return { success: false, sources: [], error: '...' };
}

// ... continue with flat logic ...

if (!episodeToken) {
  console.log(`[AnimeKai] ❌ CRITICAL: Episode not found...`);
  return { success: false, sources: [], error: '...' };
}

// ... continue ...
```

**Benefits:**
- ✅ Flatter code structure (easier to read)
- ✅ Clear error messages at each failure point
- ✅ No confusing fallback to search
- ✅ Explicit error returns

#### 2. Enhanced Logging with CRITICAL Markers
**Before:**
```typescript
console.log(`[AnimeKai] Failed to get episodes`);
```

**After:**
```typescript
console.log(`[AnimeKai] ❌ CRITICAL: Failed to get episodes for hardcoded Culling Game entry`);
console.log(`[AnimeKai] ❌ CRITICAL: Episode ${episode} not found in Culling Game episodes`);
console.log(`[AnimeKai] Available episodes:`, Object.keys(season1 || {}));
```

**Benefits:**
- ✅ Easy to spot failures in logs (❌ CRITICAL)
- ✅ More descriptive error messages
- ✅ Shows available episodes when episode not found
- ✅ Better debugging experience

#### 3. No Fallback to Search
**Before:**
```typescript
// If override fails, fall back to normal search
console.log(`[AnimeKai] Hardcoded override failed, falling back to normal search...`);
// ... continues to normal search logic ...
```

**After:**
```typescript
// If override fails, return error immediately
if (allSources.length === 0) {
  console.log(`[AnimeKai] ❌ CRITICAL: All servers failed...`);
  return { success: false, sources: [], error: '...' };
}
```

**Benefits:**
- ✅ Clear failure mode - no confusing behavior
- ✅ Easier to debug (know exactly where it failed)
- ✅ Prevents incorrect streams from being returned
- ✅ Explicit about what went wrong

#### 4. Improved Success Logging
**Before:**
```typescript
console.log(`[AnimeKai] *** HARDCODED OVERRIDE SUCCESS: Returning ${allSources.length} sources for JJK Culling Game ***`);
```

**After:**
```typescript
console.log(`[AnimeKai] *** HARDCODED OVERRIDE SUCCESS: Returning ${allSources.length} sources for JJK Culling Game E${episode} ***`);
```

**Benefits:**
- ✅ Shows which episode succeeded
- ✅ More informative success message

## Latest Update: Enhanced API Logging (Jan 19, 2026)

The API route was enhanced with better logging specifically for JJK episodes to aid in debugging and production monitoring.

### Changes Made

#### 1. Always Log JJK Conversions
**Before:**
```typescript
// Only logged in development or when DEBUG_MAL=true
if (process.env.NODE_ENV === 'development' || process.env.DEBUG_MAL === 'true') {
  console.log('[EXTRACT] MAL absolute episode conversion:', { ... });
}
```

**After:**
```typescript
// ALWAYS log for JJK to debug the issue
const isJJK = tmdbIdNum === 95479;
if (isJJK || process.env.NODE_ENV === 'development' || process.env.DEBUG_MAL === 'true') {
  console.log('[EXTRACT] *** MAL ABSOLUTE EPISODE CONVERSION ***', { ... });
}
```

**Benefits:**
- ✅ JJK episodes always log conversion details (even in production)
- ✅ Clear visual markers (`***`) make logs easy to spot
- ✅ Helps monitor if the conversion is working correctly
- ✅ Easier debugging when issues occur

#### 2. Additional JJK-Specific Logging
**New:**
```typescript
if (isJJK) {
  console.log(`[EXTRACT] *** JJK DETECTED: Will pass malId=${malId}, malTitle="${malTitle}", episode=${episode} to AnimeKai extractor ***`);
}
```

**Benefits:**
- ✅ Shows exactly what parameters are passed to the extractor
- ✅ Confirms the conversion happened before calling AnimeKai
- ✅ Makes it obvious when JJK-specific logic is triggered
- ✅ Helps verify the hardcoded override receives correct data

#### 3. Structured Log Format
**Before:**
```
[EXTRACT] Absolute episode anime detected: TMDB ep 48 → MAL 57658 (...) ep 1
```

**After:**
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
[EXTRACT] *** JJK DETECTED: Will pass malId=57658, malTitle="...", episode=1 to AnimeKai extractor ***
```

**Benefits:**
- ✅ Structured JSON format is easier to parse
- ✅ Shows all conversion details in one place
- ✅ Clear separation between conversion and extractor call
- ✅ Better for log aggregation tools

### Why This Matters

#### Production Monitoring
- Can verify JJK episodes are converting correctly in production
- No need to enable DEBUG_MAL flag or switch to development mode
- Logs are always available when investigating issues

#### Debugging
- Clear visual markers make JJK logs easy to find
- Structured format shows all relevant data
- Can verify the hardcoded override receives correct parameters

#### Maintenance
- When removing the hardcoded override, these logs will help verify normal search works
- Can monitor conversion accuracy over time
- Easier to spot if episode counts change or new seasons are added

## Previous Improvement: MAL ID Check (Jan 19, 2026)

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

## Summary of All Improvements

This hardcoded override has been improved **three times** on January 19, 2026:

### Improvement 1: MAL ID Check
- ✅ Checks **MAL ID** instead of episode range
- ✅ Leverages API's automatic MAL conversion
- ✅ No manual episode offset calculation
- ✅ More robust trigger condition

### Improvement 2: Enhanced Error Handling
- ✅ Early returns instead of nested conditionals
- ✅ Clear error messages with ❌ CRITICAL markers
- ✅ No fallback to search (explicit failure)
- ✅ Better debugging with available episodes list
- ✅ Improved success logging with episode number

### Improvement 3: Enhanced API Logging
- ✅ JJK episodes now **always log** conversion details (not just in development)
- ✅ Structured logging with clear markers (`*** MAL ABSOLUTE EPISODE CONVERSION ***`)
- ✅ Shows original episode, MAL ID, MAL title, and relative episode
- ✅ Additional JJK-specific log showing parameters passed to extractor
- ✅ Easier debugging and monitoring in production

## Code Quality Metrics

**Before all improvements:**
- Lines of code: ~115
- Nesting depth: 4-5 levels
- Error handling: Implicit (falls through)
- Debugging: Difficult (nested conditionals)
- Production logging: Minimal

**After all improvements:**
- Lines of code: ~148 (more explicit error handling)
- Nesting depth: 1-2 levels
- Error handling: Explicit with early returns
- Debugging: Easy (clear error messages at each step)
- Production logging: **Enhanced** - JJK always logs conversion details

**Trade-off:** Slightly more lines of code, but **much better maintainability, debuggability, and production monitoring**.

---

**Last Updated:** January 19, 2026  
**Status:** Active and Improved (3 improvements) ✨  
**Next Step:** Remove when MAL search can find "The Culling Game - Part 1"
