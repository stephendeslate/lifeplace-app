# Button & Animation Components Documentation

## Overview

This documentation covers the enhanced Button, IconButton, and AnimatedElement components added to the LifePlace Design System. These components provide modern, accessible, and animated user interface elements with full design token integration.

## Components

### 1. Button Component

A modern, fully-featured button component with multiple variants and size options.

#### Features

- 6 Variants: `primary`, `secondary`, `outline`, `ghost`, `terracotta`, `gold`
- 3 Sizes: `small`, `medium`, `large`
- Loading states with spinner
- Start/end icon support
- Full-width option
- Accessibility compliant (WCAG 2.1 AA)
- Keyboard navigation support
- Reduced motion support
- High contrast mode support

#### Usage

```tsx
import { Button } from '@/design-system';

// Basic usage
<Button variant="primary">Click Me</Button>

// With icon
<Button variant="secondary" startIcon={<Icon />}>
  Save
</Button>

// Loading state
<Button variant="primary" loading>
  Processing...
</Button>

// Full width
<Button variant="terracotta" fullWidth>
  Submit Form
</Button>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'terracotta' \| 'gold'` | `'primary'` | Button style variant |
| size | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size |
| fullWidth | `boolean` | `false` | Make button full width |
| startIcon | `ReactNode` | - | Icon before text |
| endIcon | `ReactNode` | - | Icon after text |
| loading | `boolean` | `false` | Show loading spinner |
| disabled | `boolean` | `false` | Disable button |
| onClick | `(event) => void` | - | Click handler |
| children | `ReactNode` | - | Button content (required) |
| sx | `SxProps` | - | MUI sx prop for custom styles |

#### Color Variants

- **Primary (Sage)**: `#508750` - Main action button
- **Secondary**: White background with sage border
- **Outline**: Transparent with sage border
- **Ghost**: Transparent, no border
- **Terracotta**: `#e8744d` - Warm accent actions
- **Gold**: `#d4a574` - Premium/special actions

---

### 2. IconButton Component

Circular icon-only button for compact actions.

#### Features

- 7 Variants: `default`, `sage`, `terracotta`, `gold`, `success`, `warning`, `error`
- 3 Sizes: `small`, `medium`, `large`
- Circular design (border-radius: 50%)
- Required accessibility labels
- Keyboard accessible
- Touch-optimized (48x48px minimum on mobile)

#### Usage

```tsx
import { IconButton } from '@/design-system';
import EditIcon from '@mui/icons-material/Edit';

// Basic usage
<IconButton
  icon={<EditIcon />}
  ariaLabel="Edit item"
  variant="sage"
/>

// Different sizes
<IconButton
  icon={<DeleteIcon />}
  ariaLabel="Delete"
  variant="error"
  size="large"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| icon | `ReactNode` | - | Icon element (required) |
| ariaLabel | `string` | - | Accessibility label (required) |
| variant | `'default' \| 'sage' \| 'terracotta' \| 'gold' \| 'success' \| 'warning' \| 'error'` | `'default'` | Button variant |
| size | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size |
| onClick | `(event) => void` | - | Click handler |
| disabled | `boolean` | `false` | Disable button |
| sx | `SxProps` | - | MUI sx prop for custom styles |

#### Accessibility

The `ariaLabel` prop is **required** to ensure screen readers can identify the button's purpose. Never omit this prop.

---

### 3. AnimatedElement Component

Scroll-triggered animation wrapper using Intersection Observer.

#### Features

- 17 Animation types
- Configurable duration and delay
- Threshold control (how much visible before trigger)
- Trigger once or repeat on scroll
- Reduced motion support
- Performance optimized with Intersection Observer

#### Animation Types

**Entry Animations** (trigger once on scroll):
- `fadeIn` - Simple opacity fade
- `slideUp` - Slide from below
- `slideDown` - Slide from above
- `slideLeft` - Slide from right
- `slideRight` - Slide from left
- `scaleUp` - Scale from small
- `scaleDown` - Scale from large
- `zoomIn` - Zoom from very small
- `zoomOut` - Zoom from large
- `slideUpFade` - Enhanced slide up with fade
- `slideDownFade` - Enhanced slide down with fade
- `reveal` - Reveal from left to right (clip-path)
- `blur` - Blur to sharp transition
- `bounceIn` - Bouncy entrance

**Looping Animations** (continuous):
- `float` - Gentle up/down motion
- `sway` - Gentle rotation
- `pulse` - Breathing effect

#### Usage

```tsx
import { AnimatedElement, FadeIn, SlideUp, ZoomIn } from '@/design-system';

// Basic usage
<AnimatedElement animation="fadeIn" duration={600}>
  <div>This will fade in</div>
</AnimatedElement>

// With delay
<AnimatedElement animation="slideUp" duration={800} delay={200}>
  <Card>Animated Card</Card>
</AnimatedElement>

// Convenience components
<FadeIn duration={600}>
  <Typography>Fades in</Typography>
</FadeIn>

<SlideUp delay={300}>
  <Box>Slides up after 300ms</Box>
</SlideUp>

// Looping animation
<AnimatedElement animation="float" triggerOnce={false}>
  <Icon>Floating Icon</Icon>
