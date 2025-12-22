/**
 * LifePlace Mobile App Theme
 *
 * Design system based on modern hospitality app patterns
 * combined with LifePlace brand identity.
 */

import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Primary Brand Colors
  primary: {
    charcoal: '#32373C',
    charcoalLight: '#4A5056',
    charcoalDark: '#1E2226',
  },

  // Accent Colors - Lavender (from LifePlace branding)
  accent: {
    lavender: '#A886CD',
    lavenderLight: '#C4A8E3',
    lavenderDark: '#8A6AAE',
    lavenderSubtle: '#F5F0FA',
  },

  // Secondary Accent - Nature-inspired Sage
  secondary: {
    sage: '#4AA485',
    sageLight: '#6BB99D',
    sageDark: '#3A8A6D',
    sageSubtle: '#EDF7F3',
  },

  // Neutral Palette
  neutral: {
    white: '#FFFFFF',
    cream: '#FAF9F7',
    sand: '#F5F3EF',
    warmGray: '#E8E5E0',
    gray: '#9B9590',
    darkGray: '#6B6560',
  },

  // Semantic Colors
  semantic: {
    success: '#4AA485',
    warning: '#E5A84B',
    error: '#D64545',
    info: '#5B8DEF',
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
    colors: ['rgba(50,55,60,0)', 'rgba(50,55,60,0.85)'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  premiumCard: {
    colors: ['rgba(168,134,205,0.1)', 'rgba(74,164,133,0.1)'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  accentButton: {
    colors: [colors.accent.lavender, colors.accent.lavenderDark],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
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
  // Subtle - Cards at rest
  sm: {
    shadowColor: colors.primary.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Medium - Elevated cards, modals
  md: {
    shadowColor: colors.primary.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },

  // Large - Bottom sheets, floating elements
  lg: {
    shadowColor: colors.primary.charcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },

  // Extra large - Overlays
  xl: {
    shadowColor: colors.primary.charcoal,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },

  // Bottom navigation specific
  bottomNav: {
    shadowColor: colors.primary.charcoal,
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
      backgroundColor: colors.primary.charcoal,
      borderRadius: layout.borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      minHeight: layout.buttonHeight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    primaryText: {
      ...typeScale.labelLarge,
      color: colors.neutral.white,
    },
    secondary: {
      backgroundColor: colors.neutral.white,
      borderRadius: layout.borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.primary.charcoal,
      paddingVertical: spacing.md - 1.5,
      paddingHorizontal: spacing.xl,
      minHeight: layout.buttonHeight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    secondaryText: {
      ...typeScale.labelLarge,
      color: colors.primary.charcoal,
    },
    accent: {
      backgroundColor: colors.accent.lavender,
      borderRadius: layout.borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      minHeight: layout.buttonHeight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    accentText: {
      ...typeScale.labelLarge,
      color: colors.neutral.white,
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.alpha.white90,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...shadows.sm,
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
      backgroundColor: colors.primary.charcoal,
      borderColor: colors.primary.charcoal,
    },
    text: {
      ...typeScale.labelMedium,
      color: colors.primary.charcoal,
    },
    textActive: {
      color: colors.neutral.white,
    },
  },

  // Input
  input: {
    container: {
      backgroundColor: colors.neutral.sand,
      borderRadius: layout.borderRadius.md,
      borderWidth: 1,
      borderColor: 'transparent',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      minHeight: layout.inputHeight,
    },
    containerFocused: {
      borderColor: colors.primary.charcoal,
      backgroundColor: colors.neutral.white,
    },
    text: {
      ...typeScale.bodyLarge,
      color: colors.primary.charcoal,
    },
    placeholder: {
      color: colors.neutral.gray,
    },
  },

  // Search bar
  searchBar: {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.neutral.sand,
      borderRadius: layout.borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    input: {
      flex: 1,
      ...typeScale.bodyMedium,
      color: colors.primary.charcoal,
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
      backgroundColor: colors.primary.charcoal,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    label: {
      ...typeScale.labelSmall,
      color: colors.neutral.gray,
      marginTop: spacing.xxs,
    },
    labelActive: {
      color: colors.primary.charcoal,
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
      color: colors.primary.charcoal,
    },
  },
} as const;

// =============================================================================
// THEME OBJECT
// =============================================================================

const theme = {
  colors,
  gradients,
  fontFamily,
  fontWeights,
  typeScale,
  spacing,
  layout,
  shadows,
  animation,
  componentStyles,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type TypeScale = typeof typeScale;

export default theme;
