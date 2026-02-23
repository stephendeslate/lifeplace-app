// Modern Button Component
// Enhanced button component with new design system variants and animations

import React, { forwardRef, type ReactNode } from 'react';
import { ButtonBase, CircularProgress, type SxProps, type Theme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { designTokens } from '../tokens/base';

// New color palette additions for the button variants
const extendedColors = {
  sage: {
    50: '#f0f4f0',
    100: '#dce7dc',
    200: '#b9cfb9',
    300: '#96b796',
    400: '#739f73',
    500: '#508750', // Primary sage
    600: '#406c40',
    700: '#305130',
    800: '#203620',
    900: '#101b10',
    950: '#080d08',
  },
  terracotta: {
    50: '#fef3f2',
    100: '#fde7e5',
    200: '#fccfcb',
    300: '#fab7b1',
    400: '#f99f97',
    500: '#e8744d', // Primary terracotta
    600: '#ba5c3e',
    700: '#8b452e',
    800: '#5d2e1f',
    900: '#2e170f',
    950: '#170c08',
  },
  gold: {
    50: '#fffef5',
    100: '#fffce6',
    200: '#fff9cc',
    300: '#fff6b3',
    400: '#fff399',
    500: '#d4a574', // Primary gold
    600: '#aa845d',
    700: '#7f6346',
    800: '#55422e',
    900: '#2a2117',
    950: '#15100c',
  },
};

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'terracotta' | 'gold';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  className?: string;
}

interface StyledButtonProps extends ButtonProps {
  theme?: Theme;
}

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'small':
      return {
        padding: `${designTokens.spacing.space[2]}px ${designTokens.spacing.space[4]}px`,
        fontSize: designTokens.typography.fontSize.xs,
        minHeight: '36px',
        minWidth: '36px',
      };
    case 'large':
      return {
        padding: `${designTokens.spacing.space[4]}px ${designTokens.spacing.space[8]}px`,
        fontSize: designTokens.typography.fontSize.lg,
        minHeight: '52px',
        minWidth: '52px',
      };
    case 'medium':
    default:
      return {
        padding: `${designTokens.spacing.space[3]}px ${designTokens.spacing.space[6]}px`,
        fontSize: designTokens.typography.fontSize.sm,
        minHeight: '44px',
        minWidth: '44px',
      };
  }
};

const getVariantStyles = (variant: ButtonVariant) => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: extendedColors.sage[500],
        color: '#ffffff',
        border: 'none',
        '&:hover': {
          backgroundColor: extendedColors.sage[600],
        },
        '&:active': {
          backgroundColor: extendedColors.sage[700],
        },
        '&:focus-visible': {
          outline: `3px solid ${extendedColors.sage[300]}`,
          outlineOffset: '2px',
        },
      };

    case 'secondary':
      return {
        backgroundColor: '#ffffff',
        color: extendedColors.sage[700],
        border: `2px solid ${extendedColors.sage[500]}`,
        '&:hover': {
          backgroundColor: extendedColors.sage[50],
          borderColor: extendedColors.sage[600],
        },
        '&:active': {
          backgroundColor: extendedColors.sage[100],
        },
        '&:focus-visible': {
          outline: `3px solid ${extendedColors.sage[300]}`,
          outlineOffset: '2px',
        },
      };

    case 'outline':
      return {
        backgroundColor: 'transparent',
        color: extendedColors.sage[700],
        border: `2px solid ${extendedColors.sage[500]}`,
        '&:hover': {
          backgroundColor: extendedColors.sage[50],
          borderColor: extendedColors.sage[600],
        },
        '&:active': {
          backgroundColor: extendedColors.sage[100],
        },
        '&:focus-visible': {
          outline: `3px solid ${extendedColors.sage[300]}`,
          outlineOffset: '2px',
        },
      };

    case 'ghost':
      return {
        backgroundColor: 'transparent',
        color: extendedColors.sage[700],
        border: 'none',
        '&:hover': {
          backgroundColor: extendedColors.sage[50],
        },
        '&:active': {
          backgroundColor: extendedColors.sage[100],
        },
        '&:focus-visible': {
          outline: `3px solid ${extendedColors.sage[300]}`,
          outlineOffset: '2px',
        },
      };

    case 'terracotta':
      return {
        backgroundColor: extendedColors.terracotta[500],
        color: '#ffffff',
        border: 'none',
        '&:hover': {
          backgroundColor: extendedColors.terracotta[600],
        },
        '&:active': {
          backgroundColor: extendedColors.terracotta[700],
        },
        '&:focus-visible': {
          outline: `3px solid ${extendedColors.terracotta[300]}`,
          outlineOffset: '2px',
        },
      };

    case 'gold':
      return {
        backgroundColor: extendedColors.gold[500],
        color: designTokens.colors.neutral[900],
        border: 'none',
        '&:hover': {
          backgroundColor: extendedColors.gold[600],
        },
        '&:active': {
          backgroundColor: extendedColors.gold[700],
        },
        '&:focus-visible': {
          outline: `3px solid ${extendedColors.gold[300]}`,
          outlineOffset: '2px',
        },
      };

    default:
      return {};
  }
};

