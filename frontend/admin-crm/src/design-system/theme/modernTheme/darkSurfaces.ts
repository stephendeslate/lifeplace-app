import { tokens } from './tokens';

export const darkSurfaces = {
  base: '#0f0f0f',
  surface1: '#171717',
  surface2: '#1f1f1f',
  surface3: '#262626',
  surface4: '#2d2d2d',
  surface5: '#333333',
  border: {
    subtle: '#2d2d2d',
    default: '#404040',
    prominent: '#525252',
  },
  text: {
    primary: '#fafafa',
    secondary: '#a3a3a3',
    tertiary: '#737373',
    disabled: '#525252',
  },
  semantic: {
    primary: { bg: '#1e3a5f', border: '#2563eb', text: '#60a5fa' },
    success: { bg: '#14532d', border: '#16a34a', text: '#4ade80' },
    warning: { bg: '#451a03', border: '#d97706', text: '#fbbf24' },
    error: { bg: '#450a0a', border: '#dc2626', text: '#f87171' },
    info: { bg: '#082f49', border: '#0284c7', text: '#38bdf8' },
  },
};

export const darkPaletteOverrides = {
  mode: 'dark' as const,
  primary: {
    50: tokens.color.primary[900],
    100: tokens.color.primary[800],
    200: tokens.color.primary[700],
    300: tokens.color.primary[600],
    400: tokens.color.primary[500],
    500: tokens.color.primary[400],
    600: tokens.color.primary[300],
    700: tokens.color.primary[200],
    800: tokens.color.primary[100],
    900: tokens.color.primary[50],
    main: tokens.color.primary[400],
    light: tokens.color.primary[300],
    dark: tokens.color.primary[600],
    contrastText: '#ffffff',
  },
  background: {
    default: darkSurfaces.base,
    paper: darkSurfaces.surface1,
  },
  text: {
    primary: darkSurfaces.text.primary,
    secondary: darkSurfaces.text.secondary,
    disabled: darkSurfaces.text.disabled,
  },
  divider: darkSurfaces.border.default,
  grey: {
    50: tokens.color.neutral[900],
    100: tokens.color.neutral[800],
    200: tokens.color.neutral[700],
    300: tokens.color.neutral[600],
    400: tokens.color.neutral[500],
    500: tokens.color.neutral[400],
    600: tokens.color.neutral[300],
    700: tokens.color.neutral[200],
    800: tokens.color.neutral[100],
    900: tokens.color.neutral[50],
  },
};
