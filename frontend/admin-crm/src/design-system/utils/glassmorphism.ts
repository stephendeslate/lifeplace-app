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
  shadowIntensity = 'medium',
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
    shadowIntensity: 'light',
  }),

  // Medium glass for cards and panels
  medium: createGlassEffect({
    opacity: 0.25,
    blur: 20,
    borderOpacity: 0.2,
    shadowIntensity: 'medium',
  }),

  // Strong glass for modals and overlays
  strong: createGlassEffect({
    opacity: 0.35,
    blur: 30,
    borderOpacity: 0.3,
    shadowIntensity: 'strong',
  }),

  // Colored glass variants
  primary: createGlassEffect({
    opacity: 0.15,
    blur: 20,
    borderOpacity: 0.3,
    shadowIntensity: 'medium',
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
export const glassHoverEffect = (
  baseGlass: Record<string, unknown>,
  intensity: 'subtle' | 'medium' | 'strong' = 'medium',
) => {
  const intensityMap = {
    subtle: { opacityIncrease: 0.05, blurIncrease: 5, transform: 'translateY(-1px)' },
    medium: { opacityIncrease: 0.1, blurIncrease: 10, transform: 'translateY(-2px)' },
    strong: { opacityIncrease: 0.15, blurIncrease: 15, transform: 'translateY(-4px)' },
  };

  const config = intensityMap[intensity];

  return {
    transition: tokens.animation.transitions.glassHover,
    '&:hover': {
      background: String(baseGlass.background).replace(
        /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/,
        (_: string, r: string, g: string, b: string, a: string) =>
          `rgba(${r}, ${g}, ${b}, ${parseFloat(a) + config.opacityIncrease})`,
      ),
      backdropFilter: String(baseGlass.backdropFilter).replace(
        /blur\((\d+)px\)/,
        (_: string, blur: string) => `blur(${parseInt(blur) + config.blurIncrease}px)`,
      ),
      transform: config.transform,
      boxShadow: tokens.shadow.glass.floating,
    },
  };
};

// Create glass card with hover effects
export const createGlassCard = (
  glassType: keyof typeof glassPresets = 'medium',
  hoverIntensity: 'subtle' | 'medium' | 'strong' = 'medium',
  borderRadius: string = tokens.spacing.radius.xxl,
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

// Create glass navigation styles
export const createGlassNavigation = (position: 'header' | 'sidebar' = 'header') => {
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

// Standardized form input styles - removes the need for repetitive inline styling
export const glassInputStyles = {
  '& .MuiOutlinedInput-root': {
    ...glassPresets.light,
    borderRadius: tokens.spacing.radius.lg,
    border: `1px solid ${tokens.color.borders.glass}`,
    '&:hover': {
      border: `1px solid ${tokens.color.primary[300]}`,
    },
    '&.Mui-focused': {
      border: `1px solid ${tokens.color.primary[500]}`,
      boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
    },
  },
};

// Standardized Select input styles
export const glassSelectStyles = {
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: tokens.color.borders.glass,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: tokens.color.primary[300],
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: tokens.color.primary[500],
    boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
  },
  '& .MuiSelect-select': {
    ...glassPresets.light,
    borderRadius: tokens.spacing.radius.lg,
  },
};

export default {
  createGlassEffect,
  glassPresets,
  glassHoverEffect,
  createGlassCard,
  createGlassNavigation,
  glassInputStyles,
  glassSelectStyles,
};
