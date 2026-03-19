// frontend/client-portal/src/components/payments/UnifiedStripePaymentFlow/useStripePaymentLogic.ts

import { useState, useEffect, useCallback } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import type { Stripe, StripeCardElement, StripeCardElementChangeEvent } from '@stripe/stripe-js';
import FinancialApi from '@/apis/financial';
import type {
  PaymentModeConfig,
  PaymentFlowResult,
  PaymentFlowError,
  BookingModeConfig,
  SaveModeConfig,
  InvoiceModeConfig,
  CardElementState,
} from '@/types/unified-payment-flow.types';
import type { Payment, Invoice } from '@/types/financial';
import { isBookingMode, isSaveMode, isInvoiceMode } from '@/types/unified-payment-flow.types';

// ===========================
// Mode Configuration Helpers
// ===========================

interface ModeUiConfig {
  title: string;
  description: string;
  submitText: string;
  processingText: string;
  icon: 'card';
}

export const getModeConfig = (
  mode: PaymentModeConfig['mode'],
  isAuthenticated?: boolean,
): ModeUiConfig => {
  switch (mode) {
    case 'booking':
      if (isAuthenticated) {
        return {
          title: 'Booking Payment',
          description: 'Complete your booking with secure payment',
          submitText: 'Save Payment Method',
          processingText: 'Saving Payment Method...',
          icon: 'card',
        };
      } else {
        return {
          title: 'Booking Payment',
          description: 'Complete your booking with secure payment',
          submitText: 'Continue with Card',
          processingText: 'Validating Card...',
          icon: 'card',
        };
      }
    case 'save':
      return {
        title: 'Save Payment Method',
        description: 'Securely save your card for future payments',
        submitText: 'Save Card',
        processingText: 'Saving Card...',
        icon: 'card',
      };
    case 'invoice':
      return {
        title: 'Invoice Payment',
        description: 'Pay your invoice securely',
        submitText: 'Pay Invoice',
        processingText: 'Processing Payment...',
        icon: 'card',
      };
    default:
      return {
        title: 'Payment',
        description: 'Complete your payment securely',
        submitText: 'Pay Now',
        processingText: 'Processing...',
        icon: 'card',
      };
  }
};

export const getAmountText = (config: PaymentModeConfig): string | null => {
  if (isBookingMode(config)) {
    return FinancialApi.formatAmount(config.total_amount, config.currency);
  }
  if (isInvoiceMode(config)) {
    return FinancialApi.formatAmount(config.amount, config.currency);
  }
  return null;
};

// ===========================
// Hook
// ===========================

interface UseStripePaymentLogicParams {
  config: PaymentModeConfig;
  onSuccess: (result: PaymentFlowResult) => void;
  onError: (error: PaymentFlowError) => void;
  isAuthenticated: boolean;
  debugMode: boolean;
}

