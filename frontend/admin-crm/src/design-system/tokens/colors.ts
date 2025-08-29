// Modern LifePlace Admin Color System
// Implementing glassmorphism-ready color palette with gradients

export const colorTokens = {
  // Primary Palette - Modern Blue-to-Purple Gradient System
  primary: {
    50: '#f0f7ff',   // Light tint for backgrounds
    100: '#e0efff',  // Cards and surfaces
    200: '#baddff',  // Hover states
    300: '#7cc1ff',  // Accent elements
    400: '#36a5ff',  // Active states  
    500: '#0087ff',  // Primary brand color
    600: '#0066cc',  // Primary dark
    700: '#0052a8',  // Deep interactive
    800: '#003d7a',  // High contrast
    900: '#002856',  // Deepest shade
  },

  // Secondary Palette - Complementary Purple
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff', 
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',  // Main secondary
    600: '#9333ea',
    700: '#7c2d12',
    800: '#581c87',
    900: '#3b0764',
  },

  // Semantic Colors with Gradient Support
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0', 
    300: '#86efac',
    400: '#4ade80',
    500: '#10b981',   // Main success
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d', 
    400: '#fbbf24',
    500: '#f59e0b',   // Main warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',   // Main error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b', 
    900: '#7f1d1d',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },

  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc', 
    400: '#38bdf8',
    500: '#0ea5e9',   // Main info
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
  },

  // Neutral Palette - Enhanced for modern interfaces
  neutral: {
    50: '#fafafa',   // Lightest background
    100: '#f5f5f5',  // Light background
    200: '#e5e5e5',  // Border light
    300: '#d4d4d4',  // Border
    400: '#a3a3a3',  // Disabled text
    500: '#737373',  // Secondary text
    600: '#525252',  // Primary text light
    700: '#404040',  // Primary text
    800: '#262626',  // Headings
    900: '#171717',  // High contrast
    950: '#0a0a0a',  // Ultra dark for backgrounds
  },

  // Glassmorphism-specific colors
  glass: {
    // White glass variants
    light: 'rgba(255, 255, 255, 0.15)',
    medium: 'rgba(255, 255, 255, 0.25)', 
    strong: 'rgba(255, 255, 255, 0.35)',
    
    // Dark glass variants
    darkLight: 'rgba(0, 0, 0, 0.15)',
    darkMedium: 'rgba(0, 0, 0, 0.25)',
    darkStrong: 'rgba(0, 0, 0, 0.35)',
    
    // Colored glass variants
    primaryGlass: 'rgba(0, 135, 255, 0.15)',
    successGlass: 'rgba(16, 185, 129, 0.15)',
    warningGlass: 'rgba(245, 158, 11, 0.15)',
    errorGlass: 'rgba(239, 68, 68, 0.15)',
  },

  // Background gradients for different contexts
  backgrounds: {
    // Subtle gradients for main backgrounds
    default: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    paper: '#ffffff',
    
    // Hero/accent backgrounds
    primaryGradient: 'linear-gradient(135deg, #0087ff 0%, #0066cc 100%)',
    secondaryGradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
    
    // Success/status gradients
    successGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    warningGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    errorGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    
    // Subtle accent backgrounds
    primarySubtle: 'linear-gradient(135deg, rgba(0, 135, 255, 0.05) 0%, rgba(0, 102, 204, 0.05) 100%)',
    successSubtle: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)',
  },

  // Border colors for glassmorphic elements
  borders: {
    glass: 'rgba(255, 255, 255, 0.2)',
    glassDark: 'rgba(0, 0, 0, 0.1)',
    primary: 'rgba(0, 135, 255, 0.3)',
    success: 'rgba(16, 185, 129, 0.3)',
    warning: 'rgba(245, 158, 11, 0.3)',
    error: 'rgba(239, 68, 68, 0.3)',
    subtle: 'rgba(0, 0, 0, 0.06)',
  },
} as const;

