// frontend/admin-crm/src/components/payments/PaymentGatewayFormDialog/QuickSetupSection.tsx

import React from 'react';
import { Box, Typography, Stack, Button, Alert } from '@mui/material';
import { CreditCard as StripeIcon, Payment as PayMongoIcon } from '@mui/icons-material';
import { tokens } from '@/design-system/tokens';

interface QuickSetupSectionProps {
  onSetupGateway: (gatewayType: 'stripe' | 'paymongo') => void;
}

export const QuickSetupSection: React.FC<QuickSetupSectionProps> = ({ onSetupGateway }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="subtitle2" gutterBottom>
      Quick Setup
    </Typography>
    <Stack direction="row" spacing={2}>
      <Button
        variant="outlined"
        startIcon={<StripeIcon />}
        onClick={() => onSetupGateway('stripe')}
        size="small"
      >
        Setup Stripe
      </Button>
      <Button
        variant="outlined"
        startIcon={<PayMongoIcon />}
        onClick={() => onSetupGateway('paymongo')}
        size="small"
      >
        Setup PayMongo
      </Button>
    </Stack>

    <Alert
      severity="info"
      sx={{
        mt: 2,
        backdropFilter: 'blur(10px)',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: tokens.spacing.radius.lg,
        border: `1px solid ${tokens.color.borders.glass}`,
      }}
    >
      <strong>Recommendation:</strong> Start with Stripe for immediate development, then add
      PayMongo for Philippine-specific payment methods.
    </Alert>
  </Box>
);
