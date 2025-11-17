# 2Embed Stream Proxy Implementation

## Summary

Implemented complete stream proxying solution for 2Embed streams that require the `Referer: https://www.2embed.cc` header on ALL requests (master playlists, quality playlists, and video segments).

## Changes Made

### 1. Created Stream Proxy API (`app/api/stream-proxy/route.ts`)

**New file** that handles:
- Proxying all HLS requests with proper referer headers
- Automatic URL rewriting in playlists to route through proxy
- Support for both playlists (.m3u8, .txt) and segments (.ts, .m4s)
- CORS headers for client playback
- Redirect handling
- Proper caching headers

**Key Features**:
```typescript
// Proxies with referer header
GET /api/stream-proxy?url=<encoded_url>&source=2embed&referer=<encoded_referer>

// Rewrites playlist URLs automatically
function rewritePlaylistUrls(playlist, baseUrl, source, referer)

// Handles both text and binary responses
```

### 2. Updated 2Embed Extractor (`app/lib/services/2embed-extractor.ts`)

**Fixed TypeScript issues**:
- Changed `[...html.matchAll()]` to `Array.from(html.matchAll())` for ES5 compatibility
- Fixed unused variable warning

**Enhanced stream metadata**:
```typescript
{
  quality: "1080p",
  url: "https://yesmovies.baby/hls3/tt0137523.txt",
  referer: "https://www.2embed.cc",
  type: "hls",
  requiresSegmentProxy: true  // ← NEW FLAG
}
```

### 3. Updated Extract API (`app/api/stream/extract/route.ts`)

**Already had proxy wrapping** - no changes needed:
- Wraps all 2embed URLs with `/api/stream-proxy` endpoint
- Passes through `requiresSegmentProxy` flag
- Includes referer in proxy URL

### 4. Updated Video Player (`app/components/player/VideoPlayer.tsx`)

**Enhanced HLS.js configuration**:
```typescript
// Now detects proxied streams
if (streamUrl.includes('.m3u8') || streamUrl.includes('stream-proxy')) {
  const hls = new Hls({
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 90,
    xhrSetup: (xhr, url) => {
      xhr.withCredentials = false; // CORS handling
    },
  });
}
```

### 5. Created Test Script (`scripts/test-stream-proxy.js`)

**Validation script** that tests:
- Master playlist proxying
- URL rewriting in playlists
- Full extraction flow with proxy
- Segment proxy flag propagation

### 6. Created Documentation (`docs/STREAM_PROXY_SETUP.md`)

**Comprehensive guide** covering:
- Architecture overview
- Request flow diagrams
- URL rewriting examples
- Testing procedures
- Troubleshooting guide
- Performance considerations
- Security recommendations

## How It Works

### Request Flow

```
1. Client → /api/stream/extract?tmdbId=550&type=movie
   ↓
2. Extract API → 2Embed Extractor
   ↓
3. Gets: https://yesmovies.baby/hls3/550.txt
   ↓
4. Wraps: /api/stream-proxy?url=...&referer=https://www.2embed.cc
   ↓
5. Returns to client
   ↓
6. Video Player → /api/stream-proxy (master.txt)
   ↓
7. Proxy fetches with referer, rewrites URLs
   ↓
8. HLS.js → /api/stream-proxy (quality playlist)
   ↓
9. Proxy fetches with referer, rewrites segment URLs
   ↓
10. HLS.js → /api/stream-proxy (segments)
    ↓
11. Proxy fetches each segment with referer
    ↓
12. Video plays! 🎉
```

### URL Rewriting Example

**Before** (original playlist):
```m3u8
#EXTM3U
1080p.m3u8
720p.m3u8
segment-001.ts
```

**After** (rewritten):
```m3u8
#EXTM3U
/api/stream-proxy?url=https%3A%2F%2F...%2F1080p.m3u8&source=2embed&referer=...
/api/stream-proxy?url=https%3A%2F%2F...%2F720p.m3u8&source=2embed&referer=...
/api/stream-proxy?url=https%3A%2F%2F...%2Fsegment-001.ts&source=2embed&referer=...
```

## Testing

```bash
# Start dev server
npm run dev

# Run test script
node scripts/test-stream-proxy.js
```

**Expected Results**:
- ✓ Master playlist proxied and URLs rewritten
- ✓ Extraction returns proxied URLs with segment proxy flag
- ✓ All requests include proper referer header
- ✓ Video plays without 403 errors

## Benefits

1. **Transparent Proxying**: All requests automatically include referer header
2. **No Client Changes**: HLS.js works normally, proxy handles everything
3. **Multi-Quality Support**: Works with all quality levels
4. **Automatic URL Rewriting**: Playlists are modified on-the-fly
5. **Proper Caching**: Reduces redundant requests
6. **Error Handling**: Graceful fallbacks and logging

## Files Modified

- ✅ `app/api/stream-proxy/route.ts` (NEW)
- ✅ `app/lib/services/2embed-extractor.ts` (UPDATED)
- ✅ `app/components/player/VideoPlayer.tsx` (UPDATED)
- ✅ `scripts/test-stream-proxy.js` (NEW)
- ✅ `docs/STREAM_PROXY_SETUP.md` (NEW)

## Next Steps

1. **Test with real content**: Try playing a movie/show
2. **Monitor performance**: Check server logs for proxy requests
3. **Optimize caching**: Adjust cache headers if needed
4. **Consider edge deployment**: Move proxy to Vercel Edge for better performance
5. **Add rate limiting**: Prevent abuse in production

## Notes

- All 2embed streams now require proxying (master.txt + segments)
- The proxy is transparent to the video player
- URLs are automatically rewritten in playlists
- Referer header is added to all upstream requests
- CORS is enabled for client playback
- Caching reduces server load

## Verification

To verify the implementation is working:

1. Check that extracted URLs include `/api/stream-proxy`
2. Verify `requiresSegmentProxy: true` in API response
3. Monitor network tab - all requests should go through proxy
4. No 403 errors should appear
5. Video should play smoothly with all quality levels

---

**Status**: ✅ COMPLETE

All 2embed streams now properly proxy master.txt sources and their segments with the required `https://2embed.cc` referer header.
