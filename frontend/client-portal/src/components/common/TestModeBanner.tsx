// frontend/client-portal/src/components/common/TestModeBanner.tsx

import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, alpha } from '@mui/material';
import {
  Science as TestIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const STORAGE_KEY = 'lifeplace_test_banner_dismissed';

/**
 * Detects if the app is running in test/sandbox mode.
 * Checks the Stripe publishable key prefix.
 */
export const isTestMode = (): boolean => {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

  // Stripe test keys start with pk_test_
  if (stripeKey.startsWith('pk_test_')) {
    return true;
  }

  // Could also check PayMongo test keys (pk_test_) in the future
  // or an explicit VITE_TEST_MODE env var

  return false;
};

/**
 * Banner displayed when the app is in test/sandbox mode.
 * Shows a prominent warning that payments are not real.
 * Can be dismissed and will show a small indicator to restore it.
 */
export const TestModeBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(() => {
    // Check sessionStorage on initial render
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });

  // Don't render anything if not in test mode
  if (!isTestMode()) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleRestore = () => {
    setIsDismissed(false);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  // Show minimized indicator when dismissed
  if (isDismissed) {
    return (
      <Tooltip title="Test Mode Active - Click to show banner" arrow>
        <IconButton
          onClick={handleRestore}
          sx={{
            position: 'fixed',
            top: 8,
            right: 8,
            zIndex: 9999,
            bgcolor: alpha('#FF9800', 0.9),
            color: 'white',
            width: 32,
            height: 32,
            '&:hover': {
              bgcolor: '#FF9800',
            },
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
          size="small"
        >
          <TestIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        bgcolor: alpha('#FF9800', 0.95),
        color: 'white',
        py: 0.75,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <TestIcon sx={{ fontSize: 18 }} />
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontSize: '0.8125rem',
          letterSpacing: '0.02em',
        }}
      >
        Test Mode — No real payments will be processed. All transactions are simulated.
      </Typography>
      <Tooltip title="Dismiss (reappears next session)" arrow>
        <IconButton
          onClick={handleDismiss}
          size="small"
          sx={{
            color: 'white',
            ml: 1,
            p: 0.5,
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.2)',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

/**
 * Hook to check if the app is in test mode.
 */
export const useTestMode = () => {
  return {
    isTestMode: isTestMode(),
  };
};

export default TestModeBanner;