// CSS Custom Properties for theme-aware styling
export const cssVariables = {
  // Primary colors
  '--color-primary-50': colorTokens.primary[50],
  '--color-primary-100': colorTokens.primary[100],
  '--color-primary-200': colorTokens.primary[200],
  '--color-primary-300': colorTokens.primary[300],
  '--color-primary-400': colorTokens.primary[400],
  '--color-primary-500': colorTokens.primary[500],
  '--color-primary-600': colorTokens.primary[600],
  '--color-primary-700': colorTokens.primary[700],
  '--color-primary-800': colorTokens.primary[800],
  '--color-primary-900': colorTokens.primary[900],

  // Semantic colors
  '--color-success-500': colorTokens.success[500],
  '--color-warning-500': colorTokens.warning[500],
  '--color-error-500': colorTokens.error[500],
  '--color-info-500': colorTokens.info[500],

  // Neutral colors
  '--color-neutral-50': colorTokens.neutral[50],
  '--color-neutral-100': colorTokens.neutral[100],
  '--color-neutral-200': colorTokens.neutral[200],
  '--color-neutral-300': colorTokens.neutral[300],
  '--color-neutral-400': colorTokens.neutral[400],
  '--color-neutral-500': colorTokens.neutral[500],
  '--color-neutral-600': colorTokens.neutral[600],
  '--color-neutral-700': colorTokens.neutral[700],
  '--color-neutral-800': colorTokens.neutral[800],
  '--color-neutral-900': colorTokens.neutral[900],

  // Glass colors
  '--glass-light': colorTokens.glass.light,
  '--glass-medium': colorTokens.glass.medium,
  '--glass-strong': colorTokens.glass.strong,
  '--glass-primary': colorTokens.glass.primaryGlass,

  // Gradients
  '--bg-primary-gradient': colorTokens.backgrounds.primaryGradient,
  '--bg-success-gradient': colorTokens.backgrounds.successGradient,
  '--bg-default': colorTokens.backgrounds.default,

  // Borders
  '--border-glass': colorTokens.borders.glass,
  '--border-primary': colorTokens.borders.primary,
} as const;

// Dark mode CSS variables
export const darkModeCssVariables = {
  // Inverted neutral colors for dark mode
  '--color-neutral-50': colorTokens.neutral[900],
  '--color-neutral-100': colorTokens.neutral[800],
  '--color-neutral-200': colorTokens.neutral[700],
  '--color-neutral-300': colorTokens.neutral[600],
  '--color-neutral-400': colorTokens.neutral[500],
  '--color-neutral-500': colorTokens.neutral[400],
  '--color-neutral-600': colorTokens.neutral[300],
  '--color-neutral-700': colorTokens.neutral[200],
  '--color-neutral-800': colorTokens.neutral[100],
  '--color-neutral-900': colorTokens.neutral[50],

  // Adjusted glass colors for dark mode
  '--glass-light': 'rgba(255, 255, 255, 0.05)',
  '--glass-medium': 'rgba(255, 255, 255, 0.08)',
  '--glass-strong': 'rgba(255, 255, 255, 0.12)',

  // Dark backgrounds
  '--bg-default': 'linear-gradient(135deg, #0a0a0a 0%, #171717 100%)',

  // Dark borders
  '--border-glass': 'rgba(255, 255, 255, 0.1)',
} as const;

// Type definitions for TypeScript
export type ColorToken = keyof typeof colorTokens;
export type PrimaryColorVariant = keyof typeof colorTokens.primary;
export type GlassVariant = keyof typeof colorTokens.glass;
export type BackgroundVariant = keyof typeof colorTokens.backgrounds;

// Helper function to get nested color values
export const getColor = (path: string): string => {
  const keys = path.split('.');
  let value: any = colorTokens;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Color token "${path}" not found`);
      return colorTokens.neutral[500];
    }
  }
  
  return value;
};

// Helper function to create glass color with custom opacity
export const createGlassColor = (baseColor: string, opacity: number): string => {
  // Convert hex to rgba if needed
  if (baseColor.startsWith('#')) {
    const hex = baseColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16); 
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  // If already rgba, modify opacity
  if (baseColor.startsWith('rgba')) {
    return baseColor.replace(/[\d\.]+\)$/g, `${opacity})`);
  }
  
  return baseColor;
};

export default colorTokens;