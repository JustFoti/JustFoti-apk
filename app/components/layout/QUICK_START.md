# Quick Start Guide - Layout System

## Installation

The layout system is already installed and ready to use. All dependencies are included in the project.

## Basic Usage

### 1. Import Components

```tsx
import { Navigation, Footer, PageTransition } from '@/app/components/layout';
```

### 2. Create a Layout

```tsx
// app/layout.tsx or any layout file
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <PageTransition>
          {children}
        </PageTransition>
        <Footer />
      </body>
    </html>
  );
}
```

### 3. Add Search Functionality (Optional)

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Navigation, Footer, PageTransition } from '@/app/components/layout';

export default function Layout({ children }) {
  const router = useRouter();

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <>
      <Navigation onSearch={handleSearch} />
      <PageTransition>
        {children}
      </PageTransition>
      <Footer />
    </>
  );
}
```

### 4. Transparent Navigation (For Hero Sections)

```tsx
<Navigation transparent={true} />
```

## Common Patterns

### Pattern 1: Standard Page Layout

```tsx
import { Navigation, Footer, PageTransition } from '@/app/components/layout';

export default function StandardLayout({ children }) {
  return (
    <>
      <Navigation />
      <main style={{ minHeight: '100vh', paddingTop: '80px' }}>
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <Footer />
    </>
  );
}
```

### Pattern 2: Hero Page Layout (Transparent Nav)

```tsx
import { Navigation, Footer, PageTransition } from '@/app/components/layout';

export default function HeroLayout({ children }) {
  return (
    <>
      <Navigation transparent={true} />
      <PageTransition>
        {children}
      </PageTransition>
      <Footer />
    </>
  );
}
```

### Pattern 3: With Search Handler

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Navigation, Footer, PageTransition } from '@/app/components/layout';

export default function SearchableLayout({ children }) {
  const router = useRouter();

  const handleSearch = (query: string) => {
    // Option 1: Navigate to search page
    router.push(`/search?q=${encodeURIComponent(query)}`);
    
    // Option 2: Update state and filter content
    // setSearchQuery(query);
    
    // Option 3: Call API and show results
    // fetchSearchResults(query);
  };

  return (
    <>
      <Navigation onSearch={handleSearch} />
      <PageTransition>
        {children}
      </PageTransition>
      <Footer />
    </>
  );
}
```

## Using Hooks

### useMediaQuery

```tsx
import { useIsMobile, useIsTablet, useIsDesktop } from '@/app/lib/hooks/useMediaQuery';

function MyComponent() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  return (
    <div>
      {isMobile && <MobileView />}
      {isTablet && <TabletView />}
      {isDesktop && <DesktopView />}
    </div>
  );
}
```

### useScrollPosition

```tsx
import { useIsScrolled, useScrollPosition } from '@/app/lib/hooks/useScrollPosition';

function MyComponent() {
  const isScrolled = useIsScrolled(100); // threshold: 100px
  const { x, y } = useScrollPosition();

  return (
    <div className={isScrolled ? 'scrolled' : ''}>
      Scroll position: {y}px
    </div>
  );
}
```

### useViewTransition

```tsx
import { useViewTransition } from '@/app/components/layout';

function MyComponent() {
  const { startTransition } = useViewTransition();

  const handleUpdate = () => {
    startTransition(() => {
      // Your state update or navigation
      setData(newData);
    });
  };

  return <button onClick={handleUpdate}>Update</button>;
}
```

## Styling

### Adjusting Navigation Height

The navigation has a default height. If you need to adjust spacing:

```css
/* For pages with navigation */
main {
  padding-top: 80px; /* Navigation height */
}

/* For pages with transparent navigation */
main {
  padding-top: 0;
}
```

### Customizing Colors

The layout uses CSS custom properties. Override them in your global CSS:

```css
:root {
  --neon-cyan: #00f5ff;
  --neon-purple: #8b5cf6;
  --neon-pink: #f471b5;
  /* Add your custom colors */
}
```

### Mobile Bottom Navigation Spacing

On mobile, add padding to avoid content being hidden by bottom nav:

```css
@media (max-width: 768px) {
  main {
    padding-bottom: 80px; /* Bottom nav height */
  }
}
```

## Troubleshooting

### Issue: Navigation overlaps content

**Solution**: Add padding-top to your main content:
```css
main {
  padding-top: 80px;
}
```

### Issue: Page transitions not working

**Solution**: Ensure PageTransition wraps your content and you're using Next.js App Router:
```tsx
<PageTransition>
  {children}
</PageTransition>
```

### Issue: Mobile menu not closing

**Solution**: The menu closes automatically on route change. If using custom navigation, ensure you're using Next.js router.

### Issue: Search not working

**Solution**: Make sure you've provided the onSearch callback:
```tsx
<Navigation onSearch={(query) => console.log(query)} />
```

### Issue: Hooks causing hydration errors

**Solution**: Use hooks only in client components:
```tsx
'use client';

import { useIsMobile } from '@/app/lib/hooks/useMediaQuery';
```

## Performance Tips

1. **Use transparent navigation sparingly**: Only on hero sections
2. **Throttle scroll handlers**: Already done in hooks (100ms)
3. **Lazy load heavy content**: Use React.lazy() for large components
4. **Optimize images**: Use Next.js Image component
5. **Minimize re-renders**: Use React.memo() for static components

## Accessibility Checklist

- [ ] Navigation is keyboard accessible (Tab, Enter, Escape)
- [ ] All interactive elements have focus indicators
- [ ] ARIA labels are present on icon buttons
- [ ] Color contrast meets WCAG AA standards
- [ ] Reduced motion is respected
- [ ] Screen reader tested

## Browser Testing

Test in these browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Next Steps

1. Integrate layout into your app
2. Customize search functionality
3. Add additional navigation links
4. Customize footer content
5. Test on different devices
6. Run accessibility audit

## Support

For issues or questions:
1. Check the README.md for detailed documentation
2. Review IMPLEMENTATION.md for technical details
3. See examples.tsx for usage examples
4. Check COMPONENT_STRUCTURE.md for architecture

## Examples

See `app/components/layout/examples.tsx` for complete working examples:
- BasicLayoutExample
- TransparentNavExample
- SearchLayoutExample
- TransitionLayoutExample
- CompleteLayoutExample (recommended)

## Quick Reference

```tsx
// Minimal setup
import { Navigation, Footer } from '@/app/components/layout';

<Navigation />
<main>{children}</main>
<Footer />

// With transitions
import { Navigation, Footer, PageTransition } from '@/app/components/layout';

<Navigation />
<PageTransition>{children}</PageTransition>
<Footer />

// Full featured
import { Navigation, Footer, PageTransition } from '@/app/components/layout';

<Navigation transparent={true} onSearch={handleSearch} />
<PageTransition>{children}</PageTransition>
<Footer />
```

That's it! You're ready to use the layout system. 🚀
