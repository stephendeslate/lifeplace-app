// Modern Card System
// Standardized card components with different variants for consistent UI

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Box,
  Fade,
  Grow,
  Typography,
} from '@mui/material';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

interface ModernCardProps {
  children: React.ReactNode;
  variant?: 'glass' | 'elevated' | 'outlined' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  interactive?: boolean;
  loading?: boolean;
  className?: string;
  sx?: object;
  onClick?: () => void;
  header?: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  animation?: 'fade' | 'grow' | 'none';
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  variant = 'glass',
  size = 'medium',
  color = 'default',
  interactive = false,
  loading = false,
  className,
  sx,
  onClick,
  header,
  title,
  subtitle,
  actions,
  borderRadius = 'xxl',
  animation = 'fade',
}) => {
  const getPadding = () => {
    switch (size) {
      case 'small': return 2;
      case 'medium': return 3;
      case 'large': return 4;
      default: return 3;
    }
  };

  const getBorderRadius = () => {
    switch (borderRadius) {
      case 'sm': return tokens.spacing.radius.sm;
      case 'md': return tokens.spacing.radius.md;
      case 'lg': return tokens.spacing.radius.lg;
      case 'xl': return tokens.spacing.radius.xl;
      case 'xxl': return tokens.spacing.radius.xxl;
      default: return tokens.spacing.radius.xxl;
    }
  };

  const getVariantStyles = () => {
    const baseStyles = {
      borderRadius: getBorderRadius(),
      position: 'relative' as const,
      overflow: 'visible' as const,
      cursor: interactive || onClick ? 'pointer' : 'default',
      transition: createTransition(['transform', 'box-shadow', 'background'], 'fast'),
    };

    switch (variant) {
      case 'glass':
        return {
          ...baseStyles,
          ...glassPresets.light,
          border: `1px solid ${tokens.color.borders.glass}`,
          
          ...(color !== 'default' && {
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, ${tokens.color[color][500]}06 0%, ${tokens.color[color][600]}04 100%)`,
              borderRadius: getBorderRadius(),
              pointerEvents: 'none',
            }
          }),
          
          '&:hover': (interactive || onClick) ? {
            ...glassPresets.medium,
            transform: 'translateY(-2px)',
            boxShadow: tokens.shadow.glass.floating,
          } : {},
        };

      case 'elevated':
        return {
          ...baseStyles,
          backgroundColor: tokens.color.neutral[50],
          boxShadow: tokens.shadow.elevation.sm,
          border: `1px solid ${tokens.color.borders.subtle}`,
          
          '&:hover': (interactive || onClick) ? {
            transform: 'translateY(-4px)',
            boxShadow: tokens.shadow.elevation.lg,
          } : {},
        };

      case 'outlined':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          border: `1px solid ${tokens.color.borders.subtle}`,
          
          '&:hover': (interactive || onClick) ? {
            backgroundColor: tokens.color.neutral[50],
            borderColor: tokens.color.borders.glass,
            transform: 'translateY(-1px)',
          } : {},
        };

      case 'minimal':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none',
          
          '&:hover': (interactive || onClick) ? {
            backgroundColor: tokens.color.neutral[50],
            transform: 'translateY(-1px)',
          } : {},
        };

      default:
        return baseStyles;
    }
  };

  const CardComponent = (
    <Card
      elevation={0}
      className={className}
      onClick={onClick}
      sx={{
        ...getVariantStyles(),
        opacity: loading ? 0.6 : 1,
        pointerEvents: loading ? 'none' : 'auto',
        position: 'relative',
        ...sx,
      }}
    >
      {(header || title || subtitle) && (
        <CardHeader
          title={title && (
            <Typography 
              variant="h6" 
              fontWeight="600"
              sx={{ 
                color: color !== 'default' 
                  ? tokens.color[color][700] 
                  : tokens.color.neutral[800]
              }}
            >
              {title}
            </Typography>
          )}
          subheader={subtitle && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: tokens.color.neutral[600],
                mt: 0.5,
              }}
            >
              {subtitle}
            </Typography>
          )}
          sx={{
            pb: 1,
            '& .MuiCardHeader-content': {
              overflow: 'visible',
            }
          }}
        >
          {header}
        </CardHeader>
      )}
      
      <CardContent sx={{ p: getPadding(), position: 'relative', zIndex: 1 }}>
        {children}
      </CardContent>
      
      {actions && (
        <CardActions sx={{ px: getPadding(), pb: getPadding() }}>
          {actions}
        </CardActions>
      )}
      
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(4px)',
            borderRadius: getBorderRadius(),
            zIndex: 10,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              border: `3px solid ${tokens.color.neutral[200]}`,
              borderTop: `3px solid ${tokens.color.primary[500]}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
              },
            }}
          />
        </Box>
      )}
    </Card>
  );

  // Apply animation wrapper
  switch (animation) {
    case 'grow':
      return (
        <Grow in timeout={300}>
          {CardComponent}
        </Grow>
      );
    case 'fade':
      return (
        <Fade in timeout={300}>
          {CardComponent}
        </Fade>
      );
    default:
      return CardComponent;
  }
};

