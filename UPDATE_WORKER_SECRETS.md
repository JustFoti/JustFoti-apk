# Update Cloudflare Worker Secrets for DLHD

The Cloudflare Worker needs RPI proxy credentials to route DLHD traffic through residential IP.

## Commands to Run

```bash
cd cloudflare-proxy

# Set RPI proxy URL
npx wrangler secret put RPI_PROXY_URL
# When prompted, enter: https://rpi-proxy.vynx.cc

# Set RPI proxy key
npx wrangler secret put RPI_PROXY_KEY
# When prompted, enter: 5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560
```

## Verify

After setting secrets, test the worker:

```bash
curl "https://media-proxy.vynx.workers.dev/dlhd?channel=51"
```

Should return a valid M3U8 playlist with proxied segments.

## Why This is Needed

- **dvalna.ru blocks Cloudflare Worker IPs** (datacenter IPs)
- **RPI proxy has residential IP** which is not blocked
- All DLHD M3U8, keys, and segments MUST route through RPI proxy
- Without these secrets, the worker will return 503 "RPI proxy not configured"
