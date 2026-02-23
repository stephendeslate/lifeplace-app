// Modern LifePlace Admin Shadows & Effects System
// Implementing glassmorphism-ready elevation and backdrop effects

export const shadowTokens = {
  // Traditional shadow scales for depth perception
  elevation: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
    xxl: '0 25px 50px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.1)',
  },

  // Glassmorphism-specific shadows for modern depth
  glass: {
    // Subtle glass shadows
    light: '0 4px 16px rgba(31, 38, 135, 0.15)',
    medium: '0 8px 32px rgba(31, 38, 135, 0.25)',
    strong: '0 12px 48px rgba(31, 38, 135, 0.35)',

    // Floating glass elements
    floating: '0 16px 40px rgba(31, 38, 135, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1)',
    elevated: '0 20px 60px rgba(31, 38, 135, 0.3), 0 8px 24px rgba(0, 0, 0, 0.15)',

    // Colored glass shadows
    primary: '0 8px 32px rgba(0, 135, 255, 0.25)',
    success: '0 8px 32px rgba(16, 185, 129, 0.25)',
    warning: '0 8px 32px rgba(245, 158, 11, 0.25)',
    error: '0 8px 32px rgba(239, 68, 68, 0.25)',
  },

  // Component-specific shadows
  component: {
    // Cards
    card: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cardHover: '0 4px 16px rgba(0, 0, 0, 0.12)',

    // Buttons
    button: '0 1px 3px rgba(0, 0, 0, 0.1)',
    buttonHover: '0 2px 6px rgba(0, 0, 0, 0.15)',

    // Dropdowns and menus
    dropdown: '0 4px 12px rgba(0, 0, 0, 0.15)',
    popover: '0 8px 24px rgba(0, 0, 0, 0.2)',

    // Navigation
    header: '0 1px 3px rgba(0, 0, 0, 0.1)',
    sidebar: '2px 0 8px rgba(0, 0, 0, 0.05)',

    // Modals and overlays
    modal: '0 20px 60px rgba(0, 0, 0, 0.3)',
    drawer: '0 8px 24px rgba(0, 0, 0, 0.15)',
    tooltip: '0 4px 12px rgba(0, 0, 0, 0.2)',

    // Form elements
    input: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
    inputFocus: '0 0 0 3px rgba(0, 135, 255, 0.1), inset 0 1px 2px rgba(0, 0, 0, 0.05)',
    inputError: '0 0 0 3px rgba(239, 68, 68, 0.1), inset 0 1px 2px rgba(0, 0, 0, 0.05)',
  },
} as const;

// Backdrop filter values for glassmorphism
export const backdropFilters = {
  none: 'none',
  light: 'blur(8px)',
  medium: 'blur(16px)',
  strong: 'blur(24px)',
  intense: 'blur(40px)',

  // Combined backdrop effects
  glass: 'blur(20px) saturate(1.2)',
  glassStrong: 'blur(40px) saturate(1.4)',

  // Specialty effects
  frosted: 'blur(12px) contrast(1.1) brightness(1.1)',
  vivid: 'blur(16px) saturate(1.8) contrast(1.2)',
} as const;

// Border styles for glassmorphic elements
export const borders = {
  // Standard borders
  none: 'none',
  thin: '1px solid',
  medium: '2px solid',
  thick: '3px solid',

  // Glass borders with transparency
  glass: {
    light: '1px solid rgba(255, 255, 255, 0.1)',
    medium: '1px solid rgba(255, 255, 255, 0.2)',
    strong: '1px solid rgba(255, 255, 255, 0.3)',

    // Colored glass borders
    primary: '1px solid rgba(0, 135, 255, 0.3)',
    success: '1px solid rgba(16, 185, 129, 0.3)',
    warning: '1px solid rgba(245, 158, 11, 0.3)',
    error: '1px solid rgba(239, 68, 68, 0.3)',
  },

  // Gradient borders
  gradient: {
    primary: '1px solid transparent',
    primaryGradient:
      'linear-gradient(135deg, rgba(0, 135, 255, 0.3) 0%, rgba(0, 102, 204, 0.3) 100%)',
    success: '1px solid transparent',
    successGradient:
      'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.3) 100%)',
  },
} as const;

// CSS Custom Properties for shadows and effects
export const shadowsCssVariables = {
  // Elevation shadows
  '--shadow-xs': shadowTokens.elevation.xs,
  '--shadow-sm': shadowTokens.elevation.sm,
  '--shadow-md': shadowTokens.elevation.md,
  '--shadow-lg': shadowTokens.elevation.lg,
  '--shadow-xl': shadowTokens.elevation.xl,

  // Glass shadows
  '--shadow-glass-light': shadowTokens.glass.light,
  '--shadow-glass-medium': shadowTokens.glass.medium,
  '--shadow-glass-floating': shadowTokens.glass.floating,
  '--shadow-glass-primary': shadowTokens.glass.primary,

  // Component shadows
  '--shadow-card': shadowTokens.component.card,
  '--shadow-card-hover': shadowTokens.component.cardHover,
  '--shadow-button': shadowTokens.component.button,
  '--shadow-dropdown': shadowTokens.component.dropdown,
  '--shadow-modal': shadowTokens.component.modal,

  // Backdrop filters
  '--backdrop-blur-light': backdropFilters.light,
  '--backdrop-blur-medium': backdropFilters.medium,
  '--backdrop-blur-strong': backdropFilters.strong,
  '--backdrop-glass': backdropFilters.glass,

  // Borders
  '--border-glass-light': borders.glass.light,
  '--border-glass-medium': borders.glass.medium,
  '--border-glass-primary': borders.glass.primary,
} as const;

// Type definitions
export type ElevationLevel = keyof typeof shadowTokens.elevation;
export type GlassShadow = keyof typeof shadowTokens.glass;
export type ComponentShadow = keyof typeof shadowTokens.component;
export type BackdropFilter = keyof typeof backdropFilters;
export type BorderStyle = keyof typeof borders;

// Helper functions
export const getShadow = (type: 'elevation' | 'glass' | 'component', scale: string): string => {
  const shadowGroup = shadowTokens[type] as Record<string, string>;
  return shadowGroup[scale] || shadowTokens.elevation.none;
};

export const getBackdropFilter = (filter: BackdropFilter): string => {
  return backdropFilters[filter];
};

export const createGlassStyle = (
  background: string = 'rgba(255, 255, 255, 0.25)',
  backdropFilter: BackdropFilter = 'medium',
  border: string = borders.glass.medium,
  shadow: string = shadowTokens.glass.medium,
) => ({
  background,
  backdropFilter: getBackdropFilter(backdropFilter),
  border,
  boxShadow: shadow,
});

// Common glass presets
export const glassPresets = {
  light: createGlassStyle(
    'rgba(255, 255, 255, 0.15)',
    'light',
    borders.glass.light,
    shadowTokens.glass.light,
  ),
  medium: createGlassStyle(
    'rgba(255, 255, 255, 0.25)',
    'medium',
    borders.glass.medium,
    shadowTokens.glass.medium,
  ),
  strong: createGlassStyle(
    'rgba(255, 255, 255, 0.35)',
    'strong',
    borders.glass.strong,
    shadowTokens.glass.strong,
  ),
  primary: createGlassStyle(
    'rgba(0, 135, 255, 0.15)',
    'medium',
    borders.glass.primary,
    shadowTokens.glass.primary,
  ),
} as const;

export default shadowTokens;