// Specialized card variants
export const ModernGlassCard: React.FC<Omit<ModernCardProps, 'variant'>> = (props) => (
  <ModernCard {...props} variant="glass" />
);

// Metric card variant optimized for displaying metrics
interface ModernMetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const ModernMetricCard: React.FC<ModernMetricCardProps> = ({
  title,
  value,
  description,
  trend,
  color = 'primary',
  icon,
  onClick,
  size = 'medium',
}) => (
  <ModernCard
    variant="glass"
    color={color}
    interactive={!!onClick}
    onClick={onClick}
    size={size}
    animation="grow"
  >
    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
      <Box flex={1} minWidth={0}>
        <Typography 
          variant="body2" 
          sx={{ 
            color: tokens.color.neutral[600],
            fontWeight: 500,
            letterSpacing: '0.025em',
            textTransform: 'uppercase',
            fontSize: '0.75rem'
          }}
          gutterBottom
        >
          {title}
        </Typography>
        
        <Typography 
          variant={size === 'large' ? 'h2' : size === 'small' ? 'h4' : 'h3'} 
          sx={{ 
            fontWeight: 700,
            background: `linear-gradient(135deg, ${tokens.color[color][600]} 0%, ${tokens.color[color][500]} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            mb: 0.5,
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>
        
        {description && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: tokens.color.neutral[500],
              fontWeight: 400,
              mb: trend ? 1 : 0
            }}
          >
            {description}
          </Typography>
        )}
        
        {trend && (
          <Box 
            display="flex" 
            alignItems="center" 
            gap={1} 
            sx={{
              ...glassPresets.light,
              borderRadius: tokens.spacing.radius.lg,
              px: 1.5,
              py: 0.5,
              width: 'fit-content',
              border: `1px solid ${trend.direction === 'up' 
                ? tokens.color.success[500] 
                : trend.direction === 'down' 
                  ? tokens.color.error[500] 
                  : tokens.color.neutral[400]
              }30`,
            }}
          >
            <Typography 
              variant="caption" 
              fontWeight="600"
              sx={{
                color: trend.direction === 'up' 
                  ? tokens.color.success[600] 
                  : trend.direction === 'down' 
                    ? tokens.color.error[600] 
                    : tokens.color.neutral[600]
              }}
            >
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </Typography>
          </Box>
        )}
      </Box>
      
      {icon && (
        <Box 
          sx={{ 
            p: size === 'large' ? 2.5 : size === 'small' ? 1.5 : 2, 
            borderRadius: tokens.spacing.radius.xl,
            background: `linear-gradient(135deg, ${tokens.color[color][500]}15 0%, ${tokens.color[color][600]}10 100%)`,
            color: tokens.color[color][600],
            border: `1px solid ${tokens.color[color][500]}20`,
            backdropFilter: 'blur(10px)',
            ml: 2,
            minWidth: size === 'large' ? 64 : size === 'small' ? 48 : 56,
            height: size === 'large' ? 64 : size === 'small' ? 48 : 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            
            '& .MuiSvgIcon-root': {
              fontSize: size === 'large' ? '2rem' : size === 'small' ? '1.25rem' : '1.5rem',
            }
          }}
        >
          {icon}
        </Box>
      )}
    </Box>
  </ModernCard>
);