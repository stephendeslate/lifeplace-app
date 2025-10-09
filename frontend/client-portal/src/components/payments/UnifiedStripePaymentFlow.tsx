// frontend/client-portal/src/components/payments/UnifiedStripePaymentFlow.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { loadStripe, type Stripe, type StripeCardElement, type StripeCardElementChangeEvent } from '@stripe/stripe-js';
import { GlassCard } from '../../design-system';
import FinancialApi from '../../apis/financial.api';
import type {
  UnifiedStripePaymentFlowProps,
  PaymentFlowResult,
  PaymentFlowError,
  PaymentModeConfig,
  BookingModeConfig,
  SaveModeConfig,
  InvoiceModeConfig,
  CardElementState,
  Payment,
  Invoice,
} from '../../types/unified-payment-flow.types';
import {
  isBookingMode,
  isSaveMode,
  isInvoiceMode,
} from '../../types/unified-payment-flow.types';

// ===========================
// Mode Configuration Helpers
// ===========================

/**
 * Get mode-specific configuration for UI and behavior
 */
const getModeConfig = (mode: PaymentModeConfig['mode'], isAuthenticated?: boolean) => {
  switch (mode) {
    case 'booking':
      // Different text for authenticated vs guest users
      if (isAuthenticated) {
        return {
          title: 'Booking Payment',
          description: 'Complete your booking with secure payment',
          submitText: 'Save Payment Method',
          processingText: 'Saving Payment Method...',
          icon: CardIcon,
        };
      } else {
        return {
          title: 'Booking Payment',
          description: 'Complete your booking with secure payment',
          submitText: 'Continue with Card',
          processingText: 'Validating Card...',
          icon: CardIcon,
        };
      }
    case 'save':
      return {
        title: 'Save Payment Method',
        description: 'Securely save your card for future payments',
        submitText: 'Save Card',
        processingText: 'Saving Card...',
        icon: CardIcon,
      };
    case 'invoice':
      return {
        title: 'Invoice Payment',
        description: 'Pay your invoice securely',
        submitText: 'Pay Invoice',
        processingText: 'Processing Payment...',
        icon: CardIcon,
      };
    default:
      return {
        title: 'Payment',
        description: 'Complete your payment securely',
        submitText: 'Pay Now',
        processingText: 'Processing...',
        icon: CardIcon,
      };
  }
};

/**
 * Get amount display text for the mode
 */
const getAmountText = (config: PaymentModeConfig): string | null => {
  if (isBookingMode(config)) {
    return FinancialApi.formatAmount(config.total_amount, config.currency);
  }
  if (isInvoiceMode(config)) {
    return FinancialApi.formatAmount(config.amount, config.currency);
  }
  return null; // Save mode has no amount
};

// ===========================
// Inner Component with Stripe Context
// ===========================

interface PaymentFlowInnerProps extends Omit<UnifiedStripePaymentFlowProps, 'gateway'> {
  publishableKey: string;
}

