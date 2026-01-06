# VIPRow Direct M3U8 Extraction - Complete Guide

## 🎉 SUCCESS! Direct M3U8 Extraction Working via Cloudflare Worker!

We successfully reverse-engineered VIPRow/Casthill to extract raw m3u8 stream URLs directly, without using iframes. All proxying is done through Cloudflare Workers (NOT Vercel API routes).

## What Works

1. ✅ **Token endpoint (boanki.net)** - Returns valid JSON with fresh scode/timestamp
2. ✅ **Manifest fetch (peulleieo.net)** - Returns valid HLS playlist
3. ✅ **Key fetch (boanki.net)** - Returns 16-byte AES-128 decryption key
4. ✅ **Cloudflare Worker** - `/viprow/*` routes handle all extraction and proxying
5. ✅ **URL Rewriting** - Manifest URLs are rewritten to go through the proxy

## Cloudflare Worker Routes

All VIPRow streaming goes through the Cloudflare Worker at `NEXT_PUBLIC_CF_STREAM_PROXY_URL`:

```
GET /viprow/stream?url=/nba/event-online-stream&link=1
  → Returns playable m3u8 with all URLs rewritten through proxy

GET /viprow/manifest?url=<encoded_manifest_url>
  → Proxies manifest with URL rewriting

GET /viprow/key?url=<encoded_key_url>
  → Proxies AES-128 decryption key

GET /viprow/segment?url=<encoded_segment_url>
  → Proxies video segments

GET /viprow/health
  → Health check
```

## API Usage

### Via Vercel API (returns Cloudflare proxy URL)
```
GET /api/livetv/viprow-stream?url=/nba/event-online-stream&link=1
```

Response:
```json
{
  "success": true,
  "mode": "direct",
  "streamUrl": "https://media-proxy.example.com/viprow/stream?url=%2Fnba%2Fevent-online-stream&link=1",
  "proxyEndpoints": {
    "stream": "https://media-proxy.example.com/viprow/stream",
    "manifest": "https://media-proxy.example.com/viprow/manifest",
    "key": "https://media-proxy.example.com/viprow/key",
    "segment": "https://media-proxy.example.com/viprow/segment"
  },
  "availableLinks": [...],
  "selectedLink": 1,
  "embedUrl": "https://casthill.net/sd0embed/..."
}
```

### Direct Cloudflare Worker (recommended for playback)
```
GET {CF_PROXY}/viprow/stream?url=/nba/event-online-stream&link=1
```

Returns a playable m3u8 manifest directly - use this URL with hls.js:

```javascript
const hls = new Hls();
hls.loadSource(response.streamUrl);
hls.attachMedia(videoElement);
```

## Proxy Config Functions

```typescript
import { 
  getVIPRowStreamUrl,
  getVIPRowManifestProxyUrl,
  getVIPRowKeyProxyUrl,
  getVIPRowSegmentProxyUrl,
  isVIPRowProxyConfigured 
} from '@/lib/proxy-config';

// Get playable stream URL
const streamUrl = getVIPRowStreamUrl('/nba/event-online-stream', 1);
// → https://media-proxy.example.com/viprow/stream?url=%2Fnba%2Fevent-online-stream&link=1
```

## Technical Details

### Extraction Flow (handled by Cloudflare Worker)

1. **VIPRow Page** → Extract `zmid`, `pid`, `edm`, `csrf` tokens
2. **Casthill Embed** → Extract obfuscated stream variables
3. **Token Refresh** → Call boanki.net with X-CSRF-Auth header
4. **Manifest Fetch** → Get HLS playlist with key and segment URLs
5. **URL Rewriting** → Rewrite all URLs to go through `/viprow/*` proxy

### Required Headers (added by Cloudflare Worker)

- `Origin: https://casthill.net`
- `Referer: https://casthill.net/`
- `User-Agent: <Chrome UA>`

### Stream Encryption

- Method: AES-128
- Key: 16 bytes from boanki.net (proxied via `/viprow/key`)
- IV: Specified in manifest
- Standard HLS players handle decryption automatically

## Files

### Cloudflare Worker
- `cloudflare-proxy/src/viprow-proxy.ts` - VIPRow extraction and proxy logic
- `cloudflare-proxy/src/index.ts` - Main worker with `/viprow/*` routes

### App
- `app/api/livetv/viprow-stream/route.ts` - Returns Cloudflare proxy URLs
- `app/lib/proxy-config.ts` - VIPRow proxy helper functions

### Scripts (for testing)
- `scripts/viprow-m3u8-extract.js` - Standalone extraction module
- `scripts/test-viprow-api.js` - API test script
- `scripts/test-proxy-flow.js` - Proxy flow test

## Deployment

1. Deploy Cloudflare Worker:
   ```bash
   cd cloudflare-proxy
   wrangler deploy
   ```

2. Set environment variable:
   ```
   NEXT_PUBLIC_CF_STREAM_PROXY_URL=https://your-worker.workers.dev/stream
   ```

3. The `/viprow/*` routes will be available at your worker URL.
