# DaddyHD.com Stream Authentication Flow

## Overview

Based on Puppeteer network analysis (December 2024), here's the complete authentication flow for extracting streams from daddyhd.com.

**KEY DISCOVERY: NO RPI PROXY NEEDED!**

The heartbeat and key endpoints work directly from Cloudflare Workers when proper headers are sent. The session is NOT IP-bound - it's token-bound via the Authorization header.

## Network Flow Summary

From the captured network requests:

```
1. [SERVERLOOKUP] GET https://chevy.giokko.ru/server_lookup?channel_id=premium51
   Response: {"server_key":"zeko"}

2. [M3U8] GET https://zekonew.kiko2.ru/zeko/premium51/mono.css
   (No auth required)

3. [KEYS] GET https://chevy.kiko2.ru/key/premium51/5887275
   Headers:
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     X-Channel-Key: premium51
     X-Client-Token: cHJlbWl1bTUxfFVTfDE3NjYxODI2MjZ8TW96aWxsYS81LjAg...
   Response: 16-byte AES key (binary)

4. [HEARTBEAT] GET https://chevy.kiko2.ru/heartbeat
   Headers: (same as key request)
   Response: {"message":"Session extended","status":"ok"}
```

## Authentication Variables

Extracted from player page (`https://epicplayplay.cfd/premiumtv/daddyhd.php?id=<channel>`):

```javascript
const CHANNEL_KEY   = "premium51";
const AUTH_TOKEN    = "7f2f4b4ee5da1a5aaca95d6ae4618589de16dc58439340bda789cff5ea9f814a";
const AUTH_COUNTRY  = "US";
const AUTH_TS       = "1765830800";  // Unix timestamp
const AUTH_EXPIRY   = "1765848800";  // Token expiry
```

## X-Client-Token Format

The `X-Client-Token` is a base64-encoded string with the following format:

```
base64(channelKey|country|timestamp|userAgent|screen|timezone|language)
```

Example decoded:
```
premium51|US|1766182626|Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...|1920x1080|America/New_York|en-US
```

## Step-by-Step Implementation

### Step 1: Fetch Player Page

The player page requires a valid referer from daddyhd.com. Multiple URL path variants work:

```
Referer options:
- https://daddyhd.com/watch.php?id={channel}
- https://daddyhd.com/stream/stream-{channel}.php
- https://daddyhd.com/cast/stream-{channel}.php
- https://daddyhd.com/watch/stream-{channel}.php
- https://daddyhd.com/plus/stream-{channel}.php
- https://daddyhd.com/casting/stream-{channel}.php
- https://daddyhd.com/player/stream-{channel}.php
```

```javascript
const playerUrl = `https://epicplayplay.cfd/premiumtv/daddyhd.php?id=${channel}`;
const response = await fetch(playerUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://daddyhd.com/watch.php?id=' + channel,
  }
});
const html = await response.text();

// Extract auth variables
const AUTH_TOKEN = html.match(/AUTH_TOKEN\s*=\s*["']([^"']+)["']/)?.[1];
const CHANNEL_KEY = html.match(/CHANNEL_KEY\s*=\s*["']([^"']+)["']/)?.[1];
const AUTH_COUNTRY = html.match(/AUTH_COUNTRY\s*=\s*["']([^"']+)["']/)?.[1];
const AUTH_TS = html.match(/AUTH_TS\s*=\s*["']([^"']+)["']/)?.[1];
```

### Step 2: Server Lookup (Optional)

```javascript
const lookupUrl = `https://chevy.giokko.ru/server_lookup?channel_id=premium${channel}`;
const response = await fetch(lookupUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0...',
    'Referer': 'https://epicplayplay.cfd/',
  }
});
const { server_key } = await response.json();
// Returns: "zeko", "chevy", "wind", "nfs", "ddy6", or "top1/cdn"
```

### Step 3: Generate Client Token

```javascript
function generateClientToken(channelKey, country, timestamp, userAgent) {
  const screen = '1920x1080';
  const tz = 'America/New_York';
  const lang = 'en-US';
  const fingerprint = `${userAgent}|${screen}|${tz}|${lang}`;
  const signData = `${channelKey}|${country}|${timestamp}|${userAgent}|${fingerprint}`;
  return btoa(signData);
}
```

### Step 4: Fetch M3U8 Playlist

```javascript
const m3u8Url = (serverKey === 'top1/cdn')
  ? `https://top1.kiko2.ru/top1/cdn/premium${channel}/mono.css`
  : `https://${serverKey}new.kiko2.ru/${serverKey}/premium${channel}/mono.css`;

