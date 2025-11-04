# Server Directory

Server-side code for Bun runtime, including middleware and database management.

## Structure

- **middleware/** - Custom middleware (auth, analytics, cache)
- **db/** - SQLite database files and management

## Bun Runtime

This application is optimized to run with Bun runtime for maximum performance:

```bash
# Development
bun --bun next dev

# Production build
bun --bun next build
bun --bun next start
```

## Database

The application uses SQLite via Bun:sqlite for analytics and caching:
- Zero-overhead database access
- Embedded database (no separate server needed)
- Fast read/write operations
