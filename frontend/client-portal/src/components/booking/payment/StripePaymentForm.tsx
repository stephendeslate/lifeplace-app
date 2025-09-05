// frontend/client-portal/src/components/booking/payment/StripePaymentForm.tsx

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';

interface StripePaymentFormProps {
  publishableKey: string;
  amount: number; // Amount in cents
  currency: string;
  onPaymentSuccess: (paymentMethodId: string) => void;
  onPaymentError: (error: string) => void;
  isProcessing?: boolean;
}

// Inner form component that uses Stripe hooks
const PaymentForm: React.FC<{
  amount: number;
  currency: string;
  onPaymentSuccess: (paymentMethodId: string) => void;
  onPaymentError: (error: string) => void;
  isProcessing?: boolean;
}> = ({ amount, currency, onPaymentSuccess, onPaymentError, isProcessing }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setCardError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setCardError('Card element not found');
      setProcessing(false);
      return;
    }

    try {
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        setCardError(error.message || 'An error occurred');
        setProcessing(false);
        onPaymentError(error.message || 'Payment failed');
        return;
      }

      // Payment method created successfully
      onPaymentSuccess(paymentMethod.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setCardError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Payment Details
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Total: {new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: currency.toUpperCase(),
          }).format(amount / 100)}
        </Typography>

        <Box sx={{ mt: 2, mb: 2 }}>
          <CardElement options={cardElementOptions} />
        </Box>

        {cardError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {cardError}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={!stripe || processing || isProcessing}
          startIcon={processing && <CircularProgress size={20} />}
        >
          {processing ? 'Processing...' : `Pay ${new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: currency.toUpperCase(),
          }).format(amount / 100)}`}
        </Button>
      </Paper>
    </Box>
  );
};

// Main component that sets up Stripe Elements
export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  publishableKey,
  amount,
  currency,
  onPaymentSuccess,
  onPaymentError,
  isProcessing,
}) => {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  useEffect(() => {
    if (publishableKey) {
      setStripePromise(loadStripe(publishableKey));
    }
  }, [publishableKey]);

  const options: StripeElementsOptions = {
    mode: 'payment',
    amount: amount,
    currency: currency.toLowerCase(),
    appearance: {
      theme: 'stripe',
    },
  };

  if (!stripePromise) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        amount={amount}
        currency={currency}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        isProcessing={isProcessing}
      />
    </Elements>
  );
};