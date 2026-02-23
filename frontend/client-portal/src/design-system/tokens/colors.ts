// design-system/tokens/colors.ts
// Modern Organic Luxury Color System

export const baseColors = {
  // Primary - Warm Sage (Sophisticated, natural luxury)
  sage: {
    50: '#f7f8f6',
    100: '#eef0ec',
    200: '#dde1d8',
    300: '#c4cbbe',
    400: '#a3ada0',
    500: '#7D8570', // Main brand color - Warm Sage
    600: '#6a7360',
    700: '#545d4d',
    800: '#3f463a',
    900: '#2a2f27',
  },

  // Secondary - Terracotta (Warmth, celebration, sunset vibes)
  terracotta: {
    50: '#fdf6f4',
    100: '#fbeae5',
    200: '#f7d5ca',
    300: '#f0b5a1',
    400: '#e58f73',
    500: '#C87356', // Main secondary - Terracotta
    600: '#b35a40',
    700: '#944733',
    800: '#72372a',
    900: '#4f2820',
  },

  // Accent - Soft Gold (Subtle luxury, not gaudy)
  gold: {
    50: '#fcfaf5',
    100: '#f9f4e8',
    200: '#f3e9d1',
    300: '#ead9b3',
    400: '#dfc490',
    500: '#D4A574', // Main accent - Soft Gold
    600: '#c18f5e',
    700: '#a57649',
    800: '#7f5a36',
    900: '#5a4027',
  },

  // Neutrals - Warm cream and grays
  neutral: {
    50: '#FAF7F2', // Warm Cream - primary background
    100: '#F5F1EB',
    200: '#EBE5DD',
    300: '#D9D1C5',
    400: '#B8AEA0',
    500: '#8B8680', // Warm Gray - body text
    600: '#6F6B67',
    700: '#54514E',
    800: '#3A3836',
    900: '#2E2A28', // Deep Charcoal - headings
  },

  // Supporting colors for variety
  clay: {
    50: '#faf6f3',
    100: '#f3ebe4',
    200: '#e7d6c8',
    300: '#d5b9a4',
    400: '#be9879',
    500: '#A67C5E',
    600: '#8d674c',
    700: '#6f523c',
    800: '#52402f',
    900: '#3a2e22',
  },

  // Olive green for natural touches
  olive: {
    50: '#f6f7f3',
    100: '#ebeee3',
    200: '#d8ddc7',
    300: '#bec7a4',
    400: '#9faa7d',
    500: '#808F5F',
    600: '#6a7750',
    700: '#555f41',
    800: '#404733',
    900: '#2d3124',
  },

  // Legacy forest colors (keeping for backward compatibility during transition)
  forest: {
    50: '#f7f8f6',
    100: '#eef0ec',
    200: '#dde1d8',
    300: '#c4cbbe',
    400: '#a3ada0',
    500: '#7D8570',
    600: '#6a7360',
    700: '#545d4d',
    800: '#3f463a',
    900: '#2a2f27',
  },

  // Legacy earth colors (mapped to clay for compatibility)
  earth: {
    50: '#faf6f3',
    100: '#f3ebe4',
    200: '#e7d6c8',
    300: '#d5b9a4',
    400: '#be9879',
    500: '#A67C5E',
    600: '#8d674c',
    700: '#6f523c',
    800: '#52402f',
    900: '#3a2e22',
  },
};

export const semanticColors = {
  success: {
    light: '#88c399',
    main: '#5BA872',
    dark: '#3d8c57',
    contrast: '#ffffff',
    subtle: 'rgba(91, 168, 114, 0.08)',
  },
  warning: {
    light: '#f4b05e',
    main: '#E89537',
    dark: '#c97725',
    contrast: '#ffffff',
    subtle: 'rgba(232, 149, 55, 0.08)',
  },
  error: {
    light: '#e77668',
    main: '#D94F3D',
    dark: '#b83828',
    contrast: '#ffffff',
    subtle: 'rgba(217, 79, 61, 0.08)',
  },
  info: {
    light: '#6a9bb8',
    main: '#4A7FA0',
    dark: '#355c79',
    contrast: '#ffffff',
    subtle: 'rgba(74, 127, 160, 0.08)',
  },
};

