// IconBadge Component
// A lightweight icon container with simple colored backgrounds

import React from 'react';
import { Box } from '@mui/material';
import { tokens } from '../../design-system';

export interface IconBadgeProps {
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'filled' | 'outlined';
  className?: string;
  sx?: object;
}

const sizeConfig = {
  small: {
    padding: 1,
    iconSize: '1rem',
    minSize: 32,
  },
  medium: {
    padding: 1.5,
    iconSize: '1.25rem',
    minSize: 40,
  },
  large: {
    padding: 2,
    iconSize: '1.5rem',
    minSize: 48,
  },
} as const;

export const IconBadge: React.FC<IconBadgeProps> = ({
  icon,
  color = 'primary',
  size = 'medium',
  variant = 'default',
  className,
  sx,
}) => {
  const config = sizeConfig[size];
  const colorValue = tokens.color[color];

  const getVariantStyles = () => {
    const baseStyles = {
      borderRadius: tokens.spacing.radius.lg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: config.minSize,
      minHeight: config.minSize,
    };

    switch (variant) {
      case 'filled':
        return {
          ...baseStyles,
          p: config.padding,
          bgcolor: colorValue[500],
          color: '#ffffff',
        };

      case 'outlined':
        return {
          ...baseStyles,
          p: config.padding,
          bgcolor: 'transparent',
          border: `1px solid ${colorValue[300]}`,
          color: colorValue[500],
        };

      case 'default':
      default:
        return {
          ...baseStyles,
          p: config.padding,
          bgcolor: colorValue[50],
          color: colorValue[600],
        };
    }
  };

  return (
    <Box
      className={className}
      sx={{
        ...getVariantStyles(),
        '& .MuiSvgIcon-root': {
          fontSize: config.iconSize,
        },
        ...sx,
      }}
    >
      {icon}
    </Box>
  );
};

export default IconBadge;