const response = await fetch(m3u8Url, {
  headers: {
    'User-Agent': 'Mozilla/5.0...',
    'Referer': 'https://epicplayplay.cfd/',
  }
});
```

### Step 5: Heartbeat (Establish Session)

**IMPORTANT:** The heartbeat endpoint blocks datacenter IPs. Must use residential IP (RPI proxy).

```javascript
const heartbeatUrl = 'https://chevy.kiko2.ru/heartbeat';
const response = await fetch(heartbeatUrl, {
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'X-Channel-Key': CHANNEL_KEY,
    'X-Client-Token': clientToken,
    'User-Agent': 'Mozilla/5.0...',
    'Referer': 'https://epicplayplay.cfd/',
    'Origin': 'https://epicplayplay.cfd',
  }
});
// Response: {"message":"Session created","status":"ok","expiry":1766186226}
```

### Step 6: Fetch Encryption Keys

**IMPORTANT:** Key requests must come from the same IP that established the heartbeat session.

```javascript
const keyUrl = `https://chevy.kiko2.ru/key/premium${channel}/${keyId}`;
const response = await fetch(keyUrl, {
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'X-Channel-Key': CHANNEL_KEY,
    'X-Client-Token': clientToken,
    'User-Agent': 'Mozilla/5.0...',
    'Referer': 'https://epicplayplay.cfd/',
    'Origin': 'https://epicplayplay.cfd',
  }
});
// Response: 16-byte binary AES-128 key
```

## Key Servers

| Server Key | M3U8 URL Pattern | Key Server |
|------------|------------------|------------|
| zeko | `https://zekonew.kiko2.ru/zeko/premium{ch}/mono.css` | chevy.kiko2.ru |
| chevy | `https://chevynew.kiko2.ru/chevy/premium{ch}/mono.css` | chevy.kiko2.ru |
| wind | `https://windnew.kiko2.ru/wind/premium{ch}/mono.css` | chevy.kiko2.ru |
| nfs | `https://nfsnew.kiko2.ru/nfs/premium{ch}/mono.css` | chevy.kiko2.ru |
| ddy6 | `https://ddy6new.kiko2.ru/ddy6/premium{ch}/mono.css` | chevy.kiko2.ru |
| top1/cdn | `https://top1.kiko2.ru/top1/cdn/premium{ch}/mono.css` | chevy.kiko2.ru |

**Note:** All key requests should go to `chevy.kiko2.ru` regardless of which server serves the M3U8. Only chevy has a working heartbeat endpoint.

## Error Codes

| Error | Message | Solution |
|-------|---------|----------|
| E2 | "Session must be created via heartbeat first" | Call heartbeat endpoint first |
| E3 | "Token expired" | Refresh AUTH_TOKEN from player page |
| 403 | Anti-bot challenge | Use residential IP |
| 418 | I'm a teapot | Direct key fetch blocked, use RPI proxy |

## Cloudflare Worker Implementation

The implementation in `cloudflare-proxy/src/dlhd-proxy.ts` handles everything directly:

1. Fetches player page to get AUTH_TOKEN (cached 5 min)
2. Calls heartbeat directly from CF Worker
3. Fetches keys directly with auth headers
4. M3U8 and segments fetched directly (no auth needed)

**NO RPI PROXY REQUIRED!**

## Important Notes

1. **Session is TOKEN-bound, not IP-bound**: The auth works from any IP as long as proper headers are sent.

2. **Key server is always chevy**: Regardless of which server serves the M3U8, keys should be fetched from `chevy.kiko2.ru` (only server with working heartbeat).

3. **Token caching**: AUTH_TOKEN is cached for 5 minutes to reduce player page fetches.

4. **Automatic retry**: On E2 errors, the worker refreshes the session and retries.
