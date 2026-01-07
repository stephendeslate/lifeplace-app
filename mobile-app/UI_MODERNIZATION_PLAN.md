# LifePlace Mobile App UI Modernization Plan

**Goal**: Transform the mobile app to a Clean & Minimal Apple-like aesthetic while maintaining brand alignment with [lifeplacealfonso.com](https://lifeplacealfonso.com)

**Target Audience**: Tech-savvy millennials
**Design Direction**: Clean & Minimal with custom display typography

---

## Table of Contents

1. [Brand Alignment Analysis](#brand-alignment-analysis)
2. [Color System Overhaul](#color-system-overhaul)
3. [Typography System](#typography-system)
4. [High Priority Components](#high-priority-components)
5. [Implementation Phases](#implementation-phases)
6. [File-by-File Changes](#file-by-file-changes)

---

## Brand Alignment Analysis

### Website vs Current Mobile App

| Element | lifeplacealfonso.com | Current Mobile App | Recommended |
|---------|---------------------|-------------------|-------------|
| Primary Button | `#32373C` (dark gray) | `#000000` (black) | `#1A1A1A` (soft black) |
| Accent | `#4AA485` (teal-green) | `#228B22` (forest green) | `#3D9970` (balanced teal-green) |
| Background | White | `#B5CAA0` (sage) | `#FAFBFC` (off-white) |
| Typography | System fonts (Segoe UI/Roboto) | System fonts | Custom display + system body |
| Aesthetic | "Peaceful, cozy, nature-forward" | Rustic-modern | Clean & Minimal with organic accents |

### Key Insight

The website uses **neutral backgrounds with selective green accents** rather than a green-dominant palette. The mobile app should follow this pattern for the "Clean & Minimal" feel while using nature colors strategically.

---

## Color System Overhaul

### Current Problems

1. **Sage background (`#B5CAA0`)** is too saturated - competes with content
2. **Pure black (`#000000`)** is harsh - Apple uses softer blacks
3. **Multiple accent colors** (wood, forest, teal) create confusion
4. **No clear visual hierarchy** through color

### New Color Architecture

```typescript
// src/theme/index.ts - PROPOSED CHANGES

export const colors = {
  // ═══════════════════════════════════════════════════════════════════════════
  // BRAND COLORS (derived from website + refined for mobile)
  // ═══════════════════════════════════════════════════════════════════════════

  brand: {
    // Primary brand green - used sparingly for key actions
    green: {
      50: '#F0F7F4',    // Backgrounds, subtle tints
      100: '#D1E7DB',   // Hover states on light
      200: '#A3D0B8',   // Borders, dividers
      300: '#75B894',   // Secondary elements
      400: '#4AA485',   // Website accent - interactive hover
      500: '#3D9970',   // PRIMARY ACCENT - CTAs, links, active states
      600: '#357A5C',   // Pressed states
      700: '#2C5B48',   // Dark mode accent
      800: '#233C34',   // Dark backgrounds
      900: '#1A1D1F',   // Near black
    },

    // Nature accent - for warmth and organic feel (use very sparingly)
    earth: {
      50: '#FAF8F5',    // Warm off-white backgrounds
      100: '#F5EDE5',   // Card backgrounds with warmth
      200: '#E8DCD0',   // Borders with warmth
      300: '#C4A882',   // Decorative elements
      400: '#A0522D',   // Sienna - accent details
      500: '#8B6914',   // Gold - featured badges
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEUTRAL PALETTE (Apple-inspired)
  // ═══════════════════════════════════════════════════════════════════════════

  neutral: {
    0: '#FFFFFF',       // Pure white - cards, modals
    25: '#FAFBFC',      // App background - barely off-white
    50: '#F6F8FA',      // Section backgrounds
    100: '#EEF1F4',     // Input backgrounds
    200: '#E1E4E8',     // Borders, dividers
    300: '#D1D5DA',     // Disabled borders
    400: '#959DA5',     // Placeholder text, icons
    500: '#6A737D',     // Secondary text
    600: '#586069',     // Body text (light mode)
    700: '#444D56',     // Primary text (light mode)
    800: '#2F363D',     // Headings
    900: '#1A1A1A',     // Primary text, buttons (soft black)
    1000: '#0D0D0D',    // Pure black (use rarely)
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC COLORS
  // ═══════════════════════════════════════════════════════════════════════════

  semantic: {
    success: {
      light: '#D4EDDA',
      main: '#28A745',
      dark: '#1E7E34',
    },
    warning: {
      light: '#FFF3CD',
      main: '#F5A623',
      dark: '#D48806',
    },
    error: {
      light: '#F8D7DA',
      main: '#DC3545',
      dark: '#BD2130',
    },
    info: {
      light: '#D1ECF1',
      main: '#17A2B8',
      dark: '#117A8B',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCTIONAL MAPPINGS
  // ═══════════════════════════════════════════════════════════════════════════

  // These semantic names make usage clear
  background: {
    primary: '#FAFBFC',     // Main app background
    secondary: '#FFFFFF',   // Cards, elevated surfaces
    tertiary: '#F6F8FA',    // Section backgrounds, inputs
    accent: '#F0F7F4',      // Highlighted sections (subtle green)
    warm: '#FAF8F5',        // Warm sections (subtle earth)
  },

  text: {
    primary: '#1A1A1A',     // Headings, important text
    secondary: '#586069',   // Body text
    tertiary: '#6A737D',    // Supporting text
    placeholder: '#959DA5', // Input placeholders
    inverse: '#FFFFFF',     // Text on dark backgrounds
    link: '#3D9970',        // Links, interactive text
  },

  border: {
    light: '#EEF1F4',       // Subtle borders
    default: '#E1E4E8',     // Standard borders
    strong: '#D1D5DA',      // Emphasized borders
  },

  interactive: {
    primary: '#1A1A1A',     // Primary buttons
    primaryHover: '#2F363D',
    primaryPressed: '#444D56',

    secondary: '#FFFFFF',   // Secondary buttons (outline)
    secondaryBorder: '#1A1A1A',

    accent: '#3D9970',      // CTA buttons, links
    accentHover: '#4AA485',
    accentPressed: '#357A5C',

    disabled: '#E1E4E8',
    disabledText: '#959DA5',
  },
};
```

### Color Usage Guidelines

| Use Case | Color Token | Example |
|----------|-------------|---------|
| App background | `background.primary` (#FAFBFC) | SafeAreaView |
| Card background | `background.secondary` (#FFFFFF) | All cards |
| Hero sections | `background.accent` (#F0F7F4) | DiscoveryLayout hero |
| Primary buttons | `interactive.primary` (#1A1A1A) | "Book Now" |
| CTA buttons | `interactive.accent` (#3D9970) | "Start Planning" |
| Links | `text.link` (#3D9970) | "View All" |
| Body text | `text.secondary` (#586069) | Descriptions |
| Headings | `text.primary` (#1A1A1A) | Titles |
| Badges (featured) | `brand.earth.500` (#8B6914) | "Featured" badge |
| Success states | `semantic.success.main` | Payment confirmed |
| Error states | `semantic.error.main` | Validation errors |

### Visual Comparison

```
CURRENT                          PROPOSED
┌────────────────────┐           ┌────────────────────┐
│ ██████████████████ │           │ ░░░░░░░░░░░░░░░░░░ │
│ █ Sage Background █ │           │ ░ Off-White BG   ░ │
│ ██████████████████ │           │ ░░░░░░░░░░░░░░░░░░ │
│                    │           │                    │
│ ┌────────────────┐ │           │ ┌────────────────┐ │
│ │ White Card     │ │           │ │ White Card     │ │
│ │ with shadow    │ │           │ │ minimal shadow │ │
│ └────────────────┘ │           │ └────────────────┘ │
│                    │           │                    │
│ [BLACK BUTTON]     │           │ [SOFT BLACK BTN]   │
│ [FOREST GREEN]     │           │ [TEAL GREEN CTA]   │
└────────────────────┘           └────────────────────┘
```

---

## Typography System

### Current State

- Using system fonts only (SF Pro / Roboto)
- No custom brand typography
- Type scale is well-defined but underutilized
- Logo uses PNG images (good)

### Proposed Typography Stack

#### Font Selection

For "Clean & Minimal" with brand warmth, I recommend:

**Option A: Inter + Fraunces (Recommended)**
- **Display**: [Fraunces](https://fonts.google.com/specimen/Fraunces) - Soft serif with organic feel
- **Body**: [Inter](https://fonts.google.com/specimen/Inter) - Highly legible, modern sans-serif
- **Fallback**: System fonts

**Option B: DM Sans (All-in-one)**
- **All text**: [DM Sans](https://fonts.google.com/specimen/DM+Sans) - Geometric but friendly
- **Fallback**: System fonts

**Option C: System fonts with Inter for UI**
- **Display**: System serif (New York / Noto Serif)
- **Body**: [Inter](https://fonts.google.com/specimen/Inter) or system sans
- Minimal font loading overhead

### Implementation: Font Loading

```typescript
// app/_layout.tsx - Add font loading

import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  if (!fontsLoaded) {
    return <SplashScreen />;
  }

  // ... rest of layout
}
```

### Updated Typography Tokens

```typescript
// src/theme/index.ts - Typography section

export const fontFamily = {
  // Display - for hero text, large headings
  display: {
    semibold: 'Fraunces_600SemiBold',
    bold: 'Fraunces_700Bold',
  },

  // Sans - for UI, body text, buttons
  sans: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },

  // Fallback to system
  system: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
};

export const typeScale = {
  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY - Hero sections, welcome screens (Fraunces)
  // ═══════════════════════════════════════════════════════════════════════════
  displayLarge: {
    fontFamily: fontFamily.display.bold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontFamily: fontFamily.display.bold,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontFamily: fontFamily.display.semibold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADLINES - Section titles, card headers (Inter Bold/Semibold)
  // ═══════════════════════════════════════════════════════════════════════════
  headlineLarge: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  headlineMedium: {
    fontFamily: fontFamily.sans.semibold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.1,
  },
  headlineSmall: {
    fontFamily: fontFamily.sans.semibold,
    fontSize: 18,
    lineHeight: 26,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TITLES - Component headers, list items (Inter Semibold/Medium)
  // ═══════════════════════════════════════════════════════════════════════════
  titleLarge: {
    fontFamily: fontFamily.sans.semibold,
    fontSize: 17,
    lineHeight: 24,
  },
  titleMedium: {
    fontFamily: fontFamily.sans.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  titleSmall: {
    fontFamily: fontFamily.sans.medium,
    fontSize: 14,
    lineHeight: 20,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BODY - Primary content (Inter Regular/Medium)
  // ═══════════════════════════════════════════════════════════════════════════
  bodyLarge: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 13,
    lineHeight: 18,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LABELS - Buttons, chips, captions (Inter Medium)
  // ═══════════════════════════════════════════════════════════════════════════
  labelLarge: {
    fontFamily: fontFamily.sans.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: fontFamily.sans.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontFamily: fontFamily.sans.medium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL - Prices, numbers (Inter Bold)
  // ═══════════════════════════════════════════════════════════════════════════
  priceMain: {
    fontFamily: fontFamily.sans.bold,
    fontSize: 24,
    lineHeight: 28,
  },
  priceSecondary: {
    fontFamily: fontFamily.sans.medium,
    fontSize: 16,
    lineHeight: 20,
  },
};
```

### Typography Usage Guide

| Context | Style | Font | Example |
|---------|-------|------|---------|
| Hero greeting | `displayMedium` | Fraunces Bold | "Good Morning, John!" |
| Section headers | `headlineLarge` | Inter Bold | "Featured Venues" |
| Card titles | `titleLarge` | Inter Semibold | "The Cabana" |
| Body text | `bodyMedium` | Inter Regular | Description text |
| Buttons | `labelLarge` | Inter Semibold | "Book Now" |
| Captions/meta | `labelSmall` | Inter Medium | "50-100 guests" |
| Prices | `priceMain` | Inter Bold | "₱5,000" |

---

## High Priority Components

### Priority Order

1. **Theme Foundation** - Colors, typography, spacing (affects everything)
2. **Button Component** - Most used interactive element
3. **Card Component** - Primary content container
4. **Home Screen Header** - First thing users see
5. **Hero Section** - Key conversion element
6. **Tab Bar** - Persistent navigation
7. **VenueCard / PackageCard** - Core content cards

---

### Component 1: Button

**Current Issues**:
- Pure black (`#000000`) is harsh
- All button variants have similar visual weight
- Missing ghost/text button variant

**Proposed Changes**:

```typescript
// src/components/common/Button.tsx

export type ButtonVariant =
  | 'primary'      // Soft black - main actions
  | 'secondary'    // Outlined - secondary actions
  | 'accent'       // Green - key CTAs
  | 'ghost'        // Text only - tertiary actions (NEW)
  | 'danger';      // Red - destructive actions (NEW)

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,  // Keep
    paddingVertical: 14,  // Slightly reduced from 16
    paddingHorizontal: 24,
    minHeight: 50,  // Reduced from 52
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,  // For icon + text
  },

  // Primary - Soft black
  primaryContainer: {
    backgroundColor: colors.interactive.primary,  // #1A1A1A
  },
  primaryText: {
    color: colors.text.inverse,
    ...typeScale.labelLarge,
  },

  // Secondary - Outlined
  secondaryContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border.strong,
  },
  secondaryText: {
    color: colors.text.primary,
    ...typeScale.labelLarge,
  },

  // Accent - Green CTA
  accentContainer: {
    backgroundColor: colors.interactive.accent,  // #3D9970
  },
  accentText: {
    color: colors.text.inverse,
    ...typeScale.labelLarge,
  },

  // Ghost - Text only (NEW)
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.text.link,
    ...typeScale.labelLarge,
  },

  // Danger - Destructive (NEW)
  dangerContainer: {
    backgroundColor: colors.semantic.error.main,
  },
  dangerText: {
    color: colors.text.inverse,
    ...typeScale.labelLarge,
  },

  // States
  disabled: {
    backgroundColor: colors.interactive.disabled,
  },
  disabledText: {
    color: colors.interactive.disabledText,
  },
});
```

**Button Size Variants** (NEW):

```typescript
export type ButtonSize = 'sm' | 'md' | 'lg';

const sizeStyles = {
  sm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 40,
    ...typeScale.labelMedium,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 50,
    ...typeScale.labelLarge,
  },
  lg: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 58,
    fontSize: 17,
  },
};
```

---

### Component 2: Card

**Current Issues**:
- All cards look the same
- Shadow is visible but adds visual noise
- No elevated variant for featured content

**Proposed Changes**:

```typescript
// src/components/common/Card.tsx

export type CardVariant =
  | 'flat'        // No elevation - for lists (NEW)
  | 'elevated'    // Subtle shadow - default
  | 'featured'    // More shadow - featured content
  | 'interactive' // With hover/press states
  | 'outlined';   // Border instead of shadow (NEW)

const cardStyles = {
  // Base styles
  base: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Flat - minimal, for dense lists
  flat: {
    // No shadow
  },

  // Elevated - subtle shadow (default)
  elevated: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,  // Reduced from 0.06
    shadowRadius: 8,
    elevation: 1,
  },

  // Featured - more prominent
  featured: {
    borderRadius: 20,  // Larger radius
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,  // Reduced from 0.1
    shadowRadius: 16,
    elevation: 3,
  },

  // Outlined - border instead of shadow
  outlined: {
    borderWidth: 1,
    borderColor: colors.border.default,
  },

  // Interactive states
  pressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.02,
  },
};
```

---

### Component 3: Home Header

**Current** ([ManagementLayout.tsx:184-207](src/components/home/ManagementLayout.tsx#L184-L207)):
- Logo + greeting + notification button
- Notification button has background + shadow

**Proposed Changes**:

```typescript
// New header design - cleaner, more minimal

const Header = () => (
  <View style={styles.header}>
    {/* Greeting takes prominence */}
    <View style={styles.greetingContainer}>
      <Text style={styles.greeting}>
        Good Morning,
      </Text>
      <Text style={styles.userName}>
        {user?.first_name || 'there'}
      </Text>
      <Text style={styles.subGreeting}>
        {getSubGreeting()}
      </Text>
    </View>

    {/* Notification - ghost style */}
    <Pressable
      style={styles.notificationButton}
      onPress={() => router.push('/actions')}
    >
      <Bell size={24} color={colors.text.primary} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount}</Text>
        </View>
      )}
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,  // More breathing room
  },

  greetingContainer: {
    flex: 1,
  },

  greeting: {
    ...typeScale.bodyMedium,
    color: colors.text.tertiary,
  },

  userName: {
    ...typeScale.displaySmall,  // Use display font
    color: colors.text.primary,
    marginTop: spacing.xxs,
  },

  subGreeting: {
    ...typeScale.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // Ghost-style notification button
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    // NO background, NO shadow
  },

  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.semantic.error.main,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    ...typeScale.labelSmall,
    color: colors.text.inverse,
    fontWeight: '600',
  },
});
```

**Visual Comparison**:

```
CURRENT                          PROPOSED
┌────────────────────────────┐   ┌────────────────────────────┐
│ [🌾] Welcome, John!   [🔔]│   │ Good Morning,         [🔔] │
│      3 items need...      │   │ John                       │
│                           │   │ 3 items need attention     │
└────────────────────────────┘   └────────────────────────────┘
                                  ↑ Display font, clear hierarchy
```

---

### Component 4: Hero Section (DiscoveryLayout)

**Current** ([DiscoveryLayout.tsx:116-133](src/components/home/DiscoveryLayout.tsx#L116-L133)):
- Small contained card with icon
- Light gray background
- Feels like a button, not a hero

**Proposed Changes**:

```typescript
// New hero - full-width with image background

const HeroSection = () => (
  <Pressable
    style={styles.hero}
    onPress={() => router.push('/booking')}
  >
    {/* Background image with overlay */}
    <Image
      source={require('@/assets/hero-venue.jpg')}  // Add a beautiful venue photo
      style={styles.heroImage}
      contentFit="cover"
    />
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.6)']}
      style={styles.heroOverlay}
    />

    {/* Content */}
    <View style={styles.heroContent}>
      <Text style={styles.heroTitle}>
        Start Planning{'\n'}Your Event
      </Text>
      <Text style={styles.heroSubtitle}>
        Discover beautiful venues and curated packages
      </Text>

      <View style={styles.heroCTA}>
        <Text style={styles.heroCTAText}>Get Started</Text>
        <ArrowRight size={20} color={colors.text.inverse} />
      </View>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  hero: {
    height: 220,
    marginHorizontal: -spacing.lg,  // Bleed to screen edges
    marginBottom: spacing.xl,
    borderRadius: 0,  // No radius - full bleed
    overflow: 'hidden',
  },

  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },

  heroTitle: {
    ...typeScale.displayMedium,
    color: colors.text.inverse,
    marginBottom: spacing.xs,
  },

  heroSubtitle: {
    ...typeScale.bodyMedium,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.md,
  },

  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  heroCTAText: {
    ...typeScale.labelLarge,
    color: colors.text.inverse,
  },
});
```

**Alternative (No Image)**:

If you don't have a suitable hero image, use a subtle gradient:

```typescript
const HeroSection = () => (
  <Pressable style={styles.hero}>
    <LinearGradient
      colors={[colors.background.accent, colors.brand.green[100]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />

    <View style={styles.heroContent}>
      <Sparkle size={40} color={colors.brand.green[500]} weight="fill" />
      <Text style={styles.heroTitle}>
        Plan Your Perfect Event
      </Text>
      <Text style={styles.heroSubtitle}>
        Browse venues, packages, and start booking
      </Text>
      <Button variant="accent" size="md">
        Get Started
      </Button>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  hero: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.xl,
  },

  heroContent: {
    alignItems: 'center',
    gap: spacing.md,
  },

  heroTitle: {
    ...typeScale.displaySmall,  // Use display font
    color: colors.text.primary,
    textAlign: 'center',
  },

  heroSubtitle: {
    ...typeScale.bodyMedium,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
```

---

### Component 5: Tab Bar

**Current** ([_layout.tsx:59-74](app/(tabs)/_layout.tsx#L59-L74)):
- Rounded top corners (24px)
- White background with shadow
- Standard tab styling

**Proposed Options**:

**Option A: Floating Pill (Modern)**

```typescript
tabBarStyle: {
  position: 'absolute',
  bottom: 16,  // Float above bottom
  left: 16,
  right: 16,
  height: 64,
  backgroundColor: colors.background.secondary,
  borderRadius: 32,  // Full pill shape
  borderTopWidth: 0,
  paddingBottom: 0,

  // Prominent shadow for floating effect
  shadowColor: colors.neutral[900],
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 8,
},
```

**Option B: Minimal Line (Apple-style)**

```typescript
tabBarStyle: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 80,
  backgroundColor: colors.background.primary,  // Match app background
  borderTopWidth: 0.5,
  borderTopColor: colors.border.light,
  paddingTop: 8,
  paddingBottom: 24,

  // No shadow
  shadowOpacity: 0,
  elevation: 0,
},
```

**Option C: Glass Morphism (Contemporary)**

```typescript
tabBarStyle: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 80,
  backgroundColor: 'rgba(255,255,255,0.85)',
  borderTopWidth: 0,
  paddingTop: 8,
  paddingBottom: 24,

  // Blur effect (requires expo-blur)
  // Use BlurView as background
},
```

**Recommended: Option B (Minimal Line)** - Most aligned with "Clean & Minimal" goal.

---

### Component 6: VenueCard / PackageCard

**Current Issues**:
- Fixed compact width (240px) - doesn't adapt
- Shadow adds visual noise
- Content density is high

**Proposed Changes**:

```typescript
// src/components/explore/VenueCard.tsx

const VenueCard = ({ venue, compact, onPress }) => {
  const cardWidth = compact ? 220 : '100%';  // Slightly smaller compact
  const imageHeight = compact ? 130 : 200;   // Taller full-width images

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        { width: cardWidth },
        compact && styles.compactContainer,
      ]}
    >
      {/* Image */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <Image
          source={{ uri: venue.featured_image }}
          style={styles.image}
          contentFit="cover"
        />

        {/* Favorite - top right */}
        <View style={styles.favoriteButton}>
          <FavoriteButton type="venue" itemId={venue.id} />
        </View>

        {/* Badge - bottom left */}
        {venue.is_overnight && (
          <View style={styles.badge}>
            <Moon size={12} color={colors.text.inverse} weight="fill" />
            <Text style={styles.badgeText}>Overnight</Text>
          </View>
        )}
      </View>

      {/* Content - cleaner layout */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {venue.name}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Users size={14} color={colors.text.tertiary} />
            <Text style={styles.metaText}>
              {formatCapacity(venue.minimum_capacity, venue.maximum_capacity)}
            </Text>
          </View>

          {venue.location_description && (
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.text.tertiary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {venue.location_description}
              </Text>
            </View>
          )}
        </View>

        {/* Price - prominent */}
        {pricing && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>From</Text>
            <Text style={styles.price}>{formatPrice(pricing.basePrice)}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    overflow: 'hidden',
    // Minimal shadow
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  compactContainer: {
    marginRight: spacing.md,
  },

  imageContainer: {
    width: '100%',
    position: 'relative',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },

  badge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 6,
  },

  badgeText: {
    ...typeScale.labelSmall,
    color: colors.text.inverse,
  },

  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },

  name: {
    ...typeScale.titleMedium,
    color: colors.text.primary,
  },

  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  metaText: {
    ...typeScale.bodySmall,
    color: colors.text.tertiary,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },

  priceLabel: {
    ...typeScale.labelSmall,
    color: colors.text.tertiary,
  },

  price: {
    ...typeScale.titleMedium,
    color: colors.brand.green[500],  // Green for price
  },
});
```

---

## Implementation Phases

### Phase 1: Foundation (1-2 days)

**Files to modify:**
1. `src/theme/index.ts` - New color system + typography tokens
2. `package.json` - Add font packages
3. `app/_layout.tsx` - Font loading

**Tasks:**
- [ ] Create new color palette based on plan
- [ ] Add `@expo-google-fonts/inter` and `@expo-google-fonts/fraunces`
- [ ] Update fontFamily definitions
- [ ] Update typeScale with new fonts
- [ ] Test font loading on iOS and Android

### Phase 2: Core Components (2-3 days)

**Files to modify:**
1. `src/components/common/Button.tsx` - New variants + sizes
2. `src/components/common/Card.tsx` - New variants
3. `src/components/common/Badge.tsx` - Color updates
4. `src/components/common/Input.tsx` - Color updates

**Tasks:**
- [ ] Update Button with new colors and ghost variant
- [ ] Update Card with new shadow values
- [ ] Update all components using old color tokens
- [ ] Test all interactive states

### Phase 3: Home Screen (2-3 days)

**Files to modify:**
1. `src/components/home/ManagementLayout.tsx` - Header + spacing
2. `src/components/home/DiscoveryLayout.tsx` - Hero + header
3. `app/(tabs)/index.tsx` - Background color
4. `app/(tabs)/_layout.tsx` - Tab bar styling

**Tasks:**
- [ ] Implement new header design
- [ ] Implement new hero section
- [ ] Update section spacing
- [ ] Update tab bar styling
- [ ] Test both layout variants

### Phase 4: Content Cards (1-2 days)

**Files to modify:**
1. `src/components/explore/VenueCard.tsx`
2. `src/components/explore/PackageCard.tsx`
3. `src/components/dashboard/ActionCard.tsx`
4. `src/components/dashboard/EventPreviewCard.tsx`

**Tasks:**
- [ ] Update card shadows and styling
- [ ] Update typography usage
- [ ] Update color tokens
- [ ] Test horizontal scrolling performance

### Phase 5: Polish & QA (2-3 days)

**Tasks:**
- [ ] Full app walkthrough on iOS
- [ ] Full app walkthrough on Android
- [ ] Dark mode preparation (optional)
- [ ] Performance profiling
- [ ] Accessibility audit
- [ ] Update STYLING_GUIDE.md with new system

---

## File-by-File Changes

### `src/theme/index.ts`

| Line Range | Change Type | Description |
|------------|-------------|-------------|
| 18-92 | **Replace** | New color system (see Color System section) |
| 122-133 | **Replace** | New fontFamily with custom fonts |
| 142-241 | **Replace** | New typeScale with font assignments |
| 320-383 | **Update** | Reduce shadow opacity values |
| 788 | **Change** | `background: colors.neutral.cream` → `background: colors.background.primary` |

### `app/_layout.tsx`

| Change | Description |
|--------|-------------|
| Add import | `import { useFonts } from 'expo-font'` |
| Add import | Font imports from @expo-google-fonts |
| Add hook | `useFonts()` call with font loading |
| Add condition | Return splash screen while fonts load |

### `src/components/common/Button.tsx`

| Line Range | Change Type | Description |
|------------|-------------|-------------|
| 21 | **Add** | New variants: 'ghost', 'danger' |
| Add type | ButtonSize type |
| 99-175 | **Update** | New color tokens and variant styles |
| Add | Size variant styles |

### `src/components/home/ManagementLayout.tsx`

| Line Range | Change Type | Description |
|------------|-------------|-------------|
| 184-207 | **Replace** | New header component design |
| 374-379 | **Update** | New header styles |
| 385-394 | **Update** | New greeting typography |
| 395-407 | **Update** | Ghost-style notification button |
| 427-429 | **Update** | Increased section spacing |

### `src/components/home/DiscoveryLayout.tsx`

| Line Range | Change Type | Description |
|------------|-------------|-------------|
| 90-114 | **Replace** | New header design |
| 116-133 | **Replace** | New hero section |
| 309-341 | **Replace** | New hero styles |

### `app/(tabs)/_layout.tsx`

| Line Range | Change Type | Description |
|------------|-------------|-------------|
| 42-43 | **Update** | New background color token |
| 59-74 | **Replace** | New tab bar styling (minimal line style) |

### `src/components/explore/VenueCard.tsx`

| Line Range | Change Type | Description |
|------------|-------------|-------------|
| 143-150 | **Update** | Reduced shadow, new color tokens |
| 188-246 | **Update** | New content styling |

---

## Quick Reference: Color Token Migration

| Old Token | New Token |
|-----------|-----------|
| `colors.neutral.cream` / `colors.neutral.sage` | `colors.background.primary` |
| `colors.neutral.white` | `colors.background.secondary` |
| `colors.neutral.sand` | `colors.background.tertiary` |
| `colors.primary.black` | `colors.neutral[900]` or `colors.interactive.primary` |
| `colors.secondary.forest` | `colors.brand.green[500]` or `colors.interactive.accent` |
| `colors.accent.wood` | `colors.brand.earth[400]` (use sparingly) |
| `colors.tertiary.teal` | Remove - consolidate to green |
| `colors.neutral.gray` | `colors.text.placeholder` |
| `colors.neutral.darkGray` | `colors.text.secondary` |
| `theme.colors.surface` | `colors.background.secondary` |
| `theme.colors.border` | `colors.border.default` |

---

## Success Metrics

After implementation, the app should:

1. **Feel lighter** - Less visual weight from reduced shadows and neutral backgrounds
2. **Have clear hierarchy** - Display font for greetings, consistent type scale
3. **Guide the eye** - Green accent used only for primary actions
4. **Feel premium** - Custom typography adds brand distinction
5. **Be consistent** - Same patterns used throughout

---

*Last updated: January 2026*
*Version: 1.0 - Initial comprehensive plan*
