# DLHD Proxy - Authentication & Session Flow

This proxy routes DLHD.dad live streams through Cloudflare Workers with proper authentication.

## Architecture (Updated Dec 2024)

```
Browser → Cloudflare Worker → DLHD CDN (with auth token + heartbeat session)
```

**No Raspberry Pi required!** The key discovery is that DLHD uses a session-based authentication system that works from any IP (including datacenter IPs) when properly authenticated.

## How It Works

### Authentication Flow

DLHD uses a 3-step authentication process:

```
1. Fetch Player Page → Get AUTH_TOKEN
2. Call Heartbeat → Establish Session  
3. Fetch Key → Use Session Token
```

### Step 1: Get Auth Token

Fetch the player page to extract the embedded auth token:

```
GET https://epicplayplay.cfd/premiumtv/daddyhd.php?id=<channel>

Response contains:
  AUTH_TOKEN = "abc123..."
  CHANNEL_KEY = "premium51"
```

### Step 2: Establish Heartbeat Session

Call the heartbeat endpoint to create a session:

```
GET https://chevy.kiko2.ru/heartbeat
Headers:
  Authorization: Bearer <AUTH_TOKEN>
  X-Channel-Key: premium<channel>

Response:
  {"expiry":1765944911,"message":"Session created","status":"ok"}
```

The session is valid for ~5 hours (expiry is a Unix timestamp).

### Step 3: Fetch Encryption Key

With an active session, fetch the AES-128 encryption key:

```
GET https://chevy.kiko2.ru/key/premium51/<key_id>
Headers:
  Authorization: Bearer <AUTH_TOKEN>
  X-Channel-Key: premium<channel>

Response: 16-byte binary key
```

## Error Codes

| Error | Meaning | Solution |
|-------|---------|----------|
| `E2` | "Session must be created via heartbeat first" | Call heartbeat endpoint |
| `E3` | Token expired or invalid | Refresh auth token from player page |
| `401` | Unauthorized | Check Authorization header format |
| `400` | Missing X-Channel-Key | Add X-Channel-Key header |

## What Requires What?

| Component | Auth Token | Heartbeat Session | Notes |
|-----------|------------|-------------------|-------|
| Server Lookup | ❌ | ❌ | Public endpoint |
| M3U8 Playlist | ❌ | ❌ | Public CDN |
| **Encryption Key** | ✅ | ✅ | Requires full auth |
| Video Segments | ❌ | ❌ | Public CDN |

## Routes

| Route | Description |
|-------|-------------|
| `GET /dlhd?channel=<id>` | Get proxied M3U8 playlist |
| `GET /dlhd/key?url=<encoded_url>` | Proxy encryption key (handles auth) |
| `GET /dlhd/segment?url=<encoded_url>` | Proxy video segment |
| `GET /dlhd/schedule` | Fetch live events schedule |
| `GET /dlhd/health` | Health check with session info |

## Session Management

The Cloudflare Worker automatically:
- Caches auth tokens per channel
- Establishes heartbeat sessions
- Tracks session expiry times
- Refreshes sessions 2 minutes before expiry
- Retries with fresh session on E2 errors

## Setup

### 1. Deploy Cloudflare Worker

```bash
cd cloudflare-proxy
npx wrangler deploy
```

### 2. (Optional) Configure RPI Proxy for Fallback

If direct auth fails, you can configure an RPI proxy as fallback:

```bash
npx wrangler secret put RPI_PROXY_URL
npx wrangler secret put RPI_PROXY_KEY
```

## Usage

```bash
# Get a channel stream
curl "https://your-worker.workers.dev/dlhd?channel=325"

# Check health and session status
curl "https://your-worker.workers.dev/dlhd/health"

# Test key fetching
curl "https://your-worker.workers.dev/dlhd/key?url=https://chevy.kiko2.ru/key/premium51/5885916"
```

## Troubleshooting

### "Session must be created via heartbeat first" (E2)
- The heartbeat call failed or session expired
- Check worker logs for heartbeat response
- Session auto-refreshes, wait and retry

### "Failed to establish session"
- Player page may have changed format
- Check if AUTH_TOKEN regex still matches
- Verify heartbeat endpoint is accessible

### Stream keeps reconnecting
- Session may be expiring too quickly
- Check session expiry in health endpoint
- Worker should auto-refresh before expiry

### Key load errors in browser
- HLS.js will auto-retry with exponential backoff
- Check browser console for detailed errors
- Worker handles session refresh automatically

## Technical Details

### Key Servers
- `chevy.kiko2.ru` - Primary
- `zeko.kiko2.ru` - Fallback

### CDN Patterns
- M3U8: `https://<server>new.kiko2.ru/<server>/premium<channel>/mono.css`
- Key: `https://<server>.kiko2.ru/key/premium<channel>/<key_id>`
- Segments: Various CDNs (DigitalOcean, Google Cloud, etc.)

### Session Cache
- TTL: 20 minutes max
- Auto-refresh: 2 minutes before expiry
- Per-channel isolation
