# Layout Components

Futuristic navigation and layout system for Flyx 2.0 with glassmorphism, magnetic hover effects, and smooth transitions.

## Components

### Navigation

A responsive navigation component with glassmorphism effects, scroll-based styling, and mobile-optimized bottom navigation.

**Features:**
- Glassmorphism with backdrop blur
- Scroll-triggered opacity and background changes
- Magnetic hover effects on navigation items
- Mobile-responsive with bottom navigation bar
- Integrated search functionality
- Route prefetching for instant navigation
- Keyboard accessible (ARIA labels, focus indicators)
- Reduced motion support

**Usage:**
```tsx
import { Navigation } from '@/app/components/layout';

<Navigation 
  transparent={true}
  onSearch={(query) => console.log('Search:', query)}
/>
```

**Props:**
- `transparent` (boolean, optional): Start with transparent background
- `onSearch` (function, optional): Callback for search submissions

### Footer

A futuristic footer component with animated backgrounds, social links, and tech stack badges.

**Features:**
- Glassmorphism styling
- Animated gradient orbs and grid patterns
- Social media links with hover effects
- Tech stack badges
- System status indicator
- Responsive layout
- Accessibility compliant

**Usage:**
```tsx
import { Footer } from '@/app/components/layout';

<Footer />
```

### PageTransition

A page transition component using View Transitions API with Framer Motion fallback.

**Features:**
- View Transitions API for supported browsers
- Framer Motion fallback for older browsers
- Smooth fade and scale animations
- Automatic route change detection
- Reduced motion support

**Usage:**
```tsx
import { PageTransition } from '@/app/components/layout';

<PageTransition>
  {children}
</PageTransition>
```

**Hook:**
```tsx
import { useViewTransition } from '@/app/components/layout';

const { startTransition } = useViewTransition();

startTransition(() => {
  // Your state update or navigation
});
```

## Hooks

### useMediaQuery

Detects media query matches for responsive behavior.

```tsx
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from '@/app/lib/hooks/useMediaQuery';

const isMobile = useIsMobile(); // max-width: 768px
const isTablet = useIsTablet(); // 769px - 1024px
const isDesktop = useIsDesktop(); // min-width: 1025px
const isCustom = useMediaQuery('(min-width: 1200px)');
```

### useScrollPosition

Tracks scroll position and detects scroll thresholds.

```tsx
import { useScrollPosition, useIsScrolled } from '@/app/lib/hooks/useScrollPosition';

const { x, y } = useScrollPosition(100); // throttle 100ms
const isScrolled = useIsScrolled(50); // threshold 50px
```

## Styling

All components use CSS Modules for scoped styling with futuristic design tokens:

- **Colors**: Neon cyan, purple, pink gradients
- **Effects**: Glassmorphism, magnetic hover, glow effects
- **Animations**: Smooth cubic-bezier transitions
- **Accessibility**: Focus indicators, reduced motion support

## Requirements Satisfied

- **1.2**: Interactions respond within 16ms (visual feedback)
- **1.3**: Page transitions complete within 200ms
- **2.4**: Fluid page transitions with physics-based animations
- **7.1**: Mobile-first responsive design
- **11.1**: View Transitions API with fallback
- **11.3**: Route prefetching on hover

## Browser Support

- **Modern browsers**: Full View Transitions API support
- **Older browsers**: Framer Motion fallback
- **Mobile**: Touch-optimized with bottom navigation
- **Accessibility**: WCAG 2.1 Level AA compliant
