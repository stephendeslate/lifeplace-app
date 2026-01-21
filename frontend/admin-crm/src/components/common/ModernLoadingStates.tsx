// Modern Loading States
// Skeleton loading components with simple flat design

import React from 'react';
import {
  Box,
  Skeleton,
  Stack,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  LinearProgress,
  Fade,
} from '@mui/material';
import { tokens } from '../../design-system';

interface ModernSkeletonProps {
  variant?: 'text' | 'rectangular' | 'rounded' | 'circular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | false;
  className?: string;
  sx?: object;
}

export const ModernSkeleton: React.FC<ModernSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'wave',
  className,
  sx,
}) => (
  <Skeleton
    variant={variant}
    width={width}
    height={height}
    animation={animation}
    className={className}
    sx={{
      bgcolor: tokens.color.neutral[100],
      borderRadius: variant === 'rounded' ? tokens.spacing.radius.md : variant === 'circular' ? '50%' : tokens.spacing.radius.sm,
      ...sx,
    }}
  />
);

// Page Header Skeleton
export const ModernHeaderSkeleton: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({
  size = 'medium'
}) => {
  const getPadding = () => {
    switch (size) {
      case 'small': return { xs: 2, md: 3 };
      case 'medium': return { xs: 3, md: 4 };
      case 'large': return { xs: 4, md: 5 };
      default: return { xs: 3, md: 4 };
    }
  };

  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: tokens.spacing.radius.lg,
          border: `1px solid ${tokens.color.borders.subtle}`,
          p: getPadding(),
          mb: 4,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={3}>
          <Box display="flex" alignItems="flex-start" gap={3} flex={1}>
            {/* Icon skeleton */}
            <ModernSkeleton
              variant="circular"
              width={size === 'large' ? 64 : size === 'small' ? 48 : 56}
              height={size === 'large' ? 64 : size === 'small' ? 48 : 56}
            />

            {/* Title and subtitle */}
            <Box flex={1}>
              <ModernSkeleton
                variant="text"
                width="60%"
                height={size === 'large' ? 48 : size === 'small' ? 32 : 40}
                sx={{ mb: 1 }}
              />
              <ModernSkeleton
                variant="text"
                width="80%"
                height={size === 'large' ? 28 : 24}
              />
            </Box>
          </Box>

          {/* Actions skeleton */}
          <Stack direction="row" spacing={2}>
            <ModernSkeleton variant="rounded" width={100} height={36} />
            <ModernSkeleton variant="rounded" width={120} height={36} />
          </Stack>
        </Box>
      </Box>
    </Fade>
  );
};

// Card Skeleton
export const ModernCardSkeleton: React.FC<{
  size?: 'small' | 'medium' | 'large';
  hasHeader?: boolean;
  hasActions?: boolean;
}> = ({
  size = 'medium',
  hasHeader = false,
  hasActions = false,
}) => {
  const getPadding = () => {
    switch (size) {
      case 'small': return 2;
      case 'medium': return 3;
      case 'large': return 4;
      default: return 3;
    }
  };

  return (
    <Fade in timeout={300}>
      <Card
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          border: `1px solid ${tokens.color.borders.subtle}`,
          borderRadius: tokens.spacing.radius.lg,
        }}
      >
        {hasHeader && (
          <Box sx={{ p: getPadding(), pb: 1 }}>
            <ModernSkeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
            <ModernSkeleton variant="text" width="60%" height={16} />
          </Box>
        )}

        <CardContent sx={{ p: getPadding() }}>
          <Stack spacing={2}>
            <ModernSkeleton variant="text" width="100%" height={20} />
            <ModernSkeleton variant="text" width="85%" height={20} />
            <ModernSkeleton variant="text" width="70%" height={20} />

            <Box mt={2}>
              <ModernSkeleton variant="rounded" width="100%" height={100} />
            </Box>

            <Stack direction="row" spacing={2} mt={2}>
              <ModernSkeleton variant="rounded" width="30%" height={16} />
              <ModernSkeleton variant="rounded" width="25%" height={16} />
              <ModernSkeleton variant="rounded" width="35%" height={16} />
            </Stack>
          </Stack>
        </CardContent>

        {hasActions && (
          <Box sx={{ p: getPadding(), pt: 0 }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <ModernSkeleton variant="rounded" width={80} height={32} />
              <ModernSkeleton variant="rounded" width={100} height={32} />
            </Stack>
          </Box>
        )}
      </Card>
    </Fade>
  );
};

