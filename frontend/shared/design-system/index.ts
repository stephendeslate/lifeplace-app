// LifePlace Shared Design System
// Unified design tokens, themes, and components

// Legacy components - commented out to prevent compilation issues in CI/CD
// import AccessibleButton, { PrimaryButton, SecondaryButton, GlassButton, RoundedButton, LoadingButton } from './components/AccessibleButton';
// import GlassCard, { GlassCardSubtle, GlassCardMedium, GlassCardStrong, InteractiveGlassCard, ColoredGlassCard } from './components/GlassCard';
import Button from './components/Button';
import AnimatedElement, {
  FadeIn,
  SlideUp,
  SlideDown,
  ZoomIn,
  BounceIn,
  Reveal,
  BlurIn,
} from './components/AnimatedElement';
import IconButton from './components/IconButton';
import { createAdminTheme, adminLightTheme, adminDarkTheme } from './themes/admin';
import { createClientTheme, clientLightTheme, clientDarkTheme } from './themes/client';
import { designTokens } from './tokens/base';
import {
  breakpoints,
  mediaQuery,
  createResponsiveValue,
  createContainer,
  createGrid,
  flex,
  createResponsiveTypography,
  spacing,
  visibility,
  createThemeResponsive,
  useResponsiveValue,
  containerWidths,
} from './utils/responsive';

// Export design tokens
export { designTokens, type DesignTokens } from './tokens/base';
export type {
  ColorToken,
  ColorShades,
  LegacyColorVariant,
  SemanticColors,
  TypographyToken,
  SpacingToken,
  ShadowToken,
  AnimationToken,
  GlassToken,
  ZIndexToken,
} from './tokens/base';

// Export theme configurations
export { createAdminTheme, adminLightTheme, adminDarkTheme } from './themes/admin';

export { createClientTheme, clientLightTheme, clientDarkTheme } from './themes/client';

// Export shared components
// Legacy components - commented out to prevent compilation issues in CI/CD
// export {
//   GlassCard,
//   GlassCardSubtle,
//   GlassCardMedium,
//   GlassCardStrong,
//   InteractiveGlassCard,
//   ColoredGlassCard,
// } from './components/GlassCard';

// export {
//   AccessibleButton,
//   PrimaryButton,
//   SecondaryButton,
//   GlassButton,
//   RoundedButton,
//   LoadingButton,
// } from './components/AccessibleButton';

export { Button } from './components/Button';

export {
  AnimatedElement,
  FadeIn,
  SlideUp,
  SlideDown,
  ZoomIn,
  BounceIn,
  Reveal,
  BlurIn,
} from './components/AnimatedElement';

export { IconButton } from './components/IconButton';

// Legacy type exports - commented out to prevent compilation issues in CI/CD
// export type {
//   GlassVariant,
//   GlassIntensity,
//   GlassCardProps,
// } from './components/GlassCard';

// export type { GlassColor } from './tokens/base';

// export type { AccessibleButtonProps } from './components/AccessibleButton';

export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

export type { AnimatedElementProps, AnimationType } from './components/AnimatedElement';

export type { IconButtonProps, IconButtonVariant, IconButtonSize } from './components/IconButton';

// Export utilities
export {
  breakpoints,
  mediaQuery,
  createResponsiveValue,
  createContainer,
  createGrid,
  flex,
  createResponsiveTypography,
  spacing,
  visibility,
  createThemeResponsive,
  useResponsiveValue,
  containerWidths,
} from './utils/responsive';

export type { Breakpoint, ResponsiveValue } from './utils/responsive';

// Design system version and metadata
export const DESIGN_SYSTEM_VERSION = '2.0.0';
export const DESIGN_SYSTEM_NAME = 'LifePlace Design System';

// Theme selection helper
export const getTheme = (app: 'admin' | 'client', mode: 'light' | 'dark' = 'light') => {
  if (app === 'admin') {
    return createAdminTheme(mode);
  }
  return createClientTheme(mode);
};