const StyledButton = styled(ButtonBase, {
  shouldForwardProp: (prop) =>
    !['variant', 'size', 'fullWidth', 'loading'].includes(prop as string),
})<StyledButtonProps>(({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
}) => {
  const sizeStyles = getSizeStyles(size);
  const variantStyles = getVariantStyles(variant);

  return {
    // Base styles
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing.space[2],
    borderRadius: designTokens.spacing.radius.md,
    fontFamily: designTokens.typography.fontFamily,
    fontWeight: designTokens.typography.fontWeight.semibold,
    lineHeight: designTokens.typography.lineHeight.normal,
    textTransform: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    width: fullWidth ? '100%' : 'auto',
    transition: designTokens.animations.transitions.all,

    // Apply size and variant styles
    ...sizeStyles,
    ...variantStyles,

    // Hover effect with elevation
    '&:hover': {
      ...variantStyles['&:hover'],
      transform: 'translateY(-2px)',
      boxShadow: designTokens.shadows.elevation.md,
    },

    // Active state
    '&:active': {
      ...variantStyles['&:active'],
      transform: 'translateY(0)',
      transition: designTokens.animations.transitions.all.replace('250ms', '100ms'),
    },

    // Disabled state
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none',
      pointerEvents: 'none',
    },

    // Loading state
    ...(loading && {
      color: 'transparent',
      cursor: 'not-allowed',
      pointerEvents: 'none',
    }),

    // Focus ring for accessibility
    '&:focus': {
      outline: 'none',
    },

    '&:focus-visible': {
      ...variantStyles['&:focus-visible'],
    },

    // High contrast mode support
    '@media (prefers-contrast: high)': {
      border: `2px solid currentColor`,
      '&:focus-visible': {
        outline: `4px solid currentColor`,
        outlineOffset: '3px',
      },
    },

    // Reduced motion support
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
      '&:hover': {
        transform: 'none',
      },
      '&:active': {
        transform: 'none',
      },
    },

    // Mobile touch optimization
    '@media (max-width: 640px)': {
      minHeight: '48px',
      minWidth: '48px',
    },
  };
});

const LoadingSpinner = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const IconWrapper = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      fullWidth = false,
      startIcon,
      endIcon,
      loading = false,
      disabled = false,
      onClick,
      children,
      sx,
      type = 'button',
      ariaLabel,
      className,
      ...props
    },
    ref,
  ) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    return (
      <StyledButton
        ref={ref}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        loading={loading}
        disabled={disabled || loading}
        onClick={handleClick}
        type={type}
        role="button"
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        className={className}
        sx={sx}
        {...props}
      >
        {startIcon && !loading && <IconWrapper>{startIcon}</IconWrapper>}

        <span style={{ visibility: loading ? 'hidden' : 'visible' }}>{children}</span>

        {endIcon && !loading && <IconWrapper>{endIcon}</IconWrapper>}

        {loading && (
          <LoadingSpinner role="status" aria-live="polite">
            <CircularProgress
              size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
              sx={{ color: 'currentColor' }}
              aria-label="Loading"
            />
          </LoadingSpinner>
        )}
      </StyledButton>
    );
  },
);

Button.displayName = 'Button';

// Export extended colors for use in other components
export { extendedColors };

export default Button;
