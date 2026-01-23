// design-system/tokens/animations.ts

export const transitions = {
  // Base transitions
  instant: '0ms',
  fast: '150ms ease-in-out',
  normal: '300ms ease-in-out',
  slow: '500ms ease-in-out',
  
  // Cubic bezier easing curves
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  
  // Nature-inspired easings
  organic: 'cubic-bezier(0.37, 0, 0.63, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  
  // Specific property transitions
  all: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  colors: 'background-color 300ms ease, color 300ms ease, border-color 300ms ease',
  transform: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: 'opacity 300ms ease-in-out',
  shadow: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Complex transitions
  elevate: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  glass: 'backdrop-filter 300ms ease, background-color 300ms ease',
};

export const animations = {
  // Fade animations
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  
  // Slide animations
  slideUp: {
    from: { transform: 'translateY(20px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  slideDown: {
    from: { transform: 'translateY(-20px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  slideLeft: {
    from: { transform: 'translateX(20px)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },
  slideRight: {
    from: { transform: 'translateX(-20px)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },
  
  // Scale animations
  scaleUp: {
    from: { transform: 'scale(0.95)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  scaleDown: {
    from: { transform: 'scale(1.05)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  
  // Nature-inspired animations
  float: {
    '0%': { transform: 'translateY(0px)' },
    '50%': { transform: 'translateY(-10px)' },
    '100%': { transform: 'translateY(0px)' },
  },
  sway: {
    '0%': { transform: 'rotate(-1deg)' },
    '50%': { transform: 'rotate(1deg)' },
    '100%': { transform: 'rotate(-1deg)' },
  },
  pulse: {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.05)' },
    '100%': { transform: 'scale(1)' },
  },
  shimmer: {
    '0%': { backgroundPosition: '-1000px 0' },
    '100%': { backgroundPosition: '1000px 0' },
  },
  ripple: {
    '0%': { transform: 'scale(0)', opacity: 1 },
    '100%': { transform: 'scale(4)', opacity: 0 },
  },

  // Additional sophisticated animations
  zoomIn: {
    from: { transform: 'scale(0.9)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  zoomOut: {
    from: { transform: 'scale(1.1)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  slideUpFade: {
    from: { transform: 'translateY(40px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  slideDownFade: {
    from: { transform: 'translateY(-40px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  reveal: {
    from: { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
    to: { clipPath: 'inset(0 0 0 0)', opacity: 1 },
  },
  blur: {
    from: { filter: 'blur(10px)', opacity: 0 },
    to: { filter: 'blur(0px)', opacity: 1 },
  },
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  bounceIn: {
    '0%': { transform: 'scale(0.3)', opacity: 0 },
    '50%': { transform: 'scale(1.05)', opacity: 0.8 },
    '70%': { transform: 'scale(0.9)', opacity: 0.9 },
    '100%': { transform: 'scale(1)', opacity: 1 },
  },
};

export const keyframes = {
  float: `
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0px); }
    }
  `,
  sway: `
    @keyframes sway {
      0% { transform: rotate(-1deg); }
      50% { transform: rotate(1deg); }
      100% { transform: rotate(-1deg); }
    }
  `,
  pulse: `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
  `,
  ripple: `
    @keyframes ripple {
      0% { transform: scale(0); opacity: 1; }
      100% { transform: scale(4); opacity: 0; }
    }
  `,
  gradient: `
    @keyframes gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `,
};

export const durations = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 1000,
  ultra: 1500,

  // Specific use cases
  ripple: 600,
  collapse: 300,
  expand: 300,
  fadeIn: 400,        // Slightly slower for elegance
  fadeOut: 300,
  hover: 250,
  pageTransition: 400,
  scroll: 800,        // For smooth scroll animations
};