import type { Components } from '@mui/material/styles';
import { tokens } from './tokens';

export const componentOverrides: Components = {
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
