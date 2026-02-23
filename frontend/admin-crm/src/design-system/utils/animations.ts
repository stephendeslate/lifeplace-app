// Animation Utility Functions
// Helper functions for creating smooth, purposeful animations

import { keyframes } from '@emotion/react';
import { tokens } from '../tokens';
import type { EasingFunction, Duration } from '../tokens/animations';

// Animation configuration interface
export interface AnimationConfig {
  duration?: Duration | number;
  easing?: EasingFunction | string;
  delay?: number;
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  iterationCount?: number | 'infinite';
}

// Fade animations
export const fadeAnimations = {
  fadeIn: () => keyframes`
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  `,

  fadeOut: () => keyframes`
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  `,

  fadeInUp: (distance: number = 24) => keyframes`
    from {
      opacity: 0;
      transform: translateY(${distance}px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  `,

  fadeInDown: (distance: number = 24) => keyframes`
    from {
      opacity: 0;
      transform: translateY(-${distance}px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  `,

  fadeInLeft: (distance: number = 24) => keyframes`
    from {
      opacity: 0;
      transform: translateX(-${distance}px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  `,

  fadeInRight: (distance: number = 24) => keyframes`
    from {
      opacity: 0;
      transform: translateX(${distance}px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  `,
};

// Scale animations
export const scaleAnimations = {
  scaleIn: keyframes`
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  `,

  scaleOut: keyframes`
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.8);
    }
  `,

  scaleUpCenter: keyframes`
    from {
      transform: scale(1);
    }
    to {
      transform: scale(1.05);
    }
  `,

  pulse: keyframes`
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.7;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  `,
};

// Slide animations
export const slideAnimations = {
  slideInLeft: keyframes`
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  `,

  slideInRight: keyframes`
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  `,

  slideOutLeft: keyframes`
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-100%);
    }
  `,

  slideOutRight: keyframes`
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(100%);
    }
  `,

  slideInUp: keyframes`
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  `,

  slideInDown: keyframes`
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  `,
};

// Rotation animations
export const rotationAnimations = {
  spin: keyframes`
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  `,

  spinReverse: keyframes`
    from {
      transform: rotate(360deg);
    }
    to {
      transform: rotate(0deg);
    }
  `,

  rotate45: keyframes`
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(45deg);
    }
  `,

  rotate90: keyframes`
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(90deg);
    }
  `,
};

// Bounce and elastic animations
export const bounceAnimations = {
  bounce: keyframes`
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  `,

  bounceIn: keyframes`
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      transform: scale(1.05);
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  `,

  shake: keyframes`
    0%, 100% {
      transform: translateX(0);
    }
    10%, 30%, 50%, 70%, 90% {
      transform: translateX(-4px);
    }
    20%, 40%, 60%, 80% {
      transform: translateX(4px);
    }
  `,

  wobble: keyframes`
    0% {
      transform: translateX(0%);
    }
    15% {
      transform: translateX(-6px) rotate(-6deg);
    }
    30% {
      transform: translateX(3px) rotate(6deg);
    }
    45% {
      transform: translateX(-3px) rotate(-3.6deg);
    }
    60% {
      transform: translateX(2px) rotate(2.4deg);
    }
    75% {
      transform: translateX(-1px) rotate(-1.2deg);
    }
    100% {
      transform: translateX(0%);
    }
  `,
};

// Glassmorphism-specific animations
export const glassAnimations = {
  glassMorphIn: keyframes`
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
      background: rgba(255, 255, 255, 0);
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(20px);
      background: rgba(255, 255, 255, 0.25);
      transform: scale(1);
    }
  `,

  glassMorphOut: keyframes`
    from {
      opacity: 1;
      backdrop-filter: blur(20px);
      background: rgba(255, 255, 255, 0.25);
      transform: scale(1);
    }
    to {
      opacity: 0;
      backdrop-filter: blur(0px);
      background: rgba(255, 255, 255, 0);
      transform: scale(0.95);
    }
  `,

  glassShimmer: keyframes`
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  `,

  backdropBlurIn: keyframes`
    from {
      backdrop-filter: blur(0px);
    }
    to {
      backdrop-filter: blur(20px);
    }
  `,
};

// Helper function to create animation styles
export const createAnimation = (
  animation: string,
  config: AnimationConfig = {},
): Record<string, string | number> => {
  const {
    duration = 'normal',
    easing = 'standard',
    delay = 0,
    fillMode = 'both',
    iterationCount = 1,
  } = config;

  const durationValue =
    typeof duration === 'string' ? `${tokens.animation.duration[duration]}ms` : `${duration}ms`;

  const easingValue =
    typeof easing === 'string'
      ? tokens.animation.easing[easing as keyof typeof tokens.animation.easing]
      : easing;

  return {
    animation: `${animation} ${durationValue} ${easingValue} ${delay}ms ${fillMode}`,
    animationIterationCount: iterationCount,
  };
};

