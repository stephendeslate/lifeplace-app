/**
 * useBookingPayment Hook
 *
 * Specialized hook for handling payments within the booking flow.
 * Integrates with BookingContext and handles payment intent creation.
 */

import { useState, useCallback } from 'react';
import { useStripe, type CardFieldInput } from '@stripe/stripe-react-native';
import { useBookingContext } from '@/contexts/BookingContext';
import { useToast } from '@/contexts/ToastContext';

interface BookingPaymentIntent {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
}

interface UseBookingPaymentState {
  isCreatingIntent: boolean;
  isConfirming: boolean;
  cardComplete: boolean;
  error: string | null;
  paymentIntentId: string | null;
  clientSecret: string | null;
}

export function useBookingPayment() {
  const { confirmPayment, createPaymentMethod } = useStripe();
  const { state } = useBookingContext();
  const { showToast } = useToast();

  const [paymentState, setPaymentState] = useState<UseBookingPaymentState>({
    isCreatingIntent: false,
    isConfirming: false,
    cardComplete: false,
    error: null,
    paymentIntentId: null,
    clientSecret: null,
  });

  // NOTE: Payment intents are created at booking completion when an invoice is generated.
  // During the booking flow, we just collect card details and create a payment method.
  // The actual payment intent creation happens through the invoice payment endpoint.
  // This matches the pattern used in client-portal's UnifiedStripePaymentFlow.

  // Handle card field change
  const handleCardChange = useCallback(
    (details: CardFieldInput.Details) => {
      setPaymentState((prev) => ({
        ...prev,
        cardComplete: details.complete,
        // The error is extracted from validation state if not complete
        error: !details.complete && details.brand ? null : null,
      }));
    },
    []
  );

  // Initialize payment - no longer calls backend, just prepares state for payment method creation
  // Payment intents are created at booking completion when an invoice is generated
  const initializePayment = useCallback(
    async (_amount: number, _paymentType: 'FULL' | 'DEPOSIT') => {
      if (!state.currentSession?.session_id) {
        setPaymentState((prev) => ({
          ...prev,
          error: 'No active booking session',
        }));
        return null;
      }

      // No backend call needed - payment method will be created via Stripe SDK
      // and payment intent will be created at booking completion
      setPaymentState((prev) => ({
        ...prev,
        isCreatingIntent: false,
        error: null,
      }));

      return { success: true };
    },
    [state.currentSession]
  );

  // Confirm payment with collected card details
  const confirmBookingPayment = useCallback(
    async (
      clientSecret: string,
      billingDetails?: {
        email?: string;
        name?: string;
        phone?: string;
      }
    ): Promise<{ success: boolean; error?: string }> => {
      if (!paymentState.cardComplete) {
        return { success: false, error: 'Please complete card details' };
      }

      setPaymentState((prev) => ({ ...prev, isConfirming: true, error: null }));

      try {
        const { error, paymentIntent } = await confirmPayment(clientSecret, {
          paymentMethodType: 'Card',
          paymentMethodData: {
            billingDetails: billingDetails || {},
          },
        });

        if (error) {
          setPaymentState((prev) => ({
            ...prev,
            isConfirming: false,
            error: error.message,
          }));
          return { success: false, error: error.message };
        }

        if (paymentIntent?.status === 'Succeeded') {
          setPaymentState((prev) => ({ ...prev, isConfirming: false }));
          showToast('Payment successful!', 'success');
          return { success: true };
        }

        // Handle other statuses
        const statusMessage = `Payment status: ${paymentIntent?.status || 'unknown'}`;
        setPaymentState((prev) => ({
          ...prev,
          isConfirming: false,
          error: statusMessage,
        }));
        return { success: false, error: statusMessage };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment confirmation failed';
        setPaymentState((prev) => ({
          ...prev,
          isConfirming: false,
          error: message,
        }));
        return { success: false, error: message };
      }
    },
    [paymentState.cardComplete, confirmPayment, showToast]
  );

  // Create a payment method (for saving cards)
  const createPaymentMethodFromCard = useCallback(
    async (
      billingDetails?: {
        email?: string;
        name?: string;
        phone?: string;
      }
    ): Promise<{ success: boolean; paymentMethodId?: string; error?: string }> => {
      if (!paymentState.cardComplete) {
        return { success: false, error: 'Please complete card details' };
      }

      try {
        const { paymentMethod, error } = await createPaymentMethod({
          paymentMethodType: 'Card',
          paymentMethodData: {
            billingDetails: billingDetails || {},
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (paymentMethod) {
          return { success: true, paymentMethodId: paymentMethod.id };
        }

        return { success: false, error: 'Failed to create payment method' };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create payment method';
        return { success: false, error: message };
      }
    },
    [paymentState.cardComplete, createPaymentMethod]
  );

  // Reset payment state
  const resetPayment = useCallback(() => {
    setPaymentState({
      isCreatingIntent: false,
      isConfirming: false,
      cardComplete: false,
      error: null,
      paymentIntentId: null,
      clientSecret: null,
    });
  }, []);

  return {
    ...paymentState,
    isLoading: paymentState.isCreatingIntent || paymentState.isConfirming,
    handleCardChange,
    initializePayment,
    confirmBookingPayment,
    createPaymentMethodFromCard,
    resetPayment,
  };
}

export default useBookingPayment;
