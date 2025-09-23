// frontend/client-portal/src/components/payments/StripePaymentForm.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Lock as SecurityIcon,
  CreditCard as CardIcon,
} from '@mui/icons-material';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { GlassCard } from '../../design-system';
import FinancialApi from '../../apis/financial.api';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface StripePaymentFormProps {
  amount: number;
  currency: string;
  invoiceId: number;
  onPaymentSuccess: (paymentIntentId: string) => void;
  disabled?: boolean;
}

const CardElementForm: React.FC<StripePaymentFormProps> = ({
  amount,
  currency,
  invoiceId,
  onPaymentSuccess,
  disabled = false,
}) => {
  const theme = useTheme();
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await FinancialApi.createInvoicePaymentIntent(invoiceId, 'stripe');
        setPaymentIntent(response.client_secret);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to initialize payment');
      }
    };

    createPaymentIntent();
  }, [invoiceId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !paymentIntent) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card information not found. Please refresh and try again.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent: confirmedPaymentIntent } = await stripe.confirmCardPayment(
        paymentIntent,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
      } else if (confirmedPaymentIntent && confirmedPaymentIntent.status === 'succeeded') {
        onPaymentSuccess(confirmedPaymentIntent.id);
      } else {
        setError('Payment was not completed. Please try again.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
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
    },
    hidePostalCode: false,
  };

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  return (
    <GlassCard variant="light" intensity="subtle">
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={2}>
            <CardIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Card Payment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pay {FinancialApi.formatAmount(amount, currency)} securely with your card
              </Typography>
            </Box>
          </Stack>

          {/* Payment Form */}
          <form onSubmit={handleSubmit}>
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
                <CardElement
                  options={cardElementOptions}
                  onChange={handleCardChange}
                />
              </Box>

              {/* Security Notice */}
              <Stack direction="row" alignItems="center" spacing={1}>
                <SecurityIcon fontSize="small" color="success" />
                <Typography variant="caption" color="text.secondary">
                  Your payment information is encrypted and secure
                </Typography>
              </Stack>

              {/* Error Display */}
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={
                  disabled ||
                  processing ||
                  !stripe ||
                  !paymentIntent ||
                  !cardComplete
                }
                startIcon={processing && <CircularProgress size={20} />}
                sx={{
                  py: 1.5,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                  },
                }}
              >
                {processing
                  ? 'Processing Payment...'
                  : `Pay ${FinancialApi.formatAmount(amount, currency)}`
                }
              </Button>

              {/* Powered by Stripe */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Powered by{' '}
                  <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    Stripe
                  </Box>
                </Typography>
              </Box>
            </Stack>
          </form>
        </Stack>
      </Box>
    </GlassCard>
  );
};

export const StripePaymentForm: React.FC<StripePaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <CardElementForm {...props} />
    </Elements>
  );
};

export default StripePaymentForm;