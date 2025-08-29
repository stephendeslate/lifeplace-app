import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';

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
    // Theme-aware neutral colors
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
    // Glass effects for current theme
    glass: {
      light: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.15)',
      medium: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.25)',
      strong: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.35)',
    },
    // Borders for current theme
    border: {
      glass: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
      subtle: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)',
    },
    primary: theme.palette.primary,
    secondary: theme.palette.secondary,
    success: theme.palette.success,
    warning: theme.palette.warning,
    error: theme.palette.error,
    info: theme.palette.info,
  };
};