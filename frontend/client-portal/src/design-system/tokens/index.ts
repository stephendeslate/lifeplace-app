// design-system/tokens/index.ts

export * from './colors';
export * from './shadows';
export * from './animations';
export * from './spacing';
export * from './typography';

import { baseColors, semanticColors, gradients, glassEffects, overlays } from './colors';
import { shadows, blurs, glows, textShadows } from './shadows';
import { transitions, animations, keyframes, durations } from './animations';
import { spacing, layout, layoutComponents, borderRadius, zIndex } from './spacing';
import { typography } from './typography';

export const tokens = {
  color: {
    base: baseColors,
    semantic: semanticColors,
    gradients,
    glass: glassEffects,
    overlays,
  },
  shadow: {
    elevation: shadows,
    blur: blurs,
    glow: glows,
    text: textShadows,
  },
  animation: {
    transition: transitions,
    animation: animations,
    keyframe: keyframes,
    duration: durations,
  },
  spacing: {
    space: spacing,
    layout,
    layoutComponents,
    radius: borderRadius,
    zIndex,
  },
  typography: {
    families: typography.families,
    weights: typography.weights,
    sizes: typography.sizes,
    lineHeights: typography.lineHeights,
    letterSpacing: typography.letterSpacing,
    styles: typography.styles,
    responsive: typography.responsive,
  },
};

export default tokens;