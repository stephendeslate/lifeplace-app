# Layout Components

Essential layout components for building consistent, responsive page layouts across the LifePlace client portal.

## Components

### Section

Wraps page sections with consistent spacing and backgrounds.

**File**: `/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/components/Section.tsx`

#### Props

```typescript
interface SectionProps {
  background?: 'cream' | 'white' | 'sage' | 'terracotta' | 'gradient';
  spacing?: 'small' | 'medium' | 'large' | 'xlarge';
  fullWidth?: boolean;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}
```

#### Features

- **Background colors** from design tokens
  - `cream`: Warm cream (#FAF7F2) - default
  - `white`: Pure white
  - `sage`: Soft sage (#f7f8f6)
  - `terracotta`: Warm terracotta (#fdf6f4)
  - `gradient`: Natural gradient (sage to cream)

- **Spacing options** (vertical padding)
  - `small`: 32px (19.2px mobile, 24px tablet)
  - `medium`: 48px (28.8px mobile, 36px tablet) - default
  - `large`: 64px (38.4px mobile, 48px tablet)
  - `xlarge`: 96px (57.6px mobile, 72px tablet)

- **Responsive behavior**: Padding automatically reduces on smaller screens
  - Mobile: 60% of desktop padding
  - Tablet: 75% of desktop padding
  - Desktop: Full padding

#### Usage

```tsx
import { Section, Container } from '@/design-system';

// Basic usage
<Section background="cream" spacing="large">
  <Container>
    <Typography variant="h1">Your Content</Typography>
  </Container>
</Section>

// Full-width section
<Section background="gradient" spacing="xlarge" fullWidth>
  <Container maxWidth="wide">
    <HeroContent />
  </Container>
</Section>

// Custom styles
<Section
  background="sage"
  spacing="medium"
  sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
>
  <Container>
    <FeatureContent />
  </Container>
</Section>
```

---

### Container

Constrains content width with responsive horizontal padding.

**File**: `/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/components/Container.tsx`

#### Props

```typescript
interface ContainerProps {
  maxWidth?: 'narrow' | 'content' | 'wide' | 'full';
  padding?: boolean;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}
```

#### Features

- **Max widths** from design tokens
  - `narrow`: 800px - for focused content (articles, forms)
  - `content`: 1200px - default, standard page content
  - `wide`: 1400px - for galleries, dashboards
  - `full`: 100% - no constraint

- **Responsive horizontal padding**
  - Mobile: 16px
  - Tablet: 24px
  - Desktop: 32px

- **Center alignment**: Content is centered with `margin: 0 auto`

- **Optional padding**: Set `padding={false}` to disable horizontal padding

#### Usage

```tsx
import { Container } from '@/design-system';

// Standard content width
<Container maxWidth="content">
  <Typography variant="h1">Page Title</Typography>
  <Typography variant="body1">Content here...</Typography>
</Container>

// Narrow for focused content
<Container maxWidth="narrow">
  <ContactForm />
</Container>

// Wide for galleries
<Container maxWidth="wide">
  <ImageGallery />
</Container>

// Full width without padding
<Container maxWidth="full" padding={false}>
  <FullWidthMap />
</Container>

// Custom styles
<Container
  maxWidth="content"
  sx={{ mt: 4, mb: 6 }}
>
  <ArticleContent />
</Container>
```

---

### ImageWithOverlay

Displays images with text overlays for hero sections and feature areas.

**File**: `/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/components/ImageWithOverlay.tsx`

#### Props

```typescript
interface ImageWithOverlayProps {
  image: string;
  alt: string;
  overlay?: 'none' | 'light' | 'dark' | 'gradient';
  overlayOpacity?: number;
  height?: string | { xs?: string; sm?: string; md?: string; lg?: string };
  objectFit?: 'cover' | 'contain';
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
}
```

#### Features

- **Responsive image display**
  - Lazy loading for performance
  - Object-fit: cover or contain
  - Border radius from design tokens (12px)

- **Overlay types** from design tokens
  - `none`: No overlay (default)
  - `light`: Medium cream overlay (rgba(250, 247, 242, 0.6))
  - `dark`: Medium dark overlay (rgba(46, 42, 40, 0.6))
  - `gradient`: Gradient from dark top to darker bottom (for text readability)

- **Custom opacity**: Override default overlay opacity (0-1)

- **Flexible height**
  - String: Single height value (e.g., '500px')
  - Object: Responsive heights (e.g., { xs: '300px', md: '600px' })

- **Content positioning**
  - Children rendered with proper z-index
  - Centered by default (flexbox)
  - Responsive padding

#### Usage

```tsx
import { ImageWithOverlay } from '@/design-system';

// Basic hero with gradient overlay
<ImageWithOverlay
  image="/images/hero-venue.jpg"
  alt="Beautiful outdoor venue"
  overlay="gradient"
  height={{ xs: '400px', md: '600px', lg: '700px' }}
>
  <Typography variant="h1" color="white" textAlign="center">
    Welcome to LifePlace
  </Typography>
  <Typography variant="h4" color="white" textAlign="center" sx={{ mt: 2 }}>
    Your Dream Event Starts Here
  </Typography>
</ImageWithOverlay>

// Dark overlay for bright images
<ImageWithOverlay
  image="/images/bright-venue.jpg"
  alt="Sunny garden venue"
  overlay="dark"
  overlayOpacity={0.5}
  height="500px"
>
  <Typography variant="h2" color="white">
    Garden Pavilion
  </Typography>
</ImageWithOverlay>

// Light overlay for dark images
<ImageWithOverlay
  image="/images/evening-venue.jpg"
  alt="Evening celebration"
  overlay="light"
  height="500px"
>
  <Typography variant="h2" color="primary.dark">
    Evening Terrace
  </Typography>
</ImageWithOverlay>

// No overlay (just image)
<ImageWithOverlay
  image="/images/interior.jpg"
  alt="Interior ballroom"
  overlay="none"
  height="400px"
  objectFit="cover"
/>

// Custom styles
<ImageWithOverlay
  image="/images/feature.jpg"
  alt="Feature venue"
  overlay="gradient"
  height="600px"
  sx={{
    borderRadius: '24px',
    boxShadow: 3
  }}
>
  <Box sx={{ textAlign: 'center', maxWidth: '800px' }}>
    <Typography variant="h1" color="white">
      Custom Content
    </Typography>
  </Box>
</ImageWithOverlay>
```

---

## Common Patterns

### Full-Page Layout

```tsx
import { Section, Container, ImageWithOverlay } from '@/design-system';

const HomePage = () => (
  <>
    {/* Hero Section */}
    <Section background="white" spacing="medium" fullWidth>
      <Container maxWidth="wide">
        <ImageWithOverlay
          image="/hero.jpg"
          alt="Hero"
          overlay="gradient"
          height={{ xs: '400px', md: '600px' }}
        >
          <Typography variant="h1" color="white">
            Welcome
          </Typography>
        </ImageWithOverlay>
      </Container>
    </Section>

    {/* Content Section */}
    <Section background="cream" spacing="large">
      <Container maxWidth="content">
        <Typography variant="h2">About Us</Typography>
        <Typography variant="body1">Content...</Typography>
      </Container>
    </Section>

    {/* CTA Section */}
    <Section background="terracotta" spacing="medium">
      <Container maxWidth="narrow">
        <Typography variant="h2" color="white" textAlign="center">
          Book Now
        </Typography>
      </Container>
    </Section>
  </>
);
```

### Alternating Backgrounds

```tsx
<>
  <Section background="cream" spacing="large">
    <Container><Content1 /></Container>
  </Section>

  <Section background="white" spacing="large">
    <Container><Content2 /></Container>
  </Section>

  <Section background="sage" spacing="large">
    <Container><Content3 /></Container>
  </Section>
</>
```

### Nested Containers

```tsx
<Section background="gradient" spacing="xlarge">
  <Container maxWidth="wide">
    <ImageWithOverlay image="/hero.jpg" alt="Hero" overlay="gradient">
      <Container maxWidth="narrow">
        <Typography variant="h1" color="white" textAlign="center">
          Nested Content
        </Typography>
      </Container>
    </ImageWithOverlay>
  </Container>
</Section>
```

---

## Design Tokens Used

All components use values from `/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/tokens/`:

### Colors (`tokens/colors.ts`)
- `tokens.color.base.neutral[50]` - Cream background
- `tokens.color.base.sage[50]` - Sage background
- `tokens.color.base.terracotta[50]` - Terracotta background
- `tokens.color.gradients.heroNatural` - Gradient background
- `tokens.color.overlays.*` - Image overlays

### Spacing (`tokens/spacing.ts`)
- `tokens.spacing.space.sectionPadding.*` - Section vertical padding
- `tokens.spacing.space.containerPadding.*` - Container horizontal padding
- `tokens.spacing.layout.maxWidth.*` - Container max widths
- `tokens.spacing.radius.image` - Image border radius (12px)
- `tokens.spacing.zIndex.*` - Z-index layering

---

## Responsive Behavior

All components are mobile-first and fully responsive:

### Breakpoints
- **xs**: 0px (mobile)
- **sm**: 640px (large mobile/small tablet)
- **md**: 768px (tablet)
- **lg**: 1024px (desktop)
- **xl**: 1280px (large desktop)

### Section Spacing
Automatically scales padding on smaller screens:
- Desktop: 100% of specified padding
- Tablet: 75% of specified padding
- Mobile: 60% of specified padding

### Container Padding
Responsive horizontal padding:
- Desktop: 32px
- Tablet: 24px
- Mobile: 16px

### ImageWithOverlay Height
Can be responsive object or fixed string:
```tsx
// Responsive
height={{ xs: '300px', md: '500px', lg: '700px' }}

// Fixed
height="600px"
```

---

## Testing

All components have comprehensive tests in:
`/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/components/__tests__/LayoutComponents.test.tsx`

Run tests:
```bash
npm run test -- src/design-system/components/__tests__/LayoutComponents.test.tsx
```

---

## Examples

See practical examples in:
`/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/components/__examples__/LayoutComponentsExample.tsx`

---

## Accessibility

- **Section**: Uses semantic `<section>` HTML element
- **Container**: Proper width constraints for readability
- **ImageWithOverlay**:
  - Requires `alt` text for images
  - Lazy loading for performance
  - Proper contrast with overlays for text readability

---

## Best Practices

1. **Always wrap content in Container** within Section for proper width constraints
2. **Use Section for every major page area** to maintain consistent spacing
3. **Choose appropriate overlay types** based on image brightness
4. **Use responsive heights** for ImageWithOverlay on different screen sizes
5. **Avoid hardcoded values** - use design tokens through sx prop if customization needed
6. **Test on mobile** - components are designed mobile-first
7. **Combine components** for complex layouts (nest Containers, etc.)

---

## Migration Notes

When redesigning existing pages:

1. Replace custom `<Box>` wrappers with `<Section>`
2. Replace page-level containers with `<Container>`
3. Replace hero image implementations with `<ImageWithOverlay>`
4. Update spacing to use consistent Section spacing options
5. Ensure no hardcoded background colors - use Section background props
6. Test responsive behavior on all breakpoints

---

## Files Created

- **Components**:
  - `/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/components/Section.tsx`
  - `/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/components/Container.tsx`
  - `/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/components/ImageWithOverlay.tsx`

- **Tests**:
  - `/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/components/__tests__/LayoutComponents.test.tsx`

- **Examples**:
  - `/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/components/__examples__/LayoutComponentsExample.tsx`

- **Documentation**:
  - `/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/components/LAYOUT_COMPONENTS_README.md`

- **Exports**:
  - Updated `/Users/stephendeslate/Desktop/lifeplace-app/frontend/client-portal/src/design-system/index.ts`

---

## Verification Checklist

- [x] All three components render correctly
- [x] Responsive behavior works on mobile/tablet/desktop
- [x] ImageWithOverlay overlays provide good text contrast
- [x] Section spacing consistent with design
- [x] Container max-widths enforce proper layout
- [x] All use design tokens (no hardcoded values)
- [x] TypeScript types are correct
- [x] All tests passing (11/11)
- [x] Components exported from design-system index
- [x] Documentation complete
- [x] Examples provided
