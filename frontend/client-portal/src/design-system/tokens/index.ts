// design-system/tokens/index.ts

export * from './colors';
export * from './shadows';
export * from './animations';
export * from './spacing';

import { baseColors, semanticColors, gradients, glassEffects, overlays } from './colors';
import { shadows, blurs, glows } from './shadows';
import { transitions, animations, keyframes, durations } from './animations';
import { spacing, layout, layoutComponents, borderRadius, zIndex } from './spacing';

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
};

export default tokens;