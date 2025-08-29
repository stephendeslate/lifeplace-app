// Glassmorphism Utility Functions
// Helper functions for creating modern glass effects

import { tokens } from '../tokens';

export interface GlassStyleOptions {
  opacity?: number;
  blur?: number;
  saturation?: number;
  brightness?: number;
  borderOpacity?: number;
  shadowIntensity?: 'light' | 'medium' | 'strong';
}

// Create basic glass effect with customizable properties
export const createGlassEffect = ({
  opacity = 0.25,
  blur = 20,
  saturation = 1.2,
  brightness = 1,
  borderOpacity = 0.2,
  shadowIntensity = 'medium'
}: GlassStyleOptions = {}) => ({
  background: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: `blur(${blur}px) saturate(${saturation}) brightness(${brightness})`,
  border: `1px solid rgba(255, 255, 255, ${borderOpacity})`,
  boxShadow: tokens.shadow.glass[shadowIntensity],
});

// Preset glass effects for common use cases
export const glassPresets = {
  // Light glass for subtle elements
  light: createGlassEffect({
    opacity: 0.15,
    blur: 10,
    borderOpacity: 0.1,
    shadowIntensity: 'light'
  }),

  // Medium glass for cards and panels
  medium: createGlassEffect({
    opacity: 0.25,
    blur: 20,
    borderOpacity: 0.2,
    shadowIntensity: 'medium'
  }),

  // Strong glass for modals and overlays
  strong: createGlassEffect({
    opacity: 0.35,
    blur: 30,
    borderOpacity: 0.3,
    shadowIntensity: 'strong'
  }),

  // Colored glass variants
  primary: createGlassEffect({
    opacity: 0.15,
    blur: 20,
    borderOpacity: 0.3,
    shadowIntensity: 'medium'
  }),

  success: {
    background: tokens.color.glass.successGlass,
    backdropFilter: 'blur(20px) saturate(1.2)',
    border: `1px solid ${tokens.color.borders.glass}`,
    boxShadow: tokens.shadow.glass.success,
  },

  warning: {
    background: tokens.color.glass.warningGlass,
    backdropFilter: 'blur(20px) saturate(1.2)',
    border: `1px solid ${tokens.color.borders.glass}`,
    boxShadow: tokens.shadow.glass.warning,
  },

  error: {
    background: tokens.color.glass.errorGlass,
    backdropFilter: 'blur(20px) saturate(1.2)',
    border: `1px solid ${tokens.color.borders.glass}`,
    boxShadow: tokens.shadow.glass.error,
  },
} as const;

// Glass hover effects
export const glassHoverEffect = (baseGlass: any, intensity: 'subtle' | 'medium' | 'strong' = 'medium') => {
  const intensityMap = {
    subtle: { opacityIncrease: 0.05, blurIncrease: 5, transform: 'translateY(-1px)' },
    medium: { opacityIncrease: 0.1, blurIncrease: 10, transform: 'translateY(-2px)' },
    strong: { opacityIncrease: 0.15, blurIncrease: 15, transform: 'translateY(-4px)' },
  };

  const config = intensityMap[intensity];

  return {
    transition: tokens.animation.transitions.glassHover,
    '&:hover': {
      background: baseGlass.background.replace(
        /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/,
        (_: string, r: string, g: string, b: string, a: string) => 
          `rgba(${r}, ${g}, ${b}, ${parseFloat(a) + config.opacityIncrease})`
      ),
      backdropFilter: baseGlass.backdropFilter.replace(
        /blur\((\d+)px\)/,
        (_: string, blur: string) => `blur(${parseInt(blur) + config.blurIncrease}px)`
      ),
      transform: config.transform,
      boxShadow: tokens.shadow.glass.floating,
    }
  };
};

// Create glass card with hover effects
export const createGlassCard = (
  glassType: keyof typeof glassPresets = 'medium',
  hoverIntensity: 'subtle' | 'medium' | 'strong' = 'medium',
  borderRadius: string = tokens.spacing.radius.xxl
) => {
  const baseGlass = glassPresets[glassType];
  const hoverEffect = glassHoverEffect(baseGlass, hoverIntensity);

  return {
    ...baseGlass,
    ...hoverEffect,
    borderRadius,
    overflow: 'hidden',
    position: 'relative' as const,
  };
};

