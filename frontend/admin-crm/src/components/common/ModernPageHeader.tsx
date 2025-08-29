// Modern Page Header Component
// Standardized header component with gradient text effects, breadcrumbs, and action buttons

import React from 'react';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Chip,
  Stack,
  IconButton,
  Button,
  Tooltip,
  Fade,
  Badge,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  current?: boolean;
}

interface HeaderAction {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'contained' | 'outlined' | 'text' | 'icon';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
  badge?: number;
}

interface ModernPageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  icon?: React.ReactNode;
  primaryAction?: HeaderAction;
  secondaryActions?: HeaderAction[];
  status?: {
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    variant?: 'filled' | 'outlined';
  };
  stats?: {
    label: string;
    value: string | number;
  }[];
  size?: 'small' | 'medium' | 'large';
  gradient?: boolean;
  glass?: boolean;
  className?: string;
  sx?: object;
}

export const ModernPageHeader: React.FC<ModernPageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  icon,
  primaryAction,
  secondaryActions = [],
  status,
  stats,
  size = 'medium',
  gradient = true,
  glass = true,
  className,
  sx,
}) => {
  const getPadding = () => {
    switch (size) {
      case 'small': return { xs: 2, md: 3 };
      case 'medium': return { xs: 3, md: 4 };
      case 'large': return { xs: 4, md: 5 };
      default: return { xs: 3, md: 4 };
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

  const getIconSize = () => {
    switch (size) {
      case 'small': return 24;
      case 'medium': return 28;
      case 'large': return 32;
      default: return 28;
    }
  };

  const renderAction = (action: HeaderAction, isSecondary: boolean = false, key?: string) => {
    const baseButtonProps = {
      disabled: action.disabled,
      onClick: action.onClick,
      sx: {
        borderRadius: tokens.spacing.radius.full,
        fontWeight: 600,
        transition: createTransition(['transform', 'background', 'box-shadow'], 'fast'),
        
        '&:hover': {
          transform: 'translateY(-1px)',
        }
      }
    };

    const content = action.variant === 'icon' ? (
      <IconButton
        {...baseButtonProps}
        sx={{
          ...baseButtonProps.sx,
          ...(glass && glassPresets.light),
          width: size === 'large' ? 48 : 44,
          height: size === 'large' ? 48 : 44,
          color: action.color ? tokens.color[action.color][600] : tokens.color.neutral[600],
          border: glass ? `1px solid ${action.color ? tokens.color[action.color][500] : tokens.color.neutral[400]}30` : undefined,
          
          '&:hover': {
            ...baseButtonProps.sx?.['&:hover'],
            ...(glass && glassPresets.medium),
            color: action.color ? tokens.color[action.color][700] : tokens.color.neutral[700],
          }
        }}
      >
        {action.badge ? (
          <Badge badgeContent={action.badge} color={action.color || 'primary'}>
            {action.icon}
          </Badge>
        ) : (
          action.icon
        )}
      </IconButton>
    ) : (
      <Button
        {...baseButtonProps}
        variant={action.variant || (isSecondary ? 'outlined' : 'contained')}
        startIcon={action.icon}
        sx={{
          ...baseButtonProps.sx,
          ...(action.variant === 'contained' && {
            background: `linear-gradient(135deg, ${tokens.color[action.color || 'primary'][500]} 0%, ${tokens.color[action.color || 'primary'][600]} 100%)`,
            boxShadow: `0 4px 16px ${tokens.color[action.color || 'primary'][500]}25`,
            
            '&:hover': {
              ...baseButtonProps.sx?.['&:hover'],
              background: `linear-gradient(135deg, ${tokens.color[action.color || 'primary'][600]} 0%, ${tokens.color[action.color || 'primary'][700]} 100%)`,
              boxShadow: `0 6px 20px ${tokens.color[action.color || 'primary'][500]}35`,
            }
          }),
          
          ...(action.variant === 'outlined' && glass && {
            ...glassPresets.light,
            border: `1px solid ${action.color ? tokens.color[action.color][500] : tokens.color.primary[500]}30`,
            color: action.color ? tokens.color[action.color][600] : tokens.color.primary[600],
            
            '&:hover': {
              ...baseButtonProps.sx?.['&:hover'],
              ...glassPresets.medium,
              border: `1px solid ${action.color ? tokens.color[action.color][500] : tokens.color.primary[500]}50`,
            }
          }),
        }}
      >
        {action.badge ? (
          <Badge badgeContent={action.badge} color={action.color || 'primary'}>
            {action.label}
          </Badge>
        ) : (
          action.label
        )}
      </Button>
    );

    return action.tooltip ? (
      <Tooltip key={action.label} title={action.tooltip} placement="bottom">
        {content}
      </Tooltip>
    ) : content;
  };

  return (
    <Fade in timeout={500}>
      <Box 
        className={className}
        sx={{ 
          mb: 4,
          ...sx,
        }}
      >
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', lg: 'row' }}
          justifyContent="space-between" 
          alignItems={{ xs: 'stretch', lg: 'flex-start' }}
          gap={{ xs: 3, lg: 4 }}
          sx={{
            ...(glass && {
              ...glassPresets.light,
              border: `1px solid ${tokens.color.borders.glass}`,
            }),
            borderRadius: tokens.spacing.radius.xxl,
            p: getPadding(),
            position: 'relative',
            overflow: 'visible',
            
            ...(gradient && glass && {
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}06 0%, ${tokens.color.success[500]}06 100%)`,
                borderRadius: tokens.spacing.radius.xxl,
                pointerEvents: 'none',
              }
            })
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <Breadcrumbs 
                separator={<NavigateNextIcon fontSize="small" />}
                sx={{ mb: 2 }}
              >
                <Link
                  href="/"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: tokens.color.neutral[600],
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: createTransition('color', 'fast'),
                    
                    '&:hover': {
                      color: tokens.color.primary[600],
                    }
                  }}
                >
                  <HomeIcon fontSize="small" />
                  Home
                </Link>
                
                {breadcrumbs.map((crumb, index) => (
                  <Typography
                    key={`breadcrumb-${index}-${crumb.label}`}
                    component={crumb.href || crumb.onClick ? 'a' : 'span'}
                    href={crumb.href}
                    onClick={crumb.onClick}
                    sx={{
                      color: crumb.current 
                        ? tokens.color.neutral[800] 
                        : tokens.color.neutral[600],
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: crumb.current ? 600 : 500,
                      cursor: (crumb.href || crumb.onClick) ? 'pointer' : 'default',
                      transition: createTransition('color', 'fast'),
                      
                      ...((crumb.href || crumb.onClick) && {
                        '&:hover': {
                          color: tokens.color.primary[600],
                        }
                      })
                    }}
                  >
                    {crumb.label}
                  </Typography>
                ))}
              </Breadcrumbs>
            )}

            {/* Header Content */}
            <Box display="flex" alignItems="flex-start" gap={3}>
              {/* Icon */}
              {icon && (
                <Box
                  sx={{
                    ...(glass && glassPresets.medium),
                    borderRadius: tokens.spacing.radius.full,
                    p: size === 'large' ? 2.5 : 2,
                    background: gradient 
                      ? `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`
                      : undefined,
                    border: glass ? `1px solid ${tokens.color.primary[500]}30` : undefined,
                    flexShrink: 0,
                  }}
                >
                  {React.isValidElement(icon) 
                    ? React.cloneElement(icon as React.ReactElement<any>, { 
                        sx: { 
                          fontSize: getIconSize(), 
                          color: tokens.color.primary[600] 
                        } 
                      }) 
                    : icon
                  }
                </Box>
              )}

              {/* Title and Subtitle */}
              <Box flex={1} minWidth={0}>
                <Box display="flex" alignItems="center" gap={2} mb={subtitle || stats ? 0.5 : 0}>
                  <Typography 
                    variant={getTitleVariant()}
                    component="h1" 
                    sx={{ 
                      fontWeight: 700,
                      ...(gradient ? {
                        background: tokens.color.backgrounds.primaryGradient,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                      } : {
                        color: tokens.color.neutral[800],
                      }),
                      lineHeight: 1.2,
                      wordBreak: 'break-word',
                    }}
                  >
                    {title}
                  </Typography>
                  
                  {status && (
                    <Chip 
                      label={status.label}
                      size="small"
                      variant={status.variant || 'filled'}
                      color={status.color || 'primary'}
                      sx={{
                        ...(glass && status.variant !== 'filled' && glassPresets.light),
                        fontWeight: 600,
                        height: 24,
                        ...(status.variant !== 'filled' && {
                          border: `1px solid ${tokens.color[status.color || 'primary'][500]}30`,
                        })
                      }}
                    />
                  )}
                </Box>
                
                {subtitle && (
                  <Typography 
                    variant={size === 'large' ? 'h6' : 'body1'}
                    sx={{ 
                      color: tokens.color.neutral[600],
                      fontWeight: 400,
                      mb: stats ? 2 : 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {subtitle}
                  </Typography>
                )}

                {/* Stats */}
                {stats && stats.length > 0 && (
                  <Stack direction="row" spacing={3} flexWrap="wrap">
                    {stats.map((stat, index) => (
                      <Box key={index}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700,
                            color: tokens.color.neutral[800],
                            lineHeight: 1.2,
                          }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: tokens.color.neutral[500],
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 500,
                          }}
                        >
                          {stat.label}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>
          </Box>

          {/* Actions */}
          {(primaryAction || secondaryActions.length > 0) && (
            <Stack 
              direction={{ xs: 'row', lg: 'row' }} 
              spacing={2} 
              sx={{ 
                position: 'relative', 
                zIndex: 1,
                flexWrap: { xs: 'wrap', lg: 'nowrap' },
                justifyContent: { xs: 'flex-start', lg: 'flex-end' },
              }}
            >
              {secondaryActions.map((action, index) => (
                <React.Fragment key={`secondary-action-${index}`}>
                  {renderAction(action, true)}
                </React.Fragment>
              ))}
              {primaryAction && renderAction(primaryAction)}
            </Stack>
          )}
        </Box>
      </Box>
    </Fade>
  );
};

// Specialized header variants
export const ModernDashboardHeader: React.FC<Omit<ModernPageHeaderProps, 'size' | 'gradient'>> = (props) => (
  <ModernPageHeader {...props} size="large" gradient />
);

export const ModernSettingsHeader: React.FC<Omit<ModernPageHeaderProps, 'glass'>> = (props) => (
  <ModernPageHeader {...props} glass={false} />
);

export const ModernOverviewHeader: React.FC<Omit<ModernPageHeaderProps, 'size'>> = (props) => (
  <ModernPageHeader {...props} size="medium" />
);

// Quick action builders
export const createRefreshAction = (onRefresh: () => void): HeaderAction => ({
  icon: <RefreshIcon />,
  label: 'Refresh',
  variant: 'icon',
  onClick: onRefresh,
  tooltip: 'Refresh data',
});

export const createFilterAction = (onFilter: () => void, count?: number): HeaderAction => ({
  icon: <FilterIcon />,
  label: 'Filter',
  variant: 'icon',
  onClick: onFilter,
  tooltip: 'Filter results',
  badge: count,
});

export const createExportAction = (onExport: () => void): HeaderAction => ({
  icon: <DownloadIcon />,
  label: 'Export',
  variant: 'outlined',
  onClick: onExport,
  color: 'success',
});

export const createSettingsAction = (onSettings: () => void): HeaderAction => ({
  icon: <SettingsIcon />,
  label: 'Settings',
  variant: 'icon',
  onClick: onSettings,
  tooltip: 'Open settings',
});

export const createAddAction = (label: string, onAdd: () => void, color: HeaderAction['color'] = 'primary'): HeaderAction => ({
  icon: <AddIcon />,
  label,
  variant: 'contained',
  onClick: onAdd,
  color,
});