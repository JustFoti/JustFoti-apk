# VIPRow/Casthill Stream Extraction Analysis

## Summary

VIPRow uses Casthill.net as their streaming backend. The stream extraction is protected by multiple layers:

1. **Cloudflare Bot Protection** on boanki.net (token refresh endpoint)
2. **IP-bound hash signatures** in manifest URLs
3. **Time-limited tokens** (20-30 second validity)
4. **CORS restrictions** requiring proper Origin/Referer headers

## Flow Analysis

### 1. VIPRow Page → Casthill Embed

```
VIPRow Event Page (/nba/event-online-stream-1)
    ↓
Extract: zmid, pid, edm, csrf, csrf_ip, category
    ↓
Construct Casthill Embed URL:
https://casthill.net/sd0embed/{category}?pid={pid}&v={zmid}&csrf={csrf}&csrf_ip={csrf_ip}
```

### 2. Casthill Embed → Stream Data

The embed page contains obfuscated JavaScript with:

- `r` = device_id (random 32-char string)
- `i` = initial scode (MD5 hash, char code array)
- `a` = timestamp (Unix seconds)
- `s` = stream_id (e.g., "bafogofab07i7opa9e30")
- `c` = base URL (base64: "https://boanki.net")
- `l` = X-CSRF-Auth header (base64 encoded)
- `d` = manifest URL (double base64 encoded)
- `m` = host_id (e.g., "s-c8")

### 3. Token Refresh Flow

```javascript
// Construct token URL (boanki.net)
const tokenUrl = `${baseUrl}?scode=${scode}&stream=${streamId}&expires=${timestamp}&u_id=${deviceId}&host_id=${hostId}`;

// Fetch with headers
fetch(tokenUrl, {
  headers: {
    'Accept': 'application/json',
    'X-CSRF-Auth': csrfAuth,
  },
  credentials: 'include', // Requires cookies!
});

// Response: { scode, ts, device_id }
```

**Problem**: boanki.net is protected by Cloudflare and requires `cf_clearance` cookie.

### 4. Manifest URL Structure

```
https://{host_id}.peulleieo.net/pavel/{stream_id}/{timestamp}/{hash}/manifest.ts?u_id={device_id}
```

- `host_id`: Server identifier (s-c8, s-b1, etc.)
- `stream_id`: Channel identifier
- `timestamp`: Expiry time (Unix seconds)
- `hash`: SHA256 signature (64 chars) - **IP-bound**
- `device_id`: Client tracking ID

### 5. Manifest Server Requirements

- **412 Precondition Failed**: Missing Referer header
- **401 Unauthorized**: Invalid/expired hash or missing credentials
- **200 OK**: Valid request with proper headers and unexpired hash

## Why Server-Side Extraction Fails

1. **Cloudflare Challenge**: boanki.net requires JavaScript execution to get `cf_clearance` cookie
2. **IP Binding**: The hash in the manifest URL is generated server-side and tied to the client's IP address
3. **Time Sensitivity**: Tokens expire within 20-30 seconds

## Working Solutions

### Option 1: Iframe Embedding (Current Implementation)

Return the Casthill embed URL for client-side iframe playback:

```typescript
// Current approach in viprow-stream/route.ts
return {
  success: true,
  playerUrl: embedUrl, // https://casthill.net/sd0embed/...
  headers: { 'Referer': streamUrl },
};
```

**Pros**: Works reliably, no Cloudflare bypass needed
**Cons**: Requires iframe, can't extract raw m3u8

### Option 2: Headless Browser (Puppeteer/Playwright)

Use a headless browser to:
1. Navigate to the stream page
2. Wait for Cloudflare challenge to complete
3. Intercept network requests for m3u8 URLs

**Pros**: Can extract raw m3u8 URLs
**Cons**: Resource intensive, requires browser installation

### Option 3: Cloudflare Bypass Service

Use a service like FlareSolverr or similar to handle Cloudflare challenges.

