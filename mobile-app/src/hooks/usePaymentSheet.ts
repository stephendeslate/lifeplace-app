/**
 * usePaymentSheet Hook
 *
 * Manages Stripe PaymentSheet lifecycle for collecting payments.
 * Supports both booking flow and invoice payments.
 */

import { useState, useCallback } from 'react';
import {
  useStripe,
  PaymentSheetError,
  type InitPaymentSheetResult,
} from '@stripe/stripe-react-native';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import paymentsApi from '@/apis/payments.api';

// Payment error types for better UX
export type PaymentErrorType =
  | 'card_declined'
  | 'insufficient_funds'
  | 'invalid_card'
  | 'expired_card'
  | 'processing_error'
  | 'network_error'
  | 'authentication_required'
  | 'cancelled'
  | 'unknown';

export interface PaymentError {
  type: PaymentErrorType;
  message: string;
  isUserError: boolean; // True if user can fix (e.g., wrong card), false if system error
  canRetry: boolean;
  suggestion?: string;
}

/**
 * Categorize payment errors for better user experience
 */
function categorizePaymentError(error: { code?: string; message?: string } | Error | string): PaymentError {
  const errorMessage = typeof error === 'string' ? error : (error as { message?: string }).message || 'Payment failed';
  const errorCode = typeof error === 'string' ? '' : (error as { code?: string }).code || '';

  // Card declined errors
  if (
    errorCode.includes('card_declined') ||
    errorMessage.toLowerCase().includes('declined') ||
    errorMessage.toLowerCase().includes('do not honor')
  ) {
    if (errorMessage.toLowerCase().includes('insufficient')) {
      return {
        type: 'insufficient_funds',
        message: 'Your card has insufficient funds. Please try a different card.',
        isUserError: true,
        canRetry: true,
        suggestion: 'Check your available balance or use a different payment method.',
      };
    }
    return {
      type: 'card_declined',
      message: 'Your card was declined. Please try a different card or contact your bank.',
      isUserError: true,
      canRetry: true,
      suggestion: 'Your bank may have blocked this transaction. Try contacting them or use a different card.',
    };
  }

  // Invalid card errors
  if (
    errorCode.includes('invalid') ||
    errorCode.includes('incorrect') ||
    errorMessage.toLowerCase().includes('invalid card') ||
    errorMessage.toLowerCase().includes('incorrect')
  ) {
    return {
      type: 'invalid_card',
      message: 'The card information is invalid. Please check your card details.',
      isUserError: true,
      canRetry: true,
      suggestion: 'Double-check your card number, expiration date, and CVV.',
    };
  }

  // Expired card
  if (
    errorCode.includes('expired') ||
    errorMessage.toLowerCase().includes('expired')
  ) {
    return {
      type: 'expired_card',
      message: 'Your card has expired. Please use a different card.',
      isUserError: true,
      canRetry: true,
      suggestion: 'Check the expiration date on your card or use a different payment method.',
    };
  }

  // Authentication required (3D Secure, etc.)
  if (
    errorCode.includes('authentication') ||
    errorMessage.toLowerCase().includes('authentication')
  ) {
    return {
      type: 'authentication_required',
      message: 'Additional verification is required. Please complete the verification process.',
      isUserError: false,
      canRetry: true,
    };
  }

  // Network errors
  if (
    errorCode.includes('network') ||
    errorMessage.toLowerCase().includes('network') ||
    errorMessage.toLowerCase().includes('connection') ||
    errorMessage.toLowerCase().includes('timeout')
  ) {
    return {
      type: 'network_error',
      message: 'Connection lost. Please check your internet and try again.',
      isUserError: false,
      canRetry: true,
      suggestion: 'Your payment was not processed. It\'s safe to try again.',
    };
  }

  // Processing errors (server-side issues)
  if (
    errorCode.includes('processing') ||
    errorMessage.toLowerCase().includes('processing')
  ) {
    return {
      type: 'processing_error',
      message: 'We couldn\'t process your payment. Please try again in a moment.',
      isUserError: false,
      canRetry: true,
    };
  }

  // Unknown/generic errors
  return {
    type: 'unknown',
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    isUserError: false,
    canRetry: true,
  };
}

interface UsePaymentSheetOptions {
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: PaymentError) => void;
}

interface PaymentSheetState {
  isInitializing: boolean;
  isPresenting: boolean;
  isReady: boolean;
  error: PaymentError | null;
}