export const gradients = {
  // Primary gradients - warm and inviting
  warmSage: 'linear-gradient(135deg, #7D8570 0%, #a3ada0 100%)',
  sunsetGlow: 'linear-gradient(135deg, #C87356 0%, #e58f73 100%)',
  goldenHour: 'linear-gradient(135deg, #D4A574 0%, #ead9b3 100%)',

  // Natural gradients - organic and sophisticated
  earthToSky: 'linear-gradient(135deg, #A67C5E 0%, #7D8570 100%)',
  meadow: 'linear-gradient(135deg, #808F5F 0%, #a3ada0 100%)',
  terracottaWarmth: 'linear-gradient(135deg, #C87356 0%, #D4A574 100%)',

  // Soft atmospheric gradients
  morningMist: 'linear-gradient(135deg, #FAF7F2 0%, #EBE5DD 100%)',
  eveningGlow: 'linear-gradient(135deg, #f3e9d1 0%, #f7d5ca 100%)',
  naturalCanvas: 'linear-gradient(135deg, #F5F1EB 0%, #eef0ec 100%)',

  // Radial gradients for depth
  radialWarm: 'radial-gradient(circle at 30% 30%, rgba(212, 165, 116, 0.15) 0%, transparent 70%)',
  radialSage: 'radial-gradient(circle at 70% 70%, rgba(125, 133, 112, 0.1) 0%, transparent 60%)',

  // Overlay gradients (subtle, used sparingly)
  overlayLight:
    'linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.2) 100%)',
  overlayDark: 'linear-gradient(135deg, rgba(46, 42, 40, 0.7) 0%, rgba(46, 42, 40, 0.5) 100%)',
  overlayWarm:
    'linear-gradient(135deg, rgba(200, 115, 86, 0.15) 0%, rgba(212, 165, 116, 0.1) 100%)',

  // Hero/Background gradients - full page
  heroWarm: 'linear-gradient(135deg, #FAF7F2 0%, #f7f8f6 50%, #fdf6f4 100%)',
  heroNatural: 'linear-gradient(180deg, #f7f8f6 0%, #FAF7F2 100%)',
  heroSunset: 'linear-gradient(135deg, #fdf6f4 0%, #f9f4e8 100%)',

  // Legacy gradients (keeping for backward compatibility during transition)
  sunrise: 'linear-gradient(135deg, #fbeae5 0%, #f7d5ca 100%)',
  sunset: 'linear-gradient(135deg, #fbeae5 0%, #f7d5ca 100%)',
  forest: 'linear-gradient(135deg, #7D8570 0%, #a3ada0 100%)',
  sky: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  earth: 'linear-gradient(135deg, #A67C5E 0%, #d5b9a4 100%)',
  mist: 'linear-gradient(135deg, #FAF7F2 0%, #EBE5DD 100%)',
  glassOverlay: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 100%)',
  glassOverlayDark: 'linear-gradient(135deg, rgba(46,42,40,0.7) 0%, rgba(46,42,40,0.5) 100%)',
};

// Minimal glass effects - use very sparingly for modern look
export const glassEffects = {
  // Only use for overlays on images or specific accent elements
  subtle: {
    background: 'rgba(250, 247, 242, 0.7)',
    backdropFilter: 'blur(8px) saturate(120%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  dark: {
    background: 'rgba(46, 42, 40, 0.7)',
    backdropFilter: 'blur(8px) saturate(120%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  warm: {
    background: 'rgba(200, 115, 86, 0.15)',
    backdropFilter: 'blur(12px) saturate(130%)',
    border: '1px solid rgba(200, 115, 86, 0.2)',
  },

  // Legacy glass effects (keeping for backward compatibility)
  lightGlass: {
    background: 'rgba(250, 247, 242, 0.7)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  darkGlass: {
    background: 'rgba(46, 42, 40, 0.7)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  coloredGlass: {
    forest: {
      background: 'rgba(125, 133, 112, 0.15)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(125, 133, 112, 0.2)',
    },
    earth: {
      background: 'rgba(166, 124, 94, 0.15)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(166, 124, 94, 0.2)',
    },
    gold: {
      background: 'rgba(212, 165, 116, 0.15)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(212, 165, 116, 0.2)',
    },
  },
};

export const overlays = {
  // Image overlays for text readability
  light: 'rgba(250, 247, 242, 0.4)',
  medium: 'rgba(250, 247, 242, 0.6)',
  heavy: 'rgba(250, 247, 242, 0.85)',
  dark: 'rgba(46, 42, 40, 0.4)',
  darkMedium: 'rgba(46, 42, 40, 0.6)',
  darkHeavy: 'rgba(46, 42, 40, 0.85)',

  // Colored overlays for specific moods
  warmGlow: 'rgba(200, 115, 86, 0.2)',
  sageGlow: 'rgba(125, 133, 112, 0.2)',
  goldGlow: 'rgba(212, 165, 116, 0.2)',

  // Gradient overlays for hero sections
  gradientDark: 'linear-gradient(to bottom, rgba(46, 42, 40, 0.3) 0%, rgba(46, 42, 40, 0.7) 100%)',
  gradientLight:
    'linear-gradient(to bottom, rgba(250, 247, 242, 0.5) 0%, rgba(250, 247, 242, 0.9) 100%)',
};
