import React from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
  Skeleton,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import type { SmartCardProps } from '../../types/enhanced-settings.types';

export const SmartCard: React.FC<SmartCardProps> = ({
  title,
  description,
  icon: IconComponent,
  completionRate,
  lastUpdated,
  quickActions,
  preview,
  children,
  onClick,
  variant = 'default',
  animation = 'hover-lift',
}) => {
  const theme = useTheme();

  const getCardStyles = () => {
    const baseStyles = {
      height: '100%',
      position: 'relative' as const,
      overflow: 'hidden',
      transition: 'background-color 0.2s ease-in-out',
      border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    };

    const variantStyles = {
      default: {
        bgcolor: 'background.paper',
      },
      glass: {
        bgcolor: 'background.paper',
      },
      gradient: {
        bgcolor: 'background.paper',
      },
      outlined: {
        bgcolor: 'transparent',
        border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
      },
    };

    const animationStyles = {
      'hover-lift': {
        '&:hover': {
          bgcolor: alpha(theme.palette.action.hover, 0.5),
        },
      },
      'hover-glow': {
        '&:hover': {
          bgcolor: alpha(theme.palette.action.hover, 0.5),
        },
      },
      'hover-scale': {
        '&:hover': {
          bgcolor: alpha(theme.palette.action.hover, 0.5),
        },
      },
      none: {},
    };

    return {
      ...baseStyles,
      ...variantStyles[variant],
      ...animationStyles[animation],
    };
  };

  const cardContent = (
    <CardContent sx={{ p: 3, height: '100%' }}>
      {/* Header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={2} flex={1}>
          {IconComponent && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'rotate(10deg) scale(1.1)',
                },
              }}
            >
              <IconComponent />
            </Box>
          )}
          <Box flex={1}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                {description}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Quick Actions */}
        {quickActions && quickActions.length > 0 && (
          <Box display="flex" gap={0.5}>
            {quickActions.map((action, index) => (
              <Tooltip key={index} title={action.label}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  sx={{
                    bgcolor: alpha(theme.palette.action.hover, 0.5),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                    },
                  }}
                >
                  {action.icon ? (
                    <action.icon fontSize="small" />
                  ) : (
                    <MoreVertIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        )}
      </Box>

      {/* Metadata Badges */}
      {(lastUpdated || completionRate !== undefined) && (
        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          {lastUpdated && (
            <Chip
              size="small"
              icon={<AccessTimeIcon fontSize="small" />}
              label={`Updated ${new Date(lastUpdated).toLocaleDateString()}`}
              variant="outlined"
              sx={{
                borderColor: alpha(theme.palette.divider, 0.3),
                color: 'text.secondary',
              }}
            />
          )}

          {completionRate !== undefined && (
            <Chip
              size="small"
              icon={<TrendingUpIcon fontSize="small" />}
              label={`${Math.round(completionRate * 100)}% Complete`}
              variant="outlined"
              sx={{
                borderColor: alpha(theme.palette.divider, 0.3),
                color: 'text.secondary',
              }}
            />
          )}
        </Box>
      )}

      {/* Completion Progress */}
      {completionRate !== undefined && (
        <Box sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Configuration Progress
            </Typography>
            <Typography variant="caption" color="primary" fontWeight="bold">
              {Math.round(completionRate * 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completionRate * 100}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              },
            }}
          />
        </Box>
      )}

      {/* Preview Section */}
      {preview && (
        <Box
          sx={{
            p: 2,
            bgcolor: alpha(theme.palette.grey[100], 0.5),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            mb: 2,
          }}
        >
          {preview}
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1 }}>{children}</Box>
    </CardContent>
  );

  if (onClick) {
    return (
      <Card elevation={0} sx={getCardStyles()}>
        <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
          {cardContent}
        </CardActionArea>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={getCardStyles()}>
      {cardContent}
    </Card>
  );
};

// Loading skeleton for SmartCard
export const SmartCardSkeleton: React.FC = () => {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Skeleton variant="circular" width={48} height={48} />
          <Box flex={1}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="100%" height={20} />
          </Box>
        </Box>
        <Box display="flex" gap={1} mb={2}>
          <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={120} height={24} sx={{ borderRadius: 1 }} />
        </Box>
        <Skeleton variant="rectangular" width="100%" height={6} sx={{ borderRadius: 1, mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={100} sx={{ borderRadius: 1 }} />
      </CardContent>
    </Card>
  );
};
