// Modern Page Header Component
// Standardized header component with breadcrumbs and action buttons

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
import { useThemeColors } from '../../hooks/useThemeColors';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  current?: boolean;
}

export interface HeaderAction {
  icon?: React.ReactNode;
  label: string;
  onClick: (event?: React.MouseEvent<HTMLElement>) => void;
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
  className,
  sx,
}) => {
  const themeColors = useThemeColors();

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
      case 'medium': return 'h4' as const;
      case 'large': return 'h3' as const;
      default: return 'h4' as const;
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

  const renderAction = (action: HeaderAction, isSecondary: boolean = false) => {
    const baseButtonProps = {
      disabled: action.disabled,
      onClick: (e: React.MouseEvent<HTMLElement>) => action.onClick(e),
      sx: {
        borderRadius: tokens.spacing.radius.md,
        fontWeight: 600,
      }
    };

    const content = action.variant === 'icon' ? (
      <IconButton
        {...baseButtonProps}
        sx={{
          ...baseButtonProps.sx,
          width: size === 'large' ? 48 : 40,
          height: size === 'large' ? 48 : 40,
          color: action.color ? tokens.color[action.color][600] : themeColors.text.secondary,
          '&:hover': {
            bgcolor: themeColors.surface.level2,
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
            bgcolor: tokens.color[action.color || 'primary'][500],
            '&:hover': {
              bgcolor: tokens.color[action.color || 'primary'][600],
            }
          }),
          ...(action.variant === 'outlined' && {
            borderColor: themeColors.border.default,
            color: themeColors.text.primary,
            '&:hover': {
              bgcolor: themeColors.surface.level2,
              borderColor: themeColors.border.prominent,
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
            bgcolor: 'background.paper',
            border: `1px solid ${themeColors.border.default}`,
            borderRadius: tokens.spacing.radius.lg,
            p: getPadding(),
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
                    color: themeColors.text.secondary,
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
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
                        ? themeColors.text.primary
                        : themeColors.text.secondary,
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: crumb.current ? 600 : 500,
                      cursor: (crumb.href || crumb.onClick) ? 'pointer' : 'default',
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
            <Box display="flex" alignItems="flex-start" gap={2}>
              {/* Icon */}
              {icon && (
                <Box
                  sx={{
                    borderRadius: tokens.spacing.radius.md,
                    p: size === 'large' ? 2 : 1.5,
                    bgcolor: themeColors.semantic.primary.bg,
                    flexShrink: 0,
                  }}
                >
                  {React.isValidElement(icon)
                    ? React.cloneElement(icon as React.ReactElement<{ sx?: object }>, {
                        sx: {
                          fontSize: getIconSize(),
                          color: themeColors.semantic.primary.text
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
                      color: themeColors.text.primary,
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
                        fontWeight: 600,
                        height: 24,
                      }}
                    />
                  )}
                </Box>

                {subtitle && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: themeColors.text.secondary,
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
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 4,
                      flexWrap: 'wrap',
                    }}
                  >
                    {stats.map((stat, index) => (
                      <Box key={index}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: themeColors.text.primary,
                            lineHeight: 1.2,
                          }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: themeColors.text.secondary,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 500,
                          }}
                        >
                          {stat.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
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