export function useStripePaymentLogic({
  config,
  onSuccess,
  onError,
  isAuthenticated,
  debugMode,
}: UseStripePaymentLogicParams) {
  const stripe = useStripe();
  const elements = useElements();

  // Component state
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardState, setCardState] = useState<CardElementState>({
    complete: false,
    empty: true,
  });

  // Intent state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(true);
  const [intentError, setIntentError] = useState<string | null>(null);

  // Mode config
  const modeConfig = getModeConfig(config.mode, isAuthenticated);
  const amountText = getAmountText(config);

  // Extract config properties to stabilize dependencies
  const configMode = config.mode;
  const configInvoiceId = isInvoiceMode(config) ? config.invoice_id : null;

  // Initialize intent
  useEffect(() => {
    const initializeIntent = async () => {
      try {
        setIntentLoading(true);
        setIntentError(null);

        if (debugMode) {
          console.log('UnifiedStripePaymentFlow - Initializing intent for mode:', config.mode);
        }

        if (isSaveMode(config)) {
          const response = await FinancialApi.createStripeSetupIntent();
          setClientSecret(response.client_secret);

          if (debugMode) {
            console.log('UnifiedStripePaymentFlow - Setup intent created:', response);
          }
        } else if (isInvoiceMode(config)) {
          const response = await FinancialApi.createInvoicePaymentIntent(
            config.invoice_id,
            'stripe',
          );
          setClientSecret(response.client_secret);

          if (debugMode) {
            console.log(
              'UnifiedStripePaymentFlow - Payment intent created for invoice:',
              config.invoice_id,
            );
          }
        } else if (isBookingMode(config)) {
          if (debugMode) {
            console.log(
              'UnifiedStripePaymentFlow - Booking mode initialized, will create payment method',
            );
          }
          setClientSecret('booking-mode');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to initialize payment';
        setIntentError(errorMessage);

        if (debugMode) {
          console.error('UnifiedStripePaymentFlow - Intent initialization failed:', error);
        }
      } finally {
        setIntentLoading(false);
      }
    };

    const abortController = new AbortController();

    const timeoutId = setTimeout(() => {
      if (!abortController.signal.aborted) {
        initializeIntent();
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [config, configMode, configInvoiceId, debugMode]);

  // Handle card element changes
  const handleCardChange = useCallback(
    (event: StripeCardElementChangeEvent) => {
      setCardState({
        complete: event.complete,
        empty: event.empty,
        error: event.error
          ? {
              code: event.error.code,
              message: event.error.message,
              type: event.error.type,
            }
          : undefined,
        brand: event.brand,
        last4: event.complete ? undefined : undefined,
      });

      if (event.complete && error) {
        setError(null);
      }
    },
    [error],
  );

  // Process save payment method mode
  const processSaveMode = async (
    stripe: Stripe,
    cardElement: StripeCardElement,
    config: SaveModeConfig,
  ) => {
    if (!clientSecret || clientSecret === 'booking-mode') {
      throw new Error('Setup intent not initialized');
    }

    try {
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

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

        let paymentMethodId: string;
        let paymentMethodObj: {
          id: string;
          card?: { last4: string; brand: string; exp_month: number; exp_year: number };
        } | null = null;

        if (typeof paymentMethodRaw === 'string') {
          paymentMethodId = paymentMethodRaw;
          if (debugMode) {
            console.log('UnifiedStripePaymentFlow - Payment method is string ID:', paymentMethodId);
          }
        } else if (paymentMethodRaw && typeof paymentMethodRaw === 'object') {
          paymentMethodId = paymentMethodRaw.id;
          paymentMethodObj = paymentMethodRaw;
          if (debugMode) {
            console.log(
              'UnifiedStripePaymentFlow - Payment method is object, ID:',
              paymentMethodId,
            );
          }
        } else {
          throw new Error('Invalid payment method format from Stripe');
        }

        if (paymentMethodObj && 'card' in paymentMethodObj) {
          const card = paymentMethodObj.card;

          if (debugMode) {
            console.log('UnifiedStripePaymentFlow - Card Object:', card);
          }

          cardDetails = {
            last_four: card?.last4 ? String(card.last4) : '',
            brand: card?.brand ? String(card.brand) : '',
            exp_month: card?.exp_month ? Number(card.exp_month) : 0,
            exp_year: card?.exp_year ? Number(card.exp_year) : 0,
          };

          if (debugMode) {
            console.log('UnifiedStripePaymentFlow - Extracted Card Details:', cardDetails);
          }

          if (!cardDetails.last_four && debugMode) {
            console.warn('UnifiedStripePaymentFlow - Warning: last4 not found in card object');
          }
        } else {
          if (debugMode) {
            console.warn(
              'UnifiedStripePaymentFlow - Warning: No expanded card object available (payment method was string)',
            );
          }
        }

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

        if (!paymentMethodId) {
          throw new Error(
            'Missing Stripe payment method ID - payment method setup may have failed',
          );
        }

        if (!methodData.last_four && !paymentMethodId) {
          throw new Error('Missing both last four digits and Stripe payment method ID');
        }

        if (debugMode) {
          console.log(
            'UnifiedStripePaymentFlow - Validation passed, payment method ID:',
            paymentMethodId,
          );
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

        if (error.message.includes('Last four digits required')) {
          errorMessage =
            'Payment method validation failed. Please try again with a different card or contact support.';
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
    config: InvoiceModeConfig,
  ) => {
    if (!clientSecret || clientSecret === 'booking-mode') {
      throw new Error('Payment intent not initialized');
    }

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

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

        if (config.save_payment_method && paymentIntent.payment_method) {
          try {
            const paymentMethod = paymentIntent.payment_method;
            let cardDetails = {
              last_four: '',
              brand: '',
              exp_month: 0,
              exp_year: 0,
            };

            if (paymentMethod && typeof paymentMethod === 'object' && 'card' in paymentMethod) {
              const card = paymentMethod.card as {
                last4: string;
                brand: string;
                exp_month: number;
                exp_year: number;
              };
              cardDetails = {
                last_four: card.last4 || '',
                brand: card.brand || '',
                exp_month: card.exp_month || 0,
                exp_year: card.exp_year || 0,
              };
            }

            const methodData = {
              type: 'CREDIT_CARD' as const,
              stripe_payment_method_id:
                typeof paymentMethod === 'string' ? paymentMethod : paymentMethod.id,
              last_four: cardDetails.last_four,
              card_brand: cardDetails.brand,
              exp_month: cardDetails.exp_month,
              exp_year: cardDetails.exp_year,
              is_default: false,
            };

            savedPaymentMethod = await FinancialApi.createPaymentMethod(methodData);

            if (debugMode) {
              console.log(
                'UnifiedStripePaymentFlow - Payment method saved during invoice payment:',
                savedPaymentMethod,
              );
            }
          } catch (saveError) {
            if (debugMode) {
              console.warn('UnifiedStripePaymentFlow - Failed to save payment method:', saveError);
            }
          }
        }

        const result: PaymentFlowResult = {
          mode: 'invoice',
          success: true,
          message:
            config.save_payment_method && savedPaymentMethod
              ? 'Invoice payment completed successfully and card saved for future use'
              : 'Invoice payment completed successfully',
          invoiceResult: {
            payment: {
              id: 0,
              amount: String(config.amount),
              currency: config.currency,
              status: 'COMPLETED',
              payment_method: undefined,
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
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred during payment';
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
    isAuthenticated: boolean,
  ) => {
    try {
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

      const card = paymentMethod.card;
      const cardDetails = {
        last_four: card?.last4 || '',
        brand: card?.brand || '',
        exp_month: card?.exp_month || 0,
        exp_year: card?.exp_year || 0,
      };

      let savedPaymentMethod = null;
      const shouldSaveToDb = config.save_payment_method && isAuthenticated;

      if (shouldSaveToDb) {
        if (debugMode) {
          console.log(
            'UnifiedStripePaymentFlow - Saving payment method to database (authenticated user)',
          );
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
        console.log(
          'UnifiedStripePaymentFlow - Skipping database save (guest user or save not requested)',
        );
      }

      const result: PaymentFlowResult = {
        mode: 'booking',
        success: true,
        message: isAuthenticated
          ? 'Booking payment method created successfully'
          : 'Card validated successfully',
        bookingResult: {
          payment_intent_id: '',
          payment_method_saved: shouldSaveToDb && !!savedPaymentMethod,
          payment_method: savedPaymentMethod || undefined,
          stripe_payment_method_id: paymentMethod.id,
          booking_session_updated: false,
          client_secret: '',
          status: 'requires_payment_method',
        },
      };

      if (debugMode) {
        console.log('UnifiedStripePaymentFlow - Booking mode completed:', result);
      }

      onSuccess(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred during booking';
      const errorResult: PaymentFlowError = {
        type: 'unknown',
        message: errorMessage,
      };
      setError(errorMessage);
      onError(errorResult);
    }
  };

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
    } finally {
      setProcessing(false);
    }
  };

  return {
    stripe,
    processing,
    error,
    cardState,
    intentLoading,
    intentError,
    modeConfig,
    amountText,
    handleCardChange,
    handlePaymentSubmit,
  };
}
