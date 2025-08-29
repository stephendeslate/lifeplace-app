// Modern MUI Theme with Glassmorphism Design System
// Integrating modern design tokens with Material-UI

import { createTheme } from '@mui/material/styles';
import type { ThemeOptions, Components } from '@mui/material/styles';
import { tokens } from '../tokens';

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

// Modern MUI theme configuration
const modernThemeOptions: ThemeOptions = {
  // Color palette with modern design tokens
  palette: {
    mode: 'light',
    primary: {
      50: tokens.color.primary[50],
      100: tokens.color.primary[100], 
      200: tokens.color.primary[200],
      300: tokens.color.primary[300],
      400: tokens.color.primary[400],
      500: tokens.color.primary[500],
      600: tokens.color.primary[600],
      700: tokens.color.primary[700],
      800: tokens.color.primary[800],
      900: tokens.color.primary[900],
      main: tokens.color.primary[500],
      light: tokens.color.primary[300],
      dark: tokens.color.primary[700],
      contrastText: '#ffffff',
    },
    secondary: {
      50: tokens.color.secondary[50],
      100: tokens.color.secondary[100],
      200: tokens.color.secondary[200],
      300: tokens.color.secondary[300],
      400: tokens.color.secondary[400],
      500: tokens.color.secondary[500],
      600: tokens.color.secondary[600],
      700: tokens.color.secondary[700],
      800: tokens.color.secondary[800],
      900: tokens.color.secondary[900],
      main: tokens.color.secondary[500],
      light: tokens.color.secondary[300],
      dark: tokens.color.secondary[700],
      contrastText: '#ffffff',
    },
    error: {
      50: tokens.color.error[50],
      100: tokens.color.error[100],
      200: tokens.color.error[200],
      300: tokens.color.error[300],
      400: tokens.color.error[400],
      500: tokens.color.error[500],
      600: tokens.color.error[600],
      700: tokens.color.error[700],
      800: tokens.color.error[800],
      900: tokens.color.error[900],
      main: tokens.color.error[500],
      light: tokens.color.error[300],
      dark: tokens.color.error[700],
      contrastText: '#ffffff',
    },
    warning: {
      50: tokens.color.warning[50],
      100: tokens.color.warning[100],
      200: tokens.color.warning[200],
      300: tokens.color.warning[300],
      400: tokens.color.warning[400],
      500: tokens.color.warning[500],
      600: tokens.color.warning[600],
      700: tokens.color.warning[700],
      800: tokens.color.warning[800],
      900: tokens.color.warning[900],
      main: tokens.color.warning[500],
      light: tokens.color.warning[300],
      dark: tokens.color.warning[700],
      contrastText: '#ffffff',
    },
    info: {
      50: tokens.color.info[50],
      100: tokens.color.info[100],
      200: tokens.color.info[200],
      300: tokens.color.info[300],
      400: tokens.color.info[400],
      500: tokens.color.info[500],
      600: tokens.color.info[600],
      700: tokens.color.info[700],
      800: tokens.color.info[800],
      900: tokens.color.info[900],
      main: tokens.color.info[500],
      light: tokens.color.info[300],
      dark: tokens.color.info[700],
      contrastText: '#ffffff',
    },
    success: {
      50: tokens.color.success[50],
      100: tokens.color.success[100],
      200: tokens.color.success[200],
      300: tokens.color.success[300],
      400: tokens.color.success[400],
      500: tokens.color.success[500],
      600: tokens.color.success[600],
      700: tokens.color.success[700],
      800: tokens.color.success[800],
      900: tokens.color.success[900],
      main: tokens.color.success[500],
      light: tokens.color.success[300],
      dark: tokens.color.success[700],
      contrastText: '#ffffff',
    },
    grey: {
      50: tokens.color.neutral[50],
      100: tokens.color.neutral[100],
      200: tokens.color.neutral[200],
      300: tokens.color.neutral[300],
      400: tokens.color.neutral[400],
      500: tokens.color.neutral[500],
      600: tokens.color.neutral[600],
      700: tokens.color.neutral[700],
      800: tokens.color.neutral[800],
      900: tokens.color.neutral[900],
    },
    background: {
      default: tokens.color.neutral[50],
      paper: '#ffffff',
    },
    text: {
      primary: tokens.color.neutral[800],
      secondary: tokens.color.neutral[600],
      disabled: tokens.color.neutral[400],
    },
    divider: tokens.color.neutral[200],
  },

  // Modern typography system
  typography: {
    fontFamily: tokens.typography.fontFamily.body,
    h1: {
      ...tokens.typography.styles.h1,
      fontSize: '2.5rem',
      '@media (max-width:768px)': {
        fontSize: '2rem',
      },
    },
    h2: {
      ...tokens.typography.styles.h2,
      fontSize: '2rem',
      '@media (max-width:768px)': {
        fontSize: '1.75rem',
      },
    },
    h3: {
      ...tokens.typography.styles.h3,
      fontSize: '1.75rem',
      '@media (max-width:768px)': {
        fontSize: '1.5rem',
      },
    },
    h4: {
      ...tokens.typography.styles.h4,
      fontSize: '1.5rem',
      '@media (max-width:768px)': {
        fontSize: '1.25rem',
      },
    },
    h5: {
      ...tokens.typography.styles.h5,
      fontSize: '1.25rem',
    },
    h6: {
      ...tokens.typography.styles.h6,
      fontSize: '1.125rem',
    },
    body1: tokens.typography.styles.bodyMd,
    body2: tokens.typography.styles.bodySm,
    subtitle1: tokens.typography.styles.subtitle1,
    subtitle2: tokens.typography.styles.subtitle2,
    caption: tokens.typography.styles.caption,
    overline: tokens.typography.styles.overline,
    button: tokens.typography.styles.button,
  },

  // Spacing system
  spacing: (factor: number) => `${factor * 8}px`,

  // Shape and border radius
  shape: {
    borderRadius: parseInt(tokens.spacing.radius.xl),
  },

  // Breakpoints
  breakpoints: {
    values: {
      xs: parseInt(tokens.spacing.breakpoints.xs),
      sm: parseInt(tokens.spacing.breakpoints.sm),
      md: parseInt(tokens.spacing.breakpoints.md), 
      lg: parseInt(tokens.spacing.breakpoints.lg),
      xl: parseInt(tokens.spacing.breakpoints.xl),
    },
  },

  // Custom glassmorphism properties
  glass: {
    light: tokens.color.glass.light,
    medium: tokens.color.glass.medium,
    strong: tokens.color.glass.strong,
    primary: tokens.color.glass.primaryGlass,
    success: tokens.color.glass.successGlass,
    warning: tokens.color.glass.warningGlass,
    error: tokens.color.glass.errorGlass,
  },

  // Animation presets
  animations: {
    fast: tokens.animation.transitions.fast,
    normal: tokens.animation.transitions.normal,
    slow: tokens.animation.transitions.slow,
    glass: tokens.animation.transitions.glass,
  },

  // Custom shadow system
  customShadows: {
    glass: tokens.shadow.glass.medium,
    floating: tokens.shadow.glass.floating,
    card: tokens.shadow.component.card,
    modal: tokens.shadow.component.modal,
  },

  // Transition presets
  transitions: {
    easing: {
      easeInOut: tokens.animation.easing.standard,
      easeOut: tokens.animation.easing.decelerate,
      easeIn: tokens.animation.easing.accelerate,
      sharp: tokens.animation.easing.sharp,
    },
    duration: {
      shortest: tokens.animation.duration.fastest,
      shorter: tokens.animation.duration.fast,
      short: tokens.animation.duration.normal,
      standard: tokens.animation.duration.normal,
      complex: tokens.animation.duration.slow,
      enteringScreen: tokens.animation.duration.normal,
      leavingScreen: tokens.animation.duration.fast,
    },
  },

  // Z-index scale
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

// Component style overrides for modern look
const componentOverrides: Components = {
  // Button components with glassmorphic styling
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: tokens.spacing.radius.xl,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
        padding: '8px 20px',
        transition: tokens.animation.transitions.button,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: tokens.shadow.component.buttonHover,
          transform: 'translateY(-1px)',
        },
        '&:active': {
          transform: 'translateY(0)',
        },
      },
      contained: {
        background: tokens.color.backgrounds.primaryGradient,
        '&:hover': {
          background: tokens.color.backgrounds.primaryGradient,
          filter: 'brightness(1.1)',
        },
      },
      outlined: {
        borderColor: tokens.color.borders.glass,
        background: tokens.color.glass.light,
        backdropFilter: 'blur(10px)',
        '&:hover': {
          background: tokens.color.glass.medium,
          backdropFilter: 'blur(15px)',
        },
      },
    },
  },

  // Card components with glass effect
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: tokens.spacing.radius.xxl,
        background: tokens.color.glass.light,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${tokens.color.borders.glass}`,
        boxShadow: tokens.shadow.glass.light,
        transition: tokens.animation.transitions.card,
        '&:hover': {
          background: tokens.color.glass.medium,
          boxShadow: tokens.shadow.glass.medium,
          transform: 'translateY(-2px)',
        },
      },
    },
  },

  // Paper components
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: tokens.spacing.radius.lg,
        '&.glass': {
          background: tokens.color.glass.medium,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${tokens.color.borders.glass}`,
          boxShadow: tokens.shadow.glass.medium,
        },
      },
      elevation1: {
        boxShadow: tokens.shadow.elevation.sm,
      },
      elevation2: {
        boxShadow: tokens.shadow.elevation.md,
      },
      elevation3: {
        boxShadow: tokens.shadow.elevation.lg,
      },
      elevation4: {
        boxShadow: tokens.shadow.elevation.xl,
      },
    },
  },

  // AppBar with glassmorphic header
  MuiAppBar: {
    styleOverrides: {
      root: {
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${tokens.color.borders.glass}`,
        boxShadow: tokens.shadow.component.header,
        color: tokens.color.neutral[800],
      },
    },
  },

  // TextField with modern styling
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: tokens.spacing.radius.lg,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          transition: tokens.animation.transitions.normal,
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.9)',
          },
          '&.Mui-focused': {
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: tokens.shadow.component.inputFocus,
          },
        },
      },
    },
  },

  // Chip components
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: tokens.spacing.radius.lg,
        fontWeight: 500,
        background: tokens.color.glass.light,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${tokens.color.borders.glass}`,
        '&:hover': {
          background: tokens.color.glass.medium,
        },
      },
      colorPrimary: {
        background: tokens.color.glass.primaryGlass,
        color: tokens.color.primary[700],
        border: `1px solid ${tokens.color.borders.primary}`,
      },
    },
  },

  // Dialog/Modal components
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: tokens.spacing.radius.xxxl,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(40px)',
        boxShadow: tokens.shadow.component.modal,
        border: `1px solid ${tokens.color.borders.glass}`,
      },
    },
  },

  // Drawer components
  MuiDrawer: {
    styleOverrides: {
      paper: {
        background: 'rgba(248, 250, 252, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: `1px solid ${tokens.color.borders.glass}`,
        boxShadow: tokens.shadow.component.drawer,
      },
    },
  },

  // List items with modern styling
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: tokens.spacing.radius.lg,
        margin: '2px 8px',
        transition: tokens.animation.transitions.fast,
        '&:hover': {
          background: tokens.color.glass.light,
          backdropFilter: 'blur(10px)',
        },
        '&.Mui-selected': {
          background: tokens.color.backgrounds.primaryGradient,
          color: 'white',
          '&:hover': {
            background: tokens.color.backgrounds.primaryGradient,
            filter: 'brightness(1.1)',
          },
        },
      },
    },
  },

  // Table components
  MuiTableContainer: {
    styleOverrides: {
      root: {
        borderRadius: tokens.spacing.radius.xxl,
        background: tokens.color.glass.light,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${tokens.color.borders.glass}`,
        boxShadow: tokens.shadow.glass.light,
      },
    },
  },

  MuiTableHead: {
    styleOverrides: {
      root: {
        background: tokens.color.glass.medium,
        backdropFilter: 'blur(20px)',
      },
    },
  },

  // Tooltip with glass effect
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: tokens.spacing.radius.lg,
        fontSize: '0.75rem',
      },
    },
  },

  // Menu with glass styling
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: tokens.spacing.radius.xl,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${tokens.color.borders.glass}`,
        boxShadow: tokens.shadow.component.dropdown,
        marginTop: '8px',
      },
    },
  },

  // Popover components
  MuiPopover: {
    styleOverrides: {
      paper: {
        borderRadius: tokens.spacing.radius.xl,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${tokens.color.borders.glass}`,
        boxShadow: tokens.shadow.component.popover,
      },
    },
  },
};

// Create the modern theme
export const modernTheme = createTheme({
  ...modernThemeOptions,
  components: componentOverrides,
});

// Theme variants
export const createModernTheme = (mode: 'light' | 'dark' = 'light') => {
  const baseTheme = { ...modernThemeOptions };
  
  if (mode === 'dark') {
    // Dark mode adjustments
    baseTheme.palette = {
      ...baseTheme.palette,
      mode: 'dark',
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
        contrastText: tokens.color.neutral[900],
      },
      background: {
        default: tokens.color.neutral[950],
        paper: tokens.color.neutral[900],
      },
      surface: {
        main: tokens.color.neutral[800],
        dark: tokens.color.neutral[900],
      },
      text: {
        primary: tokens.color.neutral[50],
        secondary: tokens.color.neutral[300],
        disabled: tokens.color.neutral[600],
      },
      divider: tokens.color.neutral[700],
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

    // Dark mode glass adjustments
    baseTheme.glass = {
      light: 'rgba(255, 255, 255, 0.05)',
      medium: 'rgba(255, 255, 255, 0.08)', 
      strong: 'rgba(255, 255, 255, 0.12)',
      primary: 'rgba(54, 165, 255, 0.15)',
      success: 'rgba(16, 185, 129, 0.15)',
      warning: 'rgba(245, 158, 11, 0.15)',
      error: 'rgba(239, 68, 68, 0.15)',
    };

    // Dark mode background adjustments
    baseTheme.customShadows = {
      glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
      floating: '0 20px 40px rgba(0, 0, 0, 0.4)',
      card: '0 4px 16px rgba(0, 0, 0, 0.2)',
      modal: '0 25px 50px rgba(0, 0, 0, 0.5)',
    };
  }

  // Dynamic component overrides based on mode
  const modeSpecificComponents: Components = {
    ...componentOverrides,
    
    // AppBar for dark mode
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: mode === 'dark' 
            ? 'rgba(26, 26, 26, 0.9)' 
            : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: mode === 'dark'
            ? `1px solid ${tokens.color.neutral[700]}`
            : `1px solid ${tokens.color.borders.glass}`,
          boxShadow: mode === 'dark'
            ? '0 1px 3px rgba(0, 0, 0, 0.5)'
            : tokens.shadow.component.header,
          color: mode === 'dark' 
            ? tokens.color.neutral[50] 
            : tokens.color.neutral[800],
        },
      },
    },

    // Card components for dark mode
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.spacing.radius.xxl,
          background: mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : tokens.color.glass.light,
          backdropFilter: 'blur(20px)',
          border: mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : `1px solid ${tokens.color.borders.glass}`,
          boxShadow: mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.3)'
            : tokens.shadow.glass.light,
          transition: tokens.animation.transitions.card,
          '&:hover': {
            background: mode === 'dark'
              ? 'rgba(255, 255, 255, 0.08)'
              : tokens.color.glass.medium,
            boxShadow: mode === 'dark'
              ? '0 12px 40px rgba(0, 0, 0, 0.4)'
              : tokens.shadow.glass.medium,
            transform: 'translateY(-2px)',
          },
        },
      },
    },

    // Paper components for dark mode
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: tokens.spacing.radius.lg,
          backgroundColor: mode === 'dark' 
            ? tokens.color.neutral[900] 
            : '#ffffff',
          '&.glass': {
            background: mode === 'dark'
              ? 'rgba(255, 255, 255, 0.08)'
              : tokens.color.glass.medium,
            backdropFilter: 'blur(20px)',
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : `1px solid ${tokens.color.borders.glass}`,
            boxShadow: mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.3)'
              : tokens.shadow.glass.medium,
          },
        },
      },
    },

    // TextField for dark mode
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.spacing.radius.lg,
            background: mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            transition: tokens.animation.transitions.normal,
            '&:hover': {
              background: mode === 'dark'
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.9)',
            },
            '&.Mui-focused': {
              background: mode === 'dark'
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(255, 255, 255, 0.95)',
              boxShadow: mode === 'dark'
                ? '0 0 0 2px rgba(54, 165, 255, 0.3)'
                : tokens.shadow.component.inputFocus,
            },
          },
        },
      },
    },

    // Drawer for dark mode
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: mode === 'dark'
            ? 'rgba(26, 26, 26, 0.95)'
            : 'rgba(248, 250, 252, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : `1px solid ${tokens.color.borders.glass}`,
          boxShadow: mode === 'dark'
            ? '0 0 20px rgba(0, 0, 0, 0.5)'
            : tokens.shadow.component.drawer,
        },
      },
    },

    // ListItemButton for dark mode
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.spacing.radius.lg,
          margin: '2px 8px',
          transition: tokens.animation.transitions.fast,
          '&:hover': {
            background: mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : tokens.color.glass.light,
            backdropFilter: 'blur(10px)',
          },
          '&.Mui-selected': {
            background: mode === 'dark'
              ? 'rgba(54, 165, 255, 0.2)'
              : tokens.color.backgrounds.primaryGradient,
            color: mode === 'dark' 
              ? tokens.color.primary[300]
              : 'white',
            '&:hover': {
              background: mode === 'dark'
                ? 'rgba(54, 165, 255, 0.25)'
                : tokens.color.backgrounds.primaryGradient,
              filter: 'brightness(1.1)',
            },
          },
        },
      },
    },
  };

  return createTheme({
    ...baseTheme,
    components: modeSpecificComponents,
  });
};

export default modernTheme;