// frontend/admin-crm/src/components/payments/PaymentGatewayFormDialog/ConfigurationStatusAlert.tsx

import React from 'react';
import { Box, Alert } from '@mui/material';
import type { PaymentGateway } from '@/types/payments';
import { tokens } from '@/design-system/tokens';

interface ConfigurationStatusAlertProps {
  gateway: PaymentGateway;
}

export const ConfigurationStatusAlert: React.FC<ConfigurationStatusAlertProps> = ({ gateway }) => {
  const isConfigured = gateway.masked_config?._configured;

  return (
    <Box sx={{ mb: 3 }}>
      <Alert
        severity={isConfigured ? 'success' : 'warning'}
        sx={{
          backdropFilter: 'blur(10px)',
          background: isConfigured ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
          borderRadius: tokens.spacing.radius.lg,
          border: `1px solid ${
            isConfigured ? tokens.color.success[500] : tokens.color.warning[500]
          }25`,
        }}
      >
        <strong>{isConfigured ? '✅ Gateway Configured' : '⚠️ Configuration Incomplete'}</strong>
        <br />
        {isConfigured
          ? 'This gateway has all required API keys configured. Leave fields empty to keep existing values.'
          : 'This gateway is missing required configuration. Please provide the necessary API keys.'}
      </Alert>
    </Box>
  );
};
