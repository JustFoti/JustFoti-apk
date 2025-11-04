# Mobile Optimization Guide

## Overview

This guide documents all mobile optimizations implemented in Flyx 2.0, including responsive design, touch interactions, gesture controls, and viewport-based asset optimization.

## Table of Contents

1. [Responsive Design System](#responsive-design-system)
2. [Touch Optimizations](#touch-optimizations)
3. [Gesture Controls](#gesture-controls)
4. [Mobile-Optimized Components](#mobile-optimized-components)
5. [Viewport-Based Asset Optimization](#viewport-based-asset-optimization)
6. [Testing Across Breakpoints](#testing-across-breakpoints)

## Responsive Design System

### Breakpoints

```css
--breakpoint-xs: 320px   /* Extra small mobile */
--breakpoint-sm: 640px   /* Small mobile */
--breakpoint-md: 768px   /* Tablet */
--breakpoint-lg: 1024px  /* Desktop */
--breakpoint-xl: 1280px  /* Large desktop */
--breakpoint-2xl: 1536px /* Extra large desktop */
```

### Mobile-First Approach

All styles are written mobile-first, with progressive enhancement for larger screens:

```css
/* Base styles for mobile */
.element {
  font-size: 1rem;
  padding: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .element {
    font-size: 1.125rem;
    padding: 1.5rem;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .element {
    font-size: 1.25rem;
    padding: 2rem;
  }
}
```

### Safe Area Insets

Support for notched devices (iPhone X and later):

```css
.element {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

## Touch Optimizations

### Touch-Friendly Tap Targets

All interactive elements meet the minimum 44x44px touch target size:

```tsx
import { useTouchOptimization } from '@/app/lib/hooks/useTouchOptimization';

function MyComponent() {
  const { triggerHaptic } = useTouchOptimization({
    preventDoubleTapZoom: true,
    preventContextMenu: true,
    enableFastClick: true,
    hapticFeedback: true,
  });

  const handleTap = () => {
    triggerHaptic('light');
    // Handle tap
  };

  return <button onClick={handleTap}>Tap Me</button>;
}
```

### Preventing Default Mobile Behaviors

- **Double-tap zoom**: Prevented on interactive elements
- **Context menu**: Disabled on long press
- **Fast click**: Enabled via `touch-action: manipulation`
- **Overscroll bounce**: Contained with `overscroll-behavior`

## Gesture Controls

### Using the Gesture Hook

```tsx
import { useGestures } from '@/app/lib/hooks/useGestures';

function VideoPlayer() {
  const gestures = useGestures({
    onSwipeLeft: () => console.log('Swipe left'),
    onSwipeRight: () => console.log('Swipe right'),
    onSwipeUp: () => console.log('Swipe up'),
    onSwipeDown: () => console.log('Swipe down'),
    onPinchIn: (scale) => console.log('Pinch in', scale),
    onPinchOut: (scale) => console.log('Pinch out', scale),
    onDoubleTap: () => console.log('Double tap'),
    onLongPress: () => console.log('Long press'),
  }, {
    swipeThreshold: 50,
    pinchThreshold: 0.1,
    doubleTapDelay: 300,
    longPressDelay: 500,
  });

  return (
    <div
      onTouchStart={gestures.onTouchStart}
      onTouchMove={gestures.onTouchMove}
      onTouchEnd={gestures.onTouchEnd}
    >
      {/* Content */}
    </div>
  );
}
```

### Video Player Gestures

The video player supports:

- **Double tap**: Play/pause
- **Horizontal swipe**: Seek forward/backward
- **Vertical swipe (right side)**: Volume control
- **Pinch**: Zoom (in fullscreen)

## Mobile-Optimized Components

### Navigation

**Desktop**: Horizontal navigation with hover effects
**Mobile**: Bottom navigation bar with touch-optimized icons

```tsx
import { Navigation } from '@/app/components/layout/Navigation';

<Navigation transparent={false} onSearch={handleSearch} />
```

Features:
- Sticky bottom navigation on mobile
- Touch-friendly 44x44px tap targets
- Haptic feedback on tap
- Safe area inset support

### Content Grid

**Desktop**: 4-6 columns with hover effects
**Tablet**: 3-4 columns
**Mobile**: 2 columns with optimized spacing

```tsx
import { ResponsiveContentGrid } from '@/app/components/content/ResponsiveContentGrid';

<ResponsiveContentGrid
  items={movies}
  onItemSelect={handleSelect}
  loading={isLoading}
/>
```

Features:
- Automatic column adjustment
- Touch-optimized card interactions
- Lazy loading with intersection observer
- Skeleton loading states

### Video Player Controls

**Desktop**: Full control bar with hover menus
**Mobile**: Simplified controls with touch gestures

Features:
- Touch-friendly 44x44px buttons
- Gesture-based seeking and volume
- Landscape orientation support
- Safe area inset support

### Mobile Layout Wrapper

```tsx
import { MobileLayout } from '@/app/components/layout/MobileLayout';

<MobileLayout hasBottomNav={true} hasTopNav={true}>
  {children}
</MobileLayout>
```

Features:
- Automatic safe area handling
- Bottom navigation spacing
- Viewport height optimization
- Touch optimization

## Viewport-Based Asset Optimization

### Responsive Images

```tsx
import {
  getOptimalImageSize,
  generateSrcSet,
  generateSizes,
  getAdaptiveQuality,
} from '@/app/lib/utils/responsive-images';

// Get optimal size for current viewport
const imageSize = getOptimalImageSize(window.innerWidth);

// Generate srcset for responsive images
const srcSet = generateSrcSet(imageUrl, [320, 640, 768, 1024, 1280, 1920]);

// Generate sizes attribute
const sizes = generateSizes([
  { maxWidth: '640px', size: '100vw' },
  { maxWidth: '768px', size: '50vw' },
  { maxWidth: '1024px', size: '33vw' },
], '25vw');

// Adaptive quality based on connection speed
const quality = getAdaptiveQuality(); // 50-80 based on network
```

### Image Optimization Features

- **Format detection**: WebP/AVIF support detection
- **Device pixel ratio**: Automatic DPR adjustment (max 2x)
- **Connection-aware**: Lower quality on slow connections
- **Data saver mode**: Respect `saveData` preference
- **Lazy loading**: Intersection observer-based
- **Blur-up placeholders**: LQIP for smooth loading

### Preloading Critical Images

```tsx
import { preloadImage } from '@/app/lib/utils/responsive-images';

// Preload hero image
await preloadImage('/hero.jpg', 'high');

// Preload above-the-fold images
await Promise.all([
  preloadImage('/poster1.jpg', 'high'),
  preloadImage('/poster2.jpg', 'high'),
]);
```

## Testing Across Breakpoints

### Device Testing Checklist

#### Mobile (320px - 768px)
- [ ] Touch targets are at least 44x44px
- [ ] Text is readable without zooming (min 16px)
- [ ] Bottom navigation is accessible
- [ ] Gestures work correctly
- [ ] Safe area insets are respected
- [ ] Landscape orientation works
- [ ] No horizontal scrolling

#### Tablet (769px - 1024px)
- [ ] Layout adapts appropriately
- [ ] Touch targets remain accessible
- [ ] Content grid shows 3-4 columns
- [ ] Navigation is usable
- [ ] Video player controls are accessible

#### Desktop (1025px+)
- [ ] Hover effects work
- [ ] Keyboard navigation works
- [ ] Content grid shows 4-6 columns
- [ ] All features are accessible
- [ ] No mobile-specific UI elements

### Browser Testing

Test on:
- **iOS Safari** (iPhone, iPad)
- **Chrome Mobile** (Android)
- **Samsung Internet** (Android)
- **Firefox Mobile** (Android)
- **Desktop browsers** (Chrome, Firefox, Safari, Edge)

### Orientation Testing

- [ ] Portrait mode works correctly
- [ ] Landscape mode adapts layout
- [ ] Video player optimizes for landscape
- [ ] Navigation remains accessible
- [ ] Content is readable in both orientations

### Network Testing

Test on different connection speeds:
- [ ] 4G: Full quality images
- [ ] 3G: Reduced quality (65%)
- [ ] 2G: Low quality (50%)
- [ ] Data saver mode: Minimal data usage

### Accessibility Testing

- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] Focus indicators visible
- [ ] Sufficient color contrast (4.5:1)
- [ ] Reduced motion support
- [ ] Touch target size compliance

## Performance Metrics

Target metrics for mobile:

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### Optimization Techniques

1. **Code splitting**: Route-based and component-based
2. **Lazy loading**: Images and below-the-fold content
3. **Virtual scrolling**: For long lists
4. **Request deduplication**: Prevent duplicate API calls
5. **Service worker**: Offline support and caching
6. **Bundle optimization**: Tree-shaking and minification

## Common Issues and Solutions

### Issue: Double-tap zoom on buttons

**Solution**: Use `touch-action: manipulation` and prevent default on double-tap

```css
button {
  touch-action: manipulation;
}
```

### Issue: Viewport height on mobile browsers

**Solution**: Use dynamic viewport height (dvh)

```css
.fullscreen {
  height: 100vh;
  height: 100dvh; /* Fallback for browsers that support it */
}
```

### Issue: Horizontal scrolling on mobile

**Solution**: Ensure all content respects viewport width

```css
* {
  max-width: 100%;
  overflow-x: hidden;
}
```

### Issue: Input zoom on iOS

**Solution**: Set font-size to at least 16px

```css
input {
  font-size: 16px !important;
}
```

### Issue: Sticky elements and safe areas

**Solution**: Combine sticky positioning with safe area insets

```css
.sticky-header {
  position: sticky;
  top: env(safe-area-inset-top);
}
```

## Best Practices

1. **Always test on real devices**, not just emulators
2. **Use mobile-first CSS** for better performance
3. **Optimize images** for different screen sizes
4. **Implement touch gestures** for better UX
5. **Respect user preferences** (reduced motion, data saver)
6. **Ensure accessibility** on all devices
7. **Monitor performance** with real user metrics
8. **Test on slow networks** to ensure usability

## Resources

- [MDN: Mobile Web Development](https://developer.mozilla.org/en-US/docs/Web/Guide/Mobile)
- [Web.dev: Mobile Performance](https://web.dev/mobile/)
- [Apple: Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Material Design: Mobile](https://material.io/design/platform-guidance/android-mobile.html)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
