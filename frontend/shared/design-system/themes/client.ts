import { createTheme, Theme } from '@mui/material/styles';
import { designTokens } from '../tokens/base';

export const createClientTheme = (mode: 'light' | 'dark' = 'light'): Theme => {
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
    },
    typography: {
      fontFamily: designTokens.typography.fontFamily,
    },
    spacing: 8,
    shape: {
      borderRadius: 12, // Slightly more rounded for client-facing app
    },
  });
};

export const clientLightTheme = createClientTheme('light');
export const clientDarkTheme = createClientTheme('dark');