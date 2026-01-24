# DLHD 502 Error Fix - January 2026

## Problem
Users were getting 502 errors when trying to watch live TV through DLHD. The root cause was that the player domain `epicplayplay.cfd` is **DEAD** (DNS returns "Non-existent domain").

All code was hardcoded to use `epicplayplay.cfd/premiumtv/daddyhd.php?id=<channel>` to fetch JWT tokens. Without JWT, key fetches to `dvalna.ru` fail with 502 errors.

## Solution
Replaced `epicplayplay.cfd` with `topembed.pw` which uses the same `dvalna.ru` backend but with different channel naming.

### Key Discoveries from Puppeteer Reverse Engineering

DLHD has 6 different player paths, each using different backends:

| Player | Path | Domain | Backend | Status |
|--------|------|--------|---------|--------|
| 1 | `/stream/` | epicplayplay.cfd | dvalna.ru | ❌ DEAD |
| 2 | `/cast/` | epicplayplay.cfd | dvalna.ru | ❌ DEAD |
| 3 | `/watch/` | **topembed.pw** | dvalna.ru | ✅ WORKING |
| 4 | `/plus/` | justembeds.xyz | encrypted | ⚠️ Different system |
| 5 | `/casting/` | cdn-live.tv | cdn-live-tv.ru | ✅ WORKING (no auth) |
| 6 | `/player/` | tv-bu1.blogspot.com | moveonjoy.com | ✅ WORKING (no auth) |

### Working Solution: topembed.pw

`topembed.pw` uses the same `dvalna.ru` CDN backend as the dead `epicplayplay.cfd`, but with different channel keys:

- Old: `premium51` → New: `ustvabc` (for ABC)
- Old: `premium44` → New: `eplayerespn_usa` (for ESPN)

The JWT tokens from topembed.pw work with the existing PoW authentication system.

## Changes Made

### 1. cloudflare-proxy/src/tv-proxy.ts
- Changed `PLAYER_DOMAIN` from `epicplayplay.cfd` to `topembed.pw`
- Added `CHANNEL_TO_TOPEMBED` mapping for known channels
- Updated `fetchPlayerJWT()` to fetch from topembed.pw
- Added fallback logic to try both topembed channel keys AND `premium{id}` format
- Added new servers: `wiki`, `hzt`, `x4` used by topembed.pw

### 2. cloudflare-proxy/src/dlhd-proxy.ts
- Same changes as tv-proxy.ts
- Updated `fetchAuthData()` to use topembed.pw
- Added new servers to `FALLBACK_SERVER_KEYS`

### 3. rpi-proxy/dlhd-auth-v3.js
- Updated `fetchAuthData()` to use topembed.pw
- Added channel mapping
- Updated Origin/Referer headers to use topembed.pw

## Channel Mapping

The following channels have been mapped from DLHD channel IDs to topembed.pw names:

```javascript
const CHANNEL_TO_TOPEMBED = {
  '31': 'TNTSports1[UK]',
  '32': 'TNTSports2[UK]',
  '33': 'TNTSports3[UK]',
  '34': 'TNTSports4[UK]',
  '35': 'SkySportsFootball[UK]',
  '36': 'SkySportsArena[UK]',
  '37': 'SkySportsAction[UK]',
  '38': 'SkySportsMainEvent[UK]',
  '39': 'FOXSports1[USA]',
  '40': 'TennisChannel[USA]',
  '43': 'PDCTV[USA]',
  '44': 'ESPN[USA]',
  '45': 'ESPN2[USA]',
  '46': 'SkySportsTennis[UK]',
  '48': 'CanalSport[Poland]',
  '49': 'SportTV1[Portugal]',
  '51': 'AbcTv[USA]',
  '52': 'CBS[USA]',
  '53': 'NBC[USA]',
  '54': 'Fox[USA]',
  // ... more channels
};
```

For channels not in the mapping, the code:
1. Tries to fetch the topembed name from DLHD's `/watch/` page
2. Falls back to `premium{id}` format if no mapping found

## Server Keys

New servers discovered and added:
- `wiki` - Used by topembed.pw for US TV channels (ABC, NBC, etc.)
- `hzt` - Used by topembed.pw for ESPN channels
- `x4` - Used by topembed.pw for CBS

## Testing

Run the test script to verify the fix:

```bash
node test-dlhd-fix-final.js
```

Expected output:
```
✅ All tests passed! The fix is working.
```

## Deployment

1. Deploy the updated Cloudflare Worker:
   ```bash
   cd cloudflare-proxy
   wrangler deploy
   ```

2. If using RPI proxy, update and restart:
   ```bash
   cd rpi-proxy
   pm2 restart dlhd-proxy
   ```

## Alternative Backends (Future Work)

If topembed.pw goes down, these alternatives were discovered:

1. **cdn-live.tv** - Simple token-based auth, no JWT/PoW needed
2. **moveonjoy.com** - No auth at all, direct M3U8 access

These could be implemented as additional fallbacks.
