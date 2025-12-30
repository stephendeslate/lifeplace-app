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

interface UsePaymentSheetOptions {
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

interface PaymentSheetState {
  isInitializing: boolean;
  isPresenting: boolean;
  isReady: boolean;
  error: string | null;
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
          setState((prev) => ({
            ...prev,
            isInitializing: false,
            error: error.message,
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
        const message = err instanceof Error ? err.message : 'Failed to initialize payment';
        setState((prev) => ({
          ...prev,
          isInitializing: false,
          error: message,
        }));
        return false;
      }
    },
    [initPaymentSheet]
  );

  // Present PaymentSheet
  const present = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!state.isReady) {
      return { success: false, error: 'Payment sheet not ready' };
    }

    setState((prev) => ({ ...prev, isPresenting: true, error: null }));

    try {
      const { error } = await presentPaymentSheet();

      setState((prev) => ({ ...prev, isPresenting: false }));

      if (error) {
        if (error.code === PaymentSheetError.Canceled) {
          // User cancelled - not an error
          return { success: false, error: 'Payment cancelled' };
        }

        const errorMessage = error.message || 'Payment failed';
        setState((prev) => ({ ...prev, error: errorMessage }));
        options?.onError?.(errorMessage);
        return { success: false, error: errorMessage };
      }

      showToast('Payment successful!', 'success');
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setState((prev) => ({ ...prev, isPresenting: false, error: message }));
      options?.onError?.(message);
      return { success: false, error: message };
    }
  }, [state.isReady, presentPaymentSheet, options, showToast]);

  // Complete flow: create intent -> initialize -> present
  const payInvoice = useCallback(
    async (
      invoiceId: number
    ): Promise<{
      success: boolean;
      paymentIntentId?: string;
      error?: string;
    }> => {
      setState((prev) => ({ ...prev, isInitializing: true, error: null }));

      try {
        // 1. Create payment intent
        const { client_secret, payment_intent_id } = await createIntent.mutateAsync(invoiceId);

        // 2. Initialize PaymentSheet
        const initialized = await initialize(client_secret);
        if (!initialized) {
          return { success: false, error: state.error || 'Failed to initialize' };
        }

        // 3. Present PaymentSheet
        const result = await present();

        if (result.success) {
          options?.onSuccess?.(payment_intent_id);
          return { success: true, paymentIntentId: payment_intent_id };
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment failed';
        setState((prev) => ({ ...prev, isInitializing: false, error: message }));
        return { success: false, error: message };
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
