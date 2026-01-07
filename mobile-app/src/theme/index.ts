/**
 * LifePlace Mobile App Theme
 *
 * Design system for LifePlace mobile application.
 *
 * Design Direction: Clean & Minimal (Apple-inspired)
 * Brand Essence: Serene, premium yet accessible, nature-connected
 *
 * Color Philosophy:
 * - Near-white backgrounds let content breathe
 * - Green accent used sparingly for key actions
 * - Soft blacks instead of pure black for elegance
 *
 * Typography:
 * - Fraunces (serif) for display/headings - brand warmth
 * - Inter (sans-serif) for UI/body - modern clarity
 *
 * @see UI_MODERNIZATION_PLAN.md for full design system documentation
 */

import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// COLORS - Clean & Minimal System (Apple-inspired)
// =============================================================================

/**
 * Brand Colors
 * Primary green derived from lifeplacealfonso.com (#4AA485)
 * Refined for mobile with full scale for flexibility
 */
export const brandColors = {
  // Primary brand green - used sparingly for key actions
  green: {
    50: '#F0F7F4',
    100: '#D1E7DB',
    200: '#A3D0B8',
    300: '#75B894',
    400: '#4AA485', // Website accent color
    500: '#3D9970', // PRIMARY - CTAs, links, active states
    600: '#357A5C',
    700: '#2C5B48',
    800: '#233C34',
    900: '#1A1D1F',
  },
  // Warm earth tones - use very sparingly for premium feel
  earth: {
    50: '#FAF8F5',
    100: '#F5EDE5',
    200: '#E8DCD0',
    300: '#C4A882',
    400: '#A0522D', // Sienna
    500: '#8B6914', // Gold - featured badges
  },
} as const;

/**
 * Neutral Palette (Apple-inspired)
 * Near-white backgrounds with subtle warm undertone
 */
export const neutralColors = {
  0: '#FFFFFF',
  25: '#FAFBFC',     // App background - barely off-white
  50: '#F6F8FA',     // Section backgrounds
  100: '#EEF1F4',    // Input backgrounds
  200: '#E1E4E8',    // Borders, dividers
  300: '#D1D5DA',    // Disabled borders
  400: '#959DA5',    // Placeholder text, icons
  500: '#6A737D',    // Secondary text
  600: '#586069',    // Body text
  700: '#444D56',    // Primary text
  800: '#2F363D',    // Headings
  900: '#1A1A1A',    // Soft black - buttons, emphasis
  1000: '#0D0D0D',   // Pure black (use rarely)
} as const;

/**
 * Legacy colors - maintained for backwards compatibility
 * @deprecated Use brandColors, neutralColors, or semanticColors instead
 */
export const colors = {
  // Primary Brand Colors (updated for softer look)
  primary: {
    black: neutralColors[900], // Soft black instead of pure black
    blackLight: neutralColors[800],
  },

  // Accent Colors - Wood/Nature Inspired (legacy)
  accent: {
    wood: brandColors.earth[400],
    woodLight: '#A0522D',
    woodDark: '#654321',
    woodSubtle: brandColors.earth[50],
  },

  // Secondary Accent - Growth/Nature (Forest Green)
  secondary: {
    forest: brandColors.green[500], // Updated to new brand green
    forestLight: brandColors.green[400],
    forestDark: brandColors.green[600],
    forestSubtle: brandColors.green[50],
    gold: brandColors.earth[500],
    goldLight: '#FFD700',
    goldDark: '#B8860B',
    goldSubtle: '#FFF8E7',
  },

  // Tertiary Accent - Consolidated into green
  tertiary: {
    teal: brandColors.green[500], // Map to brand green
    tealLight: brandColors.green[400],
    tealDark: brandColors.green[600],
    tealSubtle: brandColors.green[50],
  },

  // Neutral Palette (updated to new system)
  neutral: {
    white: neutralColors[0],
    beige: neutralColors[100],
    cream: neutralColors[25], // CHANGED: Was sage green, now off-white
    sage: brandColors.green[50], // Keep sage reference but lighter
    sand: neutralColors[50],
    warmGray: neutralColors[200],
    gray: neutralColors[400],
    darkGray: neutralColors[600],
  },

  // Brand Sage Colors (legacy)
  sage: {
    light: brandColors.green[50],
    dark: brandColors.green[400],
    darker: brandColors.green[600],
  },

  // Semantic Colors
  semantic: {
    success: '#28A745',
    warning: '#F5A623',
    error: '#DC3545',
    info: brandColors.green[500],
  },

  // Transparency helpers
  alpha: {
    black05: 'rgba(0, 0, 0, 0.05)',
    black10: 'rgba(0, 0, 0, 0.10)',
    black20: 'rgba(0, 0, 0, 0.20)',
    black40: 'rgba(0, 0, 0, 0.40)',
    black60: 'rgba(0, 0, 0, 0.60)',
    black80: 'rgba(0, 0, 0, 0.80)',
    white80: 'rgba(255, 255, 255, 0.80)',
    white90: 'rgba(255, 255, 255, 0.90)',
    white95: 'rgba(255, 255, 255, 0.95)',
  },
} as const;

