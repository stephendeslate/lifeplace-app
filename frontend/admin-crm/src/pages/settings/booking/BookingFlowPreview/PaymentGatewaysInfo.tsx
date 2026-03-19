import React from 'react';
import { Box, Typography, Alert, Chip, Stack } from '@mui/material';
import { Payment as PaymentIcon } from '@mui/icons-material';
import { ModernCard, ModernLoadingStates } from '@/components/common';

interface PaymentGateway {
  id: number;
  name: string;
}

interface PaymentGatewaysData {
  available_gateways: PaymentGateway[];
  default_gateway: number | null;
  require_immediate_payment: boolean;
}

interface PaymentGatewaysInfoProps {
  paymentGateways: PaymentGatewaysData | undefined;
  isLoading: boolean;
}

export const PaymentGatewaysInfo: React.FC<PaymentGatewaysInfoProps> = ({
  paymentGateways,
  isLoading,
}) => (
  <ModernCard sx={{ mt: 3 }}>
    <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
      <PaymentIcon color="primary" />
      Payment Configuration
    </Typography>

    {isLoading ? (
      <ModernLoadingStates.ModernListSkeleton />
    ) : paymentGateways ? (
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Available Gateways:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {paymentGateways.available_gateways.length} configured
          </Typography>
        </Box>

        {paymentGateways.available_gateways.length > 0 && (
          <Box display="flex" flexWrap="wrap" gap={1}>
            {paymentGateways.available_gateways.map((gateway) => (
              <Chip
                key={gateway.id}
                label={gateway.name}
                size="small"
                color={gateway.id === paymentGateways.default_gateway ? 'primary' : 'default'}
                variant={gateway.id === paymentGateways.default_gateway ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Default Gateway:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {paymentGateways.default_gateway
              ? paymentGateways.available_gateways.find(
                  (g) => g.id === paymentGateways.default_gateway,
                )?.name || 'Unknown'
              : 'None (user choice)'}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Immediate Payment:
          </Typography>
          <Chip
            label={paymentGateways.require_immediate_payment ? 'Required' : 'Optional'}
            size="small"
            color={paymentGateways.require_immediate_payment ? 'warning' : 'success'}
            variant="outlined"
          />
        </Box>
      </Stack>
    ) : (
      <Alert severity="info">No payment gateway configuration available for this flow.</Alert>
    )}
  </ModernCard>
);
