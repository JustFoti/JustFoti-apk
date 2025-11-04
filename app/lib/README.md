# Library Directory

Core utilities, services, and business logic for the Flyx application.

## Structure

- **services/** - External API adapters (TMDB, extractor, analytics)
- **hooks/** - Custom React hooks for common functionality
- **store/** - Zustand state management stores
- **utils/** - Utility functions and helpers
- **db/** - Database schema, queries, and migrations

## Path Aliases

Use the `@/lib/*` path alias to import from this directory:
```tsx
import { tmdbService } from '@/lib/services/tmdb'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
```
