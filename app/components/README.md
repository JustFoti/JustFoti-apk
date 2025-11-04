# Components Directory

React components organized by feature and functionality.

## Structure

- **ui/** - Futuristic UI primitives (Card3D, GlassPanel, FluidButton, etc.)
- **content/** - Content display components (ContentCard, ContentGrid, HeroSection)
- **player/** - Video player components (VideoPlayer, Controls, Timeline)
- **search/** - Search functionality components (SearchBar, SearchResults)
- **admin/** - Admin dashboard components (MetricsCard, UsageChart)
- **layout/** - Layout components (Navigation, Footer, PageTransition)

## Path Aliases

Use the `@/components/*` path alias to import components:
```tsx
import { Card3D } from '@/components/ui/Card3D'
import { ContentGrid } from '@/components/content/ContentGrid'
```

## Component Guidelines

- Use TypeScript for all components
- Export component props as interfaces
- Include JSDoc comments for complex components
- Follow composition over inheritance pattern
