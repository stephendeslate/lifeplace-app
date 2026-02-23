import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';

// Dark mode surface elevation scale - matches modernTheme.ts
const darkSurfaces = {
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

export const useThemeColors = () => {
  const theme = useMuiTheme();
  const { effectiveMode } = useAppTheme();
  const isDark = effectiveMode === 'dark';

  return {
    isDark,
    text: {
      primary: theme.palette.text.primary,
      secondary: theme.palette.text.secondary,
      disabled: theme.palette.text.disabled,
    },
    background: {
      default: theme.palette.background.default,
      paper: theme.palette.background.paper,
    },
    // Dark mode uses elevated surfaces instead of inverted greys
    neutral: {
      50: isDark ? theme.palette.grey[900] : theme.palette.grey[50],
      100: isDark ? theme.palette.grey[800] : theme.palette.grey[100],
      200: isDark ? theme.palette.grey[700] : theme.palette.grey[200],
      300: isDark ? theme.palette.grey[600] : theme.palette.grey[300],
      400: isDark ? theme.palette.grey[500] : theme.palette.grey[400],
      500: isDark ? theme.palette.grey[400] : theme.palette.grey[500],
      600: isDark ? theme.palette.grey[300] : theme.palette.grey[600],
      700: isDark ? theme.palette.grey[200] : theme.palette.grey[700],
      800: isDark ? theme.palette.grey[100] : theme.palette.grey[800],
      900: isDark ? theme.palette.grey[50] : theme.palette.grey[900],
    },
    // Surface elevation levels for dark mode (solid colors, not transparent)
    surface: isDark
      ? {
          base: darkSurfaces.base,
          level1: darkSurfaces.surface1,
          level2: darkSurfaces.surface2,
          level3: darkSurfaces.surface3,
          level4: darkSurfaces.surface4,
          level5: darkSurfaces.surface5,
        }
      : {
          base: '#fafafa',
          level1: '#ffffff',
          level2: 'rgba(255, 255, 255, 0.8)',
          level3: 'rgba(255, 255, 255, 0.9)',
          level4: 'rgba(255, 255, 255, 0.95)',
          level5: '#ffffff',
        },
    // Borders with proper contrast
    border: {
      subtle: isDark ? darkSurfaces.border.subtle : 'rgba(0, 0, 0, 0.06)',
      default: isDark ? darkSurfaces.border.default : 'rgba(0, 0, 0, 0.12)',
      prominent: isDark ? darkSurfaces.border.prominent : 'rgba(0, 0, 0, 0.23)',
    },
    // Semantic colors for status indicators
    semantic: isDark
      ? darkSurfaces.semantic
      : {
          primary: {
            bg: 'rgba(33, 150, 243, 0.1)',
            border: 'rgba(33, 150, 243, 0.3)',
            text: '#1976d2',
          },
          success: {
            bg: 'rgba(76, 175, 80, 0.1)',
            border: 'rgba(76, 175, 80, 0.3)',
            text: '#2e7d32',
          },
          warning: {
            bg: 'rgba(255, 152, 0, 0.1)',
            border: 'rgba(255, 152, 0, 0.3)',
            text: '#ed6c02',
          },
          error: {
            bg: 'rgba(244, 67, 54, 0.1)',
            border: 'rgba(244, 67, 54, 0.3)',
            text: '#d32f2f',
          },
          info: { bg: 'rgba(3, 169, 244, 0.1)', border: 'rgba(3, 169, 244, 0.3)', text: '#0288d1' },
        },
    primary: theme.palette.primary,
    secondary: theme.palette.secondary,
    success: theme.palette.success,
    warning: theme.palette.warning,
    error: theme.palette.error,
    info: theme.palette.info,
  };
};
