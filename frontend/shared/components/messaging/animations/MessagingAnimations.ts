// Messaging Animation Systems and Micro-Interactions
// Unified animation library for both Admin CRM and Client Portal messaging components

import { keyframes, css } from '@mui/styled-engine';

// === ANIMATION CONFIGURATION ===

export const animationConfig = {
  // Timing functions for different interaction types
  easing: {
    // Natural, bouncy entrance animations
    entrance: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    // Smooth exit animations
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    // Standard interactive transitions
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Sharp, quick interactions
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    // Smooth, flowing animations
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
  
  // Duration scales for different animation types
  duration: {
    instant: '50ms',
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    slower: '600ms',
    slowest: '1000ms',
  },
  
  // Stagger delays for list animations
  stagger: {
    minimal: '25ms',
    small: '50ms',
    medium: '100ms',
    large: '150ms',
  },
} as const;

// === CORE KEYFRAME ANIMATIONS ===

// Message entrance animations
export const messageEntranceKeyframes = {
  // Slide in from right (sent messages)
  slideInRight: keyframes`
    0% {
      opacity: 0;
      transform: translateX(30px) scale(0.95);
      filter: blur(2px);
    }
    60% {
      opacity: 0.8;
      transform: translateX(-2px) scale(1.02);
      filter: blur(1px);
    }
    100% {
      opacity: 1;
      transform: translateX(0) scale(1);
      filter: blur(0);
    }
  `,
  
  // Slide in from left (received messages)
  slideInLeft: keyframes`
    0% {
      opacity: 0;
      transform: translateX(-30px) scale(0.95);
      filter: blur(2px);
    }
    60% {
      opacity: 0.8;
      transform: translateX(2px) scale(1.02);
      filter: blur(1px);
    }
    100% {
      opacity: 1;
      transform: translateX(0) scale(1);
      filter: blur(0);
    }
  `,
  
  // Gentle scale in (system messages)
  scaleIn: keyframes`
    0% {
      opacity: 0;
      transform: scale(0.8);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  `,
  
  // Bouncy entrance with rotation (special messages)
  bounceRotateIn: keyframes`
    0% {
      opacity: 0;
      transform: scale(0.3) rotate(-10deg);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.1) rotate(2deg);
    }
    70% {
      transform: scale(0.95) rotate(-1deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
  `,
};

// Thread and UI interaction animations
export const interactionKeyframes = {
  // Thread selection highlight
  threadHighlight: keyframes`
    0% {
      background: transparent;
      transform: translateX(0);
    }
    20% {
      background: rgba(90, 124, 71, 0.06);
      transform: translateX(2px);
    }
    100% {
      background: rgba(90, 124, 71, 0.03);
      transform: translateX(4px);
    }
  `,
  
  // Hover elevation effect
  hoverLift: keyframes`
    0% {
      transform: translateY(0) scale(1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    100% {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
  `,
  
  // Button press animation
  buttonPress: keyframes`
    0% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(1px) scale(0.98);
    }
    100% {
      transform: translateY(0) scale(1);
    }
  `,
  
  // Loading pulse animation
  pulse: keyframes`
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.05);
    }
  `,
};

// Typing indicator animations
export const typingKeyframes = {
  // Classic three-dot typing indicator
  typingDots: keyframes`
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-8px);
      opacity: 1;
    }
  `,
  
  // Wave typing indicator
  typingWave: keyframes`
    0%, 40%, 100% {
      transform: scaleY(0.4);
      opacity: 0.5;
    }
    20% {
      transform: scaleY(1.2);
      opacity: 1;
    }
  `,
  
  // Breathing typing indicator
  typingBreathe: keyframes`
    0%, 100% {
      transform: scale(1);
      opacity: 0.6;
    }
    50% {
      transform: scale(1.3);
      opacity: 1;
    }
  `,
};

// Status and notification animations
export const statusKeyframes = {
  // Success checkmark animation
  successCheckmark: keyframes`
    0% {
      stroke-dasharray: 0, 100;
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dasharray: 100, 0;
      stroke-dashoffset: 0;
    }
  `,
  
  // Error shake animation
  errorShake: keyframes`
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
  
  // Notification slide down
  notificationSlideDown: keyframes`
    0% {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  `,
  
  // Badge pop animation
  badgePop: keyframes`
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.2);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  `,
};

// === ADMIN CRM GLASSMORPHISM ANIMATIONS ===

export const adminAnimations = {
  // Glass container entrance with backdrop blur
  glassContainerEntrance: css`
    animation: ${keyframes`
      0% {
        opacity: 0;
        transform: scale(0.95) translateY(20px);
        backdrop-filter: blur(0px);
        background: rgba(255, 255, 255, 0);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.02) translateY(-2px);
        backdrop-filter: blur(12px);
        background: rgba(255, 255, 255, 0.15);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
        backdrop-filter: blur(24px);
        background: rgba(255, 255, 255, 0.25);
      }
    `} ${animationConfig.duration.slow} ${animationConfig.easing.entrance} forwards;
  `,
  
  // Glassmorphic button hover effect
  glassButtonHover: css`
    transition: all ${animationConfig.duration.normal} ${animationConfig.easing.smooth};
    
    &:hover {
      animation: ${interactionKeyframes.hoverLift} ${animationConfig.duration.normal} ${animationConfig.easing.smooth} forwards;
      backdrop-filter: blur(32px) saturate(200%);
      background: rgba(255, 255, 255, 0.35);
      border-color: rgba(255, 255, 255, 0.25);
    }
    
    &:active {
      animation: ${interactionKeyframes.buttonPress} ${animationConfig.duration.fast} ${animationConfig.easing.sharp};
    }
  `,
  
  // Sophisticated message bubble entrance
  glassMessageEntrance: css`
    animation: ${messageEntranceKeyframes.slideInRight} ${animationConfig.duration.slow} ${animationConfig.easing.entrance} forwards;
    
    &.received {
      animation-name: ${messageEntranceKeyframes.slideInLeft};
    }
    
    &.system {
      animation-name: ${messageEntranceKeyframes.scaleIn};
    }
  `,
  
  // Thread selection with glass effects
  glassThreadSelection: css`
    transition: all ${animationConfig.duration.normal} ${animationConfig.easing.smooth};
    
    &:hover {
      backdrop-filter: blur(16px);
      background: rgba(54, 165, 255, 0.08);
      transform: translateX(2px);
      border-color: rgba(54, 165, 255, 0.15);
    }
    
    &.selected {
      animation: ${interactionKeyframes.threadHighlight} ${animationConfig.duration.normal} ${animationConfig.easing.smooth} forwards;
      backdrop-filter: blur(20px);
      background: rgba(54, 165, 255, 0.12);
      transform: translateX(4px);
      box-shadow: 0 4px 20px rgba(54, 165, 255, 0.15);
    }
  `,
  
  // Priority badge animations with glassmorphism
  priorityBadgeAnimation: css`
    &.urgent {
      animation: ${keyframes`
        0%, 100% {
          transform: scale(1);
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          box-shadow: 0 2px 12px rgba(255, 107, 107, 0.3);
        }
        50% {
          transform: scale(1.1);
          background: linear-gradient(135deg, #ff8e8e 0%, #ff6b6b 100%);
          box-shadow: 0 4px 20px rgba(255, 107, 107, 0.5);
        }
      `} 2s ${animationConfig.easing.smooth} infinite;
    }
    
    &.high {
      animation: ${statusKeyframes.badgePop} ${animationConfig.duration.slow} ${animationConfig.easing.entrance} forwards;
    }
  `,
};

// === CLIENT PORTAL ORGANIC ANIMATIONS ===

export const clientAnimations = {
  // Nature-inspired container entrance
  organicContainerEntrance: css`
    animation: ${keyframes`
      0% {
        opacity: 0;
        transform: scale(0.92) translateY(15px);
        background: rgba(250, 255, 247, 0);
        border-color: rgba(45, 80, 22, 0);
      }
      60% {
        opacity: 0.8;
        transform: scale(1.03) translateY(-3px);
        background: rgba(250, 255, 247, 0.6);
        border-color: rgba(45, 80, 22, 0.08);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
        background: rgba(250, 255, 247, 0.95);
        border-color: rgba(45, 80, 22, 0.08);
      }
    `} ${animationConfig.duration.slower} ${animationConfig.easing.entrance} forwards;
  `,
  
  // Organic button interactions
  organicButtonHover: css`
    transition: all ${animationConfig.duration.normal} ${animationConfig.easing.smooth};
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0px 12px 40px rgba(45, 80, 22, 0.15);
      background: linear-gradient(135deg, #5a7c47 0%, #2d5016 100%);
    }
    
    &:active {
      animation: ${interactionKeyframes.buttonPress} ${animationConfig.duration.fast} ${animationConfig.easing.sharp};
    }
  `,
  
  // Gentle message bubble entrance with nature feel
  organicMessageEntrance: css`
    animation: ${keyframes`
      0% {
        opacity: 0;
        transform: scale(0.85) translateY(8px);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.05) translateY(-2px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    `} ${animationConfig.duration.slow} ${animationConfig.easing.entrance} forwards;
  `,
  
  // Thread selection with organic feel
  organicThreadSelection: css`
    transition: all ${animationConfig.duration.normal} ${animationConfig.easing.smooth};
    
    &:hover {
      background: rgba(90, 124, 71, 0.04);
      border-color: rgba(90, 124, 71, 0.15);
      transform: translateX(4px);
    }
    
    &.selected {
      background: linear-gradient(135deg, rgba(90, 124, 71, 0.08) 0%, rgba(90, 124, 71, 0.04) 100%);
      border-color: rgba(90, 124, 71, 0.2);
      transform: translateX(6px);
      box-shadow: 0 4px 16px rgba(45, 80, 22, 0.1);
    }
  `,
  
  // Floating leaf micro-animation
  floatingLeaf: css`
    animation: ${keyframes`
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      33% {
        transform: translateY(-2px) rotate(1deg);
      }
      66% {
        transform: translateY(-4px) rotate(-0.5deg);
      }
    `} 3s ${animationConfig.easing.smooth} infinite;
  `,
};

// === SHARED MICRO-INTERACTIONS ===

export const microInteractions = {
  // Ripple effect for button clicks
  rippleEffect: (_color: string = 'rgba(255, 255, 255, 0.6)') => keyframes`
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  `,
  
  // Heartbeat animation for notifications
  heartbeat: css`
    animation: ${keyframes`
      0%, 50%, 100% {
        transform: scale(1);
      }
      25%, 75% {
        transform: scale(1.1);
      }
    `} 1s ${animationConfig.easing.smooth} infinite;
  `,
  
  // Gentle breathing for loading states
  breathe: css`
    animation: ${keyframes`
      0%, 100% {
        transform: scale(1);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.05);
        opacity: 1;
      }
    `} 2s ${animationConfig.easing.smooth} infinite;
  `,
  
  // Smooth fade transitions
  fadeInUp: css`
    animation: ${keyframes`
      0% {
        opacity: 0;
        transform: translateY(20px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    `} ${animationConfig.duration.slow} ${animationConfig.easing.entrance} forwards;
  `,
  
  // Staggered list item entrances
  staggeredEntrance: (delay: string = '0ms') => css`
    animation: ${keyframes`
      0% {
        opacity: 0;
        transform: translateX(-15px) scale(0.95);
      }
      100% {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    `} ${animationConfig.duration.slow} ${animationConfig.easing.entrance} forwards;
    animation-delay: ${delay};
  `,
};

// === TYPING INDICATOR COMPONENTS ===

export const typingIndicators = {
  // Three-dot classic indicator
  threeDots: css`
    .dot {
      animation: ${typingKeyframes.typingDots} 1.4s ${animationConfig.easing.smooth} infinite;
      
      &:nth-of-type(1) { animation-delay: 0ms; }
      &:nth-of-type(2) { animation-delay: 160ms; }
      &:nth-of-type(3) { animation-delay: 320ms; }
    }
  `,
  
  // Wave bars indicator
  waveBars: css`
    .bar {
      animation: ${typingKeyframes.typingWave} 1.2s ${animationConfig.easing.smooth} infinite;
      
      &:nth-of-type(1) { animation-delay: 0ms; }
      &:nth-of-type(2) { animation-delay: 100ms; }
      &:nth-of-type(3) { animation-delay: 200ms; }
      &:nth-of-type(4) { animation-delay: 300ms; }
    }
  `,
  
  // Breathing circle indicator
  breathingCircle: css`
    animation: ${typingKeyframes.typingBreathe} 1.6s ${animationConfig.easing.smooth} infinite;
  `,
};

// === PERFORMANCE OPTIMIZATIONS ===

export const performanceOptimizedAnimations = {
  // Use transform and opacity only for better performance
  gpuAccelerated: css`
    will-change: transform, opacity;
    transform: translateZ(0);
    backface-visibility: hidden;
  `,
  
  // Reduced motion fallback
  respectsReducedMotion: css`
    @media (prefers-reduced-motion: reduce) {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  `,
  
  // Smooth scrolling for message containers
  smoothScrolling: css`
    scroll-behavior: smooth;
    
    @media (prefers-reduced-motion: reduce) {
      scroll-behavior: auto;
    }
  `,
};

// === ANIMATION UTILITIES ===

export const animationUtils = {
  // Create staggered delay for list items
  createStaggerDelay: (index: number, baseDelay: number = 50): string => {
    return `${index * baseDelay}ms`;
  },
  
  // Create spring animation with custom parameters
  createSpring: (tension: number = 300, friction: number = 30) => {
    const zeta = friction / (2 * Math.sqrt(tension));
    
    return `cubic-bezier(${0.25}, ${0.1 + zeta}, ${0.25}, ${1 - zeta})`;
  },
  
  // Generate random delay for organic feel
  createOrganicDelay: (min: number = 0, max: number = 200): string => {
    const delay = Math.random() * (max - min) + min;
    return `${delay}ms`;
  },
  
  // Check if user prefers reduced motion
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
};

// Export comprehensive animation system
export default {
  config: animationConfig,
  keyframes: {
    message: messageEntranceKeyframes,
    interaction: interactionKeyframes,
    typing: typingKeyframes,
    status: statusKeyframes,
  },
  admin: adminAnimations,
  client: clientAnimations,
  micro: microInteractions,
  typing: typingIndicators,
  performance: performanceOptimizedAnimations,
  utils: animationUtils,
};