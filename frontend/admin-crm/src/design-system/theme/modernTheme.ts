// Modern MUI Theme with Glassmorphism Design System
// Integrating modern design tokens with Material-UI

import { createTheme } from '@mui/material/styles';
import type { ThemeOptions, Components } from '@mui/material/styles';

// Design system tokens
const fallbackTokens = {
  colors: {
    brand: {
      primary: {
        50: '#e3f2fd',
        100: '#bbdefb',
        200: '#90caf9',
        300: '#64b5f6',
        400: '#42a5f5',
        500: '#2196f3',
        600: '#1e88e5',
        700: '#1976d2',
        800: '#1565c0',
        900: '#0d47a1',
        950: '#0a3a7a',
      },
      secondary: {
        50: '#fce4ec',
        100: '#f8bbd0',
        200: '#f48fb1',
        300: '#f06292',
        400: '#ec407a',
        500: '#e91e63',
        600: '#d81b60',
        700: '#c2185b',
        800: '#ad1457',
        900: '#880e4f',
        950: '#6d0b3e',
      },
    },
    semantic: {
      error: {
        50: '#ffebee',
        100: '#ffcdd2',
        200: '#ef9a9a',
        300: '#e57373',
        400: '#ef5350',
        500: '#f44336',
        600: '#e53935',
        700: '#d32f2f',
        800: '#c62828',
        900: '#b71c1c',
      },
      warning: {
        50: '#fff3e0',
        100: '#ffe0b2',
        200: '#ffcc80',
        300: '#ffb74d',
        400: '#ffa726',
        500: '#ff9800',
        600: '#fb8c00',
        700: '#f57c00',
        800: '#ef6c00',
        900: '#e65100',
      },
      info: {
        50: '#e1f5fe',
        100: '#b3e5fc',
        200: '#81d4fa',
        300: '#4fc3f7',
        400: '#29b6f6',
        500: '#03a9f4',
        600: '#039be5',
        700: '#0288d1',
        800: '#0277bd',
        900: '#01579b',
      },
      success: {
        50: '#e8f5e9',
        100: '#c8e6c9',
        200: '#a5d6a7',
        300: '#81c784',
        400: '#66bb6a',
        500: '#4caf50',
        600: '#43a047',
        700: '#388e3c',
        800: '#2e7d32',
        900: '#1b5e20',
      },
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
      950: '#0f0f0f',
    },
  },
  glass: {
    light: {
      subtle: { background: 'rgba(255, 255, 255, 0.6)', border: 'rgba(255, 255, 255, 0.2)' },
      medium: { background: 'rgba(255, 255, 255, 0.7)', border: 'rgba(255, 255, 255, 0.3)' },
      strong: { background: 'rgba(255, 255, 255, 0.85)', border: 'rgba(255, 255, 255, 0.4)' },
    },
    colored: {
      primary: { background: 'rgba(33, 150, 243, 0.1)', border: 'rgba(33, 150, 243, 0.2)' },
      success: { background: 'rgba(76, 175, 80, 0.1)', border: 'rgba(76, 175, 80, 0.2)' },
      warning: { background: 'rgba(255, 152, 0, 0.1)', border: 'rgba(255, 152, 0, 0.2)' },
      error: { background: 'rgba(244, 67, 54, 0.1)', border: 'rgba(244, 67, 54, 0.2)' },
    },
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '20px' },
  },
  spacing: {
    radius: {
      none: '0',
      xs: '2px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      xxl: '24px',
      full: '9999px',
    },
    breakpoints: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  shadows: {
    glass: {
      subtle: '0 2px 8px rgba(0,0,0,0.05)',
      medium: '0 4px 16px rgba(0,0,0,0.08)',
      strong: '0 8px 32px rgba(0,0,0,0.12)',
      light: '0 1px 4px rgba(0,0,0,0.03)',
    },
    elevation: {
      none: 'none',
      xs: '0 1px 2px rgba(0,0,0,0.05)',
      sm: '0 2px 4px rgba(0,0,0,0.06)',
      md: '0 4px 8px rgba(0,0,0,0.08)',
      lg: '0 8px 16px rgba(0,0,0,0.1)',
      xl: '0 12px 24px rgba(0,0,0,0.12)',
      xxl: '0 16px 32px rgba(0,0,0,0.15)',
    },
  },
  animations: {
    transitions: { all: '0.2s ease-in-out' },
    duration: { fast: '150ms', normal: '250ms', slow: '400ms' },
  },
};

const sharedTokens = fallbackTokens;

