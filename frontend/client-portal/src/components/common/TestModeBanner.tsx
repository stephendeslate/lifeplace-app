// frontend/client-portal/src/components/common/TestModeBanner.tsx

import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { Science as TestIcon } from '@mui/icons-material';

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
 */
export const TestModeBanner: React.FC = () => {
  if (!isTestMode()) {
    return null;
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
