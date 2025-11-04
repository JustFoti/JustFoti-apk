# Content Display Components

This directory contains components for displaying movies and TV shows with futuristic UI effects.

## Components

### ContentCard
A 3D card component for displaying individual movies/TV shows.

**Features:**
- 3D tilt effects on hover
- Lazy-loaded images with blur-up placeholders
- Rating display with circular progress
- Media type badges
- Smooth animations
- Intersection Observer for analytics tracking

**Usage:**
```tsx
import { ContentCard } from '@/components/content';

<ContentCard
  item={mediaItem}
  onSelect={(id) => router.push(`/details/${id}`)}
  priority={false}
/>
```

### ContentGrid
Responsive grid layout for displaying multiple content cards.

**Features:**
- Responsive grid with auto-fit columns
- Infinite scroll support
- Progressive loading for performance
- Loading skeleton states
- Empty state handling
- Smooth animations

**Usage:**
```tsx
import { ContentGrid } from '@/components/content';

<ContentGrid
  items={movies}
  onItemSelect={(id) => router.push(`/details/${id}`)}
  onLoadMore={loadMoreMovies}
  hasMore={hasMore}
  loading={loading}
/>
```

### HeroSection
Large featured content display with parallax effects.

**Features:**
- Parallax backdrop image
- Multiple gradient overlays
- Smooth animations
- Call-to-action buttons
- Responsive design
- Mouse parallax effects

**Usage:**
```tsx
import { HeroSection } from '@/components/content';

<HeroSection
  item={featuredMovie}
  onPlay={(id) => router.push(`/watch/${id}`)}
  onMoreInfo={(id) => router.push(`/details/${id}`)}
/>
```

### CategoryRow
Horizontal scrolling row of content cards.

**Features:**
- Smooth horizontal scrolling
- Navigation arrows
- Snap scrolling
- Touch/swipe support
- Keyboard navigation
- Gradient fade edges

**Usage:**
```tsx
import { CategoryRow } from '@/components/content';

<CategoryRow
  title="Trending Movies"
  items={trendingMovies}
  onItemSelect={(id) => router.push(`/details/${id}`)}
  onViewAll={() => router.push('/trending')}
/>
```

## Performance Optimizations

1. **Lazy Loading**: Images are lazy-loaded using Intersection Observer
2. **Progressive Rendering**: ContentGrid loads items in batches
3. **Virtual Scrolling**: Only visible items are rendered
4. **Image Optimization**: Next.js Image component with responsive sizes
5. **Animation Performance**: Uses GPU-accelerated transforms
6. **Skeleton Loading**: Matching placeholders prevent layout shift

## Accessibility

All components include:
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Semantic HTML
- Reduced motion support
- Screen reader compatibility

## Requirements Satisfied

- **2.1**: 3D transformations and depth effects for Content Cards ✓
- **2.2**: Smooth parallax effects and layered animations ✓
- **4.1**: Responsive grid layout that adapts to viewport ✓
- **4.2**: Virtual scrolling for performance ✓
- **4.3**: Lazy-loading with blur-up placeholders ✓
- **4.4**: Automatic loading with smooth animations ✓
- **5.5**: Skeleton loading states matching final layouts ✓
