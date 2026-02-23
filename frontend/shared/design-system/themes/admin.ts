import { createTheme, type Theme } from '@mui/material/styles';
import { designTokens } from '../tokens/base';

// Extend MUI theme interface for admin-specific properties
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

export const createAdminTheme = (mode: 'light' | 'dark' = 'light'): Theme => {
  const glassMode = mode === 'dark' ? designTokens.glass.dark : designTokens.glass.light;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: designTokens.colors.primary.main,
        light: designTokens.colors.primary.light,
        dark: designTokens.colors.primary.dark,
      },
      secondary: {
        main: designTokens.colors.secondary.main,
        light: designTokens.colors.secondary.light,
        dark: designTokens.colors.secondary.dark,
      },
      success: {
        main: designTokens.colors.semantic.success[500],
        light: designTokens.colors.semantic.success[300],
        dark: designTokens.colors.semantic.success[700],
      },
      warning: {
        main: designTokens.colors.semantic.warning[500],
        light: designTokens.colors.semantic.warning[300],
        dark: designTokens.colors.semantic.warning[700],
      },
      error: {
        main: designTokens.colors.semantic.error[500],
        light: designTokens.colors.semantic.error[300],
        dark: designTokens.colors.semantic.error[700],
      },
      info: {
        main: designTokens.colors.semantic.info[500],
        light: designTokens.colors.semantic.info[300],
        dark: designTokens.colors.semantic.info[700],
      },
      grey: designTokens.colors.neutral,
      background: {
        default:
          mode === 'dark' ? designTokens.colors.neutral[950] : designTokens.colors.neutral[50],
        paper: mode === 'dark' ? designTokens.colors.neutral[900] : '#ffffff',
      },
      text: {
        primary:
          mode === 'dark' ? designTokens.colors.neutral[50] : designTokens.colors.neutral[800],
        secondary:
          mode === 'dark' ? designTokens.colors.neutral[300] : designTokens.colors.neutral[600],
        disabled:
          mode === 'dark' ? designTokens.colors.neutral[600] : designTokens.colors.neutral[400],
      },
    },
    typography: {
      fontFamily: designTokens.typography.fontFamily,
    },
    spacing: 8,
    shape: {
      borderRadius: 8,
    },
    // Custom glass effects compatible with existing admin app
    glass: {
      light: glassMode.subtle.background,
      medium: glassMode.medium.background,
      strong: glassMode.strong.background,
      primary: designTokens.glass.colored.primary.background,
      success: designTokens.glass.colored.success.background,
      warning: designTokens.glass.colored.warning.background,
      error: designTokens.glass.colored.error.background,
    },
    // Animation presets
    animations: {
      fast: designTokens.animations.duration.fast,
      normal: designTokens.animations.duration.normal,
      slow: designTokens.animations.duration.slow,
      glass: designTokens.animations.transitions.all,
    },
    // Custom shadow system
    customShadows: {
      glass: designTokens.shadows.glass.medium,
      floating: designTokens.shadows.glass.strong,
      card: designTokens.shadows.elevation.md,
      modal: designTokens.shadows.elevation.xl,
    },
  });
};

export const adminLightTheme = createAdminTheme('light');
export const adminDarkTheme = createAdminTheme('dark');
