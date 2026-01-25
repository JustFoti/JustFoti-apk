# DLHD Proxy - Proof-of-Work Authentication (January 2026)

This proxy routes daddyhd.com live streams through Cloudflare Workers with PoW authentication.

**⚠️ RPI PROXY REQUIRED!** The dvalna.ru domain BLOCKS Cloudflare IPs (returns 500).

## Architecture (January 2026)

```
Browser → Cloudflare Worker → RPI Proxy (residential IP) → DLHD CDN (dvalna.ru)
```

## Setup Requirements

### 1. Deploy RPI Proxy

Copy the updated `rpi-proxy/` folder to your Raspberry Pi and run:

```bash
cd rpi-proxy
npm install
API_KEY=your-secret-key node server.js
```

Expose it via Cloudflare Tunnel:
```bash
cloudflared tunnel --url http://localhost:3001
```

### 2. Configure CF Worker Secrets

```bash
cd cloudflare-proxy
npx wrangler secret put RPI_PROXY_URL   # e.g., https://xxx.trycloudflare.com
npx wrangler secret put RPI_PROXY_KEY   # Same as API_KEY on RPI
```

### 3. Deploy CF Worker

```bash
npx wrangler deploy
```

## What Changed (January 2026)

| Before (Dec 2025) | After (Jan 2026) |
|-------------------|------------------|
| Domain: kiko2.ru, giokko.ru | Domain: dvalna.ru |
| Auth: Bearer token + heartbeat | Auth: Proof-of-Work (PoW) |
| Key server blocked CF IPs | **ALL servers block CF IPs** |
| Required RPI proxy for keys only | **RPI proxy required for M3U8 AND keys** |

## How It Works

### Authentication Flow

DLHD now uses Proof-of-Work authentication for key requests:

```
1. Fetch M3U8 Playlist → Get key URLs
2. Compute PoW Nonce → HMAC-SHA256 + MD5 with threshold check
3. Generate JWT → Include resource, keyNumber, timestamp, nonce
4. Fetch Key → Use Authorization + X-Key-Timestamp + X-Key-Nonce
```

### Step 1: Get M3U8 Playlist

Fetch the playlist directly (no auth needed):

```
GET https://{server}new.dvalna.ru/{server}/premium{channel}/mono.css
Headers:
  Referer: https://epicplayplay.cfd/

Response: HLS playlist with encrypted segments
```

### Step 2: Compute PoW Nonce

The PoW algorithm finds a nonce where MD5 hash prefix < 0x1000:

```javascript
const HMAC_SECRET = '7f9e2a8b3c5d1e4f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7';
const POW_THRESHOLD = 0x1000;

function computePoWNonce(resource, keyNumber, timestamp) {
  const hmac = HMAC_SHA256(resource, HMAC_SECRET);
  
  for (let nonce = 0; nonce < 100000; nonce++) {
    const data = hmac + resource + keyNumber + timestamp + nonce;
    const hash = MD5(data);
    const prefix = parseInt(hash.substring(0, 4), 16);
    
    if (prefix < POW_THRESHOLD) return nonce;
  }
  return null;
}
```

### Step 3: Generate JWT

Create a JWT with the PoW proof:

```javascript
function generateKeyJWT(resource, keyNumber, timestamp, nonce) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    resource,      // e.g., "premium51"
    keyNumber,     // e.g., "5886102"
    timestamp,     // Unix timestamp
    nonce,         // Computed PoW nonce
    exp: timestamp + 300  // 5 minute expiry
  };
  
  return sign(header, payload, HMAC_SECRET);
}
```

### Step 4: Fetch Encryption Key

Request the key with PoW headers:

```
GET https://chevy.dvalna.ru/key/premium{channel}/{key_id}
Headers:
  Authorization: Bearer <JWT>
  X-Key-Timestamp: <timestamp>
  X-Key-Nonce: <nonce>
  Referer: https://epicplayplay.cfd/

Response: 16-byte AES-128 key
```

## What Requires What?

| Component | PoW Auth | Notes |
|-----------|----------|-------|
| Server Lookup | ❌ | Public endpoint |
| M3U8 Playlist | ❌ | Public CDN |
| **Encryption Key** | ✅ | Requires PoW JWT |
| Video Segments | ❌ | Public CDN |

## Routes

| Route | Description |
|-------|-------------|
| `GET /tv?channel=<id>` | Get proxied M3U8 playlist |
| `GET /tv/cdnlive?url=<encoded_url>` | Proxy nested M3U8 manifests (through Next.js) |
| `GET /segment?url=<encoded_url>` | Proxy video segments (DIRECT to worker) |
| `GET /tv/key?url=<encoded_url>` | Proxy encryption key (handles PoW) |
| `GET /tv/health` | Health check |

**Note:** Segments use the direct `/segment` route (not `/tv/segment`) for optimal performance. This bypasses Next.js routing and reduces latency.

## Key Servers

All servers now use dvalna.ru domain:

| Server Key | M3U8 URL Pattern |
|------------|------------------|
| zeko | `https://zekonew.dvalna.ru/zeko/premium{ch}/mono.css` |
| chevy | `https://chevynew.dvalna.ru/chevy/premium{ch}/mono.css` |
| wind | `https://windnew.dvalna.ru/wind/premium{ch}/mono.css` |
| nfs | `https://nfsnew.dvalna.ru/nfs/premium{ch}/mono.css` |
| ddy6 | `https://ddy6new.dvalna.ru/ddy6/premium{ch}/mono.css` |
| top1/cdn | `https://top1.dvalna.ru/top1/cdn/premium{ch}/mono.css` |

Key requests always go to: `https://chevy.dvalna.ru/key/premium{ch}/{key_id}`

## Setup

### Deploy Cloudflare Worker

```bash
cd cloudflare-proxy
npx wrangler deploy
```

No secrets needed! The proxy handles PoW computation internally.

## Usage

```bash
# Get a channel stream
curl "https://your-worker.workers.dev/tv?channel=51"

# Check health
curl "https://your-worker.workers.dev/tv/health"
```

## Troubleshooting

### "Invalid PoW nonce"
- Nonce computation failed
- Check that HMAC_SECRET is correct

### "Token expired"
- JWT expired (5 minute window)
- Worker will automatically recompute

### Stream keeps reconnecting
- Normal for live streams
- HLS.js handles reconnection automatically
