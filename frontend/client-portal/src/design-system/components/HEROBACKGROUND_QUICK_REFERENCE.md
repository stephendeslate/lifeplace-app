# HeroBackground - Quick Reference

## Import
```tsx
import { HeroBackground } from '@/design-system';
```

## Basic Usage

### Simple Gradient
```tsx
<HeroBackground gradient="warmSage">
  <Typography variant="h1">Welcome</Typography>
</HeroBackground>
```

### Animated Gradient
```tsx
<HeroBackground gradient="sunsetGlow" animated>
  <Typography variant="h1">Welcome</Typography>
</HeroBackground>
```

### Video Background
```tsx
<HeroBackground video="/videos/hero.mp4" overlay="dark">
  <Typography variant="h1" color="white">Welcome</Typography>
</HeroBackground>
```

### Image Background
```tsx
<HeroBackground image="/images/hero.jpg" overlay="gradient">
  <Typography variant="h1" color="white">Welcome</Typography>
</HeroBackground>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gradient` | `HeroGradient` | `'heroWarm'` | Gradient variant to use |
| `animated` | `boolean` | `false` | Enable gradient animation |
| `overlay` | `'none' \| 'light' \| 'dark' \| 'gradient'` | `'none'` | Overlay for text readability |
| `video` | `string` | - | Video URL for background |
| `image` | `string` | - | Image URL for background |
| `minHeight` | `string \| object` | `'100vh'` | Minimum height (responsive) |
| `children` | `ReactNode` | - | Content to display |
| `sx` | `SxProps` | - | Custom MUI styles |

## Gradient Variants

| Name | Description | Use Case |
|------|-------------|----------|
| `warmSage` | Natural sage green | Nature, organic themes |
| `sunsetGlow` | Warm terracotta | Celebrations, warmth |
| `goldenHour` | Soft gold luxury | Premium, elegant |
| `earthToSky` | Clay to sage | Grounded to aspirational |
| `terracottaWarmth` | Terracotta to gold | Warm, inviting |
| `heroWarm` | Warm cream | Subtle, professional |
| `heroNatural` | Natural sage | Clean, organic |
| `heroSunset` | Sunset cream | Soft, welcoming |

## Overlay Types

| Type | Effect | Best For |
|------|--------|----------|
| `none` | No overlay | Gradient-only backgrounds |
| `light` | Light semi-transparent | Dark text on light gradients |
| `dark` | Dark medium opacity | Light text on any background |
| `gradient` | Top-to-bottom fade | Video/image backgrounds |

## Responsive Height

### String
```tsx
<HeroBackground minHeight="80vh">
  ...
</HeroBackground>
```

### Object (Responsive)
```tsx
<HeroBackground
  minHeight={{
    xs: '60vh',   // Mobile
    sm: '70vh',   // Tablet
    md: '80vh',   // Desktop
    lg: '100vh'   // Large
  }}
>
  ...
</HeroBackground>
```

## Common Patterns

### Landing Page Hero
```tsx
<HeroBackground
  gradient="warmSage"
  animated
  minHeight="100vh"
>
  <Container maxWidth="lg">
    <Stack spacing={3} alignItems="center" textAlign="center">
      <Typography variant="h1">Welcome to LifePlace</Typography>
      <Typography variant="h5">Create unforgettable events</Typography>
      <Button variant="contained" size="large">Get Started</Button>
    </Stack>
  </Container>
</HeroBackground>
```

### Video Hero with Overlay
```tsx
<HeroBackground
  video="/videos/event.mp4"
  overlay="dark"
  minHeight="80vh"
>
  <Container>
    <Typography variant="h1" color="white">
      Experience the Magic
    </Typography>
  </Container>
</HeroBackground>
```

### Compact Section Hero
```tsx
<HeroBackground
  gradient="goldenHour"
  overlay="light"
  minHeight="50vh"
  sx={{ borderRadius: 4, m: 2 }}
>
  <Typography variant="h2">Our Services</Typography>
</HeroBackground>
```

## Migration from GradientBackground

### Before
```tsx
<GradientBackground gradient="forest" animated overlay>
  {children}
</GradientBackground>
```

### After
```tsx
<HeroBackground gradient="warmSage" animated overlay="light">
  {children}
</HeroBackground>
```

### Changes
1. `gradient`: Legacy names auto-map (forest → warmSage)
2. `overlay`: Changed from `boolean` to `'none' | 'light' | 'dark' | 'gradient'`
3. New props: `video`, `image`, responsive `minHeight`

## Legacy Gradient Mapping

Old gradients automatically map to new ones:

```typescript
forest  → warmSage
earth   → earthToSky
sunset  → sunsetGlow
sunrise → sunsetGlow
mist    → heroWarm
sky     → heroNatural
meadow  → earthToSky
```

## Performance Tips

1. **Use animation sparingly**: Animated gradients use GPU resources
2. **Optimize videos**: Compress videos for web (<5MB recommended)
3. **Lazy load images**: Use lazy loading for image backgrounds
4. **Choose right overlay**: Dark overlay = better readability on videos

## Accessibility

- Background elements are `aria-hidden`
- Ensure text has sufficient contrast
- Use overlays for video/image backgrounds
- Test with screen readers

## Browser Support

- ✅ All modern browsers
- ✅ Chrome, Firefox, Safari, Edge
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ⚠️ IE11: Gradients work, video needs polyfill
