# Futuristic UI Primitive Components

A collection of advanced, futuristic UI components built with React, TypeScript, and Framer Motion. These components provide cutting-edge visual effects while maintaining accessibility and performance.

## Components

### Card3D

A card component with 3D tilt effects that respond to mouse movement.

**Features:**
- Mouse-tracking 3D transforms with spring physics
- Layered depth with parallax effects
- Dynamic glow effects on hover
- Customizable intensity and glow color
- Fully keyboard accessible

**Usage:**
```tsx
import { Card3D } from '@/app/components/ui';

<Card3D
  intensity={15}
  glowColor="rgba(0, 245, 255, 0.4)"
  onClick={() => console.log('clicked')}
  ariaLabel="Featured content card"
>
  <div className="p-6">
    <h3>Card Content</h3>
    <p>Your content here</p>
  </div>
</Card3D>
```

**Props:**
- `children`: React.ReactNode - Card content
- `className?`: string - Additional CSS classes
- `intensity?`: number - 3D tilt intensity (default: 15)
- `glowColor?`: string - Glow effect color
- `disabled?`: boolean - Disable interactions
- `onClick?`: () => void - Click handler
- `tabIndex?`: number - Tab order
- `role?`: string - ARIA role
- `ariaLabel?`: string - Accessibility label

---

### GlassPanel

A glassmorphism panel with customizable blur, opacity, and effects.

**Features:**
- Customizable backdrop blur intensity
- Gradient border effects
- Ambient lighting
- Noise texture for depth
- Smooth entrance animations

**Usage:**
```tsx
import { GlassPanel } from '@/app/components/ui';

<GlassPanel
  blur="xl"
  opacity={0.05}
  borderGlow={true}
  gradient={true}
  rounded="2xl"
  shadow="lg"
>
  <h2>Panel Title</h2>
  <p>Panel content with glassmorphism effect</p>
</GlassPanel>
```

**Props:**
- `children`: React.ReactNode - Panel content
- `className?`: string - Additional CSS classes
- `blur?`: 'sm' | 'md' | 'lg' | 'xl' - Backdrop blur intensity
- `opacity?`: number - Background opacity (0-1)
- `borderGlow?`: boolean - Enable gradient border glow
- `gradient?`: boolean - Enable gradient overlay
- `padding?`: string - Padding classes
- `rounded?`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' - Border radius
- `shadow?`: 'sm' | 'md' | 'lg' | 'xl' - Shadow size
- `role?`: string - ARIA role
- `ariaLabel?`: string - Accessibility label

---

### FluidButton

A button with magnetic hover effects and ripple animations.

**Features:**
- Magnetic hover (button follows cursor)
- Ripple animation on click
- Multiple variants (primary, secondary, accent, ghost)
- Loading state with spinner
- Shimmer effect
- Fully accessible

**Usage:**
```tsx
import { FluidButton } from '@/app/components/ui';

<FluidButton
  variant="primary"
  size="md"
  onClick={() => console.log('clicked')}
  magneticStrength={0.3}
  ariaLabel="Submit form"
>
  Click Me
</FluidButton>

<FluidButton
  variant="secondary"
  loading={true}
  disabled={false}
>
  Loading...
</FluidButton>
```

**Props:**
- `children`: React.ReactNode - Button content
- `onClick?`: () => void - Click handler
- `className?`: string - Additional CSS classes
- `variant?`: 'primary' | 'secondary' | 'accent' | 'ghost' - Button style
- `size?`: 'sm' | 'md' | 'lg' - Button size
- `disabled?`: boolean - Disable button
- `loading?`: boolean - Show loading spinner
- `magneticStrength?`: number - Magnetic effect intensity (default: 0.3)
- `rippleColor?`: string - Ripple effect color
- `type?`: 'button' | 'submit' | 'reset' - Button type
- `ariaLabel?`: string - Accessibility label
- `fullWidth?`: boolean - Full width button

---

### ParallaxContainer & ParallaxLayer

