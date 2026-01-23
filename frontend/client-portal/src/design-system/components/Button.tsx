// Button Component - Simple wrapper around MUI Button
// Maps custom design system variants to MUI Button styles

import React, { forwardRef, type ReactNode } from 'react';
import { Button as MuiButton, type ButtonProps as MuiButtonProps } from '@mui/material';
import { tokens } from '../tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'terracotta' | 'sage' | 'gold' | 'text' | 'outlined';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      children,
      fullWidth = false,
      disabled = false,
      startIcon,
      endIcon,
      onClick,
      ariaLabel,
      sx,
      ...otherProps
    },
    ref
  ) => {
    // Map custom variants to MUI styles
    const getVariantStyles = () => {
      switch (variant) {
        case 'terracotta':
          return {
            backgroundColor: tokens.color.base.terracotta[600],
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: tokens.color.base.terracotta[700],
            },
            '&:active': {
              backgroundColor: tokens.color.base.terracotta[800],
            },
          };
        case 'sage':
          return {
            backgroundColor: tokens.color.base.sage[600],
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: tokens.color.base.sage[700],
            },
            '&:active': {
              backgroundColor: tokens.color.base.sage[800],
            },
          };
        case 'gold':
          return {
            backgroundColor: tokens.color.base.gold[600],
            color: tokens.color.base.neutral[900],
            '&:hover': {
              backgroundColor: tokens.color.base.gold[700],
            },
            '&:active': {
              backgroundColor: tokens.color.base.gold[800],
            },
          };
        case 'secondary':
          return {
            backgroundColor: 'transparent',
            color: tokens.color.base.sage[700],
            border: `2px solid ${tokens.color.base.sage[300]}`,
            '&:hover': {
              backgroundColor: tokens.color.base.sage[50],
              borderColor: tokens.color.base.sage[400],
            },
          };
        case 'text':
          return {
            backgroundColor: 'transparent',
            color: tokens.color.base.sage[700],
            '&:hover': {
              backgroundColor: tokens.color.base.sage[50],
            },
          };
        case 'outlined':
          return {
            backgroundColor: 'transparent',
            color: tokens.color.base.sage[700],
            border: `1px solid ${tokens.color.base.sage[300]}`,
            '&:hover': {
              backgroundColor: tokens.color.base.sage[50],
              borderColor: tokens.color.base.sage[400],
            },
          };
        case 'primary':
        default:
          return {
            backgroundColor: tokens.color.base.sage[600],
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: tokens.color.base.sage[700],
            },
            '&:active': {
              backgroundColor: tokens.color.base.sage[800],
            },
          };
      }
    };

    // Map size to px values
    const getSizeStyles = () => {
      switch (size) {
        case 'small':
          return {
            fontSize: tokens.typography.sizes.sm,
            padding: `${tokens.spacing.space[2]}px ${tokens.spacing.space[4]}px`,
            minHeight: 36,
          };
        case 'large':
          return {
            fontSize: tokens.typography.sizes.lg,
            padding: `${tokens.spacing.space[4]}px ${tokens.spacing.space[8]}px`,
            minHeight: 52,
          };
        case 'medium':
        default:
          return {
            fontSize: tokens.typography.sizes.base,
            padding: `${tokens.spacing.space[3]}px ${tokens.spacing.space[6]}px`,
            minHeight: 44,
          };
      }
    };

    return (
      <MuiButton
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        fullWidth={fullWidth}
        startIcon={startIcon}
        endIcon={endIcon}
        aria-label={ariaLabel}
        disableElevation
        sx={{
          ...getVariantStyles(),
          ...getSizeStyles(),
          fontFamily: tokens.typography.families.body,
          fontWeight: tokens.typography.weights.medium,
          textTransform: 'none',
          borderRadius: tokens.spacing.radius.lg,
          transition: tokens.animation.transition.smooth,
          '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed',
          },
          ...sx,
        }}
        {...otherProps}
      >
        {children}
      </MuiButton>
    );
  }
);

Button.displayName = 'Button';

export default Button;
