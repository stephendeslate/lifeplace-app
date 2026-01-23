# ModernCard Component

A sophisticated card component built with the Modern Organic Luxury design system. It replaces heavy glassmorphism with clean, subtle elevation for a refined, professional appearance.

## Overview

The `ModernCard` component provides six distinct visual variants and three size options, all built using design tokens with no hardcoded values. It features smooth animations, accessibility support, and a migration utility for transitioning from the old `GlassCard` component.

## Features

- **Six Variants**: subtle, elevated, warm, terracotta, sage, outlined
- **Three Sizes**: small (16px), medium (24px), large (32px)
- **Smooth Hover Animations**: Elevation changes with subtle transform effects
- **Clickable State**: Enhanced interactions for interactive cards
- **Full Design Token Integration**: No hardcoded values, all from the design system
- **Accessibility**: Proper ARIA roles, keyboard navigation support
- **Migration Utility**: Easy transition from GlassCard component

## Installation

```tsx
import { ModernCard } from '@/design-system';
```

## Basic Usage

```tsx
<ModernCard>
  <Typography variant="h6">Card Title</Typography>
  <Typography>Card content goes here</Typography>
</ModernCard>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `CardVariant` | `'elevated'` | Visual style variant |
| `size` | `CardSize` | `'medium'` | Padding size |
| `hover` | `boolean` | `false` | Enable hover effects |
| `clickable` | `boolean` | `false` | Make card clickable |
| `onClick` | `() => void` | `undefined` | Click handler (sets clickable to true) |
| `children` | `ReactNode` | - | Card content |
| `sx` | `SxProps<Theme>` | `{}` | Additional MUI styles |
| `className` | `string` | `undefined` | Additional CSS class |

### Types

```tsx
type CardVariant = 'subtle' | 'elevated' | 'warm' | 'terracotta' | 'sage' | 'outlined';
type CardSize = 'small' | 'medium' | 'large';
```

## Variants

### Subtle
Warm cream background with minimal shadow. Perfect for secondary content or nested cards.

```tsx
<ModernCard variant="subtle">
  Subtle card content
</ModernCard>
```

**Design Tokens Used:**
- Background: `tokens.color.neutral[50]`
- Shadow: `tokens.shadow.elevation.xs`

### Elevated (Default)
White background with medium shadow. Best for primary content cards.

```tsx
<ModernCard variant="elevated">
  Elevated card content
</ModernCard>
```

**Design Tokens Used:**
- Background: `#FFFFFF`
- Shadow: `tokens.shadow.component.card`

### Warm
Terracotta-tinted background with warm shadow. Great for warning or attention-grabbing content.

```tsx
<ModernCard variant="warm">
  Warm card content
</ModernCard>
```

**Design Tokens Used:**
- Background: `tokens.color.neutral[50]` with gradient overlay
- Shadow: Custom warm shadow with pink tint

### Terracotta
Full terracotta gradient background. Use sparingly for important callouts.

```tsx
<ModernCard variant="terracotta">
  Terracotta card content
</ModernCard>
```

**Design Tokens Used:**
- Background: Custom terracotta gradient
- Shadow: Custom terracotta-tinted shadow

### Sage
Soft sage green gradient background. Excellent for success states or positive metrics.

```tsx
<ModernCard variant="sage">
  Sage card content
</ModernCard>
```

**Design Tokens Used:**
- Background: Custom sage gradient
- Shadow: Custom sage-tinted shadow

### Outlined
Transparent background with border only. Perfect for form sections or low-emphasis containers.

```tsx
<ModernCard variant="outlined">
  Outlined card content
</ModernCard>
```

**Design Tokens Used:**
- Border: `tokens.color.neutral[200]`
- Background: `transparent`

## Sizes

### Small
16px padding. Ideal for compact layouts, dashboard widgets, or list items.

```tsx
<ModernCard size="small">
  Small card
</ModernCard>
```

### Medium (Default)
24px padding. Best for general-purpose cards.

```tsx
<ModernCard size="medium">
  Medium card
</ModernCard>
```

### Large
32px padding. Use for feature sections or prominent content areas.

```tsx
<ModernCard size="large">
  Large card
</ModernCard>
```

## Interactive Cards

### Hover Effects
Enable hover effects for visual feedback:

```tsx
<ModernCard variant="elevated" hover>
  Hover over me
</ModernCard>
```

### Clickable Cards
Make cards interactive with click handlers:

```tsx
<ModernCard
  variant="elevated"
  clickable
  onClick={() => console.log('Card clicked!')}
>
  Click me
</ModernCard>
```

**Note:** Setting `onClick` automatically makes the card clickable. The card includes:
- Pointer cursor on hover
- Enhanced hover animation (translateY(-4px))
- Keyboard accessibility (Enter/Space key support)
- ARIA role="button"

## Real-World Examples

### Dashboard Stats

```tsx
<Stack direction="row" spacing={2}>
  <ModernCard variant="sage" size="small" hover sx={{ flex: 1 }}>
    <Typography variant="overline" color="text.secondary">
      Total Revenue
    </Typography>
    <Typography variant="h4" fontWeight={700} color="success.dark">
      $48,352
    </Typography>
    <Typography variant="caption" color="success.main">
      +12.5% from last month
    </Typography>
  </ModernCard>

  <ModernCard variant="warm" size="small" hover sx={{ flex: 1 }}>
    <Typography variant="overline" color="text.secondary">
      Active Events
    </Typography>
    <Typography variant="h4" fontWeight={700} color="warning.dark">
      24
    </Typography>
    <Typography variant="caption" color="warning.main">
      6 this week
    </Typography>
  </ModernCard>
</Stack>
```

