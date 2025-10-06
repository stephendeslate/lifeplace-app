// frontend/client-portal/src/components/payments/GatewayPaymentRenderer.tsx

import React, { useState, useCallback, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Lock as SecurityIcon,
  CreditCard as CardIcon,
  SwapHoriz as SwitchIcon,
} from '@mui/icons-material';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { GlassCard } from '../../design-system';
import { PaymentFlowManager, type PaymentConfig, type PaymentSession, type PaymentResult, type PaymentError } from '../../services/PaymentFlowManager';

// ===========================
// Types and Interfaces
// ===========================

export interface GatewayPaymentRendererProps {
  config: PaymentConfig;
  onSuccess: (result: PaymentResult) => void;
  onError: (error: PaymentError) => void;
  onCancel?: () => void;
  disabled?: boolean;
  allowGatewaySwitching?: boolean;
}

interface GatewayConfig {
  code: string;
  name: string;
  isHealthy: boolean;
  supportedFeatures: string[];
}

interface PaymentState {
  session: PaymentSession | null;
  isProcessing: boolean;
  error: PaymentError | null;
  availableGateways: GatewayConfig[];
  selectedGateway: string | null;
  retryCount: number;
}

// ===========================
// Gateway-Specific Components
// ===========================

/**
 * Stripe payment component
 */
interface StripePaymentFormProps {
  session: PaymentSession;
  onSubmit: (paymentData: unknown) => void;
  isProcessing: boolean;
  error?: PaymentError;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  session,
  onSubmit,
  isProcessing,
  error
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const theme = useTheme();
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    const paymentData = {
      payment_method: {
        card: cardElement,
        billing_details: {
          // Add billing details if needed
        }
      }
    };

    onSubmit(paymentData);
  }, [stripe, elements, onSubmit]);

  const handleCardChange = useCallback((event: { error?: { message: string }; complete: boolean }) => {
    setCardError(event.error ? event.error.message : null);
    setCardComplete(event.complete);
  }, []);

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: theme.palette.text.primary,
        '::placeholder': {
          color: theme.palette.text.secondary,
        },
      },
      invalid: {
        color: theme.palette.error.main,
      },
    },
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {/* Card Element */}
        <Box
          sx={{
            padding: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
          }}
        >
          <CardElement
            options={cardElementOptions}
            onChange={handleCardChange}
          />
        </Box>

        {/* Card Error */}
        {cardError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {cardError}
          </Alert>
        )}

        {/* Payment Error */}
        {error && (
          <Alert severity="error">
            {error.message}
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!stripe || !cardComplete || isProcessing}
          startIcon={isProcessing ? <CircularProgress size={20} /> : <CardIcon />}
          sx={{
            height: 50,
            fontSize: '1.1rem',
            fontWeight: 600,
          }}
        >
          {isProcessing ? 'Processing...' : `Pay ${session.config.amount ? `${session.config.currency || 'PHP'} ${session.config.amount}` : ''}`}
        </Button>

        {/* Security Notice */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            color: theme.palette.text.secondary,
            fontSize: '0.875rem',
          }}
        >
          <SecurityIcon fontSize="small" />
          <Typography variant="caption">
            Your payment is secured with 256-bit SSL encryption
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

/**
 * PayPal payment component (placeholder)
 */
interface PayPalPaymentFormProps {
  session: PaymentSession;
  onSubmit: (paymentData: unknown) => void;
  isProcessing: boolean;
  error?: PaymentError;
}

const PayPalPaymentForm: React.FC<PayPalPaymentFormProps> = () => {
  return (
    <Box>
      <Alert severity="info">
        PayPal integration coming soon
      </Alert>
      <Button
        variant="contained"
        disabled
        sx={{ mt: 2, width: '100%' }}
      >
        PayPal Not Available
      </Button>
    </Box>
  );
};

/**
 * Generic payment form for unknown gateways
 */
interface GenericPaymentFormProps {
  session: PaymentSession;
  onSubmit: (paymentData: unknown) => void;
  isProcessing: boolean;
  error?: PaymentError;
}

