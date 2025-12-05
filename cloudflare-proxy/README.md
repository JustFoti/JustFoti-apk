# Cloudflare Media Proxy

Cloudflare Workers for proxying HLS streams and live TV. Much cheaper than Vercel Edge for bandwidth-heavy operations.

## Why Cloudflare Workers?

| Feature | Vercel Edge | Cloudflare Workers |
|---------|-------------|-------------------|
| Bandwidth | $0.15/GB after 100GB | **Unlimited** |
| Requests | 1M/month free | 100K/day free |
| Paid tier | $20/mo + bandwidth | **$5/mo flat** |

For video streaming, bandwidth costs add up fast. A single 1080p movie can be 5-10GB!

## Routes

| Route | Description |
|-------|-------------|
| `/stream/?url=<url>&source=<source>&referer=<referer>` | HLS stream proxy (2embed, etc.) |
| `/tv/?channel=<id>` | DLHD live TV M3U8 playlist |
| `/tv/key?url=<url>` | Encryption key proxy |
| `/tv/segment?url=<url>` | Video segment proxy |
| `/decode` | **Isolated decoder sandbox** (POST) |

## Security: Decoder Sandbox

The `/decode` endpoint provides **true V8 isolate separation** for executing untrusted decoder scripts from streaming sites. This prevents site owners from injecting malicious code (RATs, crypto miners, data exfiltration) into your application.

### Why is this needed?

VidSrc and similar sites serve obfuscated JavaScript that decodes stream URLs. Without isolation, this code runs in your application's context with access to:
- Network APIs (fetch, WebSocket)
- Storage (localStorage, cookies)
- Your application's memory

### Security Model

1. **V8 Isolate Separation** - Each request runs in a fresh Cloudflare Worker isolate
2. **No Network Access** - fetch/WebSocket blocked at the isolate level
3. **No Storage Access** - localStorage/sessionStorage unavailable
4. **Pattern Validation** - Defense-in-depth blocklist for suspicious patterns
5. **Output Validation** - Decoded URLs checked against domain allowlist
6. **Resource Limits** - CPU/memory enforced by Cloudflare

### Usage

```bash
POST /decode
Content-Type: application/json
X-API-Key: your-api-key (optional)

{
  "script": "// decoder script from site",
  "divId": "abc123",
  "encodedContent": "base64-encoded-data"
}
```

Response:
```json
{
  "success": true,
  "decodedUrl": "https://stream.example.com/video.m3u8"
}
```

## Quick Start

### 1. Install Dependencies

```bash
cd cloudflare-proxy
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

### 3. Deploy

```bash
npm run deploy
```

Your worker will be available at: `https://media-proxy.<your-subdomain>.workers.dev`

### 4. Configure Your App

Add these to your `.env.local`:

```bash
NEXT_PUBLIC_CF_STREAM_PROXY_URL=https://media-proxy.your-subdomain.workers.dev/stream
NEXT_PUBLIC_CF_TV_PROXY_URL=https://media-proxy.your-subdomain.workers.dev/tv

# SECURITY: Decoder sandbox for VidSrc extraction
DECODER_SANDBOX_URL=https://media-proxy.your-subdomain.workers.dev
DECODER_SANDBOX_API_KEY=your-secret-key  # Optional but recommended
```

That's it! Your app will automatically use Cloudflare Workers for proxying and secure decoder execution.

## Configure Secrets

### For decoder sandbox (recommended):

```bash
npx wrangler secret put API_KEY
# Enter: your-secret-key (protects /decode endpoint)
```

### For TV proxy (required for DLHD CDN bypass):

```bash
npx wrangler secret put RPI_PROXY_URL
# Enter: https://your-rpi-proxy.com

npx wrangler secret put RPI_PROXY_KEY
# Enter: your-api-key
```

## Local Development

```bash
# Copy example env file
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your secrets

# Start local dev server
npm run dev
```

## Custom Domain (Optional)

To use a custom domain instead of `*.workers.dev`:

1. Add your domain to Cloudflare
2. Update `wrangler.toml`:

```toml
[env.production]
routes = [{ pattern = "proxy.yourdomain.com/*", zone_name = "yourdomain.com" }]
```

3. Deploy: `npm run deploy:prod`

## Pricing Comparison

### Scenario: 1000 users watching 2-hour movies (avg 5GB each)

| Provider | Cost |
|----------|------|
| Vercel Edge | ~$750/month (5TB bandwidth) |
| Cloudflare Workers | **$5/month** |

## Troubleshooting

### "Error: You must be logged in"
Run `npx wrangler login` and authenticate with your Cloudflare account.

### "Error: Could not find wrangler.toml"
Make sure you're in the `cloudflare-proxy` directory.

### TV streams not working
Make sure you've set the RPI_PROXY_URL and RPI_PROXY_KEY secrets.
