// frontend/admin-crm/src/components/common/LoadingOverlay.tsx
// Reusable loading overlay component
// Replaces 5+ identical loading overlay patterns

import React from 'react';
import { Box, CircularProgress, Typography, type SxProps, type Theme } from '@mui/material';
import { tokens } from '../../design-system';

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Optional loading message */
  message?: string;
  /** Size of the loading spinner */
  size?: 'small' | 'medium' | 'large';
  /** Additional sx props */
  sx?: SxProps<Theme>;
}

const sizeMap = {
  small: 24,
  medium: 40,
  large: 56,
};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  size = 'medium',
  sx,
}) => {
  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: tokens.color.glass.light,
        backdropFilter: 'blur(4px)',
        zIndex: 10,
        borderRadius: 'inherit',
        ...sx,
      }}
    >
      <CircularProgress size={sizeMap[size]} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};

/**
 * Full-page loading overlay
 */
export const FullPageLoadingOverlay: React.FC<Omit<LoadingOverlayProps, 'sx'>> = (props) => (
  <LoadingOverlay
    {...props}
    sx={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      bgcolor: tokens.color.glass.medium,
    }}
  />
);

export default LoadingOverlay;
