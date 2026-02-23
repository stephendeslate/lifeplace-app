// IconButton Component
// Circular icon-only button with accessibility features

import React, { forwardRef, type ReactNode } from 'react';
import { ButtonBase, type SxProps, type Theme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { designTokens } from '../tokens/base';
import { extendedColors } from './Button';

export type IconButtonVariant =
  | 'default'
  | 'sage'
  | 'terracotta'
  | 'gold'
  | 'success'
  | 'warning'
  | 'error';
export type IconButtonSize = 'small' | 'medium' | 'large';

export interface IconButtonProps {
  icon: ReactNode;
  ariaLabel: string; // Required for accessibility
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  sx?: SxProps<Theme>;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

interface StyledIconButtonProps {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  theme?: Theme;
}

const getSizeStyles = (size: IconButtonSize) => {
  switch (size) {
    case 'small':
      return {
        width: '32px',
        height: '32px',
        fontSize: designTokens.typography.fontSize.sm,
      };
    case 'large':
      return {
        width: '56px',
        height: '56px',
        fontSize: designTokens.typography.fontSize.xl,
      };
    case 'medium':
    default:
      return {
        width: '44px',
        height: '44px',
        fontSize: designTokens.typography.fontSize.md,
      };
  }
};

const getVariantStyles = (variant: IconButtonVariant) => {
  switch (variant) {
    case 'sage':
      return {
        backgroundColor: extendedColors.sage[50],
        color: extendedColors.sage[700],
        '&:hover': {
          backgroundColor: extendedColors.sage[100],
        },
        '&:active': {
          backgroundColor: extendedColors.sage[200],
        },
        '&:focus-visible': {
          outline: `3px solid ${extendedColors.sage[300]}`,
          outlineOffset: '2px',
        },
      };

    case 'terracotta':
      return {
        backgroundColor: extendedColors.terracotta[50],
        color: extendedColors.terracotta[700],
        '&:hover': {
          backgroundColor: extendedColors.terracotta[100],
        },
        '&:active': {
          backgroundColor: extendedColors.terracotta[200],
        },
        '&:focus-visible': {
          outline: `3px solid ${extendedColors.terracotta[300]}`,
          outlineOffset: '2px',
        },
      };

    case 'gold':
      return {
        backgroundColor: extendedColors.gold[50],
        color: extendedColors.gold[700],
        '&:hover': {
          backgroundColor: extendedColors.gold[100],
        },
        '&:active': {
          backgroundColor: extendedColors.gold[200],
        },
        '&:focus-visible': {
          outline: `3px solid ${extendedColors.gold[300]}`,
          outlineOffset: '2px',
        },
      };

    case 'success':
      return {
        backgroundColor: designTokens.colors.semantic.success[50],
        color: designTokens.colors.semantic.success[700],
        '&:hover': {
          backgroundColor: designTokens.colors.semantic.success[100],
        },
        '&:active': {
          backgroundColor: designTokens.colors.semantic.success[200],
        },
        '&:focus-visible': {
          outline: `3px solid ${designTokens.colors.semantic.success[300]}`,
          outlineOffset: '2px',
        },
      };

    case 'warning':
      return {
        backgroundColor: designTokens.colors.semantic.warning[50],
        color: designTokens.colors.semantic.warning[700],
        '&:hover': {
          backgroundColor: designTokens.colors.semantic.warning[100],
        },
        '&:active': {
          backgroundColor: designTokens.colors.semantic.warning[200],
        },
        '&:focus-visible': {
          outline: `3px solid ${designTokens.colors.semantic.warning[300]}`,
          outlineOffset: '2px',
        },
      };

    case 'error':
      return {
        backgroundColor: designTokens.colors.semantic.error[50],
        color: designTokens.colors.semantic.error[700],
        '&:hover': {
          backgroundColor: designTokens.colors.semantic.error[100],
        },
        '&:active': {
          backgroundColor: designTokens.colors.semantic.error[200],
        },
        '&:focus-visible': {
          outline: `3px solid ${designTokens.colors.semantic.error[300]}`,
          outlineOffset: '2px',
        },
      };

    case 'default':
    default:
      return {
        backgroundColor: designTokens.colors.neutral[50],
        color: designTokens.colors.neutral[700],
        '&:hover': {
          backgroundColor: designTokens.colors.neutral[100],
        },
        '&:active': {
          backgroundColor: designTokens.colors.neutral[200],
        },
        '&:focus-visible': {
          outline: `3px solid ${designTokens.colors.neutral[300]}`,
          outlineOffset: '2px',
        },
      };
  }
};

const StyledIconButton = styled(ButtonBase, {
  shouldForwardProp: (prop) => !['variant', 'size', 'icon', 'ariaLabel'].includes(prop as string),
})<StyledIconButtonProps>(({ variant = 'default', size = 'medium' }) => {
  const sizeStyles = getSizeStyles(size);
  const variantStyles = getVariantStyles(variant);

  return {
    // Base styles
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    transition: designTokens.animations.transitions.all,
    flexShrink: 0,

    // Apply size and variant styles
    ...sizeStyles,
    ...variantStyles,

    // Icon wrapper
    '& > *': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '1em',
      height: '1em',
    },

    // Hover effect
    '&:hover': {
      ...variantStyles['&:hover'],
      transform: 'scale(1.05)',
      boxShadow: designTokens.shadows.elevation.sm,
    },

    // Active state
    '&:active': {
      ...variantStyles['&:active'],
      transform: 'scale(0.95)',
      transition: designTokens.animations.transitions.all.replace('250ms', '100ms'),
    },

    // Disabled state
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none',
      pointerEvents: 'none',
    },

    // Focus styles
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
      minWidth: '48px',
      minHeight: '48px',
    },
  };
});

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      ariaLabel,
      variant = 'default',
      size = 'medium',
      onClick,
      disabled = false,
      sx,
      className,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    return (
      <StyledIconButton
        ref={ref}
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={handleClick}
        type={type}
        role="button"
        aria-label={ariaLabel}
        aria-disabled={disabled}
        className={className}
        sx={sx}
        {...props}
      >
        {icon}
      </StyledIconButton>
    );
  },
);

IconButton.displayName = 'IconButton';

export default IconButton;