### Content Card with Actions

```tsx
<ModernCard variant="elevated" size="medium" hover>
  <Stack spacing={2}>
    <Typography variant="h6">
      Wedding Planning Checklist
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Track your wedding planning progress with our comprehensive checklist.
    </Typography>
    <Stack direction="row" spacing={1}>
      <Button variant="contained">View Checklist</Button>
      <Button variant="outlined">Share</Button>
    </Stack>
  </Stack>
</ModernCard>
```

### Form Section

```tsx
<ModernCard variant="outlined" size="medium">
  <Stack spacing={2}>
    <Typography variant="h6">Personal Information</Typography>
    <TextField label="Full Name" fullWidth />
    <TextField label="Email" fullWidth />
    <TextField label="Phone" fullWidth />
  </Stack>
</ModernCard>
```

### Selectable Options

```tsx
const [selected, setSelected] = useState<string | null>(null);

<Stack direction="row" spacing={2}>
  {['Option 1', 'Option 2', 'Option 3'].map((option) => (
    <ModernCard
      key={option}
      variant={selected === option ? 'sage' : 'elevated'}
      clickable
      onClick={() => setSelected(option)}
      sx={{ flex: 1 }}
    >
      <Typography align="center">{option}</Typography>
    </ModernCard>
  ))}
</Stack>
```

## Migration from GlassCard

Use the `migrateGlassCardProps` utility to convert GlassCard props:

```tsx
import { ModernCard, migrateGlassCardProps } from '@/design-system';

// Old GlassCard props
const oldProps = {
  variant: 'success',
  hover: true,
  clickable: true,
  onClick: handleClick,
};

// Migrate to ModernCard
const modernProps = migrateGlassCardProps(oldProps);

<ModernCard {...modernProps}>
  Content
</ModernCard>
```

### Variant Mapping

| GlassCard Variant | ModernCard Variant |
|-------------------|-------------------|
| `light` | `subtle` |
| `medium` | `elevated` |
| `strong` | `elevated` |
| `primary` | `elevated` |
| `success` | `sage` |
| `warning` | `warm` |
| `error` | `terracotta` |

## Design Tokens Reference

The component uses the following design tokens:

### Colors
- `tokens.color.neutral[50]` - Base neutral background
- `tokens.color.neutral[200]` - Border color

### Shadows
- `tokens.shadow.elevation.xs` - Minimal shadow
- `tokens.shadow.elevation.sm` - Small shadow
- `tokens.shadow.elevation.md` - Medium shadow
- `tokens.shadow.elevation.lg` - Large shadow
- `tokens.shadow.component.card` - Standard card shadow
- `tokens.shadow.component.cardHover` - Card hover shadow

### Spacing
- `tokens.spacing.space[4]` - 16px (small padding)
- `tokens.spacing.space[6]` - 24px (medium padding)
- `tokens.spacing.space[8]` - 32px (large padding)
- `tokens.spacing.radius.xxl` - 16px (card border radius)

### Animations
- `tokens.animation.transitions.card` - Card transition timing

## Accessibility

The ModernCard component includes built-in accessibility features:

- **Semantic HTML**: Uses `<div>` by default, `role="button"` when clickable
- **Keyboard Navigation**: Supports Enter and Space keys for clickable cards
- **Focus Management**: Proper `tabIndex` for keyboard users
- **ARIA Attributes**: Appropriate roles for interactive elements

## Performance Considerations

- **CSS Transitions**: Uses GPU-accelerated transform and box-shadow transitions
- **Hover Optimization**: Smooth 200ms transitions using cubic-bezier easing
- **No Runtime Calculations**: All styles computed at build time using design tokens

## Browser Support

Works on all modern browsers that support:
- CSS Grid and Flexbox
- CSS Transforms
- CSS Transitions
- CSS Variables (via MUI theme)

## Best Practices

1. **Use `elevated` for primary content** - It provides the best contrast and readability
2. **Reserve colored variants for semantic meaning** - Use sage for success, terracotta for errors
3. **Enable hover on interactive cards** - Provides visual feedback
4. **Use outlined for form sections** - Reduces visual weight in complex layouts
5. **Match size to content hierarchy** - Large for hero sections, small for widgets
6. **Combine with MUI components** - Works seamlessly with Typography, Stack, Box, etc.

## TypeScript Support

Full TypeScript support with exported types:

```tsx
import type { ModernCardProps, CardVariant, CardSize } from '@/design-system';

const cardProps: ModernCardProps = {
  variant: 'elevated',
  size: 'medium',
  hover: true,
  children: 'Content',
};
```

## Related Components

- **Box** - MUI Box for simple containers
- **Paper** - MUI Paper for basic elevation
- **Card** - MUI Card (modernCard is a replacement/alternative)

## Changelog

### Version 1.0.0
- Initial release
- Six variants: subtle, elevated, warm, terracotta, sage, outlined
- Three sizes: small, medium, large
- Hover and clickable states
- Migration utility from GlassCard
- Full design token integration
- Accessibility support

---

**Designed for LifePlace Admin CRM**
Part of the Modern Organic Luxury Design System
