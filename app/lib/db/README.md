# Database Layer

This directory contains the cross-platform SQLite database implementation for the FlyX analytics system.

## Architecture

The database layer automatically detects the runtime environment and uses the appropriate SQLite implementation:

- **Development (Bun)**: Uses `bun:sqlite` for optimal performance
- **Production (Node.js)**: Uses `better-sqlite3` for compatibility

## Files

- `connection.ts` - Database connection management with runtime detection
- `schema.ts` - Table definitions and schema versioning
- `migrations.ts` - Database migration system
- `queries.ts` - Pre-built query functions for common operations

## Features

- ✅ Cross-platform compatibility (Bun + Node.js)
- ✅ Automatic runtime detection
- ✅ Transaction support
- ✅ Migration system
- ✅ Connection pooling
- ✅ Error handling
- ✅ Health checks

## Usage

```typescript
import { initializeDB, getDB } from './connection';

// Initialize database
await initializeDB();

// Get database instance
const db = getDB();

// Execute queries
const result = db.prepare('SELECT * FROM analytics_events').all();
```

## Environment Variables

No additional environment variables are required. The database file is automatically created in the `data/` directory.

## Deployment

The system automatically switches to `better-sqlite3` when deployed to Node.js environments like Vercel, ensuring compatibility without code changes.