# Cloudflare Worker Secrets Setup for DLHD

## Problem

Getting 502/503 errors from the worker:
```
Failed to load resource: the server responded with a status of 502
```

This is because DLHD blocks Cloudflare Worker IPs and requires routing through a residential IP proxy (RPI).

## Required Secrets

The worker needs these environment variables configured:

1. **RPI_PROXY_URL** - Your residential proxy server URL
2. **RPI_PROXY_KEY** - Authentication key for the proxy

## Setup Methods

### Method 1: Using Wrangler CLI (Recommended)

```bash
cd cloudflare-proxy

# Set RPI proxy URL
wrangler secret put RPI_PROXY_URL
# When prompted, enter: http://your-rpi-ip:3000 (or your proxy URL)

# Set RPI proxy key
wrangler secret put RPI_PROXY_KEY
# When prompted, enter your secret key
```

### Method 2: Using Cloudflare Dashboard

1. Go to https://dash.cloudflare.com
2. Navigate to **Workers & Pages**
3. Click on your worker: **media-proxy-worker**
4. Go to **Settings** → **Variables**
5. Under **Environment Variables**, click **Add variable**
6. Add:
   - Variable name: `RPI_PROXY_URL`
   - Value: `http://your-rpi-ip:3000` (your proxy server)
   - Type: **Secret** (encrypted)
7. Click **Add variable** again
8. Add:
   - Variable name: `RPI_PROXY_KEY`
   - Value: Your authentication key
   - Type: **Secret** (encrypted)
9. Click **Save and Deploy**

### Method 3: Using wrangler.toml (Not Recommended for Secrets)

**DO NOT** put secrets in `wrangler.toml` as they'll be committed to git. Use the methods above instead.

## RPI Proxy Setup

If you don't have an RPI proxy running, you have two options:

### Option A: Use Your Raspberry Pi

1. SSH into your Raspberry Pi
2. Navigate to the rpi-proxy directory
3. Start the proxy:
   ```bash
   cd rpi-proxy
   npm install
   node server.js
   ```
4. Note the IP address and port (default: 3000)
5. Use this as your `RPI_PROXY_URL`: `http://192.168.x.x:3000`

### Option B: Use a VPS with Residential IP

If you don't have a Raspberry Pi, you can:
1. Get a VPS with a residential IP (not datacenter IP)
2. Deploy the rpi-proxy code there
3. Use that URL as `RPI_PROXY_URL`

### Option C: Temporarily Disable RPI Requirement (Testing Only)

**WARNING**: This will likely fail for most channels as DLHD blocks datacenter IPs.

Edit `cloudflare-proxy/src/dlhd-proxy.ts`:

```typescript
// Comment out the RPI requirement check
/*
if (!env?.RPI_PROXY_URL || !env?.RPI_PROXY_KEY) {
  return jsonResponse({ 
    error: 'RPI proxy not configured', 
    hint: 'DLHD requires residential IP. Configure RPI_PROXY_URL and RPI_PROXY_KEY in Cloudflare Worker secrets.',
  }, 503, origin);
}
*/

// Try direct fetch first (will likely fail)
try {
  const directResponse = await fetch(m3u8Url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
    },
  });
  
  if (directResponse.ok) {
    content = await directResponse.text();
    fetchedVia = 'direct';
  } else {
    throw new Error(`Direct fetch failed: ${directResponse.status}`);
  }
} catch (error) {
  return jsonResponse({ 
    error: 'M3U8 fetch failed', 
    details: 'DLHD blocks Cloudflare IPs. Configure RPI proxy.',
  }, 502, origin);
}
```

## Verification

After configuring the secrets:

### 1. Check Worker Logs

```bash
wrangler tail
```

Then make a request and watch for:
- ✅ "Calling RPI /proxy for M3U8"
- ✅ "RPI response" with status 200
- ❌ "RPI proxy not configured" (means secrets not set)

### 2. Test Direct Request

```bash
curl "https://media-proxy.vynx.workers.dev/dlhd?channel=51"
```

Should return M3U8 playlist, not an error.

### 3. Test in Browser

Open your app and try to play a DLHD channel. Should work without 502 errors.

## Troubleshooting

### Error: "RPI proxy not configured"
- Secrets not set in Cloudflare Worker
- Solution: Follow setup methods above

### Error: "RPI proxy returned error"
- RPI proxy is not running
- RPI proxy URL is incorrect
- RPI proxy key is incorrect
- Solution: Check RPI proxy is running and accessible

### Error: "M3U8 fetch failed via RPI proxy"
- RPI proxy can't reach DLHD
- Network issue
- Solution: Test RPI proxy directly

### Test RPI Proxy Directly

```bash
# Test if RPI proxy is accessible
curl "http://your-rpi-ip:3000/health"

# Test DLHD fetch through RPI proxy
curl "http://your-rpi-ip:3000/proxy?url=https://zekonew.dvalna.ru/zeko/premium51/mono.css&key=your-key"
```

## Security Notes

1. **Never commit secrets** to git
2. **Use encrypted secrets** in Cloudflare dashboard
3. **Rotate keys regularly**
4. **Restrict RPI proxy access** to only your worker IP if possible
5. **Use HTTPS** for RPI proxy if exposed to internet

## Alternative: Use Next.js API Route

If you can't set up RPI proxy, you can route DLHD requests through your Next.js API instead:

1. The Next.js API routes already have the RPI proxy logic
2. Update frontend to call `/api/dlhd-proxy` instead of worker
3. This uses your server's IP (which might not be blocked)

## Summary

**Quick Fix:**
1. Set up RPI proxy on Raspberry Pi or VPS
2. Configure `RPI_PROXY_URL` and `RPI_PROXY_KEY` in Cloudflare Worker
3. Redeploy worker
4. Test in browser

**Why This Is Needed:**
- DLHD blocks datacenter IPs (including Cloudflare Workers)
- Residential IPs (like Raspberry Pi) are not blocked
- RPI proxy acts as a bridge between worker and DLHD

---

**Status**: Configuration required  
**Priority**: HIGH - Blocks all DLHD streams  
**Estimated Time**: 10-15 minutes