const GenericPaymentForm: React.FC<GenericPaymentFormProps> = ({
  session
}) => {
  return (
    <Box>
      <Alert severity="warning">
        Payment gateway {session.gatewayCode} is not yet supported
      </Alert>
      <Button
        variant="contained"
        disabled
        sx={{ mt: 2, width: '100%' }}
      >
        Gateway Not Available
      </Button>
    </Box>
  );
};

// ===========================
// Main Gateway Payment Renderer
// ===========================

/**
 * Gateway Payment Renderer
 *
 * Phase 3 enhancement that provides unified payment component
 * with multi-gateway support and automatic failover capabilities.
 */
export const GatewayPaymentRenderer: React.FC<GatewayPaymentRendererProps> = ({
  config,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  allowGatewaySwitching = true
}) => {
  const theme = useTheme();
  const [state, setState] = useState<PaymentState>({
    session: null,
    isProcessing: false,
    error: null,
    availableGateways: [],
    selectedGateway: null,
    retryCount: 0
  });

  const paymentManager = useMemo(() => PaymentFlowManager.getInstance(), []);

  // Initialize payment session
  const initializeSession = useCallback(async (gatewayCode?: string) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      const sessionConfig = { ...config };
      if (gatewayCode) {
        sessionConfig.gatewayCode = gatewayCode;
      }

      const session = await paymentManager.initializePayment(sessionConfig);
      const gateways = await paymentManager.getAvailableGateways();

      setState(prev => ({
        ...prev,
        session,
        availableGateways: gateways,
        selectedGateway: session.gatewayCode,
        isProcessing: false,
        error: null
      }));

    } catch (error) {
      console.error('❌ Failed to initialize session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
      const paymentError = {
        code: 'initialization_failed',
        message: errorMessage
      };
      setState(prev => ({ ...prev, error: paymentError, isProcessing: false }));
      onError(paymentError);
    }
  }, [config, paymentManager, onError]);

  // Initialize on mount
  React.useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Handle payment submission
  const handlePaymentSubmit = useCallback(async (paymentData: unknown) => {
    if (!state.session || disabled) return;

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      const result = await paymentManager.processPayment(state.session, paymentData);

      if (result.success) {
        setState(prev => ({ ...prev, isProcessing: false, error: null }));
        onSuccess(result);
      } else {
        setState(prev => ({ ...prev, error: result.error ?? null, isProcessing: false }));
        if (result.error) {
          onError(result.error);
        }
      }

    } catch (error) {
      console.error('❌ Payment processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      const paymentError = {
        code: 'processing_failed',
        message: errorMessage
      };
      setState(prev => ({ ...prev, error: paymentError, isProcessing: false }));
      onError(paymentError);
    }
  }, [state.session, disabled, paymentManager, onSuccess, onError]);

  // Handle gateway switch
  const handleGatewaySwitch = useCallback(async (newGatewayCode: string) => {
    if (newGatewayCode === state.selectedGateway) return;

    await initializeSession(newGatewayCode);
  }, [state.selectedGateway, initializeSession]);

  // Handle retry
  const handleRetry = useCallback(async (useAlternativeGateway = false) => {
    if (!state.session) return;

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null, retryCount: prev.retryCount + 1 }));

      const result = await paymentManager.retryPayment(state.session, useAlternativeGateway);

      if (result.success) {
        setState(prev => ({ ...prev, isProcessing: false, error: null }));
        onSuccess(result);
      } else {
        setState(prev => ({ ...prev, error: result.error ?? null, isProcessing: false }));
        if (result.error) {
          onError(result.error);
        }
      }

    } catch (error) {
      console.error('❌ Payment retry failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment retry failed';
      const paymentError = {
        code: 'retry_failed',
        message: errorMessage
      };
      setState(prev => ({ ...prev, error: paymentError, isProcessing: false }));
      onError(paymentError);
    }
  }, [state.session, paymentManager, onSuccess, onError]);

  // Render gateway selection
  const renderGatewaySelection = () => {
    if (!allowGatewaySwitching || state.availableGateways.length <= 1) {
      return null;
    }

    return (
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Payment Method</InputLabel>
        <Select
          value={state.selectedGateway || ''}
          label="Payment Method"
          onChange={(e) => handleGatewaySwitch(e.target.value)}
          disabled={state.isProcessing}
          startAdornment={<SwitchIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />}
        >
          {state.availableGateways.map((gateway) => (
            <MenuItem
              key={gateway.code}
              value={gateway.code}
              disabled={!gateway.isHealthy}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>{gateway.name}</Typography>
                {!gateway.isHealthy && (
                  <Typography variant="caption" color="error">
                    (Unavailable)
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  // Render payment form based on gateway
  const renderPaymentForm = () => {
    if (!state.session) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    const commonProps = {
      session: state.session,
      onSubmit: handlePaymentSubmit,
      isProcessing: state.isProcessing,
      error: state.error || undefined
    };

    switch (state.session.gatewayCode) {
      case 'stripe':
        return <StripePaymentForm {...commonProps} />;
      case 'paypal':
        return <PayPalPaymentForm {...commonProps} />;
      default:
        return <GenericPaymentForm {...commonProps} />;
    }
  };

  // Render retry options
  const renderRetryOptions = () => {
    if (!state.error || state.retryCount >= 3) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="outlined"
            onClick={() => handleRetry(false)}
            disabled={state.isProcessing}
            size="small"
          >
            Try Again
          </Button>
          {state.availableGateways.length > 1 && (
            <Button
              variant="outlined"
              onClick={() => handleRetry(true)}
              disabled={state.isProcessing}
              size="small"
              startIcon={<SwitchIcon />}
            >
              Try Alternative Method
            </Button>
          )}
        </Stack>
      </Box>
    );
  };

  return (
    <GlassCard
      sx={{
        maxWidth: 500,
        mx: 'auto',
        p: 3,
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Complete Payment
          </Typography>
          {config.amount && (
            <Typography variant="h4" color="primary" fontWeight="bold">
              {config.currency || 'PHP'} {config.amount}
            </Typography>
          )}
        </Box>

        <Divider />

        {/* Gateway Selection */}
        {renderGatewaySelection()}

        {/* Payment Form */}
        {renderPaymentForm()}

        {/* Retry Options */}
        {renderRetryOptions()}

        {/* Cancel Button */}
        {onCancel && (
          <Button
            variant="text"
            onClick={onCancel}
            disabled={state.isProcessing}
            sx={{ mt: 2 }}
          >
            Cancel
          </Button>
        )}
      </Stack>
    </GlassCard>
  );
};

/**
 * Wrapper component that provides Stripe Elements context when needed
 */
export const GatewayPaymentRendererWithContext: React.FC<GatewayPaymentRendererProps> = (props) => {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [needsStripeContext, setNeedsStripeContext] = useState(false);

  // Check if we need Stripe context
  React.useEffect(() => {
    const checkStripeNeeded = async () => {
      try {
        const manager = PaymentFlowManager.getInstance();
        const gateways = await manager.getAvailableGateways();
        const hasStripe = gateways.some(g => g.code === 'stripe' && g.isHealthy);

        if (hasStripe) {
          const { loadStripe } = await import('@stripe/stripe-js');
          const stripeKey = gateways.find(g => g.code === 'stripe')?.publishableKey;

          if (stripeKey) {
            setStripePromise(loadStripe(stripeKey));
            setNeedsStripeContext(true);
          }
        }
      } catch (error) {
        console.error('Failed to setup Stripe context:', error);
      }
    };

    checkStripeNeeded();
  }, []);

  if (needsStripeContext && stripePromise) {
    return (
      <Elements stripe={stripePromise}>
        <GatewayPaymentRenderer {...props} />
      </Elements>
    );
  }

  return <GatewayPaymentRenderer {...props} />;
};

export default GatewayPaymentRendererWithContext;