// Metric Card Skeleton
export const ModernMetricCardSkeleton: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({
  size = 'medium'
}) => (
  <Fade in timeout={300}>
    <Card
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${tokens.color.borders.subtle}`,
        borderRadius: tokens.spacing.radius.lg,
        p: size === 'large' ? 4 : size === 'small' ? 2 : 3,
        height: '100%',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <ModernSkeleton
            variant="text"
            width="60%"
            height={16}
            sx={{ mb: 1 }}
          />
          <ModernSkeleton
            variant="text"
            width="40%"
            height={size === 'large' ? 48 : size === 'small' ? 32 : 40}
            sx={{ mb: 1 }}
          />
          <ModernSkeleton
            variant="text"
            width="80%"
            height={14}
            sx={{ mb: 2 }}
          />
          <ModernSkeleton
            variant="rounded"
            width="50%"
            height={24}
          />
        </Box>

        <ModernSkeleton
          variant="rounded"
          width={size === 'large' ? 64 : size === 'small' ? 48 : 56}
          height={size === 'large' ? 64 : size === 'small' ? 48 : 56}
          sx={{ ml: 2 }}
        />
      </Box>
    </Card>
  </Fade>
);

// Table Skeleton
export const ModernTableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
}> = ({
  rows = 5,
  columns = 4,
  hasHeader = true,
}) => (
  <Fade in timeout={300}>
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${tokens.color.borders.subtle}`,
        borderRadius: tokens.spacing.radius.lg,
        overflow: 'hidden',
      }}
    >
      {hasHeader && (
        <Box
          sx={{
            bgcolor: tokens.color.neutral[50],
            borderBottom: `1px solid ${tokens.color.borders.subtle}`,
            p: 2,
          }}
        >
          <Stack direction="row" spacing={2}>
            {Array.from({ length: columns }).map((_, index) => (
              <ModernSkeleton
                key={index}
                variant="text"
                width={`${100 / columns}%`}
                height={20}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <Stack key={rowIndex} direction="row" spacing={2}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <ModernSkeleton
                  key={colIndex}
                  variant="text"
                  width={`${100 / columns}%`}
                  height={16}
                />
              ))}
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  </Fade>
);

// List Skeleton
export const ModernListSkeleton: React.FC<{
  items?: number;
  showAvatar?: boolean;
  showSecondaryText?: boolean;
}> = ({
  items = 4,
  showAvatar = true,
  showSecondaryText = true,
}) => (
  <Fade in timeout={300}>
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${tokens.color.borders.subtle}`,
        borderRadius: tokens.spacing.radius.lg,
        overflow: 'hidden',
      }}
    >
      <Stack spacing={0}>
        {Array.from({ length: items }).map((_, index) => (
          <Box
            key={index}
            sx={{
              p: 3,
              borderBottom: index < items - 1 ? `1px solid ${tokens.color.borders.subtle}` : 'none',
            }}
          >
            <Box display="flex" alignItems="flex-start" gap={2}>
              {showAvatar && (
                <ModernSkeleton variant="circular" width={48} height={48} />
              )}

              <Box flex={1}>
                <ModernSkeleton variant="text" width="70%" height={20} sx={{ mb: 1 }} />
                {showSecondaryText && (
                  <ModernSkeleton variant="text" width="90%" height={16} sx={{ mb: 1 }} />
                )}
                <ModernSkeleton variant="text" width="40%" height={14} />
              </Box>

              <ModernSkeleton variant="rounded" width={24} height={24} />
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  </Fade>
);

// Loading Spinner
export const ModernLoadingSpinner: React.FC<{
  size?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  message?: string;
  variant?: 'circular' | 'linear';
  contained?: boolean;
}> = ({
  size = 40,
  color = 'primary',
  message,
  variant = 'circular',
  contained = true,
}) => (
  <Fade in timeout={300}>
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        ...(contained && {
          bgcolor: 'background.paper',
          borderRadius: tokens.spacing.radius.lg,
          border: `1px solid ${tokens.color.borders.subtle}`,
          p: 6,
        }),
        minHeight: contained ? 300 : 'auto',
      }}
    >
      {variant === 'circular' ? (
        <CircularProgress
          size={size}
          sx={{
            color: tokens.color[color][500],
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
      ) : (
        <Box sx={{ width: '100%', maxWidth: 300 }}>
          <LinearProgress
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: tokens.color.neutral[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: tokens.color[color][500],
              },
            }}
          />
        </Box>
      )}

      {message && (
        <Typography
          variant="body1"
          sx={{
            color: tokens.color.neutral[600],
            fontWeight: 500,
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  </Fade>
);

// Full Page Loading
export const ModernPageLoadingSkeleton: React.FC = () => (
  <Box sx={{ p: 4 }}>
    <ModernHeaderSkeleton size="large" />

    <Stack spacing={4}>
      {/* Metrics row */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Box key={index} sx={{ flex: 1 }}>
            <ModernMetricCardSkeleton />
          </Box>
        ))}
      </Stack>

      {/* Main content area */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 4,
        }}
      >
        {/* Left column */}
        <Stack spacing={4}>
          <ModernCardSkeleton hasHeader hasActions />
          <ModernTableSkeleton />
        </Stack>

        {/* Right column */}
        <Stack spacing={4}>
          <ModernCardSkeleton hasHeader size="small" />
          <ModernListSkeleton />
        </Stack>
      </Box>
    </Stack>
  </Box>
);

// Export all loading components
export default {
  ModernSkeleton,
  ModernHeaderSkeleton,
  ModernCardSkeleton,
  ModernMetricCardSkeleton,
  ModernTableSkeleton,
  ModernListSkeleton,
  ModernLoadingSpinner,
  ModernPageLoadingSkeleton,
};
