// frontend/admin-crm/src/components/common/StandardButtons.tsx
// Standardized button components with consistent styling across the application

import React from 'react';
import { Button, IconButton, type ButtonProps, type IconButtonProps } from '@mui/material';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

// Base button styles for reuse
export const buttonStyles = {
  base: {
    borderRadius: tokens.spacing.radius.full,
    fontWeight: 600,
    textTransform: 'none' as const,
    transition: createTransition(['all'], 'fast'),
  },

  primaryGradient: {
    background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
    boxShadow: `0 4px 16px ${tokens.color.primary[500]}25`,
    color: 'white',
    '&:hover': {
      background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
      boxShadow: `0 6px 20px ${tokens.color.primary[500]}35`,
      transform: 'translateY(-1px)',
    },
    '&:disabled': {
      background: tokens.color.neutral[300],
      boxShadow: 'none',
      color: tokens.color.neutral[500],
    },
  },

  secondaryGlass: {
    ...glassPresets.light,
    border: `1px solid ${tokens.color.neutral[300]}`,
    color: tokens.color.neutral[700],
    '&:hover': {
      ...glassPresets.medium,
      borderColor: tokens.color.neutral[400],
      transform: 'translateY(-1px)',
    },
    '&:disabled': {
      background: tokens.color.neutral[100],
      borderColor: tokens.color.neutral[200],
      color: tokens.color.neutral[400],
    },
  },

  dangerGradient: {
    background: `linear-gradient(135deg, ${tokens.color.error[500]} 0%, ${tokens.color.error[600]} 100%)`,
    boxShadow: `0 4px 16px ${tokens.color.error[500]}25`,
    color: 'white',
    '&:hover': {
      background: `linear-gradient(135deg, ${tokens.color.error[600]} 0%, ${tokens.color.error[700]} 100%)`,
      boxShadow: `0 6px 20px ${tokens.color.error[500]}35`,
      transform: 'translateY(-1px)',
    },
    '&:disabled': {
      background: tokens.color.neutral[300],
      boxShadow: 'none',
      color: tokens.color.neutral[500],
    },
  },

  successGradient: {
    background: `linear-gradient(135deg, ${tokens.color.success[500]} 0%, ${tokens.color.success[600]} 100%)`,
    boxShadow: `0 4px 16px ${tokens.color.success[500]}25`,
    color: 'white',
    '&:hover': {
      background: `linear-gradient(135deg, ${tokens.color.success[600]} 0%, ${tokens.color.success[700]} 100%)`,
      boxShadow: `0 6px 20px ${tokens.color.success[500]}35`,
      transform: 'translateY(-1px)',
    },
    '&:disabled': {
      background: tokens.color.neutral[300],
      boxShadow: 'none',
      color: tokens.color.neutral[500],
    },
  },

  warningGradient: {
    background: `linear-gradient(135deg, ${tokens.color.warning[500]} 0%, ${tokens.color.warning[600]} 100%)`,
    boxShadow: `0 4px 16px ${tokens.color.warning[500]}25`,
    color: 'white',
    '&:hover': {
      background: `linear-gradient(135deg, ${tokens.color.warning[600]} 0%, ${tokens.color.warning[700]} 100%)`,
      boxShadow: `0 6px 20px ${tokens.color.warning[500]}35`,
      transform: 'translateY(-1px)',
    },
    '&:disabled': {
      background: tokens.color.neutral[300],
      boxShadow: 'none',
      color: tokens.color.neutral[500],
    },
  },

  cancelGlass: {
    ...glassPresets.light,
    border: `1px solid ${tokens.color.neutral[300]}`,
    color: tokens.color.neutral[600],
    '&:hover': {
      ...glassPresets.medium,
      borderColor: tokens.color.neutral[400],
      color: tokens.color.neutral[700],
    },
    '&:disabled': {
      background: tokens.color.neutral[100],
      borderColor: tokens.color.neutral[200],
      color: tokens.color.neutral[400],
    },
  },

  glassIcon: {
    ...glassPresets.light,
    border: `1px solid ${tokens.color.neutral[300]}`,
    color: tokens.color.neutral[600],
    '&:hover': {
      ...glassPresets.medium,
      borderColor: tokens.color.neutral[400],
      color: tokens.color.neutral[700],
      transform: 'translateY(-1px)',
    },
    '&:disabled': {
      background: tokens.color.neutral[100],
      color: tokens.color.neutral[400],
    },
  },
} as const;

// Standard button size configurations
export const buttonSizes = {
  small: {
    px: 2.5,
    py: 0.75,
    fontSize: '0.8125rem',
  },
  medium: {
    px: 3.5,
    py: 1,
    fontSize: '0.875rem',
  },
  large: {
    px: 4.5,
    py: 1.25,
    fontSize: '1rem',
  },
} as const;

