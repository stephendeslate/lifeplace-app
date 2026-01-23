# LifePlace Alfonso Design System
## Modern Organic Luxury

A comprehensive design system for the LifePlace Alfonso event venue, embodying sophisticated, natural luxury through warm, inviting aesthetics that appeal to weddings, corporate events, retreats, and celebrations.

---

## Design Philosophy

**Modern Organic Luxury** balances:
- **Sophistication** without being intimidating
- **Natural elements** without feeling rustic
- **Warmth** without sacrificing professionalism
- **Accessibility** while maintaining premium quality

### Visual Principles
1. **Elegance through simplicity** - Clean layouts, ample whitespace
2. **Natural warmth** - Earth tones, organic shapes
3. **Subtle refinement** - Soft shadows, gentle animations
4. **Hierarchy and clarity** - Clear visual structure

---

## Color System

### Primary Colors

#### Sage (#7D8570)
- **Main brand color** - Sophisticated, natural luxury
- Use for: Primary CTAs, headers when appropriate, brand elements
- Shades: 50-900 available

#### Terracotta (#C87356)
- **Secondary color** - Warmth, celebration, sunset vibes
- Use for: Accent elements, hover states, warm CTAs
- Shades: 50-900 available

#### Soft Gold (#D4A574)
- **Accent color** - Subtle luxury, special elements
- Use for: Highlights, premium features, celebratory elements
- Shades: 50-900 available

### Neutral Colors

#### Warm Cream (#FAF7F2)
- **Primary background**
- Use for: Page backgrounds, cards, sections

#### Warm Gray (#8B8680)
- **Body text**
- Use for: Paragraph text, secondary information

#### Deep Charcoal (#2E2A28)
- **Headings**
- Use for: Headlines, important text, strong contrast

### Supporting Colors

- **Clay** - Additional warmth and variety
- **Olive** - Natural green touches for diversity

### Usage Guidelines

```tsx
import { tokens } from '@/design-system';

// Primary
tokens.color.base.sage[500]        // Main sage
tokens.color.base.terracotta[500]  // Main terracotta
tokens.color.base.gold[500]        // Main gold

// Neutrals
tokens.color.base.neutral[50]      // Warm cream background
tokens.color.base.neutral[500]     // Warm gray text
tokens.color.base.neutral[900]     // Deep charcoal headings
```

---

## Typography

### Font Families

**Headings**: Cormorant Garamond (serif)
- Elegant, refined, luxury feel
- Weights: 300, 400, 500, 600, 700

**Body Text**: Inter (sans-serif)
- Clean, modern, highly readable
- Weights: 300, 400, 500, 600, 700, 800

### Type Scale

```tsx
// Display - Marketing/Hero sections
tokens.typography.styles.display1  // 96px, light, for huge impact
tokens.typography.styles.display2  // 72px, regular, for hero sections

// Headings
tokens.typography.styles.h1  // 60px, semibold
tokens.typography.styles.h2  // 48px, semibold
tokens.typography.styles.h3  // 36px, semibold
tokens.typography.styles.h4  // 30px, medium
tokens.typography.styles.h5  // 24px, medium
tokens.typography.styles.h6  // 20px, medium

// Body
tokens.typography.styles.bodyLarge  // 18px, regular
tokens.typography.styles.body       // 16px, regular
tokens.typography.styles.bodySmall  // 14px, regular
```

### Responsive Typography

All display and heading styles automatically scale for mobile/tablet/desktop using `responsive` styles.

```tsx
// Automatically handles mobile → tablet → desktop scaling
typography.responsive.h1.mobile    // 36px on mobile
typography.responsive.h1.tablet    // 48px on tablet
typography.responsive.h1.desktop   // 60px on desktop
```

### Setup Instructions

Add to your `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

---

## Spacing System

### Base Scale (8px)
```tsx
tokens.spacing.space[0]    // 0px
tokens.spacing.space[1]    // 8px
tokens.spacing.space[2]    // 16px
tokens.spacing.space[3]    // 24px
tokens.spacing.space[4]    // 32px
tokens.spacing.space[6]    // 48px
tokens.spacing.space[8]    // 64px
tokens.spacing.space[12]   // 96px
```

### Semantic Spacing
```tsx
tokens.spacing.space.sm    // 8px
tokens.spacing.space.md    // 16px
tokens.spacing.space.lg    // 24px
tokens.spacing.space.xl    // 32px
tokens.spacing.space.xxl   // 48px
```

### Border Radius
```tsx
tokens.spacing.radius.button      // 8px (modern, subtle)
tokens.spacing.radius.card        // 16px (soft, inviting)
tokens.spacing.radius.cardLarge   // 20px (hero cards)
tokens.spacing.radius.image       // 12px (image containers)
```

---

## Shadows & Depth

### Elevation Shadows
Use for cards, modals, popovers:

```tsx
tokens.shadow.elevation.xs    // Subtle lift
tokens.shadow.elevation.sm    // Small cards
tokens.shadow.elevation.md    // Standard cards
tokens.shadow.elevation.lg    // Floating elements
tokens.shadow.elevation.xl    // Modals, drawers
```

### Specialized Shadows
```tsx
tokens.shadow.elevation.card        // Optimized for card components
tokens.shadow.elevation.cardHover   // Card hover state
tokens.shadow.elevation.image       // For image containers
```

### Focus Rings
```tsx
tokens.shadow.elevation.focusRing             // Default (sage)
tokens.shadow.elevation.focusRingTerracotta   // Warm accent
tokens.shadow.elevation.focusRingGold         // Premium elements
```

---

## Animations & Transitions

### Durations
```tsx
tokens.animation.duration.fast      // 150ms - Quick interactions
tokens.animation.duration.normal    // 300ms - Standard transitions
tokens.animation.duration.slow      // 500ms - Deliberate movements
tokens.animation.duration.hover     // 250ms - Hover states
```

### Easing Curves
```tsx
tokens.animation.transition.organic   // Natural, smooth
tokens.animation.transition.smooth    // Gentle easing
tokens.animation.transition.elevate   // Combined transform + shadow
```

### Animation Presets
```tsx
// Scroll-triggered animations
tokens.animation.animation.fadeIn
tokens.animation.animation.slideUpFade
tokens.animation.animation.zoomIn
tokens.animation.animation.reveal

