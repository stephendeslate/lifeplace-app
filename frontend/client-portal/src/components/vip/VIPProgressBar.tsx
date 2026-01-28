// frontend/client-portal/src/components/vip/VIPProgressBar.tsx

import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import type { VIPProgress, VIPTier } from '../../types/vip.types';

// Tier colors for progress bar styling
const TIER_COLORS: Record<string, string> = {
  Guest: '#6B7280',
  Partner: '#3B82F6',
  Premier: '#F59E0B',
};

interface VIPProgressBarProps {
  progress: VIPProgress | null | undefined;
  nextTier: VIPTier | null | undefined;
  currentTier?: VIPTier | null;
}

export const VIPProgressBar: React.FC<VIPProgressBarProps> = ({
  progress,
  nextTier,
  currentTier: _currentTier,
}) => {
  // Don't show if already at highest tier or no next tier
  if (!nextTier) {
    return null;
  }

  // Prefer bookings progress per CEO preference, fall back to spending if needed
  const metric = progress?.bookings || progress?.spending;

  if (!metric) {
    return null;
  }

  const nextTierColor = TIER_COLORS[nextTier.name] || TIER_COLORS.Partner;
  const progressPercent = Math.min(metric.percentage, 100);
  const remaining = Math.max(metric.required - metric.current, 0);

  // Use bookings language if available, otherwise spending
  const isBookingsProgress = !!progress?.bookings;
  const metricLabel = isBookingsProgress
    ? `${metric.current} of ${metric.required} bookings`
    : `${metric.current} of ${metric.required}`;

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Progress to {nextTier.name}
        </Typography>
        <Typography variant="body2" fontWeight={500} color="text.primary">
          {Math.round(progressPercent)}%
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progressPercent}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: `${nextTierColor}20`,
          '& .MuiLinearProgress-bar': {
            backgroundColor: nextTierColor,
            borderRadius: 4,
          },
        }}
        aria-label={`${progressPercent}% progress to ${nextTier.name} tier`}
      />

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 0.75 }}
      >
        {remaining > 0 ? (
          isBookingsProgress ? (
            <>
              <Box component="span" fontWeight={600} color="text.primary">
                {remaining} more {remaining === 1 ? 'booking' : 'bookings'}
              </Box>
              {' '}to reach {nextTier.name}
            </>
          ) : (
            <>
              <Box component="span" fontWeight={600} color="text.primary">
                {metricLabel}
              </Box>
              {' '}to reach {nextTier.name}
            </>
          )
        ) : (
          <>Almost there! Complete your next booking to level up.</>
        )}
      </Typography>
    </Box>
  );
};

export default VIPProgressBar;
