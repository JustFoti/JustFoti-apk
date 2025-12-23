# Flyx

A modern streaming platform built with Next.js 15, featuring movies, TV shows, live TV, and cross-device sync.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FVynx-Velvet%2Fflyx-main&env=TMDB_API_KEY,NEXT_PUBLIC_TMDB_API_KEY&envDescription=TMDB%20API%20keys%20required%20for%20movie%20and%20TV%20data&envLink=https%3A%2F%2Fwww.themoviedb.org%2Fsettings%2Fapi&project-name=flyx&repository-name=flyx)

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Features

- **Movies & TV Shows** - Browse trending content, search, and watch with multiple video providers
- **Live TV** - IPTV support with DLHD integration
- **Cross-Device Sync** - Sync watchlist, continue watching, and preferences across devices
- **Continue Watching** - Resume playback from where you left off
- **Admin Dashboard** - Real-time analytics, user metrics, and live activity monitoring
- **Privacy-First** - Anonymous tracking, no PII collected, GDPR-compliant

---

## Quick Deploy

### 1. Main App → Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FVynx-Velvet%2Fflyx-main&env=TMDB_API_KEY,NEXT_PUBLIC_TMDB_API_KEY&envDescription=TMDB%20API%20keys%20required&envLink=https%3A%2F%2Fwww.themoviedb.org%2Fsettings%2Fapi&project-name=flyx&repository-name=flyx)

Required environment variables:
- `TMDB_API_KEY` - [Get from TMDB](https://www.themoviedb.org/settings/api) (Bearer token)
- `NEXT_PUBLIC_TMDB_API_KEY` - TMDB API key (v3 auth)

---

### 2. Cloudflare Workers + D1 (Optional but Recommended)

Deploy workers for cross-device sync, analytics, and stream proxying. Each uses **Cloudflare D1** (SQLite at the edge) - no external database needed!

#### Sync Worker (Cross-Device Sync)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Vynx-Velvet/flyx-main/tree/main/cf-sync-worker)

<details>
<summary>Manual deployment steps</summary>

```bash
cd cf-sync-worker
npm install

# Create D1 database
npx wrangler d1 create flyx-sync-db

# Copy the database_id from output to wrangler.toml

# Initialize schema
npx wrangler d1 execute flyx-sync-db --file=schema.sql

# Deploy worker
npx wrangler deploy
```

</details>

Then add to Vercel: `NEXT_PUBLIC_CF_SYNC_URL=https://flyx-sync.YOUR-SUBDOMAIN.workers.dev`

---

#### Analytics Worker (Real-time Analytics)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Vynx-Velvet/flyx-main/tree/main/cf-analytics-worker)

<details>
<summary>Manual deployment steps</summary>

```bash
cd cf-analytics-worker
npm install

# Create D1 database
npx wrangler d1 create flyx-analytics-db

# Copy the database_id from output to wrangler.toml

# Initialize schema
npx wrangler d1 execute flyx-analytics-db --file=schema.sql

# Deploy worker
npx wrangler deploy
```

</details>

Then add to Vercel: `NEXT_PUBLIC_CF_ANALYTICS_WORKER_URL=https://flyx-analytics.YOUR-SUBDOMAIN.workers.dev`

---

#### Stream Proxy (HLS/Live TV)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Vynx-Velvet/flyx-main/tree/main/cloudflare-proxy)

<details>
<summary>Manual deployment steps</summary>

```bash
cd cloudflare-proxy
npm install
npx wrangler deploy
```

</details>

Then add to Vercel:
- `NEXT_PUBLIC_CF_STREAM_PROXY_URL=https://media-proxy.YOUR-SUBDOMAIN.workers.dev/stream`
- `NEXT_PUBLIC_CF_TV_PROXY_URL=https://media-proxy.YOUR-SUBDOMAIN.workers.dev`

---

## Local Development

```bash
# Clone and install
git clone https://github.com/Vynx-Velvet/flyx-main.git
cd flyx-main
npm install  # or: bun install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your TMDB API keys

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `TMDB_API_KEY` | TMDB Bearer token (Read Access Token) |
| `NEXT_PUBLIC_TMDB_API_KEY` | TMDB API key (v3 auth) |

### Optional (Enhanced Features)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CF_SYNC_URL` | Sync Worker URL (cross-device sync) |
| `NEXT_PUBLIC_CF_ANALYTICS_WORKER_URL` | Analytics Worker URL |
| `NEXT_PUBLIC_CF_STREAM_PROXY_URL` | Stream proxy for HLS content |
| `NEXT_PUBLIC_CF_TV_PROXY_URL` | Live TV proxy URL |
| `DATABASE_URL` | Neon PostgreSQL (alternative to D1) |

See [.env.example](.env.example) for all options.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│                 │     │         Cloudflare Edge              │
│   Vercel        │     │  ┌─────────────┐  ┌──────────────┐  │
│   (Next.js)     │────▶│  │ Sync Worker │  │Analytics     │  │
│                 │     │  │ + D1 SQLite │  │Worker + D1   │  │
└─────────────────┘     │  └─────────────┘  └──────────────┘  │
                        │  ┌─────────────────────────────────┐ │
                        │  │      Stream Proxy Worker        │ │
                        │  └─────────────────────────────────┘ │
                        └──────────────────────────────────────┘
```

**Why Cloudflare Workers + D1?**
- **Free tier**: 100k requests/day, 5GB D1 storage
- **Global edge**: <50ms latency worldwide
- **No cold starts**: Always warm, instant responses
- **SQLite at edge**: D1 is SQLite, simple and fast

---

## Admin Panel

Access at `/admin` after deployment.

**Default credentials:** `vynx` / `defaultPassword`

⚠️ Change password immediately after first login!

```bash
# Create new admin
npm run admin:create <username> <password>

# Reset password  
npm run admin:reset-password <username> <new-password>
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Edge Database | Cloudflare D1 (SQLite) |
| Deployment | Vercel + Cloudflare Workers |
| API | TMDB |

---

## Project Structure

```
flyx-main/
├── app/                    # Next.js App Router
│   ├── (routes)/          # Page routes
│   ├── admin/             # Admin panel
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── lib/               # Utilities & services
├── cf-analytics-worker/   # Analytics Worker + D1
├── cf-sync-worker/        # Sync Worker + D1
├── cloudflare-proxy/      # Stream proxy worker
├── server/                # Server utilities
└── scripts/               # CLI scripts
```

---

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:init      # Initialize database
npm run db:migrate   # Run migrations
npm run admin:create # Create admin user
```

---

## Credits

- **Movie & TV Data** - [TMDB](https://www.themoviedb.org/)
- **IPTV Help** - [MoldyTaint/Cinephage](https://github.com/MoldyTaint/Cinephage)

## License

MIT License - see [LICENSE](LICENSE)
