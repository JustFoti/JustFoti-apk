# Flyx 2.0 - Project Structure

## Overview

Flyx 2.0 is a cutting-edge streaming platform built with Bun runtime, Next.js 14, and TypeScript. The architecture prioritizes performance, modularity, and visual excellence.

## Technology Stack

- **Runtime**: Bun 1.1.38 (3x faster than Node.js)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS + CSS Modules + Framer Motion
- **State Management**: Zustand + React Context
- **Database**: SQLite (via Bun:sqlite)
- **Video**: HLS.js with custom controls

## Directory Structure

```
flyx/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── content/              # Content API endpoints
│   │   │   ├── trending/
│   │   │   ├── search/
│   │   │   └── details/
│   │   ├── stream/               # Streaming API
│   │   │   └── extract/
│   │   └── analytics/            # Analytics API
│   │       ├── track/
│   │       ├── metrics/
│   │       └── export/
│   ├── components/               # React components
│   │   ├── ui/                   # UI primitives
│   │   ├── content/              # Content display
│   │   ├── player/               # Video player
│   │   ├── search/               # Search functionality
│   │   ├── admin/                # Admin dashboard
│   │   └── layout/               # Layout components
│   ├── lib/                      # Core utilities
│   │   ├── services/             # API adapters
│   │   ├── hooks/                # Custom hooks
│   │   ├── store/                # State management
│   │   ├── utils/                # Utility functions
│   │   └── db/                   # Database layer
│   ├── types/                    # TypeScript types
│   │   ├── media.ts
│   │   ├── analytics.ts
│   │   └── api.ts
│   ├── styles/                   # Additional styles
│   └── globals.css               # Global styles
├── server/                       # Server-side code
│   ├── middleware/               # Custom middleware
│   └── db/                       # SQLite database
├── public/                       # Static assets
├── .kiro/                        # Kiro specs
│   └── specs/
│       └── flyx-complete-redesign/
├── bunfig.toml                   # Bun configuration
├── next.config.js                # Next.js config
├── tailwind.config.ts            # Tailwind config
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependencies

```

## Path Aliases

TypeScript path aliases are configured for clean imports:

```typescript
@/*              → ./*
@/components/*   → ./app/components/*
@/lib/*          → ./app/lib/*
@/types/*        → ./app/types/*
@/styles/*       → ./app/styles/*
@/utils/*        → ./app/utils/*
@/hooks/*        → ./app/hooks/*
@/services/*     → ./app/services/*
```

## Scripts

```bash
# Development (with Bun)
bun run dev

# Production build
bun run build
bun run start

# Type checking
bun run type-check

# Linting
bun run lint

# Testing
bun test
bun test --watch
```

## Configuration Files

### TypeScript (tsconfig.json)
- Strict mode enabled
- Path aliases configured
- Module resolution: bundler (optimized for Bun)

### Next.js (next.config.js)
- Image optimization (WebP, AVIF)
- SWC minification
- Optimized package imports
- Console removal in production

### Tailwind (tailwind.config.ts)
- Custom futuristic theme
- Neon color palette
- Custom animations
- Glassmorphism utilities

### Bun (bunfig.toml)
- Exact version installs
- Peer dependency auto-install
- Test configuration

## Development Guidelines

1. **TypeScript**: Use strict typing for all code
2. **Components**: Follow composition pattern
3. **Imports**: Use path aliases for clean imports
4. **Styling**: Prefer Tailwind utilities, use CSS modules for complex styles
5. **State**: Use Zustand for global state, Context for feature-specific state
6. **Performance**: Code split heavy components, lazy load images
7. **Accessibility**: Include ARIA labels, keyboard navigation

## Next Steps

Follow the implementation plan in `.kiro/specs/flyx-complete-redesign/tasks.md` to build out the application features.
