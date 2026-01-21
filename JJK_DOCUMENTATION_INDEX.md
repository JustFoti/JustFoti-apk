# JJK (Jujutsu Kaisen) Documentation Index

Quick reference for all JJK-related documentation and fixes.

## Current Status

✅ **All 59 episodes working correctly**  
⚠️ **Hardcoded override active for episodes 48-59** (temporary)  
✨ **Improved implementation** - Now checks MAL ID instead of episode range

## Documentation Files

### 1. `JJK_FIX_SUMMARY.md` - **START HERE**
Quick overview of the JJK Season 3 fix.
- What was broken
- How it was fixed
- Current status
- Files changed

### 2. `JJK_SEASON_3_FIX.md` - **DETAILED TECHNICAL DOCS**
Complete technical documentation of all changes.
- Episode count updates
- Automatic MAL entry calculation
- Hardcoded override details
- Testing instructions
- Future updates

### 3. `JJK_URL_FIX.md` - **URL PARAMETER FIX**
Explains how episode URLs were fixed.
- Problem: Episode 48 showed as "season=1&episode=1" in URL
- Solution: Pass absolute episode number, let API convert
- Clean URLs without MAL parameters

### 4. `JJK_HARDCODED_OVERRIDE.md` - **TEMPORARY WORKAROUND**
⚠️ **Important for maintenance!**
- Why the hardcoded override exists
- How it works (checks MAL ID 57658)
- When and how to remove it
- Location in code
- Testing after removal

### 5. `JJK_OVERRIDE_IMPROVEMENT.md` - **IMPLEMENTATION IMPROVEMENT**
✨ **Recent enhancement!**
- How the override was improved (Jan 19, 2026)
- **Three improvements**: MAL ID check, error handling, and API logging
- Old vs new implementation comparison
- Benefits of checking MAL ID instead of episode range
- Code quality improvements
- Error handling enhancements with early returns
- **Enhanced API logging** for better production monitoring
- No user-facing changes

## Quick Links

### Episode Mapping
- **Season 1**: Episodes 1-24 (MAL ID: 40748)
- **Season 2**: Episodes 25-47 (MAL ID: 51009)
- **Season 3**: Episodes 48-59 (MAL ID: 57658) ⚠️ Hardcoded override

### Key Files
- `app/lib/services/mal.ts` - MAL episode mappings
- `app/api/stream/extract/route.ts` - Automatic MAL conversion
- `app/lib/services/animekai-extractor.ts` - **Hardcoded override (lines ~1295-1443)**
- `app/(routes)/details/[id]/DetailsPageClient.tsx` - Client-side mapping

### Testing Endpoints
```bash
# Season 1 (Episodes 1-24)
curl "http://localhost:3000/api/stream/extract?tmdbId=95479&type=tv&season=1&episode=1"

# Season 2 (Episodes 25-47)
curl "http://localhost:3000/api/stream/extract?tmdbId=95479&type=tv&season=1&episode=25"

# Season 3 (Episodes 48-59) - Uses hardcoded override
curl "http://localhost:3000/api/stream/extract?tmdbId=95479&type=tv&season=1&episode=48"
```

## Architecture Overview

```
User clicks Episode 48
  ↓
Details page passes: episode=48 (absolute)
  ↓
API receives: tmdbId=95479, episode=48
  ↓
API calculates: Episode 48 → MAL 57658 Episode 1
  ↓
AnimeKai extractor receives: malId=57658, episode=1
  ↓
⚠️ HARDCODED OVERRIDE TRIGGERS
  ↓
Bypasses search, uses content_id=792m directly
  ↓
Fetches episode 1 from Culling Game entry
  ↓
Returns correct stream ✅
```

## Maintenance Tasks

### Regular Checks
- [ ] Monitor if episodes 48-59 still work
- [ ] Check if AnimeKai search improves (can find "Culling Game")
- [ ] Watch for Season 3 Part 2 release

### When Season 3 Part 2 Releases
1. Update episode count in `mal.ts` (12 → 24 or add new entry)
2. Test episodes 60+ work correctly
3. Consider if hardcoded override needs updating

### Removing Hardcoded Override
See `JJK_HARDCODED_OVERRIDE.md` for detailed instructions.

**Quick checklist:**
1. Delete override block in `animekai-extractor.ts` (lines ~1295-1443)
2. Test episodes 48-59 still work
3. Update all documentation files
4. Remove or archive `JJK_HARDCODED_OVERRIDE.md`

## Related Systems

- **MAL Service** (`app/lib/services/mal.ts`) - Handles MAL API and episode mapping
- **Stream Extract API** (`app/api/stream/extract/route.ts`) - Automatic MAL conversion
- **AnimeKai Extractor** (`app/lib/services/animekai-extractor.ts`) - Stream extraction
- **Details Page** (`app/(routes)/details/[id]/DetailsPageClient.tsx`) - Episode selection

## Troubleshooting

### Episode 48 not playing correctly?
1. Check console logs for "HARDCODED OVERRIDE" message
2. Look for "❌ CRITICAL" error messages in logs
3. Verify content_id is still `792m` on AnimeKai
4. Test if AnimeKai URL still works: `https://animekai.to/watch/jujutsu-kaisen-the-culling-game-part-1-792m`
5. Check if episode is available (should be 1-12)

### Want to test without override?
1. Comment out the override block temporarily
2. Test if MAL search works
3. If it works, remove override permanently

### Episode count wrong?
1. Check `TMDB_ABSOLUTE_EPISODE_ANIME` in `mal.ts`
2. Verify MAL episode counts are correct
3. Update mappings if needed

## Future Improvements

1. **Remove hardcoded override** - Top priority when possible
2. **Improve title matching** - Fuzzy search, better normalization
3. **Content ID cache** - Database of TMDB → AnimeKai mappings
4. **Automated testing** - CI/CD tests for all 59 episodes
5. **Monitoring** - Alert if episodes start failing

---

**Last Updated:** 2026-01-19  
**Status:** Hardcoded override active for episodes 48-59  
**Recent Changes:** Enhanced API logging for better production monitoring
