# DLHD 502 Error Fix - RPI Proxy Required

## Current Issue

Getting **502 Bad Gateway** errors:
```
Failed to load resource: the server responded with a status of 502
media-proxy.vynx.workers.dev/dlhd?channel=889
```

## Root Cause

The Cloudflare Worker **requires** an RPI (Residential Proxy) to be configured because:
1. DLHD blocks Cloudflare Worker IPs (datacenter IPs)
2. M3U8 playlists and encryption keys must be fetched from a residential IP
3. The worker is configured to ALWAYS use RPI proxy for DLHD

## Solution Options

### Option 1: Configure RPI Proxy (Recommended)

**If you have a Raspberry Pi or VPS with residential IP:**

1. **Start the RPI proxy:**
   ```bash
   cd rpi-proxy
   npm install
   node server.js
   ```

2. **Expose it to the internet** (choose one):
   
   **A. Using Cloudflare Tunnel (Recommended):**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   This gives you a public URL like: `https://xyz.trycloudflare.com`

   **B. Using ngrok:**
   ```bash
   ngrok http 3000
   ```
   This gives you a public URL like: `https://abc123.ngrok.io`

   **C. Direct IP (if you have static IP):**
   Use your public IP: `http://your-public-ip:3000`

3. **Configure Cloudflare Worker secrets:**
   ```bash
   cd cloudflare-proxy
   
   # Set RPI proxy URL
   wrangler secret put RPI_PROXY_URL
   # Enter: https://xyz.trycloudflare.com (or your URL)
   
   # Set RPI proxy key
   wrangler secret put RPI_PROXY_KEY
   # Enter: your-secret-key-here
   ```

4. **Deploy worker:**
   ```bash
   npm run deploy
   ```

### Option 2: Use Next.js API Instead (Quick Fix)

**If you can't set up RPI proxy right now:**

Update your frontend to use the Next.js API route instead of the worker:

**Change from:**
```javascript
const url = `https://media-proxy.vynx.workers.dev/dlhd?channel=${channelId}`;
```

**To:**
```javascript
const url = `/api/dlhd-proxy?channel=${channelId}`;
```

The Next.js API routes (`app/api/dlhd-proxy/`) already have the timestamp fix and can use your server's IP (which might not be blocked).

### Option 3: Temporary Direct Fetch (Will Likely Fail)

**WARNING**: This will fail for most channels as DLHD blocks datacenter IPs.

You can temporarily try direct fetching by modifying the worker, but this is NOT recommended for production.

## Recommended Approach

**For Production:**
1. Set up RPI proxy on Raspberry Pi or residential VPS
2. Expose via Cloudflare Tunnel (free and secure)
3. Configure worker secrets
4. Deploy

**For Quick Testing:**
1. Use Next.js API routes instead of worker
2. Your Next.js server IP might not be blocked
3. Test if it works before setting up RPI

## RPI Proxy Setup Details

### Environment Variables for RPI Proxy

Create `.env` in `rpi-proxy/`:
```bash
API_KEY=your-secret-key-here
PORT=3000
```

### Start RPI Proxy

```bash
cd rpi-proxy
npm install
node server.js
```

Should see:
```
🚀 RPI Proxy Server running on port 3000
📡 Ready to proxy DLHD requests
```

### Test RPI Proxy

```bash
# Health check
curl http://localhost:3000/health

# Test DLHD fetch
curl "http://localhost:3000/proxy?url=https://zekonew.dvalna.ru/zeko/premium51/mono.css&key=your-secret-key-here"
```

Should return M3U8 playlist.

## Cloudflare Worker Configuration

### Required Secrets

| Secret | Value | Example |
|--------|-------|---------|
| `RPI_PROXY_URL` | Your RPI proxy URL | `https://xyz.trycloudflare.com` |
| `RPI_PROXY_KEY` | Authentication key | `your-secret-key-here` |

### Set Secrets

```bash
cd cloudflare-proxy

# Method 1: Using wrangler CLI
wrangler secret put RPI_PROXY_URL
wrangler secret put RPI_PROXY_KEY

# Method 2: Using Cloudflare Dashboard
# Go to Workers & Pages → Your Worker → Settings → Variables
```

### Verify Secrets

```bash
# Check worker logs
wrangler tail

# Make a test request
curl "https://media-proxy.vynx.workers.dev/dlhd?channel=51"
```

## Why RPI Proxy Is Needed

### DLHD's IP Blocking

DLHD blocks requests from:
- ✅ Cloudflare Worker IPs (datacenter)
- ✅ AWS IPs (datacenter)
- ✅ Google Cloud IPs (datacenter)
- ✅ Most VPS providers (datacenter)

DLHD allows requests from:
- ✅ Residential ISP IPs (home internet)
- ✅ Mobile carrier IPs
- ✅ Some residential VPS providers

### What RPI Proxy Does

1. Receives request from Cloudflare Worker
2. Fetches content from DLHD using residential IP
3. Returns content to worker
4. Worker proxies to frontend

```
Frontend → Worker (datacenter IP) → RPI Proxy (residential IP) → DLHD
                                    ↑
                                    This step is required!
```

## Troubleshooting

### Error: "RPI proxy not configured"
- **Cause**: Secrets not set in worker
- **Fix**: Configure `RPI_PROXY_URL` and `RPI_PROXY_KEY`

### Error: "RPI proxy returned error"
- **Cause**: RPI proxy not running or not accessible
- **Fix**: Start RPI proxy and verify it's accessible

### Error: "Connection refused"
- **Cause**: RPI proxy not exposed to internet
- **Fix**: Use Cloudflare Tunnel or ngrok

### Error: "Invalid API key"
- **Cause**: `RPI_PROXY_KEY` doesn't match RPI proxy's `API_KEY`
- **Fix**: Make sure both use the same key

## Quick Start Checklist

- [ ] RPI proxy running on Raspberry Pi/VPS
- [ ] RPI proxy exposed to internet (Cloudflare Tunnel/ngrok)
- [ ] `RPI_PROXY_URL` configured in worker
- [ ] `RPI_PROXY_KEY` configured in worker
- [ ] Worker deployed
- [ ] Tested in browser

## Alternative: Next.js API Route

If you can't set up RPI proxy, use Next.js API:

**Pros:**
- No RPI proxy needed
- Easier setup
- Your server IP might not be blocked

**Cons:**
- More load on your Next.js server
- Might still be blocked if using datacenter hosting
- No Cloudflare edge caching

**Implementation:**
Just change frontend URLs from worker to `/api/dlhd-proxy`

---

**Status**: RPI proxy configuration required  
**Priority**: CRITICAL - Blocks all DLHD streams  
**Estimated Time**: 15-30 minutes  
**Difficulty**: Medium