// CSS Variables injection utility
export const injectDesignTokens = () => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Color tokens
  Object.entries(designTokens.colors.brand.primary).forEach(([shade, color]) => {
    root.style.setProperty(`--color-primary-${shade}`, color);
  });

  Object.entries(designTokens.colors.brand.secondary).forEach(([shade, color]) => {
    root.style.setProperty(`--color-secondary-${shade}`, color);
  });

  Object.entries(designTokens.colors.neutral).forEach(([shade, color]) => {
    root.style.setProperty(`--color-neutral-${shade}`, color);
  });

  // Semantic colors
  Object.entries(designTokens.colors.semantic).forEach(([semantic, shades]) => {
    Object.entries(shades).forEach(([shade, color]) => {
      root.style.setProperty(`--color-${semantic}-${shade}`, color as string);
    });
  });

  // Spacing tokens
  Object.entries(designTokens.spacing.space).forEach(([key, value]) => {
    root.style.setProperty(`--space-${key}`, `${value}px`);
  });

  Object.entries(designTokens.spacing.radius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  // Typography tokens
  Object.entries(designTokens.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, `${value}px`);
  });

  // Shadow tokens
  Object.entries(designTokens.shadows.elevation).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });

  // Animation tokens
  Object.entries(designTokens.animations.transitions).forEach(([key, value]) => {
    root.style.setProperty(`--transition-${key}`, value);
  });

  // Animation duration tokens
  Object.entries(designTokens.animations.duration).forEach(([key, value]) => {
    root.style.setProperty(`--duration-${key}`, value);
  });

  // Glass effect tokens
  Object.entries(designTokens.glass.light).forEach(([intensity, effect]) => {
    if (typeof effect === 'object' && effect !== null && 'background' in effect) {
      root.style.setProperty(`--glass-light-${intensity}-bg`, effect.background);
      root.style.setProperty(`--glass-light-${intensity}-border`, effect.border);
      root.style.setProperty(`--glass-light-${intensity}-blur`, effect.blur);
    }
  });

  Object.entries(designTokens.glass.dark).forEach(([intensity, effect]) => {
    if (typeof effect === 'object' && effect !== null && 'background' in effect) {
      root.style.setProperty(`--glass-dark-${intensity}-bg`, effect.background);
      root.style.setProperty(`--glass-dark-${intensity}-border`, effect.border);
      root.style.setProperty(`--glass-dark-${intensity}-blur`, effect.blur);
    }
  });
};

// Accessibility helpers
export const a11y = {
  // Color contrast utilities
  getContrastRatio: (_foreground: string, _background: string): number => {
    // Simplified contrast calculation - in production, use a proper color library
    // This is a placeholder implementation
    return 4.5; // WCAG AA compliance minimum
  },

  // Focus ring utility
  focusRing: {
    outline: `2px solid ${designTokens.colors.brand.primary[500]}`,
    outlineOffset: '2px',
  },

  // Screen reader utilities
  screenReaderOnly: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: '0',
  },

  // Motion preferences
  respectsReducedMotion: () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // High contrast mode detection
  respectsHighContrast: () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  },
};

// Performance utilities
export const performance = {
  // Lazy loading component wrapper
  createLazyComponent: <T>(importFn: () => Promise<{ default: React.ComponentType<T> }>) => {
    // This would typically use React.lazy in the consuming application
    return importFn;
  },

  // Critical CSS extraction helper
  extractCriticalCSS: () => {
    // Placeholder for critical CSS extraction logic
    return '';
  },

  // Bundle size analyzer
  analyzeBundleSize: () => {
    // Placeholder for bundle analysis
    if (process.env.NODE_ENV === 'development') {
      console.log('Design System Bundle Loaded');
    }
  },
};

// Default export with everything
export default {
  tokens: designTokens,
  themes: {
    createAdminTheme: createAdminTheme,
    createClientTheme: createClientTheme,
    adminLightTheme: adminLightTheme,
    adminDarkTheme: adminDarkTheme,
    clientLightTheme: clientLightTheme,
    clientDarkTheme: clientDarkTheme,
    getTheme: getTheme,
  },
  components: {
    // Legacy components - commented out to prevent compilation issues in CI/CD
    // GlassCard: GlassCard,
    // GlassCardSubtle: GlassCardSubtle,
    // GlassCardMedium: GlassCardMedium,
    // GlassCardStrong: GlassCardStrong,
    // InteractiveGlassCard: InteractiveGlassCard,
    // ColoredGlassCard: ColoredGlassCard,
    // AccessibleButton: AccessibleButton,
    // PrimaryButton: PrimaryButton,
    // SecondaryButton: SecondaryButton,
    // GlassButton: GlassButton,
    // RoundedButton: RoundedButton,
    // LoadingButton: LoadingButton,
    Button: Button,
    AnimatedElement: AnimatedElement,
    FadeIn: FadeIn,
    SlideUp: SlideUp,
    SlideDown: SlideDown,
    ZoomIn: ZoomIn,
    BounceIn: BounceIn,
    Reveal: Reveal,
    BlurIn: BlurIn,
    IconButton: IconButton,
  },
  utils: {
    responsive: {
      breakpoints: breakpoints,
      mediaQuery: mediaQuery,
      createResponsiveValue: createResponsiveValue,
      createContainer: createContainer,
      createGrid: createGrid,
      flex: flex,
      createResponsiveTypography: createResponsiveTypography,
      spacing: spacing,
      visibility: visibility,
      createThemeResponsive: createThemeResponsive,
      useResponsiveValue: useResponsiveValue,
      containerWidths: containerWidths,
    },
    a11y: a11y,
    performance: performance,
  },
  meta: {
    version: DESIGN_SYSTEM_VERSION,
    name: DESIGN_SYSTEM_NAME,
  },
  inject: injectDesignTokens,
};