</AnimatedElement>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| animation | `AnimationType` | `'fadeIn'` | Animation type |
| duration | `number` | `600` | Duration in milliseconds |
| delay | `number` | `0` | Delay before animation starts |
| threshold | `number` | `0.1` | Visibility threshold (0-1) |
| triggerOnce | `boolean` | `true` | Animate once or on every scroll |
| disabled | `boolean` | `false` | Disable animation |
| children | `ReactNode` | - | Content to animate |
| sx | `SxProps` | - | MUI sx prop for custom styles |
| as | `React.ElementType` | `'div'` | HTML element type |

#### Convenience Components

Pre-configured components for common animations:

```tsx
<FadeIn />          // animation="fadeIn"
<SlideUp />         // animation="slideUp"
<SlideDown />       // animation="slideDown"
<ZoomIn />          // animation="zoomIn"
<BounceIn />        // animation="bounceIn"
<Reveal />          // animation="reveal"
<BlurIn />          // animation="blur"
```

---

## Design Token Integration

All components use design tokens from `/tokens/base.ts`:

### Spacing
- Border radius: `designTokens.spacing.radius.md` (8px)
- Padding: `designTokens.spacing.space[*]`
- Button padding: Uses token-based spacing

### Typography
- Font family: `designTokens.typography.fontFamily`
- Font weight: `designTokens.typography.fontWeight.semibold`
- Font sizes: `designTokens.typography.fontSize.*`
- Line height: `designTokens.typography.lineHeight.normal`

### Shadows
- Elevation: `designTokens.shadows.elevation.*`
- Focus ring: Computed from color tokens

### Animations
- Transitions: `designTokens.animations.transitions.all`
- Durations: `designTokens.animations.duration.*`

### Extended Colors

New color palette additions for buttons:

```typescript
extendedColors = {
  sage: { 500: '#508750' },      // Primary sage green
  terracotta: { 500: '#e8744d' }, // Warm terracotta
  gold: { 500: '#d4a574' }        // Premium gold
}
```

---

## Accessibility Features

### Keyboard Navigation
- All buttons support Tab navigation
- Enter/Space to activate
- Visible focus indicators
- Focus ring with 3px outline

### Screen Reader Support
- Proper ARIA labels
- `aria-busy` for loading states
- `aria-disabled` for disabled states
- IconButton requires `ariaLabel` prop

### Motion Preferences
All components respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  /* Animations disabled */
  /* Transforms disabled */
  /* Only opacity transitions */
}
```

### High Contrast Mode
Components adapt to high contrast mode with enhanced borders and outlines.

### Touch Targets
- Minimum 44x44px (desktop)
- Minimum 48x48px (mobile)
- Meets WCAG 2.1 Level AAA

---

## Performance

### AnimatedElement Optimization
- Uses Intersection Observer API
- No scroll event listeners
- GPU-accelerated animations (transform/opacity)
- Automatic cleanup on unmount

### Best Practices
1. Use `triggerOnce={true}` for entry animations
2. Keep duration between 300-800ms for best UX
3. Stagger delays for multiple elements (100-200ms apart)
4. Avoid animating too many elements simultaneously

---

## Examples

### Complete Call-to-Action

```tsx
<AnimatedElement animation="slideUpFade" duration={800}>
  <Box sx={{ p: 4 }}>
    <FadeIn delay={300}>
      <Typography variant="h3">Join Us Today</Typography>
    </FadeIn>

    <SlideUp delay={500}>
      <Typography variant="body1">
        Start your journey with LifePlace
      </Typography>
    </SlideUp>

    <ZoomIn delay={700}>
      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button variant="primary" size="large">
          Get Started
        </Button>
        <Button variant="outline" size="large">
          Learn More
        </Button>
        <IconButton
          icon={<InfoIcon />}
          ariaLabel="More information"
          variant="sage"
        />
      </Stack>
    </ZoomIn>
  </Box>
</AnimatedElement>
```

### Form with Loading

```tsx
const [loading, setLoading] = useState(false);

<form onSubmit={handleSubmit}>
  <TextField label="Email" />
  <TextField label="Password" type="password" />

  <Button
    variant="primary"
    type="submit"
    loading={loading}
    fullWidth
  >
    Sign In
  </Button>
</form>
```

### Action Toolbar

```tsx
<Stack direction="row" spacing={1}>
  <IconButton
    icon={<EditIcon />}
    ariaLabel="Edit item"
    variant="sage"
  />
  <IconButton
    icon={<DeleteIcon />}
    ariaLabel="Delete item"
    variant="error"
  />
  <IconButton
    icon={<ShareIcon />}
    ariaLabel="Share item"
    variant="default"
  />
</Stack>
```

---

## Migration from AccessibleButton

If you're currently using `AccessibleButton`, you can migrate to the new `Button` component:

```tsx
// Before
<AccessibleButton color="primary" elevated>
  Click Me
</AccessibleButton>

// After
<Button variant="primary">
  Click Me
</Button>
```

**Note**: The new `Button` component has a cleaner API but both components can coexist in the design system.

---

## Testing

All components include:
- Keyboard navigation testing
- Screen reader compatibility
- Motion preference detection
- Focus management
- Touch target size validation

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Android Chrome 90+

Requires Intersection Observer API support (widely available).

---

## Future Enhancements

Potential future additions:
- Icon-only Button variant
- Button groups
- Split buttons
- More animation presets
- Animation playback controls
- Custom animation curves

---

## Credits

Built with:
- Material-UI (MUI) v7
- React 19
- TypeScript
- Design tokens from LifePlace Design System

---

## Support

For issues or questions, refer to the design system documentation or contact the design systems team.
