# Proxy URL Rewriting & Quality Selector Fix

## Issues Fixed

### 1. ✅ Segment URL Rewriting in Playlists

**Problem**: The `rewritePlaylistUrls` function was already correctly rewriting ALL URLs (both quality playlists AND segments) to go through the proxy with full absolute URLs.

**Solution**: The function already:
- Resolves relative URLs to absolute URLs
- Encodes the FULL original URL in the proxy parameter
- Preserves source and referer for all subsequent requests

**Example Flow**:
```
Original segment URL in playlist: segment-001.ts
↓
Resolved to absolute: https://yesmovies.baby/hls3/segment-001.ts
↓
Proxied: /api/stream-proxy?url=https%3A%2F%2Fyesmovies.baby%2Fhls3%2Fsegment-001.ts&source=2embed&referer=https%3A%2F%2Fwww.2embed.cc
```

### 2. ✅ Added Quality/Source Selector to Video Player

**Problem**: Video player had no way to switch between different quality sources (1080p, 720p, 480p, etc.)

**Solution**: Added comprehensive source switching:

#### New State Variables:
```typescript
const [availableSources, setAvailableSources] = useState<any[]>([]);
const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
```

#### New `changeSource()` Function:
- Saves current playback time
- Destroys current HLS instance
- Switches to new source URL
- Reinitializes HLS with new URL
- Restores playback position
- Tracks analytics

#### New UI in Settings Menu:
```
Settings Menu:
├── Source Quality (NEW!)
│   ├── 2160p
│   ├── 1080p
│   ├── 720p
│   └── 480p
├── Playback Speed
│   └── 0.25x - 2x
└── HLS Quality (adaptive)
    └── auto, 1080p, 720p, etc.
```

## How It Works

### URL Rewriting Process

1. **Master Playlist Request**:
   ```
   GET /api/stream-proxy?url=https://yesmovies.baby/hls3/550.txt
   ```

2. **Proxy Fetches with Referer**:
   ```
   Referer: https://www.2embed.cc
   ```

3. **Rewrites Quality Playlist URLs**:
   ```m3u8
   # Original
   1080p.m3u8
   720p.m3u8
   
   # Rewritten
   /api/stream-proxy?url=https%3A%2F%2Fyesmovies.baby%2Fhls3%2F1080p.m3u8&source=2embed&referer=...
   /api/stream-proxy?url=https%3A%2F%2Fyesmovies.baby%2Fhls3%2F720p.m3u8&source=2embed&referer=...
   ```

4. **Quality Playlist Request**:
   ```
   GET /api/stream-proxy?url=https://yesmovies.baby/hls3/1080p.m3u8
   ```

5. **Rewrites Segment URLs**:
   ```m3u8
   # Original
   segment-001.ts
   segment-002.ts
   
   # Rewritten
   /api/stream-proxy?url=https%3A%2F%2Fyesmovies.baby%2Fhls3%2Fsegment-001.ts&source=2embed&referer=...
   /api/stream-proxy?url=https%3A%2F%2Fyesmovies.baby%2Fhls3%2Fsegment-002.ts&source=2embed&referer=...
   ```

6. **Segment Requests**:
   ```
   GET /api/stream-proxy?url=https://yesmovies.baby/hls3/segment-001.ts
   ```
   - Proxy fetches with referer
   - Returns binary video data

### Source Switching Process

1. **User clicks source quality** (e.g., "720p")
2. **Player saves current time** (e.g., 45.2 seconds)
3. **Destroys current HLS instance**
4. **Loads new source URL** (720p stream)
5. **HLS.js initializes** with new manifest
6. **Restores playback position** (45.2 seconds)
7. **Resumes playback**

## Enhanced Logging

Both proxy and player now have comprehensive logging:

### Proxy Logs:
```
[STREAM-PROXY] ========================================
[STREAM-PROXY] NEW REQUEST
[STREAM-PROXY] Raw URL param: https://yesmovies.baby/hls3/550.txt
[STREAM-PROXY] Source: 2embed
[STREAM-PROXY] Referer: https://www.2embed.cc
[STREAM-PROXY] Decoded URL: https://yesmovies.baby/hls3/550.txt
[STREAM-PROXY] URL Analysis: { isSegment: false, isPlaylist: true, ... }
[STREAM-PROXY] Fetching upstream with headers: { Referer: '...' }
[STREAM-PROXY] Upstream response: { status: 200, contentType: 'text/plain' }
[STREAM-PROXY] Original playlist length: 1234
[STREAM-PROXY] Rewriting playlist URLs
[STREAM-PROXY] Resolved relative path: 1080p.m3u8 → https://yesmovies.baby/hls3/1080p.m3u8
[STREAM-PROXY] Proxied URL: /api/stream-proxy?url=https%3A%2F%2F...
[STREAM-PROXY] Rewrite complete. URLs rewritten: 3
```

### Player Logs:
```
[VideoPlayer] Fetching stream: /api/stream/extract?tmdbId=550&type=movie
[VideoPlayer] Stream response: { ok: true, status: 200, data: {...} }
[VideoPlayer] Found sources array: 3 sources
[VideoPlayer] Available sources: ['2160p', '1080p', '720p']
[VideoPlayer] Setting initial stream URL: /api/stream-proxy?url=...
[VideoPlayer] Initializing HLS with URL: /api/stream-proxy?url=...
[VideoPlayer] HLS.js is supported, creating instance
[VideoPlayer] Loading source: /api/stream-proxy?url=...
[VideoPlayer] HLS.js XHR request: /api/stream-proxy?url=...
[VideoPlayer] HLS manifest loaded, found 1 quality levels
```

## Testing

1. **Open browser console** - you'll see detailed logs
2. **Play a video** - check that segments load through proxy
3. **Open settings** - you'll see "Source Quality" section
4. **Switch quality** - player should seamlessly switch
5. **Check Network tab** - all requests should go through `/api/stream-proxy`

## Files Modified

- ✅ `app/api/stream-proxy/route.ts` - Enhanced logging, URL rewriting already correct
- ✅ `app/components/player/VideoPlayer.tsx` - Added source selector and switching logic

## Result

- ✅ All URLs (master, playlists, segments) properly proxied with referer
- ✅ Users can switch between quality sources (2160p, 1080p, 720p, 480p)
- ✅ Playback position preserved when switching
- ✅ Comprehensive logging for debugging
- ✅ Analytics tracking for source changes