export function usePaymentSheet(options?: UsePaymentSheetOptions) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { showToast } = useToast();

  const [state, setState] = useState<PaymentSheetState>({
    isInitializing: false,
    isPresenting: false,
    isReady: false,
    error: null,
  });

  // Create payment intent for invoice
  const createIntent = useMutation({
    mutationFn: (invoiceId: number) => paymentsApi.createPaymentIntent(invoiceId),
  });

  // Initialize PaymentSheet with client secret
  const initialize = useCallback(
    async (
      clientSecret: string,
      customerConfig?: {
        customerId?: string;
        customerEphemeralKeySecret?: string;
      }
    ): Promise<boolean> => {
      setState((prev) => ({ ...prev, isInitializing: true, error: null }));

      try {
        const { error }: InitPaymentSheetResult = await initPaymentSheet({
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'LifePlace',
          customerId: customerConfig?.customerId,
          customerEphemeralKeySecret: customerConfig?.customerEphemeralKeySecret,
          allowsDelayedPaymentMethods: false,
          defaultBillingDetails: {
            address: {
              country: 'PH',
            },
          },
          returnURL: 'lifeplace://payment-complete',
          applePay: {
            merchantCountryCode: 'PH',
          },
          googlePay: {
            merchantCountryCode: 'PH',
            testEnv: __DEV__,
          },
        });

        if (error) {
          const categorizedError = categorizePaymentError(error);
          setState((prev) => ({
            ...prev,
            isInitializing: false,
            error: categorizedError,
          }));
          return false;
        }

        setState((prev) => ({
          ...prev,
          isInitializing: false,
          isReady: true,
        }));
        return true;
      } catch (err) {
        const categorizedError = categorizePaymentError(err instanceof Error ? err : String(err));
        setState((prev) => ({
          ...prev,
          isInitializing: false,
          error: categorizedError,
        }));
        return false;
      }
    },
    [initPaymentSheet]
  );

  // Present PaymentSheet
  const present = useCallback(async (): Promise<{
    success: boolean;
    error?: PaymentError;
  }> => {
    if (!state.isReady) {
      return {
        success: false,
        error: {
          type: 'unknown',
          message: 'Payment sheet not ready',
          isUserError: false,
          canRetry: true,
        },
      };
    }

    setState((prev) => ({ ...prev, isPresenting: true, error: null }));

    try {
      const { error } = await presentPaymentSheet();

      setState((prev) => ({ ...prev, isPresenting: false }));

      if (error) {
        if (error.code === PaymentSheetError.Canceled) {
          // User cancelled - not an error
          const cancelledError: PaymentError = {
            type: 'cancelled',
            message: 'Payment cancelled',
            isUserError: true,
            canRetry: true,
          };
          return { success: false, error: cancelledError };
        }

        const categorizedError = categorizePaymentError(error);
        setState((prev) => ({ ...prev, error: categorizedError }));
        options?.onError?.(categorizedError);
        return { success: false, error: categorizedError };
      }

      showToast('Payment successful!', 'success');
      return { success: true };
    } catch (err) {
      const categorizedError = categorizePaymentError(err instanceof Error ? err : String(err));
      setState((prev) => ({ ...prev, isPresenting: false, error: categorizedError }));
      options?.onError?.(categorizedError);
      return { success: false, error: categorizedError };
    }
  }, [state.isReady, presentPaymentSheet, options, showToast]);

  // Complete flow: create intent -> initialize -> present
  const payInvoice = useCallback(
    async (
      invoiceId: number
    ): Promise<{
      success: boolean;
      paymentIntentId?: string;
      error?: PaymentError;
    }> => {
      setState((prev) => ({ ...prev, isInitializing: true, error: null }));

      try {
        // 1. Create payment intent
        const { client_secret, payment_intent_id } = await createIntent.mutateAsync(invoiceId);

        // 2. Initialize PaymentSheet
        const initialized = await initialize(client_secret);
        if (!initialized) {
          return {
            success: false,
            error: state.error || {
              type: 'unknown',
              message: 'Failed to initialize payment',
              isUserError: false,
              canRetry: true,
            },
          };
        }

        // 3. Present PaymentSheet
        const result = await present();

        if (result.success) {
          options?.onSuccess?.(payment_intent_id);
          return { success: true, paymentIntentId: payment_intent_id };
        }

        return result;
      } catch (err) {
        const categorizedError = categorizePaymentError(err instanceof Error ? err : String(err));
        setState((prev) => ({ ...prev, isInitializing: false, error: categorizedError }));
        return { success: false, error: categorizedError };
      }
    },
    [createIntent, initialize, present, state.error, options]
  );

  // Reset state
  const reset = useCallback(() => {
    setState({
      isInitializing: false,
      isPresenting: false,
      isReady: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    isLoading: state.isInitializing || state.isPresenting,
    initialize,
    present,
    payInvoice,
    reset,
  };
}

export default usePaymentSheet;
