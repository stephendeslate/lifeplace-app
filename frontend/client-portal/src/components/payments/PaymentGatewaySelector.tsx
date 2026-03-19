// frontend/client-portal/src/components/payments/PaymentGatewaySelector.tsx

import React, { useEffect, useMemo } from 'react';
import {
  Box,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Security as SecurityIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { GlassCard } from '../../design-system';
import FinancialApi from '../../apis/financial.api';
import type { PaymentGateway } from '../../types/financial';

interface PaymentGatewaySelectorProps {
  selectedGateway: PaymentGateway | null;
  onGatewaySelect: (gateway: PaymentGateway | null) => void;
  disabled?: boolean;
  showTitle?: boolean;
  required?: boolean;
  allowedGateways?: string[]; // Array of gateway codes to filter by
  flowId?: number; // Optional booking flow ID for client-accessible gateway endpoint
}

const PaymentGatewayIcon: React.FC<{ gateway: PaymentGateway }> = ({ gateway }) => {
  // Use different icons based on gateway code
  switch (gateway.code.toLowerCase()) {
    case 'stripe':
      return <PaymentIcon />;
    case 'paypal':
      return <PaymentIcon />;
    default:
      return <SecurityIcon />;
  }
};

export const PaymentGatewaySelector: React.FC<PaymentGatewaySelectorProps> = ({
  selectedGateway,
  onGatewaySelect,
  disabled = false,
  showTitle = true,
  required = false,
  allowedGateways,
  flowId,
}) => {
  const theme = useTheme();

  const {
    data: gateways,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['paymentGateways', flowId],
    queryFn: () => FinancialApi.getActivePaymentGateways(flowId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Only retry once for auth errors
      const errorObj = error as { response?: { status?: number } };
      if (errorObj.response?.status === 403 || errorObj.response?.status === 401) {
        return failureCount < 1;
      }
      return failureCount < 3;
    },
  });

  // Filter gateways by allowed codes with defensive programming - memoize to stabilize reference
  const filteredGateways = useMemo(
    () =>
      Array.isArray(gateways)
        ? gateways.filter(
            (gateway) =>
              gateway.is_active && (!allowedGateways || allowedGateways.includes(gateway.code)),
          )
        : [],
    [gateways, allowedGateways],
  );

  // Auto-select single gateway when available
  useEffect(() => {
    if (filteredGateways.length === 1 && !selectedGateway) {
      onGatewaySelect(filteredGateways[0]);
    }
  }, [filteredGateways, selectedGateway, onGatewaySelect]);

  const handleGatewayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const gatewayId = parseInt(event.target.value);
    const gateway = filteredGateways.find((g) => g.id === gatewayId) || null;
    onGatewaySelect(gateway);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Loading payment gateways...
        </Typography>
      </Box>
    );
  }

  if (error) {
    const errorObj = error as { response?: { status?: number } };
    const isAuthError = errorObj.response?.status === 403 || errorObj.response?.status === 401;

    return (
      <Alert severity={isAuthError ? 'info' : 'error'} icon={<ErrorIcon />} sx={{ mb: 2 }}>
        {isAuthError
          ? 'Payment gateway information is not available. Please contact support if you need to select a specific gateway.'
          : 'Failed to load payment gateways. Please try again.'}
      </Alert>
    );
  }

  if (!filteredGateways.length) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        No payment gateways are currently available. Please contact support.
      </Alert>
    );
  }

  return (
    <Box>
      {showTitle && (
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Payment Gateway{required && ' *'}
        </Typography>
      )}

      <GlassCard variant="light" intensity="subtle">
        <Box sx={{ p: 3 }}>
          {filteredGateways.length === 1 ? (
            // Single gateway - show as selected info
            <Box
              sx={{
                p: 2,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                borderRadius: 1,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <PaymentGatewayIcon gateway={filteredGateways[0]} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {filteredGateways[0].name}
                  </Typography>
                  {filteredGateways[0].description && (
                    <Typography variant="body2" color="text.secondary">
                      {filteredGateways[0].description}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>
          ) : (
            // Multiple gateways - show radio selection
            <FormControl component="fieldset" fullWidth disabled={disabled}>
              <RadioGroup value={selectedGateway?.id || ''} onChange={handleGatewayChange}>
                <Stack spacing={2}>
                  {filteredGateways.map((gateway) => (
                    <Box key={gateway.id}>
                      <FormControlLabel
                        value={gateway.id}
                        control={<Radio />}
                        label={
                          <Box sx={{ ml: 1, flex: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <PaymentGatewayIcon gateway={gateway} />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {gateway.name}
                                </Typography>
                                {gateway.description && (
                                  <Typography variant="body2" color="text.secondary">
                                    {gateway.description}
                                  </Typography>
                                )}
                                <Typography variant="caption" color="text.secondary">
                                  Gateway: {gateway.code.toUpperCase()}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        }
                        sx={{
                          m: 0,
                          p: 2,
                          border: `1px solid ${alpha('#fff', 0.1)}`,
                          borderRadius: 1,
                          backgroundColor:
                            selectedGateway?.id === gateway.id
                              ? alpha(theme.palette.primary.main, 0.1)
                              : 'transparent',
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.05),
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </RadioGroup>
            </FormControl>
          )}

          {!filteredGateways.length && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No payment gateways available
            </Typography>
          )}
        </Box>
      </GlassCard>
    </Box>
  );
};

export default PaymentGatewaySelector;
