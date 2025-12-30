/**
 * LifePlace Mobile App Theme
 *
 * Design system based on the STYLING_GUIDE.md with nature-inspired,
 * rustic-modern aesthetic aligned with LifePlace brand identity.
 *
 * Brand essence: Serene, premium yet accessible, nature-connected
 */

import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Primary Brand Colors
  primary: {
    black: '#000000',
    blackLight: '#1A1A1A',
  },

  // Accent Colors - Wood/Nature Inspired
  accent: {
    wood: '#8B4513', // Saddle Brown - primary accent
    woodLight: '#A0522D', // Sienna - hover states
    woodDark: '#654321', // Dark brown - pressed states
    woodSubtle: '#F5EDE5', // Light wood tint for backgrounds
  },

  // Secondary Accent - Growth/Nature (Forest Green)
  secondary: {
    forest: '#228B22', // Forest Green - CTAs, success
    forestLight: '#32CD32', // Lime green - hover
    forestDark: '#1B6B1B', // Dark green - pressed
    forestSubtle: '#EDF7ED', // Light green tint
  },

  // Tertiary Accent - Serene/Cool (Teal)
  tertiary: {
    teal: '#008080', // Teal - links, progress
    tealLight: '#20B2AA', // Light sea green
    tealDark: '#006666', // Dark teal
    tealSubtle: '#E6F3F3', // Light teal tint
  },

  // Neutral Palette
  neutral: {
    white: '#FFFFFF',
    beige: '#F5F5DC', // Section backgrounds
    cream: '#FAF9F7', // Page backgrounds
    sand: '#F5F3EF', // Card backgrounds
    warmGray: '#E8E5E0', // Borders, dividers
    gray: '#9B9590', // Placeholder text
    darkGray: '#6B6560', // Secondary text
  },

  // Semantic Colors
  semantic: {
    success: '#228B22', // Aligned with forest green
    warning: '#E5A84B', // Warm amber
    error: '#D64545', // Soft red
    info: '#008080', // Aligned with teal
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

export const fontFamily = {
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
  // Display - Hero sections, welcome screens
  displayLarge: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.5,
  },

  // Headlines - Section titles, card headers
  headlineLarge: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.3,
  },
  headlineMedium: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.2,
  },
  headlineSmall: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: fontWeights.semibold,
  },

  // Titles - Component headers, list items
  titleLarge: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: fontWeights.semibold,
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeights.semibold,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.semibold,
  },

  // Body - Primary content
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeights.regular,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: fontWeights.regular,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },

  // Labels - Buttons, chips, captions
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.3,
  },
  labelSmall: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.4,
  },

  // Price styling
  priceMain: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: fontWeights.bold,
  },
  priceUnit: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
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
    shadowColor: colors.primary.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  // Subtle - Cards at rest
  sm: {
    shadowColor: colors.primary.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Medium - Elevated cards, modals
  md: {
    shadowColor: colors.primary.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },

  // Large - Bottom sheets, floating elements
  lg: {
    shadowColor: colors.primary.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },

  // Extra large - Overlays
  xl: {
    shadowColor: colors.primary.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },

  // Bottom navigation specific
  bottomNav: {
    shadowColor: colors.primary.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
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
    50: '#F5F5F5',
    100: '#E8E8E8',
    200: '#D1D1D1',
    300: '#A8A8A8',
    400: '#6B6B6B',
    500: colors.primary.black, // Base
    600: colors.primary.black,
    700: colors.primary.black,
    800: colors.primary.blackLight,
    900: '#0A0A0A',
  },
  neutral: {
    50: colors.neutral.cream,
    100: colors.neutral.sand,
    200: colors.neutral.warmGray,
    300: '#D1CCC7',
    400: colors.neutral.gray,
    500: colors.neutral.gray,
    600: colors.neutral.darkGray,
    700: '#4A4540',
    800: '#2D2A26',
    900: colors.primary.black,
  },
  success: {
    50: colors.secondary.forestSubtle,
    100: '#D1EAD1',
    500: colors.semantic.success,
    600: colors.secondary.forestDark,
    700: '#155415',
  },
  warning: {
    50: '#FEF6E7',
    100: '#FDE8C4',
    500: colors.semantic.warning,
    600: '#CC8F3D',
    700: '#AA7032',
  },
  error: {
    50: '#FCE8E8',
    100: '#F7C4C4',
    500: colors.semantic.error,
    600: '#B33636',
    700: '#8C2A2A',
  },
  info: {
    50: colors.tertiary.tealSubtle,
    100: '#CCE5E5',
    500: colors.semantic.info,
    600: colors.tertiary.tealDark,
    700: '#004D4D',
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
      sand: colors.neutral.sand,
      warmGray: colors.neutral.warmGray,
      gray: colors.neutral.gray,
      darkGray: colors.neutral.darkGray,
      beige: colors.neutral.beige,
    },
    accent: colors.accent,
    secondary: colors.secondary,
    tertiary: colors.tertiary,
    semantic: colors.semantic,
    alpha: colors.alpha,
    // Semantic shortcuts
    surface: colors.neutral.white,
    background: colors.neutral.cream,
    border: colors.neutral.warmGray,
  },
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
