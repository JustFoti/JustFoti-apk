# DLHD Proxy with Raspberry Pi Residential IP

This proxy routes DLHD.dad live streams through your Raspberry Pi's residential IP to bypass CDN blocks.

## Architecture

```
Browser → Cloudflare Worker → RPI Proxy (residential IP) → DLHD CDN
```

## What Requires Residential IP?

Based on testing, DLHD's CDN blocks datacenter IPs selectively:

| Component | Datacenter IP | Residential IP | Strategy |
|-----------|---------------|----------------|----------|
| Server Lookup | ✅ Works | ✅ Works | Direct from CF Worker |
| M3U8 Playlist | ❌ HTTP 500 | ✅ Works | Via RPI Proxy |
| **Encryption Key** | ❌ HTTP 418 | ✅ Works | Via RPI Proxy |
| Video Segments | ✅ Works | ✅ Works | Direct (CDN hosted) |

## Routes

| Route | Description |
|-------|-------------|
| `GET /dlhd?channel=<id>` | Get proxied M3U8 playlist |
| `GET /dlhd/key?url=<encoded_url>` | Proxy encryption key |
| `GET /dlhd/segment?url=<encoded_url>` | Proxy video segment |
| `GET /dlhd/health` | Health check |

## Setup

### 1. Set Up Raspberry Pi Proxy

On your Raspberry Pi:

```bash
cd rpi-proxy
npm install
export API_KEY=$(openssl rand -hex 32)
echo "Save this key: $API_KEY"
node server.js
```

### 2. Expose RPI via Cloudflare Tunnel

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared

# Start tunnel
./cloudflared tunnel --url http://localhost:3001
```

Copy the tunnel URL (e.g., `https://random-words.trycloudflare.com`)

### 3. Configure Cloudflare Worker Secrets

```bash
cd cloudflare-proxy

# Set RPI proxy URL (the tunnel URL)
npx wrangler secret put RPI_PROXY_URL
# Enter: https://random-words.trycloudflare.com

# Set RPI proxy API key
npx wrangler secret put RPI_PROXY_KEY
# Enter: your-api-key-from-step-1
```

### 4. Deploy

```bash
npx wrangler deploy
```

## Usage

```bash
# Get a channel stream
curl "https://your-worker.workers.dev/dlhd?channel=325"

# Check health
curl "https://your-worker.workers.dev/dlhd/health"
```

## Troubleshooting

### "RPI proxy not configured"
- Set `RPI_PROXY_URL` and `RPI_PROXY_KEY` secrets via wrangler

### "RPI proxy error: 502"
- Check if RPI proxy server is running
- Check if Cloudflare tunnel is active
- Verify API key matches

### Slow streaming
- RPI adds ~50-100ms latency per request
- Segments fetch direct from CDN (fast)
- Only M3U8 and keys go through RPI
