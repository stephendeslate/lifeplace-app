// Modern Empty State Component
// Reusable empty state component with glassmorphic styling and smooth animations

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Grow,
  Fade,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Error as ErrorIcon,
  HelpOutline as HelpIcon,
  TrendingUp as TrendingUpIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

interface ModernEmptyStateProps {
  icon?: SvgIconComponent | React.ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  tip?: {
    text: string;
    type?: 'info' | 'success' | 'warning' | 'pro';
  };
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'error' | 'search' | 'loading';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  illustration?: 'gradient' | 'glass' | 'minimal';
  className?: string;
  sx?: object;
}

export const ModernEmptyState: React.FC<ModernEmptyStateProps> = ({
  icon: IconComponent,
  title,
  description,
  primaryAction,
  secondaryAction,
  tip,
  size = 'medium',
  variant = 'default',
  color = 'primary',
  illustration = 'gradient',
  className,
  sx,
}) => {
  const getIconSize = () => {
    switch (size) {
      case 'small': return 80;
      case 'medium': return 120;
      case 'large': return 160;
      default: return 120;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return 4;
      case 'medium': return 6;
      case 'large': return 8;
      default: return 6;
    }
  };

  const getTitleVariant = () => {
    switch (size) {
      case 'small': return 'h5' as const;
      case 'medium': return 'h3' as const;
      case 'large': return 'h2' as const;
      default: return 'h3' as const;
    }
  };

  const getDefaultIcon = () => {
    switch (variant) {
      case 'error': return ErrorIcon;
      case 'search': return SearchIcon;
      case 'loading': return RefreshIcon;
      default: return HelpIcon;
    }
  };

  const getIllustrationStyles = () => {
    const baseSize = getIconSize();
    
    switch (illustration) {
      case 'gradient':
        return {
          width: baseSize,
          height: baseSize,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${tokens.color[color][500]} 0%, ${tokens.color[color][600]} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 4,
          boxShadow: `0 8px 32px ${tokens.color[color][500]}30`,
          position: 'relative' as const,
          overflow: 'hidden' as const,
          
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)`,
            animation: 'float 6s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
              '33%': { transform: 'translate(10px, -10px) rotate(120deg)' },
              '66%': { transform: 'translate(-5px, 5px) rotate(240deg)' },
            }
          }
        };
        
      case 'glass':
        return {
          ...glassPresets.medium,
          width: baseSize,
          height: baseSize,
          borderRadius: tokens.spacing.radius.full,
          border: `2px solid ${tokens.color[color][500]}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 4,
          background: `linear-gradient(135deg, ${tokens.color[color][500]}10 0%, ${tokens.color[color][600]}08 100%)`,
          boxShadow: tokens.shadow.glass.floating,
        };
        
      default: // minimal
        return {
          width: baseSize * 0.8,
          height: baseSize * 0.8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 4,
          color: tokens.color[color][500],
          opacity: 0.8,
        };
    }
  };

  const FinalIcon = IconComponent || getDefaultIcon();
  const iconSize = size === 'large' ? 64 : size === 'small' ? 40 : 48;

  return (
    <Grow in timeout={500}>
      <Box
        className={className}
        sx={{ 
          p: getPadding(),
          textAlign: 'center',
          ...glassPresets.light,
          borderRadius: tokens.spacing.radius.xxl,
          border: variant === 'error' 
            ? `2px dashed ${tokens.color.error[300]}` 
            : `2px dashed ${tokens.color.borders.glass}`,
          background: `linear-gradient(135deg, ${tokens.color[color][500]}04 0%, ${tokens.color[color][600]}03 100%)`,
          position: 'relative',
          overflow: 'hidden',
          minHeight: size === 'small' ? 280 : size === 'large' ? 480 : 380,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 30% 30%, ${tokens.color[color][500]}06 0%, transparent 70%)`,
            pointerEvents: 'none',
          },
          
          ...sx,
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Icon/Illustration */}
          <Fade in timeout={800}>
            <Box sx={getIllustrationStyles()}>
              {React.isValidElement(FinalIcon) ? (
                FinalIcon
              ) : typeof FinalIcon === 'function' ? (
                React.createElement(FinalIcon as React.ComponentType<{ sx?: object }>, {
                  sx: { 
                    fontSize: iconSize, 
                    color: illustration === 'gradient' ? 'white' : 'inherit' 
                  }
                })
              ) : null}
            </Box>
          </Fade>
          
          {/* Title */}
          <Fade in timeout={1000}>
            <Typography 
              variant={getTitleVariant()}
              sx={{
                fontWeight: 700,
                background: variant === 'error' 
                  ? `linear-gradient(135deg, ${tokens.color.error[600]} 0%, ${tokens.color.error[500]} 100%)`
                  : `linear-gradient(135deg, ${tokens.color.neutral[800]} 0%, ${tokens.color.neutral[600]} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 2,
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
          </Fade>
          
          {/* Description */}
          <Fade in timeout={1200}>
            <Typography 
              variant={size === 'large' ? 'h6' : 'body1'}
              sx={{ 
                color: tokens.color.neutral[600], 
                mb: tip ? 3 : 4, 
                maxWidth: size === 'large' ? 800 : size === 'small' ? 400 : 600, 
                mx: 'auto', 
                lineHeight: 1.6,
                fontWeight: 400,
              }}
            >
              {description}
            </Typography>
          </Fade>
          
          {/* Tip */}
          {tip && (
            <Fade in timeout={1400}>
              <Box
                sx={{
                  ...glassPresets.light,
                  borderRadius: tokens.spacing.radius.xl,
                  p: 2.5,
                  maxWidth: size === 'large' ? 600 : 500,
                  mx: 'auto',
                  mb: 4,
                  border: `1px solid ${tip.type === 'pro' 
                    ? tokens.color.warning[500] 
                    : tip.type === 'success'
                      ? tokens.color.success[500]
                      : tip.type === 'warning'
                        ? tokens.color.warning[500]
                        : tokens.color.info[500]
                  }30`,
                  background: `linear-gradient(135deg, ${tip.type === 'pro' 
                    ? tokens.color.warning[500] 
                    : tip.type === 'success'
                      ? tokens.color.success[500]
                      : tip.type === 'warning'
                        ? tokens.color.warning[500]
                        : tokens.color.info[500]
                  }08 0%, transparent 100%)`,
                }}
              >
                <Box display="flex" alignItems="flex-start" gap={1.5}>
                  <LightbulbIcon 
                    sx={{ 
                      fontSize: 20, 
                      color: tip.type === 'pro' 
                        ? tokens.color.warning[600] 
                        : tip.type === 'success'
                          ? tokens.color.success[600]
                          : tip.type === 'warning'
                            ? tokens.color.warning[600]
                            : tokens.color.info[600],
                      mt: 0.1,
                      flexShrink: 0,
                    }} 
                  />
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography 
                        variant="body2" 
                        fontWeight="600"
                        sx={{ 
                          color: tip.type === 'pro' 
                            ? tokens.color.warning[700] 
                            : tip.type === 'success'
                              ? tokens.color.success[700]
                              : tip.type === 'warning'
                                ? tokens.color.warning[700]
                                : tokens.color.info[700] 
                        }}
                      >
                        {tip.type === 'pro' ? 'Pro Tip' : tip.type === 'success' ? 'Success' : tip.type === 'warning' ? 'Note' : 'Tip'}
                      </Typography>
                      {tip.type === 'pro' && (
                        <Chip 
                          label="Premium" 
                          size="small" 
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            background: `linear-gradient(135deg, ${tokens.color.warning[500]} 0%, ${tokens.color.warning[600]} 100%)`,
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: tip.type === 'pro' 
                          ? tokens.color.warning[700] 
                          : tip.type === 'success'
                            ? tokens.color.success[700]
                            : tip.type === 'warning'
                              ? tokens.color.warning[700]
                              : tokens.color.info[700],
                        lineHeight: 1.5,
                      }}
                    >
                      {tip.text}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Fade>
          )}
          
          {/* Actions */}
          {(primaryAction || secondaryAction) && (
            <Fade in timeout={1600}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                justifyContent="center" 
                alignItems="center"
                sx={{ mb: 2 }}
              >
                {primaryAction && (
                  <Button
                    variant="contained"
                    size={size === 'large' ? 'large' : 'medium'}
                    startIcon={primaryAction.icon || <AddIcon />}
                    onClick={primaryAction.onClick}
                    sx={{
                      background: `linear-gradient(135deg, ${tokens.color[primaryAction.color || color][500]} 0%, ${tokens.color[primaryAction.color || color][600]} 100%)`,
                      borderRadius: tokens.spacing.radius.full,
                      px: size === 'large' ? 5 : 4,
                      py: size === 'large' ? 1.5 : 1.25,
                      boxShadow: `0 8px 32px ${tokens.color[primaryAction.color || color][500]}25`,
                      transition: createTransition(['transform', 'box-shadow'], 'fast'),
                      fontWeight: 600,
                      
                      '&:hover': {
                        background: `linear-gradient(135deg, ${tokens.color[primaryAction.color || color][600]} 0%, ${tokens.color[primaryAction.color || color][700]} 100%)`,
                        transform: 'translateY(-2px)',
                        boxShadow: `0 12px 40px ${tokens.color[primaryAction.color || color][500]}35`,
                      }
                    }}
                  >
                    {primaryAction.label}
                  </Button>
                )}
                
                {secondaryAction && (
                  <Button
                    variant="outlined"
                    size={size === 'large' ? 'large' : 'medium'}
                    startIcon={secondaryAction.icon || <TrendingUpIcon />}
                    onClick={secondaryAction.onClick}
                    sx={{
                      ...glassPresets.light,
                      borderRadius: tokens.spacing.radius.full,
                      border: `1px solid ${tokens.color.neutral[300]}`,
                      color: tokens.color.neutral[700],
                      px: size === 'large' ? 5 : 4,
                      py: size === 'large' ? 1.5 : 1.25,
                      fontWeight: 600,
                      transition: createTransition(['transform', 'background'], 'fast'),
                      
                      '&:hover': {
                        ...glassPresets.medium,
                        transform: 'translateY(-2px)',
                        border: `1px solid ${tokens.color.neutral[400]}`,
                      }
                    }}
                  >
                    {secondaryAction.label}
                  </Button>
                )}
              </Stack>
            </Fade>
          )}
        </Box>
      </Box>
    </Grow>
  );
};

// Specialized empty state variants
export const ModernNoDataState: React.FC<Omit<ModernEmptyStateProps, 'variant' | 'title' | 'description'> & { 
  title?: string; 
  description?: string; 
  entityName?: string;
}> = ({ 
  title, 
  description, 
  entityName = 'data',
  ...props 
}) => (
  <ModernEmptyState
    {...props}
    variant="default"
    title={title || `No ${entityName} yet`}
    description={description || `You haven't created any ${entityName} yet. Get started by adding your first ${entityName}.`}
  />
);

export const ModernErrorState: React.FC<Omit<ModernEmptyStateProps, 'variant' | 'color'>> = (props) => (
  <ModernEmptyState
    {...props}
    variant="error"
    color="error"
    icon={ErrorIcon}
  />
);

export const ModernSearchEmptyState: React.FC<Omit<ModernEmptyStateProps, 'variant' | 'icon'>> = (props) => (
  <ModernEmptyState
    {...props}
    variant="search"
    icon={SearchIcon}
  />
);

export const ModernLoadingState: React.FC<Omit<ModernEmptyStateProps, 'variant' | 'icon'>> = (props) => (
  <ModernEmptyState
    {...props}
    variant="loading"
    icon={RefreshIcon}
  />
);