// Create glass button styles
export const createGlassButton = (
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'primary',
  variant: 'filled' | 'outlined' | 'ghost' = 'filled'
) => {
  const colorMap = {
    primary: {
      background: tokens.color.glass.primaryGlass,
      border: `1px solid ${tokens.color.borders.primary}`,
      color: tokens.color.primary[700],
    },
    secondary: {
      background: `rgba(${tokens.color.secondary[500]}, 0.15)`,
      border: `1px solid rgba(${tokens.color.secondary[500]}, 0.3)`,
      color: tokens.color.secondary[700],
    },
    success: {
      background: tokens.color.glass.successGlass,
      border: `1px solid ${tokens.color.borders.success}`,
      color: tokens.color.success[700],
    },
    warning: {
      background: tokens.color.glass.warningGlass,
      border: `1px solid ${tokens.color.borders.warning}`,
      color: tokens.color.warning[700],
    },
    error: {
      background: tokens.color.glass.errorGlass,
      border: `1px solid ${tokens.color.borders.error}`,
      color: tokens.color.error[700],
    },
  };

  const variantStyles = {
    filled: {
      ...colorMap[color],
      backdropFilter: 'blur(10px)',
      '&:hover': {
        background: colorMap[color].background.replace('0.15', '0.25'),
        backdropFilter: 'blur(15px)',
        transform: 'translateY(-1px)',
      }
    },
    outlined: {
      background: 'transparent',
      border: colorMap[color].border,
      color: colorMap[color].color,
      '&:hover': {
        background: colorMap[color].background,
        backdropFilter: 'blur(10px)',
      }
    },
    ghost: {
      background: 'transparent',
      border: 'transparent',
      color: colorMap[color].color,
      '&:hover': {
        background: colorMap[color].background,
        backdropFilter: 'blur(10px)',
      }
    },
  };

  return {
    ...variantStyles[variant],
    borderRadius: tokens.spacing.radius.xl,
    padding: '8px 20px',
    fontWeight: 600,
    transition: tokens.animation.transitions.button,
    textTransform: 'none' as const,
  };
};

// Create glass modal/dialog styles
export const createGlassModal = (
  backdropBlur: number = 40,
  overlayOpacity: number = 0.3
) => ({
  backdrop: {
    backdropFilter: `blur(${backdropBlur}px)`,
    background: `rgba(0, 0, 0, ${overlayOpacity})`,
  },
  paper: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(40px)',
    border: `1px solid ${tokens.color.borders.glass}`,
    borderRadius: tokens.spacing.radius.xxxl,
    boxShadow: tokens.shadow.component.modal,
  },
});

// Create glass navigation styles
export const createGlassNavigation = (
  position: 'header' | 'sidebar' = 'header'
) => {
  const styles = {
    header: {
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${tokens.color.borders.glass}`,
      boxShadow: tokens.shadow.component.header,
    },
    sidebar: {
      background: 'rgba(248, 250, 252, 0.95)',
      backdropFilter: 'blur(30px)',
      borderRight: `1px solid ${tokens.color.borders.glass}`,
      boxShadow: tokens.shadow.component.sidebar,
    },
  };

  return styles[position];
};

// Create glass table styles
export const createGlassTable = (
  headerIntensity: 'light' | 'medium' = 'medium'
) => ({
  container: {
    background: tokens.color.glass.light,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${tokens.color.borders.glass}`,
    borderRadius: tokens.spacing.radius.xxl,
    boxShadow: tokens.shadow.glass.light,
    overflow: 'hidden',
  },
  header: {
    background: headerIntensity === 'light' 
      ? tokens.color.glass.light 
      : tokens.color.glass.medium,
    backdropFilter: 'blur(20px)',
    borderBottom: `1px solid ${tokens.color.borders.glass}`,
  },
  row: {
    '&:hover': {
      background: tokens.color.glass.light,
      backdropFilter: 'blur(10px)',
    }
  },
});

// Create glass form field styles
export const createGlassFormField = (
  state: 'default' | 'focused' | 'error' = 'default'
) => {
  const stateStyles = {
    default: {
      background: 'rgba(255, 255, 255, 0.8)',
      border: `1px solid ${tokens.color.borders.glass}`,
    },
    focused: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: `1px solid ${tokens.color.borders.primary}`,
      boxShadow: tokens.shadow.component.inputFocus,
    },
    error: {
      background: 'rgba(255, 255, 255, 0.9)',
      border: `1px solid ${tokens.color.borders.error}`,
      boxShadow: tokens.shadow.component.inputError,
    },
  };

  return {
    ...stateStyles[state],
    backdropFilter: 'blur(10px)',
    borderRadius: tokens.spacing.radius.lg,
    transition: tokens.animation.transitions.normal,
  };
};

// Utility to add glass effect to existing styles
export const addGlassEffect = (
  existingStyles: any,
  glassType: keyof typeof glassPresets = 'medium'
): any => ({
  ...existingStyles,
  ...glassPresets[glassType],
});

// Check browser support for backdrop-filter
export const supportsBackdropFilter = (): boolean => {
  if (typeof window === 'undefined') return false;
  return CSS?.supports?.('backdrop-filter', 'blur(1px)') || false;
};

// Fallback styles for unsupported browsers
export const createFallbackGlass = (glassStyle: any) => {
  if (supportsBackdropFilter()) {
    return glassStyle;
  }

  return {
    ...glassStyle,
    backdropFilter: 'none',
    background: glassStyle.background.replace(/rgba\((.*),\s*([\d.]+)\)/, 'rgba($1, 0.9)'),
    boxShadow: tokens.shadow.elevation.lg,
  };
};

export default {
  createGlassEffect,
  glassPresets,
  glassHoverEffect,
  createGlassCard,
  createGlassButton,
  createGlassModal,
  createGlassNavigation,
  createGlassTable,
  createGlassFormField,
  addGlassEffect,
  supportsBackdropFilter,
  createFallbackGlass,
};