# DLHD Stream Proxy API

Proxies M3U8 with embedded key. Segments fetch directly from CDN.

## CORS Test Results

| Endpoint | Without Headers | Needs Proxy? |
|----------|-----------------|--------------|
| M3U8 Playlist | 200 ✓ | No, but we proxy to embed key |
| **Decryption Key** | **404 ✗** | **YES** |
| Video Segments | 200 ✓ | No |

## Architecture

```
Browser (HLS.js)                         Server (/api/dlhd-proxy)
      │                                           │
      │ 1. GET /api/dlhd-proxy?channel=769        │
      │──────────────────────────────────────────▶│
      │                                           │ fetches M3U8 + key (cached)
      │◀──────────────────────────────────────────│
      │    M3U8 with embedded key (data:uri)      │
      │                                           │
      │ 2. GET segments (direct to CDN)           │
      │──────────────────────────────────────────▶│ whalesignal.ai
```

## Caching

| Item | TTL | Notes |
|------|-----|-------|
| Key | 10 minutes | Embedded in M3U8 response |
| M3U8 | 2 seconds | Live stream refresh rate |

## API

### GET /api/dlhd-proxy?channel={id}

Returns M3U8 with embedded decryption key. Segments point directly to CDN.

**Parameters:**
- `channel` (required): Channel ID
- `invalidate` (optional): Force refresh key cache

**Response Headers:**
- `X-DLHD-Key-Cached`: true/false
- `X-DLHD-Key-Cache-Age`: seconds
- `X-DLHD-Key-Cache-TTL`: seconds remaining

## Usage

```javascript
const hls = new Hls();
hls.loadSource(`/api/dlhd-proxy?channel=${channelId}`);
hls.attachMedia(videoElement);

// On decryption error, invalidate and retry
hls.on(Hls.Events.ERROR, (e, data) => {
  if (data.details === 'fragDecryptError') {
    hls.loadSource(`/api/dlhd-proxy?channel=${channelId}&invalidate=true`);
  }
});
```
