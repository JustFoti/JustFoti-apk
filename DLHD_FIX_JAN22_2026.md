# DLHD 502 Error Fix - January 22, 2026

## Problem
Channels 565 (TVN HD Poland) and 770 (Marquee Sports Network) were returning 502 errors instead of proper responses.

## Root Cause
1. The code was skipping dvalna.ru backend entirely when JWT fetch from topembed.pw failed
2. Channels 565 and 770 don't have topembed.pw mappings, so JWT fetch always failed
3. The fallback backends (cdn-live-tv.ru, moveonjoy.com) don't have these channels
4. Missing server key `dokko1` in the server list (channel 565 uses this server)

## Fixes Applied

### 1. Always Try dvalna.ru with premium{channel} Key
Changed the logic to always attempt dvalna.ru backend using `premium{channel}` key, even when JWT fetch fails. The M3U8 playlist is accessible without JWT - only key requests need JWT authentication.

### 2. Added `dokko1` Server
Added `dokko1` to `ALL_SERVER_KEYS` and `constructM3U8Url()` function. Channel 565 (TVN HD Poland) uses this server.

### 3. Improved Server Lookup
Updated `getServerKey()` to:
- Log errors instead of silently failing
- Try RPI proxy as fallback if direct fetch fails (dvalna.ru may block CF IPs)
- Pass `env` parameter for RPI proxy access

### 4. Better Error Responses
Changed error handling to return:
- **503 (Service Unavailable)** when channel exists but is offline
- **502 (Bad Gateway)** only when all backends are unreachable

## Test Results
After deployment, channels now correctly report their status:

```
Channel 565: Found on dokko1 server - "Channel offline" (503)
Channel 770: Found on ddy6 server - "Channel offline" (503)
Channel 51:  Found on wiki/zeko servers - "Channel offline" (503)
```

## Server Mappings Discovered
- Channel 51 (ABC) → `zeko` server
- Channel 565 (TVN HD Poland) → `dokko1` server
- Channel 770 (Marquee Sports) → `ddy6` server
- Channel 44 (ESPN) → `zeko` server
- Channel 45 (ESPN2) → `wind` server

## Files Modified
- `cloudflare-proxy/src/tv-proxy.ts`

## Deployment
```bash
cd cloudflare-proxy
npx wrangler deploy --name media-proxy
```

## Notes
- Many DLHD channels are only active during live events
- US broadcast channels (ABC, CBS, NBC, FOX) typically only stream during sports events
- The 503 "Channel offline" response is the correct behavior when the channel exists but isn't streaming
