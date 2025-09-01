// design-system/tokens/colors.ts

export const baseColors = {
  // Primary - Deep Forest
  forest: {
    50: '#f3f6f1',
    100: '#e1e8db',
    200: '#c5d4bb',
    300: '#9fb491',
    400: '#7a9469',
    500: '#5a7c47',
    600: '#2d5016', // Main brand color
    700: '#1a3009',
    800: '#0f1a05',
    900: '#080d03',
  },
  
  // Secondary - Rich Earth
  earth: {
    50: '#faf5f0',
    100: '#f0e4d7',
    200: '#e0c9af',
    300: '#c5a47c',
    400: '#a0673d',
    500: '#8b4513', // Main secondary
    600: '#6d360f',
    700: '#5d2f0c',
    800: '#3d1f08',
    900: '#1f0f04',
  },
  
  // Accent - Subtle Gold
  gold: {
    50: '#fffef7',
    100: '#fffbea',
    200: '#fff5cc',
    300: '#ffeb99',
    400: '#ffdd55',
    500: '#FFD700', // Celebration gold
    600: '#d4b000',
    700: '#a38800',
    800: '#736000',
    900: '#4a3d00',
  },
  
  // Neutral grays with green undertones
  sage: {
    50: '#fafbf9',
    100: '#f5f6f4',
    200: '#eaebe8',
    300: '#d5d7d3',
    400: '#a8aba6',
    500: '#7d807a',
    600: '#5d605a',
    700: '#434642',
    800: '#2c2e2b',
    900: '#1a1b19',
  },
};

export const semanticColors = {
  success: {
    light: '#81c784',
    main: '#4caf50',
    dark: '#388e3c',
    glass: 'rgba(76, 175, 80, 0.1)',
  },
  warning: {
    light: '#ffb74d',
    main: '#ff9800',
    dark: '#f57c00',
    glass: 'rgba(255, 152, 0, 0.1)',
  },
  error: {
    light: '#e57373',
    main: '#f44336',
    dark: '#c62828',
    glass: 'rgba(244, 67, 54, 0.1)',
  },
  info: {
    light: '#64b5f6',
    main: '#2196f3',
    dark: '#1976d2',
    glass: 'rgba(33, 150, 243, 0.1)',
  },
};

export const gradients = {
  // Nature-inspired gradients
  sunrise: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  sunset: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
  forest: 'linear-gradient(135deg, #2d5016 0%, #5a7c47 100%)',
  meadow: 'linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)',
  sky: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  earth: 'linear-gradient(135deg, #8b4513 0%, #c5a47c 100%)',
  mist: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  
  // Overlay gradients for glassmorphism
  glassOverlay: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  glassOverlayDark: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 100%)',
};

export const glassEffects = {
  // Glass morphism effects
  lightGlass: {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  },
  darkGlass: {
    background: 'rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  coloredGlass: {
    forest: {
      background: 'rgba(45, 80, 22, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(45, 80, 22, 0.15)',
    },
    earth: {
      background: 'rgba(139, 69, 19, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(139, 69, 19, 0.15)',
    },
    gold: {
      background: 'rgba(255, 215, 0, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 215, 0, 0.15)',
    },
  },
};

export const overlays = {
  light: 'rgba(255, 255, 255, 0.05)',
  medium: 'rgba(255, 255, 255, 0.1)',
  heavy: 'rgba(255, 255, 255, 0.2)',
  dark: 'rgba(0, 0, 0, 0.05)',
  darkMedium: 'rgba(0, 0, 0, 0.1)',
  darkHeavy: 'rgba(0, 0, 0, 0.2)',
};