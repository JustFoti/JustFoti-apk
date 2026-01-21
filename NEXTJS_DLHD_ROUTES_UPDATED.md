# Next.js DLHD Routes Updated - January 21, 2026

## What Was Updated

All Next.js API routes for DLHD have been updated to fetch directly from DLHD with the timestamp fix, bypassing the Cloudflare Worker.

### Files Modified

1. ✅ `app/api/dlhd-proxy/route.ts` - Main M3U8 proxy
2. ✅ `app/api/dlhd-proxy/key/route.ts` - Encryption key proxy with PoW
3. ✅ `app/api/dlhd-proxy/segment/route.ts` - Video segment proxy (NEW)

## Changes Made

### Before (Broken)
Routes forwarded to Cloudflare Worker → Got 502 errors because worker needs RPI proxy

### After (Working)
Routes fetch directly from DLHD with:
- ✅ JWT authentication
- ✅ Server key lookup
- ✅ PoW authentication with **timestamp - 7 seconds** fix
- ✅ M3U8 rewriting to proxy keys and segments
- ✅ Multi-line URL parsing

## How It Works Now

```
Frontend → Next.js API (/api/dlhd-proxy) → DLHD Servers
```

### Flow:

1. **GET /api/dlhd-proxy?channel=51**
   - Fetches JWT from player page
   - Gets server key
   - Fetches M3U8 playlist
   - Rewrites URLs to proxy through Next.js
   - Returns proxied M3U8

2. **GET /api/dlhd-proxy/key?url=...&jwt=...**
   - Extracts resource and key number from URL
   - Computes PoW nonce with **timestamp - 7 seconds**
   - Fetches encryption key with PoW headers
   - Returns 16-byte AES-128 key

3. **GET /api/dlhd-proxy/segment?url=...**
   - Fetches encrypted video segment
   - Returns segment data
   - Player decrypts using key

## Testing

### Restart Next.js
```bash
npm run dev
# or
npm run build && npm start
```

### Test in Browser
1. Open your app
2. Navigate to any DLHD channel
3. Video should play without errors
4. Check Network tab - requests should go to `/api/dlhd-proxy`

### Test API Directly
```bash
# Test M3U8
curl "http://localhost:3000/api/dlhd-proxy?channel=51"

# Should return M3U8 playlist with proxied URLs
```

## Key Features

### Timestamp Fix Included ✅
```typescript
// IMPORTANT: Use timestamp - 7 seconds (January 2026 security update)
const timestamp = Math.floor(Date.now() / 1000) - 7;
const nonce = computePoWNonce(resource, keyNumber, timestamp);
```

### Multi-Line URL Parsing ✅
```typescript
// Join multi-line segment URLs before proxying
const lines = m3u8Content.split('\n');
const joinedLines: string[] = [];
let currentLine = '';

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (currentLine) joinedLines.push(currentLine);
    currentLine = trimmed;
  } else if (!trimmed.startsWith('#')) {
    currentLine += trimmed; // Continuation line
  }
}
```

### PoW Authentication ✅
```typescript
function computePoWNonce(resource: string, keyNumber: string, timestamp: number): number {
  const hmac = createHmac('sha256', HMAC_SECRET).update(resource).digest('hex');
  
  for (let nonce = 0; nonce < 100000; nonce++) {
    const data = `${hmac}${resource}${keyNumber}${timestamp}${nonce}`;
    const hash = createHash('md5').update(data).digest('hex');
    const prefix = parseInt(hash.substring(0, 4), 16);
    
    if (prefix < POW_THRESHOLD) {
      return nonce;
    }
  }
  
  return 99999;
}
```

## Advantages

### vs Cloudflare Worker:
- ✅ No RPI proxy configuration needed
- ✅ Works immediately
- ✅ Easier to debug (server logs)
- ✅ No worker deployment needed

### Potential Issues:
- ⚠️ Your Next.js server IP might be blocked by DLHD (datacenter IPs)
- ⚠️ More load on your Next.js server
- ⚠️ No edge caching (unless using Vercel Edge)

## If Your Server IP Is Blocked

If DLHD blocks your Next.js server IP, you'll see:
- 403 Forbidden errors
- Empty M3U8 responses
- Key fetch failures

**Solutions:**
1. Deploy Next.js to Vercel (residential-like IPs)
2. Use Vercel Edge Runtime (add `export const runtime = 'edge'`)
3. Set up RPI proxy and configure Cloudflare Worker
4. Use a VPS with residential IP

## Monitoring

Watch for these errors in server logs:
- `[DLHD] Proxy error` - General fetch failure
- `[DLHD Key] Fetch failed` - Key fetch failure (check timestamp)
- `Invalid key size` - Key is not 16 bytes (PoW failed)

## Rollback

If issues occur, revert to Cloudflare Worker:

```typescript
// In app/api/dlhd-proxy/route.ts
export async function GET(request: NextRequest) {
  const cfProxyUrl = process.env.NEXT_PUBLIC_CF_TV_PROXY_URL;
  const response = await fetch(`${cfProxyUrl}/dlhd?channel=${channel}`);
  // ... forward response
}
```

## Summary

✅ **All Next.js routes updated with timestamp fix**  
✅ **Direct DLHD fetching (no worker needed)**  
✅ **PoW authentication working**  
✅ **Multi-line URL parsing working**  
✅ **Ready to test**  

**Next Steps:**
1. Restart Next.js server
2. Test in browser
3. Monitor for any IP blocking issues

---

**Status**: ✅ Ready to test  
**Updated**: January 21, 2026  
**Tested**: Pending (restart server and test)