// Transition helper functions
export const createTransition = (
  property: string | string[] = 'all',
  duration: Duration | number = 'normal',
  easing: EasingFunction | string = 'standard',
  delay: number = 0,
): string => {
  const properties = Array.isArray(property) ? property : [property];
  const durationValue =
    typeof duration === 'string' ? `${tokens.animation.duration[duration]}ms` : `${duration}ms`;

  const easingValue =
    typeof easing === 'string'
      ? tokens.animation.easing[easing as keyof typeof tokens.animation.easing]
      : easing;

  const delayValue = delay > 0 ? ` ${delay}ms` : '';

  return properties
    .map((prop) => `${prop} ${durationValue} ${easingValue}${delayValue}`)
    .join(', ');
};

// Stagger animation utilities
export const staggerUtilities = {
  // Calculate stagger delay for nth-child
  calculateStaggerDelay: (index: number, baseDelay: number = 50): number => {
    return index * baseDelay;
  },

  // Create stagger animation styles
  createStaggerStyles: (
    totalItems: number,
    baseDelay: number = 50,
    animation: string,
    config: AnimationConfig = {},
  ) => {
    const styles: Record<string, Record<string, unknown>> = {};

    for (let i = 1; i <= totalItems; i++) {
      const delay = (i - 1) * baseDelay;
      styles[`&:nth-child(${i})`] = {
        ...createAnimation(animation, { ...config, delay }),
      };
    }

    return styles;
  },

  // Predefined stagger presets
  presets: {
    fastStagger: { baseDelay: 30, maxItems: 10 },
    normalStagger: { baseDelay: 50, maxItems: 15 },
    slowStagger: { baseDelay: 100, maxItems: 8 },
  },
};

// Hover animation utilities
export const hoverAnimations = {
  // Lift effect for cards
  liftEffect: {
    transition: createTransition(['transform', 'box-shadow'], 'fast'),
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow.glass.floating,
    },
  },

  // Scale effect for buttons
  scaleEffect: (scale: number = 1.02) => ({
    transition: createTransition('transform', 'fast'),
    '&:hover': {
      transform: `scale(${scale})`,
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  }),

  // Glow effect
  glowEffect: (color: string = tokens.color.primary[500]) => ({
    transition: createTransition(['box-shadow', 'transform'], 'fast'),
    '&:hover': {
      boxShadow: `0 0 20px ${color}30, 0 0 40px ${color}20`,
      transform: 'translateY(-1px)',
    },
  }),

  // Glass morph hover
  glassMorphHover: {
    transition: createTransition(['backdrop-filter', 'background', 'transform'], 'fast'),
    '&:hover': {
      backdropFilter: 'blur(30px)',
      background: 'rgba(255, 255, 255, 0.35)',
      transform: 'translateY(-1px)',
    },
  },
};

// Loading animations
export const loadingAnimations = {
  spinner: (spin: string) =>
    createAnimation(spin, {
      duration: 1000,
      easing: 'linear' as const,
      iterationCount: 'infinite',
    }),

  pulse: (pulse: string) =>
    createAnimation(pulse, {
      duration: 2000,
      easing: 'standard',
      iterationCount: 'infinite',
    }),

  shimmer: (width: string = '100%') => ({
    background: `linear-gradient(90deg, 
      transparent, 
      rgba(255, 255, 255, 0.4), 
      transparent
    )`,
    backgroundSize: `${width} 100%`,
    animation: `${glassAnimations.glassShimmer} 2s infinite`,
  }),
};

// Page transition animations
export const pageTransitions = {
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: { duration: 0.3, ease: tokens.animation.easing.standard },
  },

  slideRight: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
    transition: { duration: 0.3, ease: tokens.animation.easing.standard },
  },

  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: tokens.animation.easing.standard },
  },

  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { duration: 0.2, ease: tokens.animation.easing.standard },
  },
};

// Utility function to create custom animations
export const createCustomAnimation = (keyframes: string, config: AnimationConfig = {}) => {
  return createAnimation(keyframes, config);
};

// Animation class names for CSS
export const animationClasses = {
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  slideIn: 'animate-slide-in',
  slideOut: 'animate-slide-out',
  scaleIn: 'animate-scale-in',
  scaleOut: 'animate-scale-out',
  bounce: 'animate-bounce',
  shake: 'animate-shake',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  glassMorphIn: 'animate-glass-morph-in',
  glassMorphOut: 'animate-glass-morph-out',
};

// Performance utilities
export const performanceUtils = {
  // Check if user prefers reduced motion
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Conditionally apply animation based on user preference
  respectReducedMotion: (
    animationStyle: Record<string, unknown>,
    fallbackStyle: Record<string, unknown> = {},
  ) => {
    return performanceUtils.prefersReducedMotion() ? fallbackStyle : animationStyle;
  },

  // Optimize animations for performance
  optimizeForPerformance: (animationStyle: Record<string, unknown>) => ({
    ...animationStyle,
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden',
    perspective: 1000,
  }),
};

export default {
  fadeAnimations,
  scaleAnimations,
  slideAnimations,
  rotationAnimations,
  bounceAnimations,
  glassAnimations,
  createAnimation,
  createTransition,
  staggerUtilities,
  hoverAnimations,
  loadingAnimations,
  pageTransitions,
  createCustomAnimation,
  animationClasses,
  performanceUtils,
};
