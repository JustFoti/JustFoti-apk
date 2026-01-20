# JJK Season 3 (Culling Game) Fix - January 2026

## Problem
Jujutsu Kaisen Season 3 (The Culling Game: Part 1) was incorrectly mapped with 24 episodes when it actually has 12 episodes for Part 1.

## Solution
Updated the MAL (MyAnimeList) mapping in the codebase to correctly reflect Season 3's episode count.

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
- ✅ Total episode count: 59 episodes
- ✅ No TypeScript errors
- ✅ Client and server mappings are synchronized

## Future Updates

When Season 3 Part 2 is released, update the episode count for MAL ID 57658 or add a new MAL entry if it's released as a separate season.

## MAL Reference
- MAL ID 57658: https://myanimelist.net/anime/57658/Jujutsu_Kaisen__Shimetsu_Kaiyuu_-_Zenpen
- Status: Currently Airing (as of Jan 2026)
- Episodes: 12 (Part 1)
- Broadcast: Fridays at 00:26 JST