// Compatibility layer to map shared design tokens to the old structure
const tokens = {
  color: {
    primary: sharedTokens.colors.brand.primary,
    secondary: sharedTokens.colors.brand.secondary,
    error: sharedTokens.colors.semantic.error,
    warning: sharedTokens.colors.semantic.warning,
    info: sharedTokens.colors.semantic.info,
    success: sharedTokens.colors.semantic.success,
    neutral: sharedTokens.colors.neutral,
    glass: {
      light: sharedTokens.glass.light.subtle.background,
      medium: sharedTokens.glass.light.medium.background,
      strong: sharedTokens.glass.light.strong.background,
      primaryGlass: sharedTokens.glass.colored.primary.background,
      successGlass: sharedTokens.glass.colored.success.background,
      warningGlass: sharedTokens.glass.colored.warning.background,
      errorGlass: sharedTokens.glass.colored.error.background,
    },
    backgrounds: {
      primaryGradient: `linear-gradient(135deg, ${sharedTokens.colors.brand.primary[500]}, ${sharedTokens.colors.brand.primary[700]})`,
    },
    borders: {
      glass: sharedTokens.glass.light.subtle.border,
      primary: sharedTokens.glass.colored.primary.border,
    },
  },
  typography: {
    fontFamily: {
      body: sharedTokens.typography.fontFamily,
    },
    styles: {
      h1: { fontFamily: sharedTokens.typography.fontFamily, fontWeight: 700, lineHeight: 1.2 },
      h2: { fontFamily: sharedTokens.typography.fontFamily, fontWeight: 600, lineHeight: 1.3 },
      h3: { fontFamily: sharedTokens.typography.fontFamily, fontWeight: 600, lineHeight: 1.3 },
      h4: { fontFamily: sharedTokens.typography.fontFamily, fontWeight: 600, lineHeight: 1.4 },
      h5: { fontFamily: sharedTokens.typography.fontFamily, fontWeight: 600, lineHeight: 1.4 },
      h6: { fontFamily: sharedTokens.typography.fontFamily, fontWeight: 600, lineHeight: 1.5 },
      bodyMd: { fontFamily: sharedTokens.typography.fontFamily, fontWeight: 400, lineHeight: 1.7 },
      bodySm: { fontFamily: sharedTokens.typography.fontFamily, fontWeight: 400, lineHeight: 1.6 },
      subtitle1: {
        fontFamily: sharedTokens.typography.fontFamily,
        fontWeight: 500,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontFamily: sharedTokens.typography.fontFamily,
        fontWeight: 500,
        lineHeight: 1.5,
      },
      caption: { fontFamily: sharedTokens.typography.fontFamily, fontWeight: 400, lineHeight: 1.5 },
      overline: {
        fontFamily: sharedTokens.typography.fontFamily,
        fontWeight: 600,
        lineHeight: 1.5,
      },
      button: { fontFamily: sharedTokens.typography.fontFamily, fontWeight: 600, lineHeight: 1.5 },
    },
  },
  spacing: {
    radius: {
      ...sharedTokens.spacing.radius,
      xxl: '24px',
      xxxl: '32px',
    },
    breakpoints: sharedTokens.spacing.breakpoints,
  },
  shadow: {
    glass: {
      ...sharedTokens.shadows.glass,
      floating: sharedTokens.shadows.glass.strong,
    },
    elevation: sharedTokens.shadows.elevation,
    component: {
      card: sharedTokens.shadows.elevation.md,
      modal: sharedTokens.shadows.elevation.xl,
      buttonHover: sharedTokens.shadows.elevation.sm,
      header: sharedTokens.shadows.elevation.sm,
      inputFocus: sharedTokens.shadows.elevation.sm,
      drawer: sharedTokens.shadows.elevation.lg,
      dropdown: sharedTokens.shadows.elevation.md,
      popover: sharedTokens.shadows.elevation.lg,
    },
  },
  animation: {
    transitions: {
      fast: sharedTokens.animations.transitions.all,
      normal: sharedTokens.animations.transitions.all,
      slow: sharedTokens.animations.transitions.all,
      glass: sharedTokens.animations.transitions.all,
      button: sharedTokens.animations.transitions.all,
      card: sharedTokens.animations.transitions.all,
    },
    duration: {
      ...sharedTokens.animations.duration,
      fastest: '100ms',
    },
    easing: {
      standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
};

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
      xs: tokens.spacing.breakpoints.xs,
      sm: tokens.spacing.breakpoints.sm,
      md: tokens.spacing.breakpoints.md,
      lg: tokens.spacing.breakpoints.lg,
      xl: tokens.spacing.breakpoints.xl,
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
      shortest: 100,
      shorter: 150,
      short: 250,
      standard: 250,
      complex: 350,
      enteringScreen: 250,
      leavingScreen: 150,
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

// Dark mode surface elevation scale
// Uses solid backgrounds instead of glass for better readability
const darkSurfaces = {
  base: '#0f0f0f', // Page background (neutral 950)
  surface1: '#171717', // Cards, containers (neutral 900)
  surface2: '#1f1f1f', // Elevated cards, sidebars
  surface3: '#262626', // Table headers, emphasized areas (neutral 800)
  surface4: '#2d2d2d', // Menus, popovers
  surface5: '#333333', // Tooltips, overlays
  border: {
    subtle: '#2d2d2d', // Subtle dividers
    default: '#404040', // Default borders (neutral 700)
    prominent: '#525252', // Emphasized borders (neutral 600)
  },
  text: {
    primary: '#fafafa', // Main text (neutral 50)
    secondary: '#a3a3a3', // Secondary text (neutral 400)
    tertiary: '#737373', // Muted text (neutral 500)
    disabled: '#525252', // Disabled text (neutral 600)
  },
  // Semantic colors adjusted for dark backgrounds
  semantic: {
    primary: { bg: '#1e3a5f', border: '#2563eb', text: '#60a5fa' },
    success: { bg: '#14532d', border: '#16a34a', text: '#4ade80' },
    warning: { bg: '#451a03', border: '#d97706', text: '#fbbf24' },
    error: { bg: '#450a0a', border: '#dc2626', text: '#f87171' },
    info: { bg: '#082f49', border: '#0284c7', text: '#38bdf8' },
  },
};

// Theme variants
export const createModernTheme = (mode: 'light' | 'dark' = 'light') => {
  const baseTheme = { ...modernThemeOptions };

  if (mode === 'dark') {
    // Dark mode adjustments with elevated surfaces
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

    // Dark mode uses solid surfaces, but keep glass tokens for overlays
    baseTheme.glass = {
      light: darkSurfaces.surface2,
      medium: darkSurfaces.surface3,
      strong: darkSurfaces.surface4,
      primary: darkSurfaces.semantic.primary.bg,
      success: darkSurfaces.semantic.success.bg,
      warning: darkSurfaces.semantic.warning.bg,
      error: darkSurfaces.semantic.error.bg,
    };

    // Dark mode shadow adjustments
    baseTheme.customShadows = {
      glass: '0 8px 32px rgba(0, 0, 0, 0.5)',
      floating: '0 20px 40px rgba(0, 0, 0, 0.6)',
      card: '0 4px 16px rgba(0, 0, 0, 0.4)',
      modal: '0 25px 50px rgba(0, 0, 0, 0.7)',
    };
  }

  // Dynamic component overrides based on mode
  const modeSpecificComponents: Components = {
    ...componentOverrides,

    // AppBar with solid dark background
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: mode === 'dark' ? darkSurfaces.surface2 : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: mode === 'dark' ? 'none' : 'blur(20px)',
          borderBottom:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.border.default}`
              : `1px solid ${tokens.color.borders.glass}`,
          boxShadow:
            mode === 'dark' ? '0 1px 3px rgba(0, 0, 0, 0.4)' : tokens.shadow.component.header,
          color: mode === 'dark' ? darkSurfaces.text.primary : tokens.color.neutral[800],
        },
      },
    },

    // Card with elevated surface
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.spacing.radius.xxl,
          background: mode === 'dark' ? darkSurfaces.surface1 : tokens.color.glass.light,
          backdropFilter: mode === 'dark' ? 'none' : 'blur(20px)',
          border:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.border.default}`
              : `1px solid ${tokens.color.borders.glass}`,
          boxShadow: mode === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.4)' : tokens.shadow.glass.light,
          transition: tokens.animation.transitions.card,
          '&:hover': {
            background: mode === 'dark' ? darkSurfaces.surface2 : tokens.color.glass.medium,
            boxShadow:
              mode === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.5)' : tokens.shadow.glass.medium,
            transform: 'translateY(-2px)',
            borderColor: mode === 'dark' ? darkSurfaces.border.prominent : undefined,
          },
        },
      },
    },

    // Paper with elevated surface
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: tokens.spacing.radius.lg,
          backgroundColor: mode === 'dark' ? darkSurfaces.surface1 : '#ffffff',
          '&.glass': {
            background: mode === 'dark' ? darkSurfaces.surface2 : tokens.color.glass.medium,
            backdropFilter: mode === 'dark' ? 'none' : 'blur(20px)',
            border:
              mode === 'dark'
                ? `1px solid ${darkSurfaces.border.default}`
                : `1px solid ${tokens.color.borders.glass}`,
            boxShadow:
              mode === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.4)' : tokens.shadow.glass.medium,
          },
        },
        elevation1: {
          boxShadow: mode === 'dark' ? '0 1px 3px rgba(0, 0, 0, 0.3)' : tokens.shadow.elevation.sm,
        },
        elevation2: {
          boxShadow: mode === 'dark' ? '0 2px 6px rgba(0, 0, 0, 0.4)' : tokens.shadow.elevation.md,
        },
        elevation3: {
          boxShadow: mode === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.5)' : tokens.shadow.elevation.lg,
        },
      },
    },

    // TextField with visible backgrounds and borders
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.spacing.radius.lg,
            background: mode === 'dark' ? darkSurfaces.surface2 : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: mode === 'dark' ? 'none' : 'blur(10px)',
            transition: tokens.animation.transitions.normal,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark' ? darkSurfaces.border.default : undefined,
            },
            '&:hover': {
              background: mode === 'dark' ? darkSurfaces.surface3 : 'rgba(255, 255, 255, 0.9)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'dark' ? darkSurfaces.border.prominent : undefined,
              },
            },
            '&.Mui-focused': {
              background: mode === 'dark' ? darkSurfaces.surface3 : 'rgba(255, 255, 255, 0.95)',
              boxShadow:
                mode === 'dark'
                  ? `0 0 0 2px ${darkSurfaces.semantic.primary.border}`
                  : tokens.shadow.component.inputFocus,
            },
          },
        },
      },
    },

    // Drawer with solid dark background
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: mode === 'dark' ? darkSurfaces.surface1 : 'rgba(248, 250, 252, 0.95)',
          backdropFilter: mode === 'dark' ? 'none' : 'blur(20px)',
          borderRight:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.border.default}`
              : `1px solid ${tokens.color.borders.glass}`,
          boxShadow:
            mode === 'dark' ? '4px 0 16px rgba(0, 0, 0, 0.4)' : tokens.shadow.component.drawer,
        },
      },
    },

    // ListItemButton with visible hover states
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.spacing.radius.lg,
          margin: '2px 8px',
          transition: tokens.animation.transitions.fast,
          '&:hover': {
            background: mode === 'dark' ? darkSurfaces.surface3 : tokens.color.glass.light,
            backdropFilter: mode === 'dark' ? 'none' : 'blur(10px)',
          },
          '&.Mui-selected': {
            background:
              mode === 'dark'
                ? darkSurfaces.semantic.primary.bg
                : tokens.color.backgrounds.primaryGradient,
            color: mode === 'dark' ? darkSurfaces.semantic.primary.text : 'white',
            '&:hover': {
              background: mode === 'dark' ? '#234b75' : tokens.color.backgrounds.primaryGradient,
              filter: mode === 'dark' ? 'none' : 'brightness(1.1)',
            },
          },
        },
      },
    },

    // Table container with elevated surface
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: tokens.spacing.radius.xxl,
          background: mode === 'dark' ? darkSurfaces.surface1 : tokens.color.glass.light,
          backdropFilter: mode === 'dark' ? 'none' : 'blur(20px)',
          border:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.border.default}`
              : `1px solid ${tokens.color.borders.glass}`,
          boxShadow: mode === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.4)' : tokens.shadow.glass.light,
        },
      },
    },

    // Table head with distinct background
    MuiTableHead: {
      styleOverrides: {
        root: {
          background: mode === 'dark' ? darkSurfaces.surface3 : tokens.color.glass.medium,
          backdropFilter: mode === 'dark' ? 'none' : 'blur(20px)',
          '& .MuiTableCell-head': {
            color: mode === 'dark' ? darkSurfaces.text.primary : tokens.color.neutral[700],
            fontWeight: 600,
            borderBottom: mode === 'dark' ? `1px solid ${darkSurfaces.border.default}` : undefined,
          },
        },
      },
    },

    // Table cell with proper borders
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.border.subtle}`
              : `1px solid ${tokens.color.neutral[200]}`,
          color: mode === 'dark' ? darkSurfaces.text.primary : tokens.color.neutral[800],
        },
        head: {
          backgroundColor: mode === 'dark' ? darkSurfaces.surface3 : tokens.color.neutral[100],
          color: mode === 'dark' ? darkSurfaces.text.primary : tokens.color.neutral[700],
          fontWeight: 600,
        },
      },
    },

    // Table row hover states
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: mode === 'dark' ? darkSurfaces.surface2 : 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: mode === 'dark' ? darkSurfaces.semantic.primary.bg : undefined,
            '&:hover': {
              backgroundColor: mode === 'dark' ? '#234b75' : undefined,
            },
          },
        },
      },
    },

    // Chip with visible backgrounds
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: tokens.spacing.radius.lg,
          fontWeight: 500,
          background: mode === 'dark' ? darkSurfaces.surface3 : tokens.color.glass.light,
          backdropFilter: mode === 'dark' ? 'none' : 'blur(10px)',
          border:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.border.default}`
              : `1px solid ${tokens.color.borders.glass}`,
          color: mode === 'dark' ? darkSurfaces.text.primary : undefined,
          '&:hover': {
            background: mode === 'dark' ? darkSurfaces.surface4 : tokens.color.glass.medium,
          },
        },
        colorPrimary: {
          background:
            mode === 'dark' ? darkSurfaces.semantic.primary.bg : tokens.color.glass.primaryGlass,
          color: mode === 'dark' ? darkSurfaces.semantic.primary.text : tokens.color.primary[700],
          border:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.semantic.primary.border}`
              : `1px solid ${tokens.color.borders.primary}`,
        },
        colorSuccess: {
          background: mode === 'dark' ? darkSurfaces.semantic.success.bg : tokens.color.success[50],
          color: mode === 'dark' ? darkSurfaces.semantic.success.text : tokens.color.success[700],
          border:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.semantic.success.border}`
              : `1px solid ${tokens.color.success[200]}`,
        },
        colorError: {
          background: mode === 'dark' ? darkSurfaces.semantic.error.bg : tokens.color.error[50],
          color: mode === 'dark' ? darkSurfaces.semantic.error.text : tokens.color.error[700],
          border:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.semantic.error.border}`
              : `1px solid ${tokens.color.error[200]}`,
        },
        colorWarning: {
          background: mode === 'dark' ? darkSurfaces.semantic.warning.bg : tokens.color.warning[50],
          color: mode === 'dark' ? darkSurfaces.semantic.warning.text : tokens.color.warning[700],
          border:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.semantic.warning.border}`
              : `1px solid ${tokens.color.warning[200]}`,
        },
      },
    },

    // Dialog with elevated surface
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.spacing.radius.xxxl,
          background: mode === 'dark' ? darkSurfaces.surface2 : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: mode === 'dark' ? 'none' : 'blur(40px)',
          boxShadow:
            mode === 'dark' ? '0 25px 50px rgba(0, 0, 0, 0.7)' : tokens.shadow.component.modal,
          border:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.border.default}`
              : `1px solid ${tokens.color.borders.glass}`,
        },
      },
    },

    // Menu with elevated surface
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.spacing.radius.xl,
          background: mode === 'dark' ? darkSurfaces.surface4 : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: mode === 'dark' ? 'none' : 'blur(20px)',
          border:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.border.default}`
              : `1px solid ${tokens.color.borders.glass}`,
          boxShadow:
            mode === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.5)' : tokens.shadow.component.dropdown,
          marginTop: '8px',
        },
      },
    },

    // MenuItem with visible hover
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: mode === 'dark' ? darkSurfaces.surface5 : undefined,
          },
          '&.Mui-selected': {
            backgroundColor: mode === 'dark' ? darkSurfaces.semantic.primary.bg : undefined,
            '&:hover': {
              backgroundColor: mode === 'dark' ? '#234b75' : undefined,
            },
          },
        },
      },
    },

    // Popover with elevated surface
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.spacing.radius.xl,
          background: mode === 'dark' ? darkSurfaces.surface4 : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: mode === 'dark' ? 'none' : 'blur(20px)',
          border:
            mode === 'dark'
              ? `1px solid ${darkSurfaces.border.default}`
              : `1px solid ${tokens.color.borders.glass}`,
          boxShadow:
            mode === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.5)' : tokens.shadow.component.popover,
        },
      },
    },

    // Tooltip with higher contrast
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: mode === 'dark' ? darkSurfaces.surface5 : 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: tokens.spacing.radius.lg,
          fontSize: '0.75rem',
          border: mode === 'dark' ? `1px solid ${darkSurfaces.border.default}` : undefined,
        },
      },
    },

    // Divider with visible color
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: mode === 'dark' ? darkSurfaces.border.subtle : tokens.color.neutral[200],
        },
      },
    },

    // Button adjustments for dark mode
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
          borderColor: mode === 'dark' ? darkSurfaces.border.prominent : tokens.color.borders.glass,
          background: mode === 'dark' ? darkSurfaces.surface2 : tokens.color.glass.light,
          backdropFilter: mode === 'dark' ? 'none' : 'blur(10px)',
          color: mode === 'dark' ? darkSurfaces.text.primary : undefined,
          '&:hover': {
            background: mode === 'dark' ? darkSurfaces.surface3 : tokens.color.glass.medium,
            backdropFilter: mode === 'dark' ? 'none' : 'blur(15px)',
            borderColor: mode === 'dark' ? darkSurfaces.border.prominent : undefined,
          },
        },
        text: {
          color: mode === 'dark' ? darkSurfaces.text.primary : undefined,
          '&:hover': {
            background: mode === 'dark' ? darkSurfaces.surface3 : undefined,
          },
        },
      },
    },

    // IconButton for dark mode
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: mode === 'dark' ? darkSurfaces.text.secondary : undefined,
          '&:hover': {
            backgroundColor: mode === 'dark' ? darkSurfaces.surface3 : undefined,
          },
        },
      },
    },

    // Select component
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'dark' ? darkSurfaces.border.default : undefined,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'dark' ? darkSurfaces.border.prominent : undefined,
          },
        },
      },
    },

    // Input label
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: mode === 'dark' ? darkSurfaces.text.secondary : undefined,
          '&.Mui-focused': {
            color: mode === 'dark' ? darkSurfaces.semantic.primary.text : undefined,
          },
        },
      },
    },

    // Tabs
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTabs-indicator': {
            backgroundColor: mode === 'dark' ? darkSurfaces.semantic.primary.text : undefined,
          },
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          color: mode === 'dark' ? darkSurfaces.text.secondary : undefined,
          '&.Mui-selected': {
            color: mode === 'dark' ? darkSurfaces.semantic.primary.text : undefined,
          },
          '&:hover': {
            backgroundColor: mode === 'dark' ? darkSurfaces.surface3 : undefined,
          },
        },
      },
    },

    // Autocomplete
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'dark' ? darkSurfaces.surface4 : undefined,
          border: mode === 'dark' ? `1px solid ${darkSurfaces.border.default}` : undefined,
        },
        option: {
          '&:hover': {
            backgroundColor: mode === 'dark' ? darkSurfaces.surface5 : undefined,
          },
          '&[aria-selected="true"]': {
            backgroundColor: mode === 'dark' ? darkSurfaces.semantic.primary.bg : undefined,
          },
        },
      },
    },

    // Switch
    MuiSwitch: {
      styleOverrides: {
        track: {
          backgroundColor: mode === 'dark' ? darkSurfaces.surface4 : undefined,
        },
      },
    },

    // Skeleton for loading states
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? darkSurfaces.surface3 : undefined,
        },
      },
    },

    // Alert component
    MuiAlert: {
      styleOverrides: {
        standardSuccess: {
          backgroundColor: mode === 'dark' ? darkSurfaces.semantic.success.bg : undefined,
          color: mode === 'dark' ? darkSurfaces.semantic.success.text : undefined,
          border: mode === 'dark' ? `1px solid ${darkSurfaces.semantic.success.border}` : undefined,
        },
        standardError: {
          backgroundColor: mode === 'dark' ? darkSurfaces.semantic.error.bg : undefined,
          color: mode === 'dark' ? darkSurfaces.semantic.error.text : undefined,
          border: mode === 'dark' ? `1px solid ${darkSurfaces.semantic.error.border}` : undefined,
        },
        standardWarning: {
          backgroundColor: mode === 'dark' ? darkSurfaces.semantic.warning.bg : undefined,
          color: mode === 'dark' ? darkSurfaces.semantic.warning.text : undefined,
          border: mode === 'dark' ? `1px solid ${darkSurfaces.semantic.warning.border}` : undefined,
        },
        standardInfo: {
          backgroundColor: mode === 'dark' ? darkSurfaces.semantic.info.bg : undefined,
          color: mode === 'dark' ? darkSurfaces.semantic.info.text : undefined,
          border: mode === 'dark' ? `1px solid ${darkSurfaces.semantic.info.border}` : undefined,
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
