// frontend/client-portal/src/components/payments/UnifiedStripePaymentFlow/PaymentLoadingStates.tsx

import React from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';

interface IntentLoadingProps {
  message?: string;
}

export const IntentLoading: React.FC<IntentLoadingProps> = ({
  message = 'Initializing payment form...',
}) => (
  <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 4 }}>
    <CircularProgress size={24} />
    <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
      {message}
    </Typography>
  </Box>
);

interface IntentErrorProps {
  message: string;
}

export const IntentError: React.FC<IntentErrorProps> = ({ message }) => (
  <Alert severity="error" sx={{ my: 2 }}>
    <Typography variant="body2">{message}</Typography>
  </Alert>
);

export const StripeLoading: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 4 }}>
    <CircularProgress size={24} />
    <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
      Loading payment system...
    </Typography>
  </Box>
);
