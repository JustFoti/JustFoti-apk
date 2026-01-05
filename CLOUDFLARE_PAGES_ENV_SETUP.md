# Cloudflare Pages Environment Variables Setup

## CRITICAL: Build-Time vs Runtime Variables

Cloudflare Pages has TWO types of environment variables:

1. **Build-time variables** - Available during `next build` (NEXT_PUBLIC_* vars)
2. **Runtime variables** - Available when the app runs (server-side only)

**NEXT_PUBLIC_* variables MUST be set as build-time variables** because Next.js inlines them during build.

---

## Step-by-Step Setup in Cloudflare Dashboard

### 1. Go to Cloudflare Pages Settings
- Dashboard → Pages → Your Project → Settings → Environment variables

### 2. Add These Variables (Production Environment)

#### REQUIRED - Build Time Variables
These MUST have **"Available during build"** checked ✅

| Variable Name | Example Value | Build Time? |
|--------------|---------------|-------------|
| `NEXT_PUBLIC_TMDB_API_KEY` | `your_tmdb_api_key` | ✅ YES |
| `NEXT_PUBLIC_CF_ANALYTICS_WORKER_URL` | `https://flyx-analytics.vynx.workers.dev` | ✅ YES |
| `NEXT_PUBLIC_CF_SYNC_URL` | `https://flyx-sync.vynx.workers.dev` | ✅ YES |
| `NEXT_PUBLIC_CF_PROXY_URL` | `https://media-proxy.vynx.workers.dev` | ✅ YES |
| `NEXT_PUBLIC_CF_STREAM_PROXY_URL` | `https://media-proxy.vynx.workers.dev/stream` | ✅ YES |
| `NEXT_PUBLIC_CF_TV_PROXY_URL` | `https://media-proxy.vynx.workers.dev` | ✅ YES |
| `NEXT_PUBLIC_CF_TMDB_URL` | `https://media-proxy.vynx.workers.dev` | ✅ YES |
| `NEXT_PUBLIC_USE_DLHD_PROXY` | `true` | ✅ YES |

#### OPTIONAL - Runtime Variables (Server-side only)
These do NOT need "Available during build"

| Variable Name | Example Value | Build Time? |
|--------------|---------------|-------------|
| `TMDB_API_KEY` | `your_tmdb_bearer_token` | ❌ NO |
| `IP_SALT` | `random-string-for-hashing` | ❌ NO |

> **Note:** RPI proxy credentials (`RPI_PROXY_URL`, `RPI_PROXY_KEY`) are configured in the **CF Worker's wrangler.toml secrets**, NOT in Cloudflare Pages. The client never talks to RPI directly - all RPI requests go through the CF Worker (`media-proxy.vynx.workers.dev`).

---

## Your Specific Values (vynx.workers.dev)

Based on your setup, here are the exact values to use:

```
NEXT_PUBLIC_TMDB_API_KEY=<your TMDB API key>
NEXT_PUBLIC_CF_ANALYTICS_WORKER_URL=https://flyx-analytics.vynx.workers.dev
NEXT_PUBLIC_CF_SYNC_URL=https://flyx-sync.vynx.workers.dev
NEXT_PUBLIC_CF_PROXY_URL=https://media-proxy.vynx.workers.dev
NEXT_PUBLIC_CF_STREAM_PROXY_URL=https://media-proxy.vynx.workers.dev/stream
NEXT_PUBLIC_CF_TV_PROXY_URL=https://media-proxy.vynx.workers.dev
NEXT_PUBLIC_CF_TMDB_URL=https://media-proxy.vynx.workers.dev
NEXT_PUBLIC_USE_DLHD_PROXY=true
```

---

## How to Add in Cloudflare Dashboard

1. Go to: **Cloudflare Dashboard** → **Pages** → **flyx** (your project)
2. Click **Settings** tab
3. Click **Environment variables** in the left sidebar
4. For each variable:
   - Click **Add variable**
   - Enter the variable name (e.g., `NEXT_PUBLIC_TMDB_API_KEY`)
   - Enter the value
   - **IMPORTANT**: Check the box **"Available during build"** for all `NEXT_PUBLIC_*` variables
   - Select **Production** environment (or both Production and Preview)
   - Click **Save**

---

## Verify Your Setup

After adding all variables:
1. Trigger a new deployment (push to GitHub or click "Retry deployment")
2. Check the build logs for any "undefined" or missing env var errors
3. Test the live site - API calls should work

---

## Common Mistakes

❌ **NOT checking "Available during build"** for NEXT_PUBLIC_* vars
   - Result: Variables are undefined in the built app

❌ **Adding vars to wrangler.toml**
   - Result: Overwrites your dashboard secrets on every deploy

❌ **Using wrong variable names**
   - Result: App uses fallback values or fails

❌ **Forgetting to save after adding each variable**
   - Result: Variables not actually set

---

## Quick Checklist

- [ ] `NEXT_PUBLIC_TMDB_API_KEY` added with "Available during build" ✅
- [ ] `NEXT_PUBLIC_CF_ANALYTICS_WORKER_URL` added with "Available during build" ✅
- [ ] `NEXT_PUBLIC_CF_SYNC_URL` added with "Available during build" ✅
- [ ] `NEXT_PUBLIC_CF_STREAM_PROXY_URL` added with "Available during build" ✅
- [ ] `NEXT_PUBLIC_CF_TV_PROXY_URL` added with "Available during build" ✅
- [ ] `NEXT_PUBLIC_USE_DLHD_PROXY` added with "Available during build" ✅
- [ ] `TMDB_API_KEY` (bearer token) added for server-side
- [ ] Triggered new deployment after adding variables

---

## RPI Proxy Setup (in CF Worker, NOT Pages)

RPI proxy credentials go in the **cloudflare-proxy worker**, not Cloudflare Pages:

```bash
cd cloudflare-proxy
wrangler secret put RPI_PROXY_URL
wrangler secret put RPI_PROXY_KEY
```

The flow is: **Client → CF Worker → RPI Proxy** (client never sees RPI credentials)
