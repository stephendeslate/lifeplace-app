# LifePlace Mobile App Styling Guide

A comprehensive design system for the LifePlace React Native mobile application, combining modern hospitality app patterns with the LifePlace brand identity.

> **Important**: This is a **venue event booking platform** for retreats and events, NOT a hotel booking app. The UI components and data structures reflect Venues (event spaces), Packages (event offerings), and Events (bookings).

---

## Table of Contents

1. [Brand Foundation](#brand-foundation)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Icons & Imagery](#icons--imagery)
7. [Animations & Interactions](#animations--interactions)
8. [Screen Templates](#screen-templates)
9. [Backend Data Reference](#backend-data-reference)

---

## Brand Foundation

### About LifePlace

**LifePlace Retreat & Event Center** is a serene, nature-inspired venue for retreats, events, and special occasions, located in Alfonso near Tagaytay City, Cavite, Philippines.

#### Core Theme
The brand revolves around **spiritual renewal**, **abundance**, and **living life to the full**, directly inspired by the biblical quote from **John 10:10b**: *"I have come that they may have life, and have it to the full."*

This theme emphasizes:
- **Peace** - A tranquil escape from everyday life
- **Community** - Spaces that foster connection and togetherness
- **Transformation** - Environments for personal and group growth

#### Target Experiences
LifePlace appeals to groups seeking:
- Relaxation and spiritual retreats
- Team building and corporate events
- Camping and outdoor adventures
- Workshops and training sessions
- Milestone celebrations (weddings, birthdays, anniversaries)

#### Venue Characteristics
- Accessibility to nature with cool, refreshing environments
- Versatile facilities blending indoor comfort with outdoor openness
- Exceptional spaces that foster connection and memorable moments
- Positioned as an ideal spot for reinvention and delight

### Brand Essence

LifePlace's branding is **minimalist**, **elegant**, and **nature-oriented**, evoking feelings of tranquility, growth, and spirituality.

The mobile app should feel:
- **Serene & Inviting** - Calm, welcoming interface that reflects peace
- **Premium yet Accessible** - Elegant without being intimidating
- **Nature-Connected** - Organic shapes, earthy warmth, rustic-modern aesthetic
- **Spiritually Grounded** - Subtle references to abundance and fullness of life

### Visual Theme

**Rustic-Modern with Nature-Inspired Serenity**

The aesthetic blends:
- **Organic elements**: Wood textures, greenery, natural motifs
- **Clean design**: White spaces, simple fonts, minimal clutter
- **Symbolic imagery**: Wheat sheaves representing harvest and fullness of life

This creates a balanced, inviting feel that positions LifePlace as a "place of life" – peaceful, inclusive, and transformative.

### Design Principles

1. **Imagery First** - High-quality photography of lush landscapes, venues, and events drives emotional connection. Style should be realistic and aspirational with warm lighting and soft focus on details.

2. **Effortless Navigation** - Clear hierarchy, intuitive flows, straightforward menu structure

3. **Warm Minimalism** - Clean layouts with warm, organic touches; avoid clutter and prioritize open space

4. **Nature Motifs** - Subtle use of natural elements (wheat sheaves, leaves, wood textures) as decorative accents

5. **Consistent Rhythm** - Predictable spacing and component patterns for a calming user experience

### Logo Elements

The LifePlace logo features:
- **Icon**: A stylized wheat sheaf (two symmetrical wheat stalks forming a flame-like or vase shape) symbolizing growth, nourishment, and biblical abundance
- **Primary text**: "LifePlace" in a flowing, handwritten script font for an organic, personal feel
- **Tagline**: "RETREAT AND EVENT CENTER" in uppercase sans-serif for clarity and professionalism
- **Rendering**: Typically monochromatic for versatility across media

---

## Color System

### Brand Color Philosophy

The LifePlace color palette is **neutral and earth-toned**, emphasizing natural harmony and spirituality. Colors promote a calming aesthetic with high contrast ratios (above 4.5:1) for accessibility. Avoid vibrant colors to maintain the serene brand identity.

### Primary Palette

```typescript
export const colors = {
  // Primary Brand Colors
  primary: {
    black: '#000000',         // Logo text, headings, body copy, navigation links
    blackLight: '#1A1A1A',    // Secondary text emphasis
  },

  // Accent Colors - Nature Inspired
  accent: {
    wood: '#8B4513',          // Saddle Brown - Wood tones, borders, buttons, hover states
    woodLight: '#A0522D',     // Sienna - Lighter wood accent
    woodDark: '#654321',      // Dark brown - Pressed states
    woodSubtle: '#F5EDE5',    // Light wood tint for backgrounds
  },

  // Secondary Accent - Growth/Nature
  secondary: {
    forest: '#228B22',        // Forest Green - CTAs, highlights, icons (wheat)
    forestLight: '#32CD32',   // Lime green - Hover states
    forestDark: '#1B6B1B',    // Dark green - Pressed states
    forestSubtle: '#EDF7ED',  // Light green tint for backgrounds
  },

  // Tertiary Accent - Serene/Cool
  tertiary: {
    teal: '#008080',          // Teal - Secondary accents, links, progress bars
    tealLight: '#20B2AA',     // Light sea green
    tealDark: '#006666',      // Dark teal
    tealSubtle: '#E6F3F3',    // Light teal tint
  },

  // Neutral Palette
  neutral: {
    white: '#FFFFFF',         // Page backgrounds, logo base, content sections
    beige: '#F5F5DC',         // Beige - Section backgrounds, subtle patterns, overlay tints
    cream: '#FAF9F7',         // Warm off-white backgrounds
    sand: '#F5F3EF',          // Card backgrounds, sections
    warmGray: '#E8E5E0',      // Borders, dividers
    gray: '#9B9590',          // Placeholder text
    darkGray: '#6B6560',      // Secondary text
  },

  // Semantic Colors
  semantic: {
    success: '#228B22',       // Forest Green - aligned with brand
    warning: '#E5A84B',       // Warm amber
    error: '#D64545',         // Soft red
    info: '#008080',          // Teal - aligned with brand
  },

  // Gradients - Nature Inspired
  gradients: {
    imageOverlay: ['transparent', 'rgba(0,0,0,0.7)'],
    heroFade: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'],
    natureFade: ['#FFFFFF', '#90EE90'],  // White to Light Green - Hero banners, background fades
    premiumCard: ['rgba(139,69,19,0.05)', 'rgba(34,139,34,0.05)'],  // Subtle wood to green
  },
};
```

### Color Reference Table

| Color Role | Description | HEX | RGB | Usage Examples |
|------------|-------------|-----|-----|----------------|
| Primary Text/Logo | Deep black for text, icons, and outlines | `#000000` | rgb(0, 0, 0) | Logo text, headings, body copy, navigation links |
| Background/Base | Pure white for clean, airy canvases | `#FFFFFF` | rgb(255, 255, 255) | Page backgrounds, logo base, content sections |
| Accent - Wood/Brown | Warm brown for rustic elements | `#8B4513` | rgb(139, 69, 19) | Venue wood tones, borders, buttons, hover states, cards, footers |
| Accent - Green/Foliage | Medium green for nature and growth motifs | `#228B22` | rgb(34, 139, 34) | Call-to-action buttons, highlights, wheat icons, section dividers |
| Accent - Teal/Roof | Soft teal-blue for subtle highlights | `#008080` | rgb(0, 128, 128) | Secondary accents, links, progress bars (use sparingly) |
| Neutral - Beige/Wall | Light beige for backgrounds or subtle fills | `#F5F5DC` | rgb(245, 245, 220) | Section backgrounds, subtle patterns, overlay tints on images |
| Gradient - Nature | Soft transition from white to light green | `#FFFFFF` to `#90EE90` | rgb(255,255,255) to rgb(144,238,144) | Hero banners, background fades, loading animations |

### Color Usage Guidelines

| Element | Color | Notes |
|---------|-------|-------|
| Primary buttons | `primary.black` | White text |
| Secondary buttons | `neutral.white` | Black border & text |
| CTA/Accent buttons | `secondary.forest` | White text - for key actions |
| Warm accent buttons | `accent.wood` | White text - for booking confirmations |
| Backgrounds | `neutral.white` or `neutral.beige` | Main content areas |
| Cards | `neutral.white` | Subtle shadow, clean appearance |
| Section backgrounds | `neutral.beige` or `neutral.cream` | Subtle warmth |
| Inactive tabs | `neutral.gray` | Active: `primary.black` |
| Price tags | `primary.black` | Clear, professional |
| Links | `tertiary.teal` | Subtle, serene accent |
| Progress indicators | `tertiary.teal` | Calming visual feedback |
| Success states | `secondary.forest` | Nature-aligned positive feedback |
| Favorite icon | `semantic.error` when active | Outline when inactive |

---

## Typography

### Typography Philosophy

LifePlace typography emphasizes **readability**, **warmth**, and **approachability**. The font choices balance organic, personal feels for branding elements with clean, professional sans-serif for content, ensuring high contrast and generous spacing to evoke calm.

### Font Stack

```typescript
export const typography = {
  fontFamily: {
    // Display/Headings - Script-style for branding warmth (logo, special headings)
    // Note: For logo text "LifePlace", use a script font similar to Brush Script or Pacifico
    display: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto',
    }),
    // Primary - Clean, modern sans-serif for main content
    primary: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto',
    }),
    // Secondary - For body text, readable and clear
    secondary: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
    }),
  },
};
```

### Typography Guidelines

| Element | Style | Weight | Size | Notes |
|---------|-------|--------|------|-------|
| Logo "LifePlace" | Script/Cursive | Medium-Bold | 48-72px | Fluid curves, organic feel |
| Tagline "RETREAT AND EVENT CENTER" | Sans-serif, Uppercase | Bold | 14-18px | Clear, professional |
| Body text | Sans-serif | Regular | 16-18px | Line-height 1.5-1.8 for easy reading |
| Subheadings | Sans-serif, Uppercase | Bold | 14-18px | High contrast, generous spacing |

### Type Scale

```typescript
export const typeScale = {
  // Display - Hero sections, welcome screens
  displayLarge: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Headlines - Section titles, card headers
  headlineLarge: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headlineMedium: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headlineSmall: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },

  // Titles - Component headers, list items
  titleLarge: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },

  // Body - Primary content
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },

  // Labels - Buttons, chips, captions
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  labelSmall: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.4,
  },

  // Price styling
  priceMain: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
};
```

### Typography Usage

| Context | Style | Color |
|---------|-------|-------|
| Screen titles | `headlineLarge` | `charcoal` |
| Card titles | `titleLarge` | `charcoal` |
| Property names | `titleMedium` | `charcoal` |
| Body text | `bodyMedium` | `darkGray` |
| Prices | `priceMain` + `priceUnit` | `charcoal` |
| Chip labels | `labelMedium` | Varies |
| Captions | `bodySmall` | `gray` |

---

## Spacing & Layout

### Spacing Scale

```typescript
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  xxxxl: 48,
};
```

### Layout Constants

```typescript
export const layout = {
  // Screen padding
  screenPaddingHorizontal: 20,
  screenPaddingVertical: 16,

  // Card dimensions
  cardBorderRadius: 16,
  cardBorderRadiusLarge: 24,
  cardBorderRadiusSmall: 12,

  // Image aspect ratios
  heroAspectRatio: 16 / 9,
  cardAspectRatio: 4 / 3,
  thumbnailAspectRatio: 1,

  // Bottom navigation
  bottomNavHeight: 80,
  bottomNavPadding: 16,

  // Safe areas
  statusBarHeight: Platform.select({ ios: 47, android: 24 }),
};
```

### Border Radius System

| Element | Radius | Usage |
|---------|--------|-------|
| Large cards | `24px` | Property cards, hero images |
| Standard cards | `16px` | Info cards, sections |
| Small cards | `12px` | Thumbnails, chips |
| Buttons | `12px` | All buttons |
| Pills/Chips | `24px` (full round) | Categories, tags |
| Input fields | `12px` | Text inputs |
| Avatars | `50%` | Profile images |

### Shadow System

```typescript
export const shadows = {
  // Subtle - Cards at rest
  sm: {
    shadowColor: '#32373C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Medium - Elevated cards, modals
  md: {
    shadowColor: '#32373C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },

  // Large - Bottom sheets, floating elements
  lg: {
    shadowColor: '#32373C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },

  // Bottom navigation
  bottomNav: {
    shadowColor: '#32373C',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
};
```

---

## Components

### Buttons

#### Primary Button
```typescript
const PrimaryButton = {
  container: {
    backgroundColor: colors.primary.black,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  pressed: {
    backgroundColor: colors.primary.blackLight,
  },
  disabled: {
    backgroundColor: colors.neutral.warmGray,
  },
};
```

#### Secondary Button
```typescript
const SecondaryButton = {
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary.black,
    paddingVertical: 15,
    paddingHorizontal: 24,
    minHeight: 52,
  },
  text: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
  },
};
```

#### CTA Button (Nature Green)
```typescript
const CTAButton = {
  container: {
    backgroundColor: colors.secondary.forest,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  text: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  pressed: {
    backgroundColor: colors.secondary.forestDark,
  },
};
```

#### Accent Button (Warm Wood)
```typescript
const AccentButton = {
  container: {
    backgroundColor: colors.accent.wood,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  text: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  pressed: {
    backgroundColor: colors.accent.woodDark,
  },
};
```

#### Icon Button
```typescript
const IconButton = {
  container: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  icon: {
    size: 24,
    color: colors.primary.black,
  },
};
```

### Cards

#### Venue Card (Featured)
Display venues (event spaces) like Cabana, Open Field, etc.

**Backend fields used**: `name`, `description`, `featured_image`, `gallery_images`, `minimum_capacity`, `maximum_capacity`, `recommended_capacity`, `is_overnight`

```typescript
const VenueCardFeatured = {
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.neutral.white,
    ...shadows.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  title: {
    ...typeScale.titleLarge,
    color: colors.neutral.white,
    marginBottom: spacing.xxs,
  },
  capacityBadge: {
    ...typeScale.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  overnightBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.secondary.forest,  // Nature green for overnight badge
    borderRadius: 8,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
};
```

#### Package Card (Featured)
Display packages/products with pricing.

**Backend fields used**: `name`, `description`, `base_price`, `pricing_model` (FIXED/HOURLY), `type` (PACKAGE/PRODUCT), `minimum_guests`, `maximum_guests`, `event_days`

```typescript
const PackageCardFeatured = {
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.neutral.white,
    ...shadows.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
    marginBottom: spacing.xxs,
  },
  description: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceMain: {
    ...typeScale.priceMain,
    color: colors.primary.black,
  },
  priceUnit: {
    ...typeScale.priceUnit,
    color: colors.neutral.darkGray,
    marginLeft: spacing.xxs,
  },
  // Display "/hour" for HOURLY pricing_model, or nothing for FIXED
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
};
```

#### Venue Card (Compact)
For horizontal lists and selection screens.

```typescript
const VenueCardCompact = {
  container: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 16,
    margin: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  capacityRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  capacityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
};
```

#### Info Card
```typescript
const InfoCard = {
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    ...shadows.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accent.lavenderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
};
```

### Chips & Pills

#### Category Chip
For filtering by ProductCategory or EventType.

**Backend fields used**: `ProductCategory.name`, `EventType.name`

```typescript
const CategoryChip = {
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
  },
  containerActive: {
    backgroundColor: colors.primary.black,
    borderColor: colors.primary.black,
  },
  text: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  textActive: {
    color: colors.neutral.white,
  },
};
```

#### Venue Feature Chip
Display venue characteristics (NOT hotel amenities).

**Example values**: "Overnight", "Outdoor", "Indoor", "Pool Access"

```typescript
const VenueFeatureChip = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.neutral.beige,  // Warm beige background
    gap: spacing.xs,
  },
  icon: {
    size: 16,
    color: colors.primary.black,
  },
  text: {
    ...typeScale.labelSmall,
    color: colors.primary.black,
  },
};
```

#### Event Status Badge
Display event/booking status.

**Backend values**: `LEAD`, `CONFIRMED`, `COMPLETED`, `CANCELLED`

```typescript
const EventStatusBadge = {
  base: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
  },
  LEAD: {
    backgroundColor: colors.semantic.info,
  },
  CONFIRMED: {
    backgroundColor: colors.secondary.sage,
  },
  COMPLETED: {
    backgroundColor: colors.neutral.darkGray,
  },
  CANCELLED: {
    backgroundColor: colors.semantic.error,
  },
  text: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
};
```

#### Payment Status Badge
Display payment status.

**Backend values**: `UNPAID`, `PARTIALLY_PAID`, `PAID`

```typescript
const PaymentStatusBadge = {
  base: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
  },
  UNPAID: {
    backgroundColor: colors.semantic.error,
  },
  PARTIALLY_PAID: {
    backgroundColor: colors.semantic.warning,
  },
  PAID: {
    backgroundColor: colors.secondary.sage,
  },
  text: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
};
```

#### Badge
```typescript
const Badge = {
  container: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.secondary.forest,  // Nature green for badges
  },
  text: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
};
```

### Input Fields

#### Text Input
```typescript
const TextInput = {
  container: {
    backgroundColor: colors.neutral.beige,  // Warm beige background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  containerFocused: {
    borderColor: colors.primary.black,
    backgroundColor: colors.neutral.white,
  },
  label: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginBottom: spacing.xs,
  },
  input: {
    ...typeScale.bodyLarge,
    color: colors.primary.black,
  },
  placeholder: {
    color: colors.neutral.gray,
  },
};
```

#### Search Bar
```typescript
const SearchBar = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.beige,  // Warm beige background
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  icon: {
    size: 20,
    color: colors.neutral.gray,
  },
  input: {
    flex: 1,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
};
```

### Navigation

#### Bottom Navigation Bar
```typescript
const BottomNavBar = {
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl, // Account for safe area
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...shadows.bottomNav,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    minWidth: 60,
  },
  itemActive: {
    // Active indicator
  },
  icon: {
    size: 24,
    color: colors.neutral.gray,
  },
  iconActive: {
    color: colors.primary.black,
  },
  activeIndicator: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  labelActive: {
    color: colors.primary.black,
    fontWeight: '600',
  },
};
```

#### Header
```typescript
const Header = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
  },
  transparent: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  title: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
};
```

### Modals & Sheets

#### Bottom Sheet
```typescript
const BottomSheet = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral.warmGray,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
};
```

### Ratings & Reviews

#### Star Rating
```typescript
const StarRating = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  star: {
    size: 16,
    color: colors.semantic.warning,
  },
  starEmpty: {
    color: colors.neutral.warmGray,
  },
  text: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    marginLeft: spacing.xs,
  },
  reviewCount: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
};
```

#### Review Card
```typescript
const ReviewCard = {
  container: {
    backgroundColor: colors.neutral.beige,  // Warm beige background
    borderRadius: 16,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  quote: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    fontStyle: 'italic',
  },
};
```

---

## Icons & Imagery

### Iconography Philosophy

LifePlace icons should be **simple**, **line-based**, and **minimal** to align with the clean, serene brand aesthetic. Icons serve as subtle visual cues rather than dominant elements.

### Brand-Specific Icons

| Symbol | Usage | Style |
|--------|-------|-------|
| Wheat sheaves | Growth themes, abundance, fullness of life | Line icon, symmetrical |
| Cross | Sanctuary/chapel facilities | Simple line cross |
| Tent | Camping experiences | Line-based tent outline |
| Group/People | Team building, community | Minimal human figures |
| Tree/Leaf | Nature, outdoor themes | Organic line shapes |

### Icon Library
Use **Phosphor Icons** or **Feather Icons** for consistency. Recommended icons:

#### Navigation Icons
| Function | Icon Name | Size |
|----------|-----------|------|
| Home | `house` | 24 |
| Search | `magnifying-glass` | 24 |
| My Events | `calendar-blank` | 24 |
| Favorites | `heart` | 24 |
| Profile | `user` | 24 |
| Back | `arrow-left` | 24 |
| Close | `x` | 24 |
| Share | `share` | 24 |
| Filter | `sliders` | 24 |
| Notification | `bell` | 24 |

#### Venue & Event Icons
| Function | Icon Name | Size | Usage |
|----------|-----------|------|-------|
| Capacity | `users` | 16-20 | Show min/max/recommended guests |
| Duration | `clock` | 16-20 | Program hours, event duration |
| Date | `calendar` | 16-20 | Event dates |
| Time | `clock-afternoon` | 16-20 | Check-in/checkout times |
| Overnight | `moon` | 16-20 | is_overnight venues |
| Day Event | `sun` | 16-20 | Non-overnight venues |
| Location | `map-pin` | 16-20 | Venue location |
| Outdoor | `tree` | 16-20 | Outdoor venue indicator |
| Indoor | `house-line` | 16-20 | Indoor venue indicator |

#### Payment & Status Icons
| Function | Icon Name | Size | Usage |
|----------|-----------|------|-------|
| Price | `currency-circle-dollar` | 16-20 | Pricing display |
| Payment | `credit-card` | 20 | Payment methods |
| Invoice | `file-text` | 20 | Invoice/receipts |
| Success | `check-circle` | 20 | Confirmed status |
| Warning | `warning` | 20 | Pending/overdue |
| Error | `x-circle` | 20 | Cancelled/failed |

#### Booking Flow Icons
| Function | Icon Name | Size | Usage |
|----------|-----------|------|-------|
| Venue Selection | `buildings` | 24 | Step: venue_selection |
| Date Selection | `calendar-check` | 24 | Step: date_time |
| Package | `package` | 24 | Step: package_selection |
| Add-ons | `plus-circle` | 24 | Step: addon_selection |
| Summary | `list-checks` | 24 | Step: pricing_summary |
| Contact | `address-book` | 24 | Step: contact_info |
| Payment | `wallet` | 24 | Step: payment_info |
| Confirmation | `seal-check` | 24 | Step: confirmation |

#### Star Rating
| Function | Icon Name | Size |
|----------|-----------|------|
| Star Filled | `star-fill` | 16 |
| Star Empty | `star` | 16 |

### Icon Styling
```typescript
const iconStyles = {
  // Navigation icons
  nav: {
    size: 24,
    strokeWidth: 1.5,
  },
  // In-content icons
  content: {
    size: 20,
    strokeWidth: 1.5,
  },
  // Small inline icons
  inline: {
    size: 16,
    strokeWidth: 2,
  },
};
```

### Image Guidelines

#### Imagery Style

LifePlace imagery should be:
- **Photo-centric**: High-quality photographs dominate, building trust and immersion
- **Realistic and aspirational**: Warm lighting, soft focus on details
- **Subject matter**: Venue facilities, weddings, retreats, natural surroundings
- **Details**: Floral decorations, wooden structures, green foliage, people in celebratory or reflective settings
- **Composition**: Wide-angle shots to emphasize spaciousness; avoid abstract graphics or illustrations

#### Aspect Ratios
- **Hero images**: 16:9 or full-bleed
- **Venue cards**: 4:3
- **Gallery thumbnails**: 1:1
- **List images**: 1:1

#### Image Treatment
```typescript
const imageStyles = {
  // Standard rounded image
  rounded: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  // Full-bleed hero
  hero: {
    width: '100%',
    height: 300,
  },
  // With gradient overlay - for text readability
  withOverlay: {
    // Apply LinearGradient from transparent to rgba(0,0,0,0.6)
  },
  // Gallery thumbnail
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
};
```

#### Placeholder & Loading States
```typescript
const imagePlaceholder = {
  backgroundColor: colors.neutral.beige,  // Warm beige aligned with brand
  // Use skeleton animation with shimmer effect for calming transitions
};
```

---

## Animations & Interactions

### Timing Functions
```typescript
export const animation = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    standard: Easing.bezier(0.4, 0.0, 0.2, 1),
    decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
    accelerate: Easing.bezier(0.4, 0.0, 1, 1),
    sharp: Easing.bezier(0.4, 0.0, 0.6, 1),
  },
};
```

### Common Animations

#### Button Press
```typescript
const buttonPressAnimation = {
  scale: 0.97,
  duration: 100,
};
```

#### Card Press
```typescript
const cardPressAnimation = {
  scale: 0.98,
  duration: 150,
};
```

#### Page Transitions
- **Push**: Slide from right (300ms)
- **Modal**: Slide from bottom (300ms)
- **Fade**: Cross-fade (200ms)

#### Micro-interactions
- **Favorite heart**: Scale bounce + fill animation
- **Bottom nav**: Smooth indicator slide
- **Pull to refresh**: Custom LifePlace animation
- **Loading**: Skeleton shimmer effect

---

## Screen Templates

### 1. Home/Explore Screen
**Data sources**: `Venue`, `ProductOption`, `EventType`, `User`

```
┌─────────────────────────────────┐
│  [Logo]              [Bell][Av] │  ← Header with notifications
│                                 │
│  Good Morning, [first_name]!    │  ← User.first_name
│  Plan Your Next Event           │
│                                 │
│  [🔍 Search venues...      ]    │  ← Search bar
│                                 │
│  [All] [Retreats] [Weddings]    │  ← EventType.name chips
│                                 │
│  Featured Venues                │
│  ┌───────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░ │  │  ← Venue.featured_image
│  │ ░░░░ [Image] ░░░░░░░░░░░ │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  │ [Overnight]              │  │  ← Venue.is_overnight badge
│  │ Venue Name               │  │  ← Venue.name
│  │ 👥 50-100 guests         │  │  ← min/max_capacity
│  └───────────────────────────┘  │
│                                 │
│  Popular Packages               │
│  ┌─────────┐ ┌─────────┐       │  ← ProductOption (type=PACKAGE)
│  │ [Image] │ │ [Image] │       │
│  │ Package │ │ Package │       │     ProductOption.name
│  │ ₱5,000  │ │ ₱8,000  │       │     ProductOption.base_price
│  └─────────┘ └─────────┘       │
│                                 │
│  ─────────────────────────────  │
│  [🏠]    [📅]    [❤️]    [👤]  │  ← Bottom navigation
└─────────────────────────────────┘
```

### 2. Venue Detail Screen
**Data sources**: `Venue`, `VenueOperatingRules`, `PackageVenue`, `EventFeedback`

```
┌─────────────────────────────────┐
│ [← ]                    [♡] [⤴] │  ← Floating header
│                                 │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← Venue.gallery_images
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │     with swipeable carousel
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │     (1/N)
│                                 │
│  Venue Name                     │  ← Venue.name
│  📍 Location                    │  ← Venue.location_description
│  ⭐ 4.8 (234 reviews) >         │  ← EventFeedback.overall_rating avg
│                                 │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐   │  ← Venue capacity boxes
│  │ 👥 │ │ 🌙 │ │ ⏱️ │ │ 🔓 │   │
│  │ Min│ │Over│ │Prog│ │Check│   │
│  │ 50 │ │nite│ │8hr │ │2PM │   │
│  └────┘ └────┘ └────┘ └────┘   │
│  min_   is_    default  default │  ← VenueOperatingRules
│  cap    over   _program check_  │
│         night  _hours   in_time │
│                                 │
│  [About] [Packages] [Reviews]   │  ← Tab navigation
│                                 │
│  Description text goes here...  │  ← Venue.description
│  Lorem ipsum dolor sit amet...  │
│                                 │
│  Available Packages             │
│  ┌───────────────────────────┐  │  ← PackageVenue → ProductOption
│  │ Package Name        ₱5000 │  │
│  │ 8 hours • 50 guests      │  │
│  └───────────────────────────┘  │
│                                 │
│  ─────────────────────────────  │
│  From ₱5,000      [ Book Now ]  │  ← Sticky footer
└─────────────────────────────────┘
```

### 3. Booking Flow Steps
**Data sources**: `BookingFlow`, `BookingFlowStep`, `BookingSession`

The booking flow has multiple step types. Here are the key screens:

#### Step: Venue Selection (venue_selection)
```
┌─────────────────────────────────┐
│  [←]  Select Venue(s)     [X]   │
│  ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← BookingSession progress
│                                 │
│  Choose your event space        │
│                                 │
│  ┌───────────────────────────┐  │
│  │ [Image]   Venue Name     │  │  ← Venue cards
│  │           👥 50-100      │  │     (from VenueSelectionStep
│  │           ₱500/hr        │  │      Configuration.available_venues)
│  │                    [✓]   │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ [Image]   Venue Name 2   │  │
│  │           👥 20-50       │  │
│  │           ₱300/hr        │  │
│  │                    [ ]   │  │
│  └───────────────────────────┘  │
│                                 │
│  ─────────────────────────────  │
│  1 selected          [Continue] │
└─────────────────────────────────┘
```

#### Step: Date & Time Selection (date_time)
```
┌─────────────────────────────────┐
│  [←]     Step 2 of 8     [X]    │
│  ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░  │
│                                 │
│  Select Event Date              │
│                                 │
│  ┌───────────────────────────┐  │
│  │      December 2024        │  │
│  │  S  M  T  W  T  F  S      │  │
│  │  1  2  3  4  5  6  7      │  │
│  │  8  9 10 11 12 13 14      │  │
│  │ [15]16 17 18 19 20 21     │  │  ← Event.start_date
│  │ 22 23 24 25 26 27 28      │  │
│  │ 29 30 31                  │  │
│  └───────────────────────────┘  │
│                                 │
│  Event Duration                 │  ← Based on ProductOption.event_days
│  ┌───────────────────────────┐  │     or custom selection
│  │ Program Hours: [8] hours  │  │  ← VenueOperatingRules constraints
│  └───────────────────────────┘  │
│                                 │
│  Number of Guests               │
│  ┌───────────────────────────┐  │
│  │        [ - ] 75 [ + ]     │  │  ← Event.num_participants
│  └───────────────────────────┘  │
│                                 │
│  ─────────────────────────────  │
│                     [Continue]  │
└─────────────────────────────────┘
```

#### Step: Package Selection (package_selection)
```
┌─────────────────────────────────┐
│  [←]  Select Package     [X]    │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░  │
│                                 │
│  Choose your package            │
│                                 │
│  ┌───────────────────────────┐  │  ← ProductOption (type=PACKAGE)
│  │ [Image]                   │  │
│  │ Package Name              │  │     ProductOption.name
│  │ Description text...       │  │     ProductOption.description
│  │                           │  │
│  │ 👥 50-100  ⏱️ 8hrs        │  │     min/max_guests, min/max_hours
│  │                           │  │
│  │ ₱5,000           [Select] │  │     base_price (pricing_model)
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Premium Package           │  │
│  │ All-inclusive retreat...  │  │
│  │                           │  │
│  │ 👥 50-100  📅 2D1N        │  │     event_days for multi-day
│  │                           │  │
│  │ ₱12,000          [Select] │  │
│  └───────────────────────────┘  │
│                                 │
│  ─────────────────────────────  │
│                     [Continue]  │
└─────────────────────────────────┘
```

#### Step: Pricing Summary (pricing_summary)
```
┌─────────────────────────────────┐
│  [←]  Review & Pay       [X]    │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░  │
│                                 │
│  Booking Summary                │
│                                 │
│  Venue: Cabana                  │  ← Selected venue
│  Date: Dec 15, 2024             │  ← Event.start_date
│  Time: 2:00 PM - 10:00 PM       │  ← Program times
│  Guests: 75                     │  ← Event.num_participants
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Package                        │
│  Premium Event Package    ₱5000 │  ← EventProductOption
│    Excess hours (2)        ₱600 │     excess_hours × excess_hour_price
│                                 │
│  Add-ons                        │
│  Catering (75 pax)        ₱7500 │  ← EventProductOption (type=PRODUCT)
│  Sound System              ₱500 │
│                                 │
│  ─────────────────────────────  │
│  Subtotal               ₱13,600 │
│  VAT (12%)               ₱1,632 │  ← ProductOption.tax_rate
│  ─────────────────────────────  │
│  Total                  ₱15,232 │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Discount Code: [        ] │  │  ← Discount.code
│  └───────────────────────────┘  │
│                                 │
│  ☐ I agree to terms...          │
│                                 │
│  ─────────────────────────────  │
│  ₱15,232       [Proceed to Pay] │
└─────────────────────────────────┘
```

### 4. My Events Screen
**Data sources**: `Event`, `EventProductOption`, `Payment`

```
┌─────────────────────────────────┐
│  My Events                      │
│                                 │
│  [Upcoming] [Past] [Cancelled]  │  ← Filter by Event.status
│                                 │
│  ┌───────────────────────────┐  │
│  │ [Venue Image]             │  │
│  │                           │  │
│  │ Event Name         [CONF] │  │  ← Event.name, status badge
│  │ Cabana                    │  │  ← Venue.name
│  │ 📅 Dec 15, 2024           │  │  ← Event.start_date
│  │ ⏱️ 2:00 PM - 10:00 PM     │  │  ← Program times
│  │ 👥 75 guests              │  │  ← Event.num_participants
│  │                           │  │
│  │ ─────────────────────────│  │
│  │ Payment: [PARTIALLY PAID] │  │  ← Event.payment_status
│  │ ₱7,500 / ₱15,232         │  │  ← total_amount_paid / total_amount_due
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Another Event     [LEAD]  │  │
│  │ Open Field                │  │
│  │ 📅 Jan 20, 2025           │  │
│  │ Awaiting Quote            │  │
│  └───────────────────────────┘  │
│                                 │
│  ─────────────────────────────  │
│  [🏠]    [📅]    [❤️]    [👤]  │
└─────────────────────────────────┘
```

### 5. Event Detail Screen
**Data sources**: `Event`, `EventQuote`, `PaymentPlan`, `Payment`, `EventTask`

```
┌─────────────────────────────────┐
│ [← ]  Event Details     [⋮]    │
│                                 │
│  Corporate Retreat              │  ← Event.name
│  ┌───────────────────────────┐  │
│  │ Status: CONFIRMED         │  │  ← Event.status
│  │ Payment: PARTIALLY PAID   │  │  ← Event.payment_status
│  └───────────────────────────┘  │
│                                 │
│  Event Details                  │
│  ─────────────────────────────  │
│  Venue      Cabana              │
│  Date       Dec 15, 2024        │
│  Time       2:00 PM - 10:00 PM  │
│  Guests     75                  │
│  Check-in   PENDING             │  ← Event.check_in_status
│                                 │
│  Payment Summary                │
│  ─────────────────────────────  │
│  Total Due        ₱15,232       │  ← Event.total_amount_due
│  Paid             ₱7,500        │  ← Event.total_amount_paid
│  Balance          ₱7,732        │
│                                 │
│  Payment Schedule               │  ← PaymentPlan + PaymentInstallment
│  ┌───────────────────────────┐  │
│  │ Downpayment   ✓  ₱4,570  │  │
│  │ Dec 1, 2024        PAID  │  │
│  ├───────────────────────────┤  │
│  │ Installment 1     ₱3,831  │  │
│  │ Dec 8, 2024      PENDING │  │
│  ├───────────────────────────┤  │
│  │ Balance          ₱3,831  │  │
│  │ Dec 14, 2024     PENDING │  │
│  └───────────────────────────┘  │
│                                 │
│  ─────────────────────────────  │
│           [ Make Payment ]      │
└─────────────────────────────────┘
```

### 6. Onboarding/Welcome Screen
```
┌─────────────────────────────────┐
│                                 │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░ [Full Bleed ░░░░░░░░  │
│  ░░░░░░░░ Image] ░░░░░░░░░░░░  │  ← Beautiful venue photo
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                 │
│  ╭─────────────────────────────╮│
│  │                             ││
│  │  Plan Your Perfect          ││
│  │  Event                      ││
│  │                             ││
│  │  Book retreats, weddings,   ││
│  │  and corporate events at    ││
│  │  LifePlace.                 ││
│  │                             ││
│  │     [ Get Started ]         ││
│  │                             ││
│  │         • • •               ││
│  ╰─────────────────────────────╯│
└─────────────────────────────────┘
```

---

## Implementation Notes

### React Native Specifics

```typescript
// theme.ts - Export all design tokens
export const theme = {
  colors,
  typography,
  typeScale,
  spacing,
  layout,
  shadows,
  animation,
};

// Use with styled-components or StyleSheet
import { theme } from './theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.layout.cardBorderRadius,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
});
```

### Accessibility Requirements
- Minimum touch target: 44x44 points
- Color contrast ratio: 4.5:1 minimum
- Support Dynamic Type on iOS
- Screen reader labels on all interactive elements
- Haptic feedback on key interactions

### Dark Mode Considerations
```typescript
// Future dark mode palette - maintaining brand serenity
export const darkColors = {
  background: '#1A1D1F',
  surface: '#252A2E',
  surfaceElevated: '#2E3338',
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255,255,255,0.7)',
  },
  accent: {
    wood: '#A0522D',     // Sienna - lighter brown for dark mode
    forest: '#32CD32',   // Lighter green for dark mode
    teal: '#20B2AA',     // Light sea green
  },
};
```

---

## Asset Checklist

### Required Assets
- [ ] LifePlace logo (SVG, PNG @1x, @2x, @3x)
- [ ] App icon (1024x1024 + all required sizes)
- [ ] Splash screen
- [ ] Placeholder images
- [ ] Icon set (Phosphor or custom)
- [ ] Lottie animations for loading states
- [ ] Empty state illustrations

### Font Files
- [ ] SF Pro Display (iOS system)
- [ ] Roboto (Android system)
- [ ] Custom font if brand requires (include all weights)

---

## Backend Data Reference

This section provides a quick reference for the key backend entities and their fields that the mobile app will consume.

### Core Entities

#### User
```typescript
interface User {
  id: number;
  email: string;           // Primary identifier (email-based auth)
  first_name: string;
  last_name: string;
  role: 'CLIENT' | 'ADMIN';
  is_active: boolean;
  date_joined: string;     // ISO datetime
  profile?: UserProfile;
}

interface UserProfile {
  phone?: string;
  company?: string;
  display_timezone: string;  // Default: 'Asia/Manila'
}
```

#### Venue
```typescript
interface Venue {
  id: string;              // UUID
  name: string;            // e.g., "Cabana", "Open Field"
  code: string;            // Unique code
  description?: string;
  is_overnight: boolean;   // For overnight stays
  location_description?: string;

  // Capacity
  minimum_capacity: number;
  maximum_capacity: number;
  recommended_capacity: number;

  // Status
  is_active: boolean;
  is_bookable: boolean;

  // Images
  featured_image?: string;  // URL
  gallery_images: string[]; // Array of URLs

  // Standalone rental pricing (if applicable)
  is_rentable_standalone: boolean;
  standalone_base_price?: number;
  standalone_included_hours?: number;
  standalone_excess_hour_price?: number;

  // Related
  operating_rules?: VenueOperatingRules;
}

interface VenueOperatingRules {
  default_check_in_time: string;   // HH:MM format
  default_checkout_time: string;
  checkout_next_day: boolean;

  minimum_program_hours: number;
  maximum_program_hours: number;
  default_program_hours: number;
  is_fixed_duration: boolean;

  // Early check-in
  early_checkin_allowed: boolean;
  early_checkin_fee_per_hour?: number;
  earliest_checkin_time?: string;

  // Late checkout
  late_checkout_allowed: boolean;
  late_checkout_fee_per_hour?: number;
  late_checkout_max_hours: number;
}
```

#### ProductOption (Package/Add-on)
```typescript
interface ProductOption {
  id: string;              // UUID
  name: string;
  description: string;
  category: ProductCategory;
  type: 'PACKAGE' | 'PRODUCT';

  // Pricing
  pricing_model: 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM';
  base_price: number;
  currency: string;        // Default: 'PHP'
  tax_rate: number;        // Default: 12.00 (%)
  is_tax_inclusive: boolean;

  // Computed
  formatted_price: string; // e.g., "PHP 5000.00" or "PHP 500/hour"
  price_with_tax: number;

  // Constraints
  minimum_hours?: number;
  maximum_hours?: number;
  minimum_guests?: number;
  maximum_guests?: number;
  recommended_guests?: number;

  // Multi-day packages (e.g., 2D1N camps)
  event_days?: number;     // e.g., 2 for 2D1N

  // Status
  is_active: boolean;
  is_featured: boolean;
  allow_multiple: boolean;

  // Booking constraints
  advance_booking_days: number;
  maximum_booking_days: number;
}

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  slug: string;
  parent?: ProductCategory;
  is_active: boolean;
  requires_venue: boolean;
  full_path: string;       // Computed hierarchy path
}
```

#### Event (Booking)
```typescript
interface Event {
  id: string;
  client: User;
  name: string;

  // Status
  status: 'LEAD' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

  // Dates & Times
  start_date: string;      // ISO datetime
  end_date: string;
  program_start_time?: string;
  program_end_time?: string;
  program_duration_hours?: number;

  // Venue
  venue?: Venue;

  // Guests
  num_participants?: number;

  // Payment
  total_amount_due?: number;
  total_amount_paid: number;

  // Check-in tracking
  check_in_status: 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW';
  scheduled_check_in_time?: string;
  scheduled_checkout_time?: string;
  actual_check_in_time?: string;
  actual_checkout_time?: string;

  // Products
  products: EventProductOption[];

  // Related
  accepted_quote?: EventQuote;
  payment_plan?: PaymentPlan;
}

interface EventProductOption {
  id: string;
  product_option: ProductOption;
  quantity: number;
  final_price: number;
  num_participants?: number;
  num_nights?: number;
  excess_hours?: number;
}
```

#### Booking Flow
```typescript
interface BookingFlow {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;

  // Configuration
  allow_guest_booking: boolean;
  require_account_creation: boolean;
  auto_approve_bookings: boolean;

  // Constraints
  max_advance_booking_days: number;
  min_advance_booking_days: number;

  // Steps
  steps: BookingFlowStep[];
}

interface BookingFlowStep {
  id: string;
  step_type:
    | 'introduction'
    | 'venue_selection'
    | 'date_time'
    | 'questionnaire'
    | 'package_selection'
    | 'addon_selection'
    | 'pricing_summary'
    | 'contact_info'
    | 'payment_info'
    | 'confirmation';
  order: number;
  is_enabled: boolean;
  is_required: boolean;
  is_skippable: boolean;
  configuration: StepConfiguration;
}

interface BookingSession {
  session_id: string;      // UUID
  booking_flow: BookingFlow;
  client?: User;
  current_step?: BookingFlowStep;
  completed_steps: BookingFlowStep[];
  booking_data: BookingData;
  is_completed: boolean;
  is_abandoned: boolean;
  expires_at: string;
  created_event?: Event;
  progress_percentage: number;  // Computed
}

interface BookingData {
  selected_venues?: string[];
  selected_packages?: string[];
  selected_addons?: string[];
  event_date?: string;
  duration?: number;
  num_participants?: number;
  contact_info?: ContactInfo;
  questionnaire_responses?: Record<string, any>;
}
```

#### Payment
```typescript
interface Payment {
  id: string;
  payment_number: string;  // Unique, generated
  event: Event;
  amount: number;
  currency: string;        // Default: 'PHP'
  status: 'CREATED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  due_date: string;        // Date
  paid_on?: string;        // Date
  description?: string;
  reference_number?: string;
  receipt_number?: string;
}

interface PaymentPlan {
  id: string;
  event: Event;
  total_amount: number;
  down_payment_amount: number;
  currency: string;
  down_payment_due_date: string;
  number_of_installments: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'DEFAULTED' | 'CANCELLED';

  // Computed
  paid_amount: number;
  remaining_balance: number;
  is_overdue: boolean;
  completion_percentage: number;

  installments: PaymentInstallment[];
}

interface PaymentInstallment {
  id: string;
  amount: number;
  due_date: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'WAIVED' | 'CANCELLED';
  installment_number: number;
  late_fee_amount: number;

  // Computed
  paid_amount: number;
  remaining_amount: number;
  is_fully_paid: boolean;
  days_overdue_count: number;
}
```

#### EventQuote
```typescript
interface EventQuote {
  id: string;
  event: Event;
  version: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

  // Pricing
  subtotal: number;
  tax_amount: number;
  service_charge_amount: number;
  discount_amount: number;
  total_amount: number;

  // Dates
  valid_until: string;
  sent_at?: string;
  accepted_at?: string;
  rejected_at?: string;

  // Content
  notes?: string;
  terms_and_conditions?: string;

  line_items: QuoteLineItem[];
}

interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
  product?: ProductOption;
  item_type: 'PACKAGE' | 'ADDON';
  excess_hours?: number;
  excess_hour_price?: number;
}
```

#### EventFeedback
```typescript
interface EventFeedback {
  id: string;
  event: Event;
  submitted_by?: User;
  overall_rating: 1 | 2 | 3 | 4 | 5;
  categories: Record<string, number>;  // Category-specific ratings
  comments?: string;
  testimonial?: string;
  is_public: boolean;
  response?: string;
  created_at: string;
}
```

### Key Calculations

| Calculation | Formula |
|-------------|---------|
| Event Total Price | Sum of `EventProductOption.final_price` |
| Total Paid | Sum of `Payment` with `status='COMPLETED'` |
| Remaining Balance | `total_amount_due - total_amount_paid` |
| Booking Progress | `(completed_steps.length / total_steps) * 100` |
| Price with Tax | `base_price * (1 + tax_rate/100)` if not inclusive |

### Currency & Formatting

- **Currency**: PHP (Philippine Peso)
- **Currency Symbol**: ₱
- **Decimal Places**: 2 for prices
- **Timezone**: Asia/Manila (default)
- **Date Format**: ISO 8601 from API, display as localized

---

## Interactive Elements Guidelines

### Buttons
- **Shape**: Rectangular with rounded corners (12px radius)
- **Hover/Press effects**: Subtle color shifts or shadows for engagement
- **Primary CTA**: Forest green (`#228B22`) with white text
- **Secondary**: White with black border and text
- **Warm accent**: Wood brown (`#8B4513`) for booking confirmations

### Navigation
- **Menu style**: Horizontal bar with dropdowns for subpages
- **Bottom navigation**: Rounded top corners, clean icons, active state indicator

### Forms
- **Input fields**: Clean inputs with placeholder text
- **Submit buttons**: Green accents to tie into nature theme
- **Validation**: Subtle, non-intrusive error states

### Advanced Interactions (Future)
- **Parallax scrolling**: For immersive venue tours
- **Interactive maps**: For facility exploration
- **Smooth transitions**: Calming animations between screens

---

*Last updated: December 2024*
*Version: 2.0 - Comprehensive brand identity update with LifePlace business theme, styling overview, and complete color palette*
