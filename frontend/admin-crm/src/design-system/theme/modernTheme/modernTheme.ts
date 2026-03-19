import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';
import { tokens } from './tokens';
import { palette } from './palette';
import { typography } from './typography';
import { componentOverrides } from './componentOverrides';
import { darkPaletteOverrides } from './darkSurfaces';
import { darkSurfaces } from './darkSurfaces';
import { buildDarkComponentOverrides } from './darkMode';

// Extend MUI theme interface for custom properties
declare module '@mui/material/styles' {
  interface Theme {
    glass: {
      light: string;
      medium: string;
      strong: string;
      primary: string;
      success: string;
      warning: string;
      error: string;
    };
    animations: {
      fast: string;
      normal: string;
      slow: string;
      glass: string;
    };
    customShadows: {
      glass: string;
      floating: string;
      card: string;
      modal: string;
    };
  }

  interface ThemeOptions {
    glass?: {
      light?: string;
      medium?: string;
      strong?: string;
      primary?: string;
      success?: string;
      warning?: string;
      error?: string;
    };
    animations?: {
      fast?: string;
      normal?: string;
      slow?: string;
      glass?: string;
    };
    customShadows?: {
      glass?: string;
      floating?: string;
      card?: string;
      modal?: string;
    };
  }
}

const modernThemeOptions: ThemeOptions = {
  palette,

  typography,

  spacing: (factor: number) => `${factor * 8}px`,

  shape: {
    borderRadius: parseInt(tokens.spacing.radius.xl),
  },

  breakpoints: {
    values: {
      xs: tokens.spacing.breakpoints.xs,
      sm: tokens.spacing.breakpoints.sm,
      md: tokens.spacing.breakpoints.md,
      lg: tokens.spacing.breakpoints.lg,
      xl: tokens.spacing.breakpoints.xl,
    },
  },

  glass: {
    light: tokens.color.glass.light,
    medium: tokens.color.glass.medium,
    strong: tokens.color.glass.strong,
    primary: tokens.color.glass.primaryGlass,
    success: tokens.color.glass.successGlass,
    warning: tokens.color.glass.warningGlass,
    error: tokens.color.glass.errorGlass,
  },

  animations: {
    fast: tokens.animation.transitions.fast,
    normal: tokens.animation.transitions.normal,
    slow: tokens.animation.transitions.slow,
    glass: tokens.animation.transitions.glass,
  },

  customShadows: {
    glass: tokens.shadow.glass.medium,
    floating: tokens.shadow.glass.floating,
    card: tokens.shadow.component.card,
    modal: tokens.shadow.component.modal,
  },

  transitions: {
    easing: {
      easeInOut: tokens.animation.easing.standard,
      easeOut: tokens.animation.easing.decelerate,
      easeIn: tokens.animation.easing.accelerate,
      sharp: tokens.animation.easing.sharp,
    },
    duration: {
      shortest: 100,
      shorter: 150,
      short: 250,
      standard: 250,
      complex: 350,
      enteringScreen: 250,
      leavingScreen: 150,
    },
  },

  zIndex: {
    mobileStepper: 1000,
    fab: 1050,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
};

export const modernTheme = createTheme({
  ...modernThemeOptions,
  components: componentOverrides,
});

export const createModernTheme = (mode: 'light' | 'dark' = 'light') => {
  const baseTheme = { ...modernThemeOptions };

  if (mode === 'dark') {
    baseTheme.palette = {
      ...baseTheme.palette,
      ...darkPaletteOverrides,
    };

    baseTheme.glass = {
      light: darkSurfaces.surface2,
      medium: darkSurfaces.surface3,
      strong: darkSurfaces.surface4,
      primary: darkSurfaces.semantic.primary.bg,
      success: darkSurfaces.semantic.success.bg,
      warning: darkSurfaces.semantic.warning.bg,
      error: darkSurfaces.semantic.error.bg,
    };

    baseTheme.customShadows = {
      glass: '0 8px 32px rgba(0, 0, 0, 0.5)',
      floating: '0 20px 40px rgba(0, 0, 0, 0.6)',
      card: '0 4px 16px rgba(0, 0, 0, 0.4)',
      modal: '0 25px 50px rgba(0, 0, 0, 0.7)',
    };
  }

  const modeSpecificComponents = buildDarkComponentOverrides(mode);

  return createTheme({
    ...baseTheme,
    components: modeSpecificComponents,
  });
};

export default modernTheme;