Container and layers for creating parallax depth effects.

**Features:**
- Scroll-based parallax
- Mouse-tracking parallax (optional)
- Multiple layers with different speeds
- Smooth spring animations
- Respects reduced motion preferences

**Usage:**
```tsx
import { ParallaxContainer, ParallaxLayer } from '@/app/components/ui';

<ParallaxContainer
  height="min-h-screen"
  enableMouseParallax={true}
  mouseStrength={20}
>
  <ParallaxLayer speed={0.5} zIndex={0}>
    <div>Background layer (slow)</div>
  </ParallaxLayer>
  
  <ParallaxLayer speed={1} zIndex={1}>
    <div>Middle layer (normal)</div>
  </ParallaxLayer>
  
  <ParallaxLayer speed={1.5} zIndex={2}>
    <div>Foreground layer (fast)</div>
  </ParallaxLayer>
</ParallaxContainer>
```

**ParallaxContainer Props:**
- `children`: React.ReactNode - Parallax layers
- `className?`: string - Additional CSS classes
- `height?`: string - Container height
- `enableMouseParallax?`: boolean - Enable mouse tracking
- `mouseStrength?`: number - Mouse parallax intensity
- `role?`: string - ARIA role
- `ariaLabel?`: string - Accessibility label

**ParallaxLayer Props:**
- `children`: React.ReactNode - Layer content
- `speed?`: number - Parallax speed multiplier (default: 1)
- `className?`: string - Additional CSS classes
- `zIndex?`: number - Layer stacking order

**Custom Hook:**
```tsx
import { useParallax } from '@/app/components/ui';

const { ref, y } = useParallax(1.5);

<motion.div ref={ref} style={{ y }}>
  Custom parallax element
</motion.div>
```

---

### AnimatedGrid & AnimatedGridItem

A responsive grid with smooth layout transitions and staggered animations.

**Features:**
- Responsive column configuration
- Staggered entrance animations
- Smooth layout transitions
- Automatic reordering animations
- Respects reduced motion preferences

**Usage:**
```tsx
import { AnimatedGrid, AnimatedGridItem } from '@/app/components/ui';

<AnimatedGrid
  columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
  gap="gap-6"
  staggerDelay={0.05}
  animateOnMount={true}
>
  {items.map((item) => (
    <AnimatedGridItem key={item.id} layoutId={item.id}>
      <Card3D>
        <div>{item.content}</div>
      </Card3D>
    </AnimatedGridItem>
  ))}
</AnimatedGrid>
```

**AnimatedGrid Props:**
- `children`: React.ReactNode - Grid items
- `className?`: string - Additional CSS classes
- `columns?`: { sm?, md?, lg?, xl? } - Responsive columns
- `gap?`: string - Gap between items
- `staggerDelay?`: number - Delay between item animations
- `animateOnMount?`: boolean - Animate on initial render
- `layoutId?`: string - Layout group ID
- `role?`: string - ARIA role
- `ariaLabel?`: string - Accessibility label

**AnimatedGridItem Props:**
- `children`: React.ReactNode - Item content
- `className?`: string - Additional CSS classes
- `hoverScale?`: number - Scale on hover (default: 1.02)
- `tapScale?`: number - Scale on tap (default: 0.98)
- `layoutId?`: string - Unique layout ID for animations

---

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:

- **Keyboard Navigation**: All interactive components are keyboard accessible
- **ARIA Labels**: Proper ARIA attributes for screen readers
- **Focus Indicators**: Visible focus states for keyboard navigation
- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **Semantic HTML**: Proper HTML structure and roles

## Performance

- **Optimized Animations**: Uses GPU-accelerated transforms
- **Spring Physics**: Natural, performant animations with Framer Motion
- **Lazy Evaluation**: Effects only run when needed
- **Memory Efficient**: Proper cleanup of event listeners and timers

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- React 18+
- Framer Motion 12+
- TypeScript 5+

## Examples

See the component files for detailed implementation examples and TypeScript types.
