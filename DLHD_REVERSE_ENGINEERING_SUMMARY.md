# DLHD Reverse Engineering Summary - January 22, 2026

## Problem
Users getting 502 errors and "No Segments found in Playlist" HLS errors when trying to watch live TV channels.

## Root Cause Analysis

### Finding 1: epicplayplay.cfd is DEAD
- The original player domain `epicplayplay.cfd` no longer resolves (DNS NXDOMAIN)
- All code was hardcoded to use this domain for JWT tokens
- **Fix**: Changed to `topembed.pw` which uses the same dvalna.ru backend

### Finding 2: Channel Key Format Changed
- Old format: `premium{id}` (e.g., `premium51` for ABC)
- New format: Named keys (e.g., `ustvabc` for ABC, `eplayerespn_usa` for ESPN)
- The JWT payload contains the real channel key in the `sub` field
- **Fix**: Updated code to extract channel key from JWT and use it for M3U8/key requests

### Finding 3: Key URL Domain Mismatch
- M3U8 playlists from CDN use `kiko2.ru` for key URLs
- Our proxy was only matching `premium{id}` pattern
- **Fix**: Updated rewriteM3U8 to match any channel key format and normalize to `dvalna.ru`

### Finding 4: Many Channels Are Simply OFFLINE
This is the **CRITICAL FINDING**:

| Channel | Status | Server | Notes |
|---------|--------|--------|-------|
| ESPN (44) | ✅ WORKING | hzt | M3U8 has segments |
| ESPN2 (45) | ✅ WORKING | hzt | M3U8 has segments |
| ABC (51) | ❌ OFFLINE | wiki | M3U8 empty (104 bytes) |
| CBS (52) | ❌ OFFLINE | x4 | M3U8 empty (104 bytes) |
| NBC (53) | ❌ OFFLINE | wiki | M3U8 empty (103 bytes) |
| Fox (54) | ❌ OFFLINE | zeko | M3U8 empty (102 bytes) |
| All UK Sky Sports | ❌ OFFLINE | various | M3U8 empty |
| All TNT Sports | ❌ OFFLINE | top1 | M3U8 empty |

**Only 2 out of 37 channels are currently streaming!**

The empty M3U8 response looks like:
```
#EXTM3U
# Powered by V.CDN 1.5.7
#EXT-X-MEDIA-SEQUENCE:1066500
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:3
(NO SEGMENTS - channel offline)
```

This is NOT an authentication issue - the CDN is returning valid M3U8 headers but no segments because the channel is not currently broadcasting.

## DLHD Player Architecture

DLHD has 6 different players, each using different backends:

| Player | Path | Backend | Status |
|--------|------|---------|--------|
| 1 | /stream | epicplayplay.cfd | ❌ DEAD |
| 2 | /cast | epicplayplay.cfd | ❌ DEAD |
| 3 | /watch | topembed.pw → dvalna.ru | ✅ Working (for online channels) |
| 4 | /plus | daddyliveplayer.shop | Different backend |
| 5 | /casting | ddyplayer.cfd / bintv.pages.dev | Different backend |
| 6 | /player | lovecdn.ru / tv-bu1.blogspot.com | Different backend |

Players 4, 5, 6 use completely different backends that may have different channel availability.

## Code Changes Made

### 1. tv-proxy.ts - M3U8 Segment Check
Added check for empty M3U8 (channel offline):
```typescript
const hasSegments = content.includes('#EXTINF') || content.includes('.ts');
if (!hasSegments) {
  // M3U8 is valid but empty - channel is offline
  errors.push(`${channelKey}/${sk}: M3U8 empty (channel offline on CDN)`);
  continue;
}
```

### 2. tv-proxy.ts - Better Error Response
Return 503 (Service Unavailable) for offline channels:
```typescript
if (allOffline && errors.length > 0) {
  return jsonResponse({ 
    error: 'Channel offline', 
    message: 'This channel is not currently streaming.',
    hint: 'US broadcast channels are often only available during live sports events'
  }, 503, origin);
}
```

### 3. tv-proxy.ts - Key URL Rewriting
Fixed to handle any channel key format:
```typescript
const keyPathMatch = absoluteKeyUrl.match(/\/key\/([^/]+)\/(\d+)/);
if (keyPathMatch) {
  absoluteKeyUrl = `https://chevy.${CDN_DOMAIN}/key/${keyPathMatch[1]}/${keyPathMatch[2]}`;
}
```

### 4. tv-proxy.ts - Reverse Channel Lookup
Added reverse lookup for non-premium channel keys:
```typescript
if (!channel) {
  for (const [chId, topembedName] of Object.entries(CHANNEL_TO_TOPEMBED)) {
    const cached = jwtCache.get(chId);
    if (cached && cached.channelKey === channelKey) {
      channel = chId;
      break;
    }
  }
}
```

## Recommendations

1. **For Users**: US broadcast channels (ABC, NBC, CBS, Fox) are typically only available during live sports events. Try ESPN which is 24/7.

2. **For Future**: Consider implementing fallback to alternative backends (players 4, 5, 6) when topembed.pw channels are offline.

3. **Monitoring**: Add monitoring for channel availability to proactively notify users when channels go offline.

## Files Modified
- `cloudflare-proxy/src/tv-proxy.ts`

## Test Scripts Created
- `test-dvalna-full-reverse.js` - Tests all servers for all channels
- `test-all-dlhd-channels.js` - Tests all 37 DLHD channels
- `test-dlhd-all-players.js` - Tests all 6 DLHD player backends
- `test-topembed-direct.js` - Direct Puppeteer test of topembed.pw
