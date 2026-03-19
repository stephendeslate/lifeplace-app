import type { Components } from '@mui/material/styles';
import { tokens } from './tokens';
import { componentOverrides } from './componentOverrides';
import { darkSurfaces } from './darkSurfaces';

export function buildDarkComponentOverrides(mode: 'light' | 'dark'): Components {
  return {
    ...componentOverrides,

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

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: mode === 'dark' ? darkSurfaces.border.subtle : tokens.color.neutral[200],
        },
      },
    },

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
    MuiSwitch: {
      styleOverrides: {
        track: { backgroundColor: mode === 'dark' ? darkSurfaces.surface4 : undefined },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: mode === 'dark' ? darkSurfaces.surface3 : undefined },
      },
    },
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
}
