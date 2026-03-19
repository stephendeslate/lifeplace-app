// frontend/client-portal/src/components/payments/UnifiedStripePaymentFlow/PaymentFormContent.tsx

import React from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import { Lock as SecurityIcon, CreditCard as CardIcon } from '@mui/icons-material';
import { CardElement } from '@stripe/react-stripe-js';
import type { StripeCardElementChangeEvent } from '@stripe/stripe-js';
import { GlassCard } from '@/design-system';
import type { CardElementState } from '@/types/unified-payment-flow.types';

interface ModeUiConfig {
  title: string;
  description: string;
  submitText: string;
  processingText: string;
  icon: 'card';
}

interface PaymentFormContentProps {
  modeConfig: ModeUiConfig;
  amountText: string | null;
  processing: boolean;
  error: string | null;
  cardState: CardElementState;
  stripeReady: boolean;
  disabled: boolean;
  loading: boolean;
  showSecurityBadge: boolean;
  showPoweredByStripe: boolean;
  onCancel?: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onCardChange: (event: StripeCardElementChangeEvent) => void;
  cardElementOptions?: {
    style?: Record<string, unknown>;
    hidePostalCode?: boolean;
    iconStyle?: 'default' | 'solid';
    disabled?: boolean;
  };
}

const ICON_MAP = {
  card: CardIcon,
} as const;

export const PaymentFormContent: React.FC<PaymentFormContentProps> = ({
  modeConfig,
  amountText,
  processing,
  error,
  cardState,
  stripeReady,
  disabled,
  loading,
  showSecurityBadge,
  showPoweredByStripe,
  onCancel,
  onSubmit,
  onCardChange,
  cardElementOptions,
}) => {
  const theme = useTheme();

  const IconComponent = ICON_MAP[modeConfig.icon];

  const cardElementStyles = {
    style: {
      base: {
        fontSize: '16px',
        color: theme.palette.text.primary,
        fontFamily: theme.typography.fontFamily,
        '::placeholder': {
          color: theme.palette.text.secondary,
        },
        backgroundColor: 'transparent',
      },
      invalid: {
        color: theme.palette.error.main,
        iconColor: theme.palette.error.main,
      },
      ...cardElementOptions?.style,
    },
    hidePostalCode: cardElementOptions?.hidePostalCode ?? false,
    iconStyle: cardElementOptions?.iconStyle ?? 'default',
    disabled: cardElementOptions?.disabled ?? (disabled || processing),
  };

  return (
    <GlassCard variant="light" intensity="subtle">
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconComponent color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {modeConfig.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {amountText ? `${modeConfig.description} - ${amountText}` : modeConfig.description}
              </Typography>
            </Box>
          </Stack>

          {/* Payment Form */}
          <form onSubmit={onSubmit}>
            <Stack spacing={3}>
              {/* Card Input */}
              <Box
                sx={{
                  p: 2,
                  border: `1px solid ${alpha('#fff', 0.2)}`,
                  borderRadius: 1,
                  backgroundColor: alpha('#fff', 0.05),
                  '&:focus-within': {
                    borderColor: theme.palette.primary.main,
                  },
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Card Information
                </Typography>
                <CardElement options={cardElementStyles} onChange={onCardChange} />
              </Box>

              {/* Card State Feedback */}
              {cardState.error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {cardState.error.message}
                </Alert>
              )}

              {/* Security Notice */}
              {showSecurityBadge && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <SecurityIcon fontSize="small" color="success" />
                  <Typography variant="caption" color="text.secondary">
                    Your payment information is encrypted and secure
                  </Typography>
                </Stack>
              )}

              {/* Error Display */}
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Action Buttons */}
              <Stack direction="row" spacing={2}>
                {onCancel && (
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={processing}
                    sx={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth={!onCancel}
                  disabled={
                    disabled ||
                    loading ||
                    processing ||
                    !stripeReady ||
                    !cardState.complete ||
                    !!cardState.error
                  }
                  startIcon={processing && <CircularProgress size={20} />}
                  sx={{
                    flex: onCancel ? 2 : 1,
                    py: 1.5,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    },
                  }}
                >
                  {processing ? modeConfig.processingText : modeConfig.submitText}
                </Button>
              </Stack>

              {/* Powered by Stripe */}
              {showPoweredByStripe && (
                <>
                  <Divider sx={{ opacity: 0.3 }} />
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Powered by{' '}
                      <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Stripe
                      </Box>
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          </form>
        </Stack>
      </Box>
    </GlassCard>
  );
};