// Continuous animations
tokens.animation.animation.float
tokens.animation.animation.sway
tokens.animation.animation.pulse
```

---

## Components

### Using Design Tokens in Components

```tsx
import { Box } from '@mui/material';
import { tokens } from '@/design-system';

<Box
  sx={{
    backgroundColor: tokens.color.base.neutral[50],
    color: tokens.color.base.neutral[900],
    padding: tokens.spacing.space[4],
    borderRadius: tokens.spacing.radius.card,
    boxShadow: tokens.shadow.elevation.card,
    transition: tokens.animation.transition.all,
    '&:hover': {
      boxShadow: tokens.shadow.elevation.cardHover,
    },
  }}
>
  Content
</Box>
```

### Component Variants

The design system includes pre-built components:

- **Card** - Clean, modern cards (replacing GlassCard)
- **GradientBackground** - Hero backgrounds with new gradients
- **AnimatedElement** - Scroll-triggered animations
- **ImageWithOverlay** - Images with text overlays
- **Section** - Page section layouts
- **Container** - Content width containers

---

## Gradients

### Primary Gradients
```tsx
tokens.color.gradients.warmSage        // Brand gradient
tokens.color.gradients.sunsetGlow      // Warm, celebratory
tokens.color.gradients.goldenHour      // Luxury accent
```

### Hero/Background Gradients
```tsx
tokens.color.gradients.heroWarm        // Multi-stop warm gradient
tokens.color.gradients.heroNatural     // Subtle natural gradient
tokens.color.gradients.heroSunset      // Evening warmth
```

### Usage
```tsx
<Box sx={{ background: tokens.color.gradients.heroWarm }}>
  Hero Content
</Box>
```

---

## Best Practices

### Color
- ✅ Use sage for primary brand elements
- ✅ Use terracotta for warmth and CTAs
- ✅ Use warm cream backgrounds throughout
- ❌ Don't use more than 3 colors in a single component
- ❌ Avoid pure black or pure white

### Typography
- ✅ Use Cormorant Garamond for headings (elegance)
- ✅ Use Inter for body text (readability)
- ✅ Maintain 1.6 line-height for body text
- ❌ Don't use more than 3 font sizes in a section
- ❌ Avoid all-caps except for small labels

### Spacing
- ✅ Use 8px-based spacing scale
- ✅ Increase spacing generously between sections
- ✅ Use whitespace to create breathing room
- ❌ Don't use arbitrary spacing values
- ❌ Avoid cramming content

### Shadows
- ✅ Use subtle shadows for depth
- ✅ Increase shadow on hover for interactivity
- ❌ Don't use heavy shadows everywhere
- ❌ Avoid glassmorphism except overlays on images

### Animations
- ✅ Use subtle, purposeful animations
- ✅ Animate on user interaction
- ✅ Use scroll-triggered reveals sparingly
- ❌ Don't animate everything
- ❌ Avoid distracting continuous animations

---

## Migration from Old System

### Color Mappings
- `forest` → `sage` (updated to warmer, sophisticated green)
- `earth` → `clay` (refined brown tones)
- `gold` → `gold` (softened, less gaudy)

### Component Updates
- `GlassCard` → Use new `Card` component with subtle shadows
- Heavy glassmorphism → Minimal use, only for image overlays
- Dark green (#2d5016) → Warm sage (#7D8570)

---

## Resources

### Design Tools
- **Figma**: [Design file link]
- **Color Palette**: See tokens/colors.ts
- **Typography**: See tokens/typography.ts

### Inspiration
- Kinfolk aesthetic
- Modern luxury resorts
- Airbnb Luxe
- The Knot wedding platform

---

## Support

For questions or contributions to the design system:
- Review component examples in `/design-system/components/`
- Check token definitions in `/design-system/tokens/`
- Refer to existing page implementations

---

**Version**: 2.0.0 (Modern Organic Luxury)
**Last Updated**: 2026-01-22
