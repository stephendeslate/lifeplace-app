// Design System Tokens - Centralized export
// Modern LifePlace Admin Design System

import colorTokens, { getColor, createGlassColor, getNotificationColor, getChartColor, getEventStatusColors, cssVariables as colorCssVariables } from './colors';
import typographyTokens, { getTypographyStyle, createResponsiveTypography, typographyCssVariables } from './typography';
import spacingTokens, { getSpace, getSemanticSpace, getRadius, padding, margin, gap, spacingCssVariables } from './spacing';
import shadowTokens, { getShadow, getBackdropFilter, createGlassStyle, glassPresets as shadowGlassPresets, shadowsCssVariables } from './shadows';
import animationTokens, { getDuration, getEasing, getTransition, createTransition as createAnimationTransition, createAnimation as createAnimationKeyframe, staggerAnimations, animationCssVariables } from './animations';

// Re-export with proper names to avoid conflicts
export { colorTokens, getColor, createGlassColor, getNotificationColor, getChartColor, getEventStatusColors };
export { typographyTokens, getTypographyStyle, createResponsiveTypography };
export { spacingTokens, getSpace, getSemanticSpace, getRadius, padding, margin, gap };
export { shadowTokens, getShadow, getBackdropFilter, createGlassStyle };
export { animationTokens, getDuration, getEasing, getTransition };

// Export types
export type { ColorToken, PrimaryColorVariant, GlassVariant, BackgroundVariant, NotificationCategory, EventStatusType, ChartSeriesIndex } from './colors';
export type { FontFamily, FontWeight, FontSize, TypographyStyle } from './typography';
export type { SpaceScale, SemanticSpacing, RadiusScale, ContainerSize, ZIndexLevel, Breakpoint } from './spacing';
export type { ElevationLevel, GlassShadow, InteractiveShadow, ComponentShadow, BackdropFilter } from './shadows';
export type { EasingFunction, Duration, AnimationPattern, TransitionPreset } from './animations';

// Rename conflicting exports
export { shadowGlassPresets as glassPresets };
export { createAnimationTransition as createTransition };
export { createAnimationKeyframe as createAnimation };
export { staggerAnimations };

// Combined CSS variables for easy global injection
export const allCssVariables = {
  ...colorCssVariables,
  ...typographyCssVariables,
  ...spacingCssVariables,
  ...shadowsCssVariables,
  ...animationCssVariables,
} as const;

// Design token categories for organized access
export const tokens = {
  color: colorTokens,
  typography: typographyTokens,
  spacing: spacingTokens,
  shadow: shadowTokens,
  animation: animationTokens,
} as const;

// Utility function to inject CSS variables globally
export const injectCssVariables = (): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  Object.entries(allCssVariables).forEach(([property, value]) => {
    root.style.setProperty(property, String(value));
  });
};

// Theme configuration helper
export const createThemeConfig = () => ({
  colors: colorTokens,
  typography: typographyTokens,
  spacing: spacingTokens,
  shadows: shadowTokens,
  animations: animationTokens,
});

// Design system version
export const DESIGN_SYSTEM_VERSION = '1.0.0';

// Export all tokens as default
export default tokens;