/**
 * Semantic Color Tokens
 * Use these for clear, consistent color application
 */
export const semanticTokens = {
  background: {
    primary: neutralColors[25],    // Main app background
    secondary: neutralColors[0],   // Cards, elevated surfaces
    tertiary: neutralColors[50],   // Section backgrounds, inputs
    accent: brandColors.green[50], // Highlighted sections
  },
  text: {
    primary: neutralColors[900],   // Headings, important text
    secondary: neutralColors[600], // Body text
    tertiary: neutralColors[500],  // Supporting text
    placeholder: neutralColors[400],
    inverse: neutralColors[0],     // Text on dark backgrounds
    link: brandColors.green[500],  // Links, interactive text
  },
  border: {
    light: neutralColors[100],
    default: neutralColors[200],
    strong: neutralColors[300],
  },
  interactive: {
    primary: neutralColors[900],         // Primary buttons
    primaryHover: neutralColors[800],
    primaryPressed: neutralColors[700],
    accent: brandColors.green[500],      // CTA buttons
    accentHover: brandColors.green[400],
    accentPressed: brandColors.green[600],
    disabled: neutralColors[200],
    disabledText: neutralColors[400],
  },
} as const;

// Gradient configurations for LinearGradient
export const gradients = {
  imageOverlay: {
    colors: ['transparent', 'rgba(0,0,0,0.7)'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  heroFade: {
    colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  natureFade: {
    colors: ['#FFFFFF', '#90EE90'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  premiumCard: {
    colors: ['rgba(139,69,19,0.05)', 'rgba(34,139,34,0.05)'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

/**
 * Font Family Configuration
 *
 * Display fonts (Fraunces) - Used for hero headings, greetings
 * Sans fonts (Inter) - Used for UI, body text, buttons
 *
 * When fonts are not loaded, falls back to system fonts
 */
export const fontFamily = {
  // Display - Fraunces (soft serif for brand warmth)
  display: {
    semibold: 'Fraunces_600SemiBold',
    bold: 'Fraunces_700Bold',
  },

  // Sans - Inter (modern, highly legible)
  sans: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },

  // System fallbacks
  system: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  systemBold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),

  // Legacy exports for backwards compatibility
  primary: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  primaryBold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const typeScale = {
  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY - Hero sections, welcome screens (Fraunces serif for brand warmth)
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
  // BODY - Primary content (Inter Regular)
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
  // LABELS - Buttons, chips, captions (Inter Medium/Semibold)
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
  priceUnit: {
    fontFamily: fontFamily.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

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
} as const;

// =============================================================================
// LAYOUT
// =============================================================================

export const layout = {
  // Screen dimensions
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,

  // Screen padding
  screenPaddingHorizontal: 20,
  screenPaddingVertical: 16,

  // Border radius
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  // Card dimensions
  cardBorderRadius: 16,
  cardBorderRadiusLarge: 24,
  cardBorderRadiusSmall: 12,

  // Image aspect ratios
  aspectRatio: {
    hero: 16 / 9,
    card: 4 / 3,
    thumbnail: 1,
    wide: 2.35,
  },

  // Component heights
  buttonHeight: 52,
  buttonHeightSmall: 40,
  inputHeight: 52,
  bottomNavHeight: 80,
  headerHeight: 56,

  // Icon sizes
  iconSize: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
  },

  // Safe areas (override with useSafeAreaInsets in practice)
  statusBarHeight: Platform.select({ ios: 47, android: 24, default: 24 }),
  bottomSafeArea: Platform.select({ ios: 34, android: 0, default: 0 }),
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  // Extra subtle - Input fields, minimal elevation
  xs: {
    shadowColor: neutralColors[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, // Reduced for cleaner look
    shadowRadius: 4,
    elevation: 1,
  },

  // Subtle - Cards at rest (REDUCED for minimal aesthetic)
  sm: {
    shadowColor: neutralColors[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, // Reduced from 0.06
    shadowRadius: 8,
    elevation: 2,
  },

  // Medium - Elevated cards, modals
  md: {
    shadowColor: neutralColors[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, // Reduced from 0.1
    shadowRadius: 16,
    elevation: 4,
  },

  // Large - Bottom sheets, floating elements
  lg: {
    shadowColor: neutralColors[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10, // Reduced from 0.15
    shadowRadius: 24,
    elevation: 8,
  },

  // Extra large - Overlays
  xl: {
    shadowColor: neutralColors[900],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15, // Reduced from 0.2
    shadowRadius: 32,
    elevation: 12,
  },

  // Bottom navigation - minimal line style
  bottomNav: {
    shadowColor: neutralColors[900],
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04, // Very subtle for minimal look
    shadowRadius: 8,
    elevation: 4,
  },

  // No shadow
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// =============================================================================
// ANIMATION
// =============================================================================

export const animation = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
  },
  // For use with react-native-reanimated Easing
  easing: {
    standard: [0.4, 0.0, 0.2, 1] as const,
    decelerate: [0.0, 0.0, 0.2, 1] as const,
    accelerate: [0.4, 0.0, 1, 1] as const,
    sharp: [0.4, 0.0, 0.6, 1] as const,
  },
  // Button press scale
  buttonPress: {
    scale: 0.97,
    duration: 100,
  },
  cardPress: {
    scale: 0.98,
    duration: 150,
  },
} as const;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const componentStyles = {
  // Buttons
  button: {
    primary: {
      container: {
        backgroundColor: colors.primary.black,
        borderRadius: layout.borderRadius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        minHeight: layout.buttonHeight,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      text: {
        ...typeScale.labelLarge,
        color: colors.neutral.white,
      },
    },
    secondary: {
      container: {
        backgroundColor: colors.neutral.white,
        borderRadius: layout.borderRadius.md,
        borderWidth: 1.5,
        borderColor: colors.primary.black,
        paddingVertical: spacing.md - 1.5,
        paddingHorizontal: spacing.xl,
        minHeight: layout.buttonHeight,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      text: {
        ...typeScale.labelLarge,
        color: colors.primary.black,
      },
    },
    cta: {
      container: {
        backgroundColor: colors.secondary.forest,
        borderRadius: layout.borderRadius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        minHeight: layout.buttonHeight,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      text: {
        ...typeScale.labelLarge,
        color: colors.neutral.white,
      },
    },
    accent: {
      container: {
        backgroundColor: colors.accent.wood,
        borderRadius: layout.borderRadius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        minHeight: layout.buttonHeight,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      text: {
        ...typeScale.labelLarge,
        color: colors.neutral.white,
      },
    },
    icon: {
      container: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.alpha.white90,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        ...shadows.sm,
      },
    },
  },

  // Cards
  card: {
    base: {
      backgroundColor: colors.neutral.white,
      borderRadius: layout.cardBorderRadius,
      ...shadows.sm,
    },
    featured: {
      backgroundColor: colors.neutral.white,
      borderRadius: layout.cardBorderRadiusLarge,
      overflow: 'hidden' as const,
      ...shadows.md,
    },
    elevated: {
      backgroundColor: colors.neutral.white,
      borderRadius: layout.cardBorderRadius,
      ...shadows.md,
    },
  },

  // Chips
  chip: {
    base: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: layout.borderRadius.full,
      backgroundColor: colors.neutral.white,
      borderWidth: 1,
      borderColor: colors.neutral.warmGray,
    },
    active: {
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
  },

  // Input
  input: {
    container: {
      backgroundColor: colors.neutral.beige,
      borderRadius: layout.borderRadius.md,
      borderWidth: 1,
      borderColor: 'transparent',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      minHeight: layout.inputHeight,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    containerFocused: {
      borderColor: colors.primary.black,
      backgroundColor: colors.neutral.white,
    },
    containerError: {
      borderColor: colors.semantic.error,
    },
    input: {
      ...typeScale.bodyLarge,
      color: colors.primary.black,
      flex: 1,
    },
    placeholder: {
      color: colors.neutral.gray,
    },
    label: {
      ...typeScale.labelSmall,
      color: colors.neutral.gray,
      marginBottom: spacing.xs,
    },
    error: {
      ...typeScale.labelSmall,
      color: colors.semantic.error,
      marginTop: spacing.xxs,
    },
  },

  // Search bar
  searchBar: {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.neutral.beige,
      borderRadius: layout.borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    input: {
      flex: 1,
      ...typeScale.bodyMedium,
      color: colors.primary.black,
    },
  },

  // Bottom navigation
  bottomNav: {
    container: {
      backgroundColor: colors.neutral.white,
      borderTopLeftRadius: layout.borderRadius.xl,
      borderTopRightRadius: layout.borderRadius.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.xl,
      flexDirection: 'row' as const,
      justifyContent: 'space-around' as const,
      ...shadows.bottomNav,
    },
    item: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: spacing.xs,
      minWidth: 60,
    },
    activeIndicator: {
      width: 48,
      height: 48,
      borderRadius: layout.borderRadius.lg,
      backgroundColor: colors.primary.black,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    label: {
      ...typeScale.labelSmall,
      color: colors.neutral.gray,
      marginTop: spacing.xxs,
    },
    labelActive: {
      color: colors.primary.black,
      fontWeight: fontWeights.semibold,
    },
  },

  // Header
  header: {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.neutral.white,
    },
    transparent: {
      backgroundColor: 'transparent',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    title: {
      ...typeScale.titleMedium,
      color: colors.primary.black,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.alpha.white90,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...shadows.sm,
    },
  },
} as const;

// =============================================================================
// COLOR SCALES (for compatibility with semantic color references)
// =============================================================================

/**
 * Extended color scales for more granular color usage.
 * Maps numeric scales (100-900) to semantic color intensities.
 */
export const colorScales = {
  primary: {
    50: neutralColors[50],
    100: neutralColors[100],
    200: neutralColors[200],
    300: neutralColors[300],
    400: neutralColors[500],
    500: neutralColors[900], // Base - soft black
    600: neutralColors[900],
    700: neutralColors[900],
    800: neutralColors[800],
    900: neutralColors[1000],
  },
  neutral: {
    50: neutralColors[25],  // Off-white background
    100: neutralColors[50],
    200: neutralColors[200],
    300: neutralColors[300],
    400: neutralColors[400],
    500: neutralColors[500],
    600: neutralColors[600],
    700: neutralColors[700],
    800: neutralColors[800],
    900: neutralColors[900],
  },
  success: {
    50: '#D4EDDA',
    100: '#C3E6CB',
    500: '#28A745',
    600: '#1E7E34',
    700: '#155724',
  },
  warning: {
    50: '#FFF3CD',
    100: '#FFE8A1',
    500: '#F5A623',
    600: '#D48806',
    700: '#AA6D04',
  },
  error: {
    50: '#F8D7DA',
    100: '#F1AEB5',
    500: '#DC3545',
    600: '#BD2130',
    700: '#9A1C26',
  },
  info: {
    50: brandColors.green[50],
    100: brandColors.green[100],
    500: brandColors.green[500],
    600: brandColors.green[600],
    700: brandColors.green[700],
  },
} as const;

// =============================================================================
// TYPOGRAPHY FONTS (for component compatibility)
// =============================================================================

export const typographyFonts = {
  regular: fontFamily.primary,
  medium: fontFamily.primary,
  semibold: fontFamily.primaryBold,
  bold: fontFamily.primaryBold,
} as const;

export const typographySizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
} as const;

// =============================================================================
// THEME OBJECT
// =============================================================================

const themeObject = {
  colors: {
    ...colorScales,
    // Named colors from base colors (for component compatibility)
    primary: {
      ...colorScales.primary,
      black: colors.primary.black,
      blackLight: colors.primary.blackLight,
    },
    neutral: {
      ...colorScales.neutral,
      white: colors.neutral.white,
      cream: colors.neutral.cream,
      sage: colors.neutral.sage,
      sand: colors.neutral.sand,
      warmGray: colors.neutral.warmGray,
      gray: colors.neutral.gray,
      darkGray: colors.neutral.darkGray,
      beige: colors.neutral.beige,
    },
    accent: colors.accent,
    secondary: colors.secondary,
    tertiary: colors.tertiary,
    sage: colors.sage,
    semantic: colors.semantic,
    alpha: colors.alpha,
    // NEW: Brand colors for direct access
    brand: brandColors,
    // Semantic shortcuts - UPDATED for clean minimal look
    surface: neutralColors[0],           // White cards
    background: neutralColors[25],       // Off-white app background (#FAFBFC)
    border: neutralColors[200],          // Subtle borders
  },
  // NEW: Semantic tokens for modern usage
  tokens: semanticTokens,
  gradients,
  fontFamily,
  fontWeights,
  typeScale,
  spacing,
  layout,
  shadows,
  animation,
  componentStyles,
  typography: {
    fonts: typographyFonts,
    sizes: typographySizes,
  },
  borderRadius: layout.borderRadius,
} as const;

export type Theme = typeof themeObject;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type TypeScale = typeof typeScale;

// Named export for convenience
export { themeObject as theme };

export default themeObject;