// Props types
interface StandardButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
  loading?: boolean;
}

// Primary Button - Gradient blue, for main actions
export const PrimaryButton: React.FC<StandardButtonProps> = ({
  children,
  sx,
  size = 'medium',
  loading,
  disabled,
  ...props
}) => (
  <Button
    {...props}
    disabled={disabled || loading}
    sx={{
      ...buttonStyles.base,
      ...buttonStyles.primaryGradient,
      ...buttonSizes[size as keyof typeof buttonSizes],
      ...sx,
    }}
  >
    {loading ? 'Loading...' : children}
  </Button>
);

// Secondary Button - Glass effect, for secondary actions
export const SecondaryButton: React.FC<StandardButtonProps> = ({
  children,
  sx,
  size = 'medium',
  loading,
  disabled,
  ...props
}) => (
  <Button
    {...props}
    disabled={disabled || loading}
    sx={{
      ...buttonStyles.base,
      ...buttonStyles.secondaryGlass,
      ...buttonSizes[size as keyof typeof buttonSizes],
      ...sx,
    }}
  >
    {loading ? 'Loading...' : children}
  </Button>
);

// Danger Button - Gradient red, for destructive actions
export const DangerButton: React.FC<StandardButtonProps> = ({
  children,
  sx,
  size = 'medium',
  loading,
  disabled,
  ...props
}) => (
  <Button
    {...props}
    disabled={disabled || loading}
    sx={{
      ...buttonStyles.base,
      ...buttonStyles.dangerGradient,
      ...buttonSizes[size as keyof typeof buttonSizes],
      ...sx,
    }}
  >
    {loading ? 'Deleting...' : children}
  </Button>
);

// Success Button - Gradient green, for positive actions
export const SuccessButton: React.FC<StandardButtonProps> = ({
  children,
  sx,
  size = 'medium',
  loading,
  disabled,
  ...props
}) => (
  <Button
    {...props}
    disabled={disabled || loading}
    sx={{
      ...buttonStyles.base,
      ...buttonStyles.successGradient,
      ...buttonSizes[size as keyof typeof buttonSizes],
      ...sx,
    }}
  >
    {loading ? 'Loading...' : children}
  </Button>
);

// Warning Button - Gradient orange/yellow, for caution actions
export const WarningButton: React.FC<StandardButtonProps> = ({
  children,
  sx,
  size = 'medium',
  loading,
  disabled,
  ...props
}) => (
  <Button
    {...props}
    disabled={disabled || loading}
    sx={{
      ...buttonStyles.base,
      ...buttonStyles.warningGradient,
      ...buttonSizes[size as keyof typeof buttonSizes],
      ...sx,
    }}
  >
    {loading ? 'Loading...' : children}
  </Button>
);

// Cancel Button - Subtle glass, for cancel/close actions
export const CancelButton: React.FC<StandardButtonProps> = ({
  children,
  sx,
  size = 'medium',
  loading,
  disabled,
  ...props
}) => (
  <Button
    {...props}
    disabled={disabled || loading}
    sx={{
      ...buttonStyles.base,
      ...buttonStyles.cancelGlass,
      ...buttonSizes[size as keyof typeof buttonSizes],
      ...sx,
    }}
  >
    {loading ? 'Loading...' : children}
  </Button>
);

// Glass Icon Button - For icon-only actions
interface GlassIconButtonProps extends Omit<IconButtonProps, 'color'> {
  colorVariant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export const GlassIconButton: React.FC<GlassIconButtonProps> = ({
  children,
  sx,
  colorVariant = 'default',
  size = 'medium',
  ...props
}) => {
  const getColorStyles = () => {
    if (colorVariant === 'default') return {};

    const colorToken = tokens.color[colorVariant];
    return {
      color: colorToken[600],
      border: `1px solid ${colorToken[300]}30`,
      '&:hover': {
        ...glassPresets.medium,
        color: colorToken[700],
        borderColor: `${colorToken[400]}50`,
        transform: 'translateY(-1px)',
      },
    };
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small': return { width: 36, height: 36 };
      case 'large': return { width: 52, height: 52 };
      default: return { width: 44, height: 44 };
    }
  };

  return (
    <IconButton
      {...props}
      sx={{
        ...buttonStyles.glassIcon,
        ...getSizeStyles(),
        ...getColorStyles(),
        transition: createTransition(['all'], 'fast'),
        ...sx,
      }}
    >
      {children}
    </IconButton>
  );
};

export default {
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  SuccessButton,
  WarningButton,
  CancelButton,
  GlassIconButton,
  buttonStyles,
  buttonSizes,
};