const PaymentFlowInner: React.FC<PaymentFlowInnerProps> = ({
  config,
  onSuccess,
  onError,
  onCancel,
  isAuthenticated = false,
  disabled = false,
  loading = false,
  showSecurityBadge = true,
  showPoweredByStripe = true,
  cardElementOptions,
  debugMode = false,
}) => {
  const theme = useTheme();
  const stripe = useStripe();
  const elements = useElements();

  // Component state
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardState, setCardState] = useState<CardElementState>({
    complete: false,
    empty: true,
  });

  // Intent state (for setup or payment intents)
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(true);
  const [intentError, setIntentError] = useState<string | null>(null);

  // Get mode configuration with authentication context
  const modeConfig = getModeConfig(config.mode, isAuthenticated);
  const amountText = getAmountText(config);

  // Extract config properties to stabilize dependencies
  const configMode = config.mode;
  const configInvoiceId = isInvoiceMode(config) ? config.invoice_id : null;

  // Initialize intent (setup intent for save mode, payment intent for others)
  useEffect(() => {
    const initializeIntent = async () => {
      try {
        setIntentLoading(true);
        setIntentError(null);

        if (debugMode) {
          console.log('UnifiedStripePaymentFlow - Initializing intent for mode:', config.mode);
        }

        if (isSaveMode(config)) {
          // Create setup intent for save mode
          const response = await FinancialApi.createStripeSetupIntent();
          setClientSecret(response.client_secret);

          if (debugMode) {
            console.log('UnifiedStripePaymentFlow - Setup intent created:', response);
          }
        } else if (isInvoiceMode(config)) {
          // Create payment intent for invoice mode
          // CRITICAL FIX: Add debouncing to prevent rapid successive API calls
          const response = await FinancialApi.createInvoicePaymentIntent(
            config.invoice_id,
            'stripe'
          );
          setClientSecret(response.client_secret);

          if (debugMode) {
            console.log('UnifiedStripePaymentFlow - Payment intent created for invoice:', config.invoice_id);
          }
        } else if (isBookingMode(config)) {
          // For booking mode, we might create payment intent if required
          // For now, we'll handle this in the payment processing step
          // This could be extended to create payment intent upfront if needed
          if (debugMode) {
            console.log('UnifiedStripePaymentFlow - Booking mode initialized, will create payment method');
          }
          setClientSecret('booking-mode'); // Placeholder to indicate ready
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
        setIntentError(errorMessage);

        if (debugMode) {
          console.error('UnifiedStripePaymentFlow - Intent initialization failed:', error);
        }
      } finally {
        setIntentLoading(false);
      }
    };

    // CRITICAL FIX: Add abort controller and debouncing to prevent duplicate calls
    const abortController = new AbortController();

    // Debounce the initialization to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      if (!abortController.signal.aborted) {
        initializeIntent();
      }
    }, 100); // 100ms debounce

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [config, configMode, configInvoiceId, debugMode]);

  // Handle card element changes
  const handleCardChange = useCallback((event: StripeCardElementChangeEvent) => {
    setCardState({
      complete: event.complete,
      empty: event.empty,
      error: event.error ? {
        code: event.error.code,
        message: event.error.message,
        type: event.error.type,
      } : undefined,
      brand: event.brand,
      last4: event.complete ? undefined : undefined, // Will be available after successful processing
    });

    // Clear error when user starts typing
    if (event.complete && error) {
      setError(null);
    }
  }, [error]);

  // Main payment processing function
  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      const errorResult: PaymentFlowError = {
        type: 'stripe',
        message: 'Payment system not ready. Please try again.',
      };
      onError(errorResult);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      const errorResult: PaymentFlowError = {
        type: 'stripe',
        message: 'Card information not found. Please refresh and try again.',
      };
      onError(errorResult);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      if (debugMode) {
        console.log('UnifiedStripePaymentFlow - Processing payment for mode:', config.mode);
      }

      if (isSaveMode(config)) {
        await processSaveMode(stripe, cardElement, config);
      } else if (isInvoiceMode(config)) {
        await processInvoiceMode(stripe, cardElement, config);
      } else if (isBookingMode(config)) {
        await processBookingMode(stripe, cardElement, config, isAuthenticated);
      }

    } catch (error) {
      if (debugMode) {
        console.error('UnifiedStripePaymentFlow - Payment processing failed:', error);
      }

      // Error is handled in individual process functions
    } finally {
      setProcessing(false);
    }
  };

  // Process save payment method mode
  const processSaveMode = async (
    stripe: Stripe,
    cardElement: StripeCardElement,
    config: SaveModeConfig
  ) => {
    if (!clientSecret || clientSecret === 'booking-mode') {
      throw new Error('Setup intent not initialized');
    }

    try {
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        const errorResult: PaymentFlowError = {
          type: 'stripe',
          message: stripeError.message || 'Card setup failed',
          stripe_error: {
            type: stripeError.type,
            code: stripeError.code,
            message: stripeError.message,
          },
        };
        setError(stripeError.message ?? null);
        onError(errorResult);
        return;
      }

      if (setupIntent && setupIntent.status === 'succeeded') {
        // Extract card details and create payment method record
        const paymentMethodRaw = setupIntent.payment_method;
        let cardDetails = {
          last_four: '',
          brand: '',
          exp_month: 0,
          exp_year: 0,
        };

        if (debugMode) {
          console.log('UnifiedStripePaymentFlow - Setup Intent:', setupIntent);
          console.log('UnifiedStripePaymentFlow - Payment Method Raw:', paymentMethodRaw);
          console.log('UnifiedStripePaymentFlow - Payment Method Type:', typeof paymentMethodRaw);
        }

        // Handle both string and object responses from Stripe
        let paymentMethodId: string;
        let paymentMethodObj: { id: string; card?: { last4: string; brand: string; exp_month: number; exp_year: number } } | null = null;

        if (typeof paymentMethodRaw === 'string') {
          // Payment method is just the ID string
          paymentMethodId = paymentMethodRaw;
          if (debugMode) {
            console.log('UnifiedStripePaymentFlow - Payment method is string ID:', paymentMethodId);
          }
        } else if (paymentMethodRaw && typeof paymentMethodRaw === 'object') {
          // Payment method is an expanded object
          paymentMethodId = paymentMethodRaw.id;
          paymentMethodObj = paymentMethodRaw;
          if (debugMode) {
            console.log('UnifiedStripePaymentFlow - Payment method is object, ID:', paymentMethodId);
          }
        } else {
          throw new Error('Invalid payment method format from Stripe');
        }

        // Extract card details if we have the expanded object
        if (paymentMethodObj && 'card' in paymentMethodObj) {
          const card = paymentMethodObj.card;

          if (debugMode) {
            console.log('UnifiedStripePaymentFlow - Card Object:', card);
          }

          // More robust extraction with proper validation
          cardDetails = {
            last_four: card?.last4 ? String(card.last4) : '',
            brand: card?.brand ? String(card.brand) : '',
            exp_month: card?.exp_month ? Number(card.exp_month) : 0,
            exp_year: card?.exp_year ? Number(card.exp_year) : 0,
          };

          if (debugMode) {
            console.log('UnifiedStripePaymentFlow - Extracted Card Details:', cardDetails);
          }

          // Validate that we actually have the essential card details
          if (!cardDetails.last_four) {
            console.warn('UnifiedStripePaymentFlow - Warning: last4 not found in card object');
          }
        } else {
          if (debugMode) {
            console.warn('UnifiedStripePaymentFlow - Warning: No expanded card object available (payment method was string)');
          }
        }

        // Create payment method record in backend
        const methodData = {
          type: 'CREDIT_CARD' as const,
          stripe_payment_method_id: paymentMethodId,
          last_four: cardDetails.last_four,
          card_brand: cardDetails.brand,
          exp_month: cardDetails.exp_month,
          exp_year: cardDetails.exp_year,
          is_default: config.save_as_default || false,
          nickname: config.nickname,
        };

        if (debugMode) {
          console.log('UnifiedStripePaymentFlow - Method Data to send to backend:', methodData);
        }

        // Validate that we have essential data before sending to backend
        if (!paymentMethodId) {
          throw new Error('Missing Stripe payment method ID - payment method setup may have failed');
        }

        if (!methodData.last_four && !paymentMethodId) {
          throw new Error('Missing both last four digits and Stripe payment method ID');
        }

        if (debugMode) {
          console.log('UnifiedStripePaymentFlow - Validation passed, payment method ID:', paymentMethodId);
        }

        const savedPaymentMethod = await FinancialApi.createPaymentMethod(methodData);

        const result: PaymentFlowResult = {
          mode: 'save',
          success: true,
          message: 'Payment method saved successfully',
          saveResult: {
            payment_method: savedPaymentMethod,
            setup_intent_id: setupIntent.id,
            is_default: config.save_as_default || false,
          },
        };

        if (debugMode) {
          console.log('UnifiedStripePaymentFlow - Save mode completed:', result);
        }

        onSuccess(result);
      } else {
        throw new Error('Card setup was not completed');
      }

    } catch (error) {
      let errorMessage = 'An unexpected error occurred during card setup';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Check if this is an API error about last four digits
        if (error.message.includes('Last four digits required')) {
          errorMessage = 'Payment method validation failed. Please try again with a different card or contact support.';
        } else if (error.message.includes('stripe_payment_method_id')) {
          errorMessage = 'Payment method setup failed. Please try again.';
        }
      }

      if (debugMode) {
        console.error('UnifiedStripePaymentFlow - Save mode error:', error);
      }

      const errorResult: PaymentFlowError = {
        type: 'unknown',
        message: errorMessage,
      };
      setError(errorMessage);
      onError(errorResult);
    }
  };

  // Process invoice payment mode
  const processInvoiceMode = async (
    stripe: Stripe,
    cardElement: StripeCardElement,
    config: InvoiceModeConfig
  ) => {
    if (!clientSecret || clientSecret === 'booking-mode') {
      throw new Error('Payment intent not initialized');
    }

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        const errorResult: PaymentFlowError = {
          type: 'stripe',
          message: stripeError.message || 'Payment failed',
          stripe_error: {
            type: stripeError.type,
            code: stripeError.code,
            decline_code: stripeError.decline_code,
            message: stripeError.message,
          },
        };
        setError(stripeError.message ?? null);
        onError(errorResult);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        let savedPaymentMethod = null;

        // Save payment method if requested
        if (config.save_payment_method && paymentIntent.payment_method) {
          try {
            // Extract card details from the payment method
            const paymentMethod = paymentIntent.payment_method;
            let cardDetails = {
              last_four: '',
              brand: '',
              exp_month: 0,
              exp_year: 0,
            };

            if (paymentMethod && typeof paymentMethod === 'object' && 'card' in paymentMethod) {
              const card = paymentMethod.card as { last4: string; brand: string; exp_month: number; exp_year: number };
              cardDetails = {
                last_four: card.last4 || '',
                brand: card.brand || '',
                exp_month: card.exp_month || 0,
                exp_year: card.exp_year || 0,
              };
            }

            // Create payment method record in backend
            const methodData = {
              type: 'CREDIT_CARD' as const,
              stripe_payment_method_id: typeof paymentMethod === 'string' ? paymentMethod : paymentMethod.id,
              last_four: cardDetails.last_four,
              card_brand: cardDetails.brand,
              exp_month: cardDetails.exp_month,
              exp_year: cardDetails.exp_year,
              is_default: false,
            };

            savedPaymentMethod = await FinancialApi.createPaymentMethod(methodData);

            if (debugMode) {
              console.log('UnifiedStripePaymentFlow - Payment method saved during invoice payment:', savedPaymentMethod);
            }
          } catch (saveError) {
            // Log the error but don't fail the payment
            if (debugMode) {
              console.warn('UnifiedStripePaymentFlow - Failed to save payment method:', saveError);
            }
            // We could optionally notify the user that payment succeeded but card save failed
          }
        }

        // Payment successful - the backend will handle creating the Payment record
        const result: PaymentFlowResult = {
          mode: 'invoice',
          success: true,
          message: config.save_payment_method && savedPaymentMethod
            ? 'Invoice payment completed successfully and card saved for future use'
            : 'Invoice payment completed successfully',
          invoiceResult: {
            payment: {
              id: 0, // Will be populated by backend
              amount: String(config.amount),
              currency: config.currency,
              status: 'COMPLETED',
              payment_method: undefined, // Will be populated by backend
              gateway: 'stripe',
              stripe_payment_intent_id: paymentIntent.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as unknown as Payment,
            invoice: {
              id: config.invoice_id,
            } as unknown as Invoice,
            payment_method_saved: !!savedPaymentMethod,
            payment_method: savedPaymentMethod || undefined,
          },
        };

        if (debugMode) {
          console.log('UnifiedStripePaymentFlow - Invoice payment completed:', result);
        }

        onSuccess(result);
      } else {
        throw new Error('Payment was not completed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during payment';
      const errorResult: PaymentFlowError = {
        type: 'unknown',
        message: errorMessage,
      };
      setError(errorMessage);
      onError(errorResult);
    }
  };

  // Process booking payment mode
  const processBookingMode = async (
    stripe: Stripe,
    cardElement: StripeCardElement,
    config: BookingModeConfig,
    isAuthenticated: boolean
  ) => {
    try {
      // For booking mode, we create a payment method and optionally process payment
      // This is more complex and might involve creating payment intents on the backend

      // First, create a payment method in Stripe
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (paymentMethodError) {
        const errorResult: PaymentFlowError = {
          type: 'stripe',
          message: paymentMethodError.message || 'Failed to create payment method',
          stripe_error: {
            type: paymentMethodError.type,
            code: paymentMethodError.code,
            message: paymentMethodError.message,
          },
        };
        setError(paymentMethodError.message ?? null);
        onError(errorResult);
        return;
      }

      if (!paymentMethod) {
        throw new Error('Payment method creation failed');
      }

      // Extract card details
      const card = paymentMethod.card;
      const cardDetails = {
        last_four: card?.last4 || '',
        brand: card?.brand || '',
        exp_month: card?.exp_month || 0,
        exp_year: card?.exp_year || 0,
      };

      // Only save payment method to database if user is authenticated
      let savedPaymentMethod = null;
      const shouldSaveToDb = config.save_payment_method && isAuthenticated;

      if (shouldSaveToDb) {
        if (debugMode) {
          console.log('UnifiedStripePaymentFlow - Saving payment method to database (authenticated user)');
        }

        const methodData = {
          type: 'CREDIT_CARD' as const,
          stripe_payment_method_id: paymentMethod.id,
          last_four: cardDetails.last_four,
          card_brand: cardDetails.brand,
          exp_month: cardDetails.exp_month,
          exp_year: cardDetails.exp_year,
          is_default: false,
        };

        savedPaymentMethod = await FinancialApi.createPaymentMethod(methodData);
      } else if (debugMode) {
        console.log('UnifiedStripePaymentFlow - Skipping database save (guest user or save not requested)');
      }

      // For booking mode, we might need to create and confirm a payment intent
      // This would typically be handled by the booking flow system
      // For now, we return the payment method information

      const result: PaymentFlowResult = {
        mode: 'booking',
        success: true,
        message: isAuthenticated
          ? 'Booking payment method created successfully'
          : 'Card validated successfully',
        bookingResult: {
          payment_intent_id: '', // Would be populated if payment intent created
          payment_method_saved: shouldSaveToDb && !!savedPaymentMethod, // Only true if saved to DB
          payment_method: savedPaymentMethod || undefined, // DB payment method (authenticated only)
          stripe_payment_method_id: paymentMethod.id, // Always return Stripe PM ID
          booking_session_updated: false, // Would be updated by booking system
          client_secret: '',
          status: 'requires_payment_method',
        },
      };

      if (debugMode) {
        console.log('UnifiedStripePaymentFlow - Booking mode completed:', result);
      }

      onSuccess(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during booking';
      const errorResult: PaymentFlowError = {
        type: 'unknown',
        message: errorMessage,
      };
      setError(errorMessage);
      onError(errorResult);
    }
  };

  // Card element styling
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

  // Loading states
  if (intentLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Initializing payment form...
        </Typography>
      </Box>
    );
  }

  // Intent error state
  if (intentError) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        <Typography variant="body2">
          {intentError}
        </Typography>
      </Alert>
    );
  }

  // Main render
  return (
    <GlassCard variant="light" intensity="subtle">
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={2}>
            <modeConfig.icon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {modeConfig.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {amountText
                  ? `${modeConfig.description} - ${amountText}`
                  : modeConfig.description
                }
              </Typography>
            </Box>
          </Stack>

          {/* Payment Form */}
          <form onSubmit={handlePaymentSubmit}>
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
                  options={cardElementStyles}
                  onChange={handleCardChange}
                />
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
                    !stripe ||
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

// ===========================
// Main Component with Elements Provider
// ===========================

export const UnifiedStripePaymentFlow: React.FC<UnifiedStripePaymentFlowProps> = ({
  gateway,
  onError,
  ...props
}) => {
  // Memoize the publishable key to prevent recreating stripe promise
  const publishableKey = useMemo(() => {
    return gateway.public_config?.publishable_key as string || import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  }, [gateway.public_config?.publishable_key]);

  // Memoize the Stripe promise to prevent recreation
  const stripePromise = useMemo(() => {
    if (publishableKey) {
      return loadStripe(publishableKey);
    }
    return null;
  }, [publishableKey]);

  // Handle missing publishable key (only check once when key changes)
  useEffect(() => {
    if (!publishableKey) {
      const errorResult: PaymentFlowError = {
        type: 'backend',
        message: 'Stripe publishable key not configured',
      };
      onError(errorResult);
    }
  }, [publishableKey, onError]);

  // Loading state while Stripe initializes
  if (!stripePromise) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Loading payment system...
        </Typography>
      </Box>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentFlowInner
        {...props}
        onError={onError}
        publishableKey={gateway.public_config?.publishable_key as string}
      />
    </Elements>
  );
};

export default UnifiedStripePaymentFlow;