// Modern Empty State Component
// Reusable empty state component with simple flat styling

import React from 'react';
import { Box, Typography, Button, Stack, Grow, Fade, Chip } from '@mui/material';
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
  className,
  sx,
}) => {
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 64;
      case 'medium':
        return 80;
      case 'large':
        return 100;
      default:
        return 80;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return 4;
      case 'medium':
        return 6;
      case 'large':
        return 8;
      default:
        return 6;
    }
  };

  const getTitleVariant = () => {
    switch (size) {
      case 'small':
        return 'h6' as const;
      case 'medium':
        return 'h5' as const;
      case 'large':
        return 'h4' as const;
      default:
        return 'h5' as const;
    }
  };

  const getDefaultIcon = () => {
    switch (variant) {
      case 'error':
        return ErrorIcon;
      case 'search':
        return SearchIcon;
      case 'loading':
        return RefreshIcon;
      default:
        return HelpIcon;
    }
  };

  const FinalIcon = IconComponent || getDefaultIcon();
  const iconSize = size === 'large' ? 48 : size === 'small' ? 32 : 40;

  return (
    <Grow in timeout={500}>
      <Box
        className={className}
        sx={{
          p: getPadding(),
          textAlign: 'center',
          bgcolor: 'background.paper',
          borderRadius: tokens.spacing.radius.lg,
          border:
            variant === 'error'
              ? `1px dashed ${tokens.color.error[300]}`
              : `1px dashed ${tokens.color.borders.subtle}`,
          minHeight: size === 'small' ? 240 : size === 'large' ? 400 : 320,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          ...sx,
        }}
      >
        <Box>
          {/* Icon */}
          <Fade in timeout={800}>
            <Box
              sx={{
                width: getIconSize(),
                height: getIconSize(),
                borderRadius: tokens.spacing.radius.lg,
                bgcolor: variant === 'error' ? tokens.color.error[50] : tokens.color[color][50],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              {React.isValidElement(FinalIcon)
                ? FinalIcon
                : typeof FinalIcon === 'function'
                  ? React.createElement(FinalIcon as React.ComponentType<{ sx?: object }>, {
                      sx: {
                        fontSize: iconSize,
                        color:
                          variant === 'error' ? tokens.color.error[500] : tokens.color[color][500],
                      },
                    })
                  : null}
            </Box>
          </Fade>

          {/* Title */}
          <Fade in timeout={1000}>
            <Typography
              variant={getTitleVariant()}
              sx={{
                fontWeight: 600,
                color: variant === 'error' ? tokens.color.error[700] : tokens.color.neutral[800],
                mb: 1.5,
              }}
            >
              {title}
            </Typography>
          </Fade>

          {/* Description */}
          <Fade in timeout={1200}>
            <Typography
              variant="body2"
              sx={{
                color: tokens.color.neutral[600],
                mb: tip ? 3 : 4,
                maxWidth: size === 'large' ? 600 : size === 'small' ? 320 : 480,
                mx: 'auto',
                lineHeight: 1.6,
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
                  bgcolor:
                    tip.type === 'pro'
                      ? tokens.color.warning[50]
                      : tip.type === 'success'
                        ? tokens.color.success[50]
                        : tip.type === 'warning'
                          ? tokens.color.warning[50]
                          : tokens.color.info[50],
                  borderRadius: tokens.spacing.radius.md,
                  p: 2,
                  maxWidth: size === 'large' ? 500 : 400,
                  mx: 'auto',
                  mb: 4,
                }}
              >
                <Box display="flex" alignItems="flex-start" gap={1.5}>
                  <LightbulbIcon
                    sx={{
                      fontSize: 18,
                      color:
                        tip.type === 'pro'
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
                          color:
                            tip.type === 'pro'
                              ? tokens.color.warning[700]
                              : tip.type === 'success'
                                ? tokens.color.success[700]
                                : tip.type === 'warning'
                                  ? tokens.color.warning[700]
                                  : tokens.color.info[700],
                        }}
                      >
                        {tip.type === 'pro'
                          ? 'Pro Tip'
                          : tip.type === 'success'
                            ? 'Success'
                            : tip.type === 'warning'
                              ? 'Note'
                              : 'Tip'}
                      </Typography>
                      {tip.type === 'pro' && (
                        <Chip
                          label="Premium"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: tokens.color.warning[500],
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color:
                          tip.type === 'pro'
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
              >
                {primaryAction && (
                  <Button
                    variant="contained"
                    size={size === 'large' ? 'large' : 'medium'}
                    startIcon={primaryAction.icon || <AddIcon />}
                    onClick={primaryAction.onClick}
                    sx={{
                      bgcolor: tokens.color[primaryAction.color || color][500],
                      borderRadius: tokens.spacing.radius.md,
                      px: 3,
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: tokens.color[primaryAction.color || color][600],
                      },
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
                      borderRadius: tokens.spacing.radius.md,
                      borderColor: tokens.color.neutral[300],
                      color: tokens.color.neutral[700],
                      px: 3,
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: tokens.color.neutral[50],
                        borderColor: tokens.color.neutral[400],
                      },
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
export const ModernNoDataState: React.FC<
  Omit<ModernEmptyStateProps, 'variant' | 'title' | 'description'> & {
    title?: string;
    description?: string;
    entityName?: string;
  }
> = ({ title, description, entityName = 'data', ...props }) => (
  <ModernEmptyState
    {...props}
    variant="default"
    title={title || `No ${entityName} yet`}
    description={
      description ||
      `You haven't created any ${entityName} yet. Get started by adding your first ${entityName}.`
    }
  />
);

export const ModernErrorState: React.FC<Omit<ModernEmptyStateProps, 'variant' | 'color'>> = (
  props,
) => <ModernEmptyState {...props} variant="error" color="error" icon={ErrorIcon} />;

export const ModernSearchEmptyState: React.FC<Omit<ModernEmptyStateProps, 'variant' | 'icon'>> = (
  props,
) => <ModernEmptyState {...props} variant="search" icon={SearchIcon} />;

export const ModernLoadingState: React.FC<Omit<ModernEmptyStateProps, 'variant' | 'icon'>> = (
  props,
) => <ModernEmptyState {...props} variant="loading" icon={RefreshIcon} />;
