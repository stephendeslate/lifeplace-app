// design-system/components/SkeletonLoader.tsx

import React from 'react';
import { Box, Skeleton } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import type { SkeletonProps } from '@mui/material';
import { tokens } from '../tokens';

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const StyledSkeleton = styled(Skeleton)(() => ({
  backgroundColor: tokens.color.base.sage[100],
  '&::after': {
    background: `linear-gradient(
      90deg,
      transparent,
      ${tokens.color.overlays.light},
      transparent
    )`,
    animation: `${shimmer} 2s infinite`,
  },
  borderRadius: tokens.spacing.radius.md,
}));

interface SkeletonLoaderProps extends SkeletonProps {
  type?: 'card' | 'list' | 'text' | 'avatar' | 'button' | 'calendar' | 'venue' | 'custom';
  lines?: number;
  showAvatar?: boolean;
  showActions?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'custom',
  lines = 3,
  showAvatar = false,
  showActions = false,
  ...props
}) => {
  switch (type) {
    case 'card':
      return (
        <Box
          sx={{
            p: 3,
            borderRadius: tokens.spacing.radius.card,
            background: tokens.color.glass.lightGlass.background,
            backdropFilter: tokens.color.glass.lightGlass.backdropFilter,
            border: tokens.color.glass.lightGlass.border,
          }}
        >
          <StyledSkeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
          <StyledSkeleton variant="text" sx={{ fontSize: '1.5rem', mb: 1 }} />
          <StyledSkeleton variant="text" width="60%" sx={{ mb: 2 }} />
          {Array.from({ length: lines }).map((_, i) => (
            <StyledSkeleton key={i} variant="text" sx={{ mb: 0.5 }} />
          ))}
          {showActions && (
            <Box display="flex" gap={1} mt={2}>
              <StyledSkeleton variant="rounded" width={100} height={36} />
              <StyledSkeleton variant="rounded" width={100} height={36} />
            </Box>
          )}
        </Box>
      );

    case 'list':
      return (
        <Box>
          {Array.from({ length: lines }).map((_, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                mb: 1,
                borderRadius: tokens.spacing.radius.md,
                background: tokens.color.glass.lightGlass.background,
                backdropFilter: tokens.color.glass.lightGlass.backdropFilter,
              }}
            >
              {showAvatar && <StyledSkeleton variant="circular" width={40} height={40} />}
              <Box flex={1}>
                <StyledSkeleton variant="text" width="30%" sx={{ mb: 0.5 }} />
                <StyledSkeleton variant="text" width="70%" />
              </Box>
              {showActions && <StyledSkeleton variant="rounded" width={80} height={32} />}
            </Box>
          ))}
        </Box>
      );

    case 'calendar':
      return (
        <Box
          sx={{
            p: 3,
            borderRadius: tokens.spacing.radius.card,
            background: tokens.color.glass.lightGlass.background,
            backdropFilter: tokens.color.glass.lightGlass.backdropFilter,
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <StyledSkeleton variant="circular" width={32} height={32} />
            <StyledSkeleton variant="text" width={150} sx={{ fontSize: '1.25rem' }} />
            <StyledSkeleton variant="circular" width={32} height={32} />
          </Box>
          <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={1}>
            {Array.from({ length: 35 }).map((_, i) => (
              <StyledSkeleton key={i} variant="rounded" sx={{ aspectRatio: '1', width: '100%' }} />
            ))}
          </Box>
        </Box>
      );

    case 'venue':
      return (
        <Box
          sx={{
            p: 3,
            borderRadius: tokens.spacing.radius.card,
            background: tokens.color.glass.lightGlass.background,
            backdropFilter: tokens.color.glass.lightGlass.backdropFilter,
          }}
        >
          <StyledSkeleton variant="text" sx={{ fontSize: '1.5rem', mb: 2 }} />
          <StyledSkeleton variant="rectangular" sx={{ width: '100%', height: 400, mb: 2 }} />
          <Box display="flex" gap={2}>
            {Array.from({ length: 3 }).map((_, i) => (
              <StyledSkeleton key={i} variant="rounded" width={100} height={32} />
            ))}
          </Box>
        </Box>
      );

    case 'text':
      return (
        <Box>
          {Array.from({ length: lines }).map((_, i) => (
            <StyledSkeleton
              key={i}
              variant="text"
              width={i === lines - 1 ? '60%' : '100%'}
              sx={{ mb: 0.5 }}
            />
          ))}
        </Box>
      );

    case 'avatar':
      return (
        <Box display="flex" alignItems="center" gap={2}>
          <StyledSkeleton variant="circular" width={60} height={60} />
          <Box flex={1}>
            <StyledSkeleton variant="text" width="40%" sx={{ mb: 0.5 }} />
            <StyledSkeleton variant="text" width="60%" />
          </Box>
        </Box>
      );

    case 'button':
      return <StyledSkeleton variant="rounded" width={120} height={40} {...props} />;

    default:
      return <StyledSkeleton {...props} />;
  }
};

// Composed skeleton screens for common page layouts
export const PageSkeletons = {
  HomePage: () => (
    <Box>
      {/* Hero Section */}
      <StyledSkeleton variant="rectangular" height={500} sx={{ mb: 4 }} />

      {/* Feature Cards */}
      <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={3} mb={4}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonLoader key={i} type="card" lines={2} showActions />
        ))}
      </Box>

      {/* Calendar Section */}
      <SkeletonLoader type="calendar" />
    </Box>
  ),

  BookingPage: () => (
    <Box>
      {/* Progress Bar */}
      <Box display="flex" gap={1} mb={4}>
        {Array.from({ length: 5 }).map((_, i) => (
          <StyledSkeleton key={i} variant="rounded" height={4} sx={{ flex: 1 }} />
        ))}
      </Box>

      {/* Form Content */}
      <Box display="grid" gridTemplateColumns="2fr 1fr" gap={3}>
        <Box>
          <StyledSkeleton variant="text" sx={{ fontSize: '2rem', mb: 2 }} />
          <SkeletonLoader type="text" lines={3} />
          <Box mt={3}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} mb={2}>
                <StyledSkeleton variant="text" width="30%" sx={{ mb: 1 }} />
                <StyledSkeleton variant="rounded" height={56} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Sidebar */}
        <SkeletonLoader type="card" lines={5} showActions={false} />
      </Box>
    </Box>
  ),

  DashboardPage: () => (
    <Box>
      {/* Stats Cards */}
      <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={2} mb={4}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              p: 2,
              borderRadius: tokens.spacing.radius.card,
              background: tokens.color.glass.lightGlass.background,
            }}
          >
            <StyledSkeleton variant="text" width="60%" sx={{ mb: 1 }} />
            <StyledSkeleton variant="text" sx={{ fontSize: '2rem' }} />
          </Box>
        ))}
      </Box>

      {/* Recent Activity */}
      <SkeletonLoader type="list" lines={5} showAvatar showActions />
    </Box>
  ),
};

export default SkeletonLoader;
