// LifePlace Admin Design System
// Modern glassmorphism design system for admin interfaces

// Export design tokens (avoid re-export conflicts)
export { tokens } from './tokens';

// Export theme
export { modernTheme, createModernTheme } from './theme/modernTheme';

// Export utilities (import and re-export to avoid conflicts)
import * as glassmorphismUtils from './utils/glassmorphism';
import * as animationUtils from './utils/animations';
import * as responsiveUtils from './utils/responsive';

export { glassmorphismUtils, animationUtils, responsiveUtils };

// Export tokens as named imports for convenience
export {
  colorTokens,
  typographyTokens,
  spacingTokens,
  shadowTokens,
  animationTokens,
} from './tokens';

// Design system version and metadata
export const DESIGN_SYSTEM = {
  name: 'LifePlace Modern Design System',
  version: '1.0.0',
  description: 'Modern glassmorphism design system for admin interfaces',
  theme: 'glassmorphic',
  features: [
    'Glassmorphism effects',
    'Modern typography scale',
    'Responsive design utilities',
    'Smooth animations',
    'Accessibility compliant',
    'Dark mode support',
  ],
} as const;

// Quick access to common utilities
export const designSystem = {
  // Quick glass effects
  glass: {
    light: 'rgba(255, 255, 255, 0.15)',
    medium: 'rgba(255, 255, 255, 0.25)',
    strong: 'rgba(255, 255, 255, 0.35)',
  },
  
  // Quick animations
  animate: {
    fast: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Quick spacing
  space: {
    xs: '4px',
    sm: '8px', 
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  // Quick colors
  color: {
    primary: '#0087ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    neutral: '#737373',
  },
  
  // Quick shadows
  shadow: {
    glass: '0 8px 32px rgba(31, 38, 135, 0.37)',
    floating: '0 12px 40px rgba(0, 0, 0, 0.15)',
    card: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  
  // Quick breakpoints
  breakpoint: {
    xs: '320px',
    sm: '768px',
    md: '1024px',
    lg: '1280px',
    xl: '1440px',
  },
} as const;