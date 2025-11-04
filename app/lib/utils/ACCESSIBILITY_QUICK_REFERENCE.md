# Accessibility Quick Reference

## Common Patterns

### Button with ARIA
```tsx
<button
  onClick={handleClick}
  aria-label="Play video"
  aria-pressed={isPlaying}
  aria-expanded={isMenuOpen}
>
  {isPlaying ? 'Pause' : 'Play'}
</button>
```

### Link with Current Page
```tsx
<a
  href="/home"
  aria-current={isActive ? 'page' : undefined}
>
  Home
</a>
```

### Form Input
```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby={hasError ? 'email-error' : undefined}
/>
{hasError && (
  <div id="email-error" role="alert">
    Invalid email
  </div>
)}
```

### Modal Dialog
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
>
  <h2 id="dialog-title">Dialog Title</h2>
  {/* Content */}
</div>
```

### Screen Reader Only Text
```tsx
<span className="sr-only">
  Additional context for screen readers
</span>
```

### Announce to Screen Readers
```tsx
import { announceToScreenReader } from '@/lib/utils/accessibility';

announceToScreenReader('Action completed', 'polite');
announceToScreenReader('Error occurred', 'assertive');
```

## Keyboard Navigation

### Basic Navigation
```tsx
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';

const { handleKeyDown } = useKeyboardNavigation({
  onEnter: () => handleSelect(),
  onEscape: () => handleClose(),
  onArrowUp: () => moveFocusUp(),
  onArrowDown: () => moveFocusDown(),
});

<div onKeyDown={handleKeyDown}>
  {/* Content */}
</div>
```

### Focus Management
```tsx
import { trapFocus } from '@/lib/utils/accessibility';

useEffect(() => {
  if (isOpen && modalRef.current) {
    const cleanup = trapFocus(modalRef.current);
    return cleanup;
  }
}, [isOpen]);
```

## Reduced Motion

### Using Hook
```tsx
import { useAccessibility } from '@/lib/hooks/useAccessibility';

const { shouldAnimate } = useAccessibility();

<motion.div
  animate={shouldAnimate ? { scale: 1.1 } : {}}
>
  Content
</motion.div>
```

### Using CSS
```css
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    transition: none;
  }
}
```

## Contrast Checking

```tsx
import { getContrastRatio, meetsContrastRequirement } from '@/lib/utils/accessibility';

const ratio = getContrastRatio('#ffffff', '#0a0a0f');
const isAccessible = meetsContrastRequirement(ratio, 'normal'); // 4.5:1
const isAccessibleLarge = meetsContrastRequirement(ratio, 'large'); // 3:1
```

## Focus Indicators

All interactive elements automatically get focus indicators. To customize:

```css
.my-button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.2);
}
```

## Checklist

- [ ] All images have alt text
- [ ] All buttons have accessible names
- [ ] All form inputs have labels
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA
- [ ] Reduced motion is supported
- [ ] Semantic HTML is used
- [ ] ARIA attributes are correct
- [ ] Screen reader tested