**Pros**: Can work server-side
**Cons**: Additional infrastructure, may violate ToS

## Extracted Values Example

```javascript
{
  deviceId: 'z1y1l9w8h2z7t6i7h9s5l3x7f6x8v9d4',
  streamId: 'bafogofab07i7opa9e30',
  hostId: 's-c3',
  baseUrl: 'https://boanki.net',
  scode: '4702bd6c7e60f3f1f0b8e6382a6a37a7',
  timestamp: '1767669196',
  csrfAuth: 'TnpreU1ueFZVM3cu...',
  manifestUrl: 'https://s-c3.peulleieo.net/pavel/bafogofab07i7opa9e30/1767669216/e4215ecd87bf930345969a9c633535f86fef89e78937ec2789999e311d98fdf8/manifest.ts'
}
```

## BREAKTHROUGH: Direct M3U8 Extraction Works!

After extensive testing, we discovered that:

1. **boanki.net is NOT blocked by Cloudflare** - The token endpoint returns valid JSON responses
2. **The manifest server accepts our requests** - With proper headers (Origin, Referer, User-Agent)
3. **No cookies required** - The initial scode/timestamp from the embed are sufficient

### Working Flow

```javascript
// 1. Fetch VIPRow stream page → extract embed parameters
const streamHtml = await fetch(streamPageUrl);
const { zmid, pid, edm, csrf, csrf_ip, category } = extractParams(streamHtml);

// 2. Fetch Casthill embed → extract stream variables
const embedUrl = `https://${edm}/sd0embed/${category}?pid=${pid}&v=${zmid}&csrf=${csrf}&csrf_ip=${csrf_ip}`;
const embedHtml = await fetch(embedUrl, { headers: { Referer: streamPageUrl } });
const { deviceId, streamId, hostId, initialScode, timestamp, baseUrl, csrfAuth, manifestUrl } = extractVars(embedHtml);

// 3. Refresh token via boanki.net
const tokenUrl = `${baseUrl}?scode=${initialScode}&stream=${streamId}&expires=${timestamp}&u_id=${deviceId}&host_id=${hostId}`;
const tokenData = await fetch(tokenUrl, {
  headers: {
    'Accept': 'application/json',
    'X-CSRF-Auth': csrfAuth,
    'Origin': 'https://casthill.net',
    'Referer': 'https://casthill.net/',
  }
}).then(r => r.json());
// Returns: { success: true, ts: 1767670511, device_id: "...", scode: "..." }

// 4. Fetch manifest
const m3u8Url = new URL(manifestUrl);
m3u8Url.searchParams.set('u_id', tokenData.device_id);
const manifest = await fetch(m3u8Url, {
  headers: {
    'Origin': 'https://casthill.net',
    'Referer': 'https://casthill.net/',
  }
}).then(r => r.text());
// Returns valid HLS manifest!
```

### Key Headers Required

For manifest server (peulleieo.net):
- `Origin: https://casthill.net`
- `Referer: https://casthill.net/`
- `User-Agent: <any modern browser UA>`

For token server (boanki.net):
- `Accept: application/json`
- `X-CSRF-Auth: <extracted from embed>`
- `Origin: https://casthill.net`
- `Referer: https://casthill.net/`

### Stream Encryption

The stream uses AES-128 encryption. The key URL is in the manifest:
```
#EXT-X-KEY:METHOD=AES-128,URI="https://boanki.net/{streamId}/{uuid}?u_id={deviceId}&ssid={sessionId}"
```

The key endpoint also requires the same Origin/Referer headers.

## Conclusion

**Direct m3u8 extraction is now working!** The API route at `/api/livetv/viprow-stream` supports both:
- `mode=direct` - Returns raw m3u8 URL (default)
- `mode=embed` - Returns iframe embed URL (fallback)

See `scripts/viprow-m3u8-extract.js` for the complete extraction implementation.
