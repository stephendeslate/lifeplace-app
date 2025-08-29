// Modern LifePlace Admin Animation System
// Implementing smooth, purposeful motion for enhanced UX

export const animationTokens = {
  // Easing functions for natural motion
  easing: {
    // Standard Material Design curves
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Default easing
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',      // Elements entering screen
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',      // Elements leaving screen
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',         // Sharp/snappy animations
    
    // Custom curves for specific effects
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',  // Playful bounce
    gentle: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',    // Gentle ease
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',        // Very smooth
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Elastic effect
    
    // iOS-inspired curves
    iosEnter: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    iosExit: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  },

  // Duration tokens for consistent timing
  duration: {
    fastest: 100,     // Micro-interactions (hover effects)
    faster: 150,      // Quick transitions
    fast: 200,        // Standard interactions
    normal: 300,      // Default duration
    slow: 400,        // Deliberate transitions
    slower: 500,      // Complex animations
    slowest: 750,     // Page transitions
  },

  // Delay tokens for staggered animations
  delay: {
    none: 0,
    xs: 50,
    sm: 100,
    md: 150,
    lg: 200,
    xl: 250,
    xxl: 300,
  },

  // Common animation patterns
  patterns: {
    // Fade animations
    fadeIn: {
      keyframes: {
        from: { opacity: 0 },
        to: { opacity: 1 }
      },
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fillMode: 'both'
    },

    fadeOut: {
      keyframes: {
        from: { opacity: 1 },
        to: { opacity: 0 }
      },
      duration: 200,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fillMode: 'both'
    },

    fadeInUp: {
      keyframes: {
        from: { 
          opacity: 0,
          transform: 'translateY(24px)'
        },
        to: { 
          opacity: 1,
          transform: 'translateY(0)'
        }
      },
      duration: 400,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fillMode: 'both'
    },

    fadeInDown: {
      keyframes: {
        from: { 
          opacity: 0,
          transform: 'translateY(-24px)'
        },
        to: { 
          opacity: 1,
          transform: 'translateY(0)'
        }
      },
      duration: 400,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fillMode: 'both'
    },

    // Slide animations
    slideInLeft: {
      keyframes: {
        from: { transform: 'translateX(-100%)' },
        to: { transform: 'translateX(0)' }
      },
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fillMode: 'both'
    },

    slideInRight: {
      keyframes: {
        from: { transform: 'translateX(100%)' },
        to: { transform: 'translateX(0)' }
      },
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fillMode: 'both'
    },

    slideOutLeft: {
      keyframes: {
        from: { transform: 'translateX(0)' },
        to: { transform: 'translateX(-100%)' }
      },
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fillMode: 'both'
    },

    slideOutRight: {
      keyframes: {
        from: { transform: 'translateX(0)' },
        to: { transform: 'translateX(100%)' }
      },
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fillMode: 'both'
    },

    // Scale animations  
    scaleIn: {
      keyframes: {
        from: { 
          opacity: 0,
          transform: 'scale(0.8)'
        },
        to: { 
          opacity: 1,
          transform: 'scale(1)'
        }
      },
      duration: 200,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fillMode: 'both'
    },

    scaleOut: {
      keyframes: {
        from: { 
          opacity: 1,
          transform: 'scale(1)'
        },
        to: { 
          opacity: 0,
          transform: 'scale(0.8)'
        }
      },
      duration: 150,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fillMode: 'both'
    },

    // Bounce effect for playful interactions
    bounce: {
      keyframes: {
        '0%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.05)' },
        '100%': { transform: 'scale(1)' }
      },
      duration: 200,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      fillMode: 'both'
    },

    // Pulse effect for attention
    pulse: {
      keyframes: {
        '0%': { transform: 'scale(1)', opacity: 1 },
        '50%': { transform: 'scale(1.05)', opacity: 0.7 },
        '100%': { transform: 'scale(1)', opacity: 1 }
      },
      duration: 1000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      iterationCount: 'infinite'
    },

    // Shake effect for errors
    shake: {
      keyframes: {
        '0%, 100%': { transform: 'translateX(0)' },
        '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
        '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' }
      },
      duration: 500,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fillMode: 'both'
    },

    // Rotate animations
    spin: {
      keyframes: {
        from: { transform: 'rotate(0deg)' },
        to: { transform: 'rotate(360deg)' }
      },
      duration: 1000,
      easing: 'linear',
      iterationCount: 'infinite'
    },

    // Glass morphing effect
    glassMorph: {
      keyframes: {
        '0%': { 
          backdropFilter: 'blur(0px)',
          background: 'rgba(255, 255, 255, 0)'
        },
        '100%': { 
          backdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.25)'
        }
      },
      duration: 400,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fillMode: 'both'
    },
  },

  // Transition presets for common use cases
  transitions: {
    // Basic transitions
    fast: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Property-specific transitions
    opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors: 'color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    shadow: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    border: 'border 150ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Component-specific transitions
    button: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    card: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    modal: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    drawer: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    tooltip: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Glass-specific transitions
    glass: 'backdrop-filter 300ms cubic-bezier(0.4, 0, 0.2, 1), background 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    glassHover: 'backdrop-filter 200ms cubic-bezier(0.4, 0, 0.2, 1), background 200ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Stagger animation helpers for list items
export const staggerAnimations = {
  // Stagger delays for multiple elements
  calculateDelay: (index: number, baseDelay: number = 50): number => {
    return index * baseDelay;
  },

  // Stagger configuration presets
  presets: {
    fast: { baseDelay: 30, maxDelay: 200 },
    normal: { baseDelay: 50, maxDelay: 300 },
    slow: { baseDelay: 100, maxDelay: 500 },
  },

  // Create stagger style for nth-child
  createStaggerStyle: (totalItems: number, baseDelay: number = 50) => {
    const styles: Record<string, any> = {};
    
    for (let i = 1; i <= totalItems; i++) {
      styles[`&:nth-child(${i})`] = {
        animationDelay: `${(i - 1) * baseDelay}ms`,
      };
    }
    
    return styles;
  },
};

// CSS Custom Properties for animations
export const animationCssVariables = {
  // Durations
  '--duration-fastest': `${animationTokens.duration.fastest}ms`,
  '--duration-fast': `${animationTokens.duration.fast}ms`,
  '--duration-normal': `${animationTokens.duration.normal}ms`,
  '--duration-slow': `${animationTokens.duration.slow}ms`,
  '--duration-slowest': `${animationTokens.duration.slowest}ms`,

  // Easing functions
  '--easing-standard': animationTokens.easing.standard,
  '--easing-decelerate': animationTokens.easing.decelerate,
  '--easing-accelerate': animationTokens.easing.accelerate,
  '--easing-bounce': animationTokens.easing.bounce,

  // Common transitions
  '--transition-fast': animationTokens.transitions.fast,
  '--transition-normal': animationTokens.transitions.normal,
  '--transition-button': animationTokens.transitions.button,
  '--transition-card': animationTokens.transitions.card,
  '--transition-glass': animationTokens.transitions.glass,
} as const;

// Type definitions
export type EasingFunction = keyof typeof animationTokens.easing;
export type Duration = keyof typeof animationTokens.duration;
export type AnimationPattern = keyof typeof animationTokens.patterns;
export type TransitionPreset = keyof typeof animationTokens.transitions;

// Helper functions
export const getDuration = (speed: Duration): number => {
  return animationTokens.duration[speed];
};

export const getEasing = (curve: EasingFunction): string => {
  return animationTokens.easing[curve];
};

export const getTransition = (preset: TransitionPreset): string => {
  return animationTokens.transitions[preset];
};

// Animation utility functions
export const createTransition = (
  property: string = 'all',
  duration: Duration = 'normal',
  easing: EasingFunction = 'standard',
  delay: number = 0
): string => {
  const durationMs = getDuration(duration);
  const easingFunction = getEasing(easing);
  const delayString = delay > 0 ? ` ${delay}ms` : '';
  
  return `${property} ${durationMs}ms ${easingFunction}${delayString}`;
};

// Keyframes generator for CSS-in-JS
export const createKeyframes = (name: string, keyframes: Record<string, any>) => {
  return {
    [`@keyframes ${name}`]: keyframes,
  };
};

// Animation class generator
export const createAnimation = (
  pattern: AnimationPattern,
  customDuration?: number,
  customEasing?: EasingFunction,
  customDelay?: number
) => {
  const basePattern = animationTokens.patterns[pattern];
  
  return {
    animation: `${pattern} ${customDuration || basePattern.duration}ms ${
      customEasing ? getEasing(customEasing) : basePattern.easing
    } ${customDelay || 0}ms ${'fillMode' in basePattern ? basePattern.fillMode : 'both'}`,
  };
};

export default animationTokens;