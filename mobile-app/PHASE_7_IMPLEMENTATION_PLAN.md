# Phase 7: Stripe Payment Integration - Implementation Plan

> **Prerequisite**: Phase 6 (Booking Flow) must be completed
> **Requires**: EAS development build (Stripe SDK not compatible with Expo Go)
> **Reference**: [DEVELOPMENT_GUIDE.md Section 13](DEVELOPMENT_GUIDE.md)

---

## Overview

Phase 7 integrates Stripe payment processing into the LifePlace mobile app, enabling secure credit/debit card payments within the booking flow and for invoice payments. This phase builds upon the existing payment UI components and hooks, adding native Stripe SDK integration.

### Goals
- Install and configure @stripe/stripe-react-native
- Create StripeProvider wrapper component
- Implement PaymentSheet for seamless card collection
- Update PaymentStep to use real Stripe integration
- Add saved payment method management
- Implement payment plan support for installments

### Current State Analysis

**Already Implemented:**
- [src/types/booking/payment.types.ts](src/types/booking/payment.types.ts) - Payment type definitions
- [src/apis/booking/payment.api.ts](src/apis/booking/payment.api.ts) - Payment API layer
- [src/apis/payments.api.ts](src/apis/payments.api.ts) - Invoice/payment management
- [src/hooks/booking/usePayment.ts](src/hooks/booking/usePayment.ts) - Payment hooks
- [src/hooks/useFinancial.ts](src/hooks/useFinancial.ts) - Financial hooks with `createPaymentIntent`
- [src/components/booking/steps/PaymentStep.tsx](src/components/booking/steps/PaymentStep.tsx) - UI for gateway selection
- [app/payments/](app/payments/) - Payment screens structure

**Missing:**
- Stripe SDK installation and configuration
- StripeProvider wrapper
- usePaymentSheet hook
- CardField/PaymentSheet components
- Saved payment methods UI
- Payment confirmation flow
- Payment plan components

---

## 7.1 Stripe SDK Setup

### 7.1.1 Install Stripe React Native

```bash
cd mobile-app
npx expo install @stripe/stripe-react-native
```

**Verification:** Run `npm ls @stripe/stripe-react-native` to confirm installation.

### 7.1.2 Configure app.json

Update [app.json](app.json) to include Stripe plugin configuration:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-secure-store",
      ["expo-splash-screen", {...}],
      "expo-font",
      [
        "@stripe/stripe-react-native",
        {
          "merchantIdentifier": "merchant.com.lifeplace.app",
          "enableGooglePay": true
        }
      ]
    ]
  }
}
```

**Required app.json additions:**
- `plugins` array: Add Stripe plugin with merchant identifier
- `ios.associatedDomains`: Already configured for deep links
- `scheme`: Already configured as "lifeplace" for return URLs

### 7.1.3 Configure app.config.js (Environment Variables)

Create or update `app.config.js` for dynamic Stripe key loading:

```javascript
// app.config.js
export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
```

### 7.1.4 Environment Variables

Ensure `.env` contains:
```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

---

## 7.2 StripeProvider Implementation

### 7.2.1 Create StripeProvider

**File:** `src/providers/StripeProvider.tsx`

```typescript
/**
 * StripeProvider
 *
 * Wraps the app with Stripe context for payment processing.
 * Must be placed inside GestureHandlerRootView but can be app-wide.
 */

import React from 'react';
import { StripeProvider as StripeNativeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

interface StripeProviderProps {
  children: React.ReactNode;
}

const STRIPE_PUBLISHABLE_KEY =
  Constants.expoConfig?.extra?.stripePublishableKey || '';

export function StripeProvider({ children }: StripeProviderProps) {
  if (!STRIPE_PUBLISHABLE_KEY) {
    console.warn('Stripe publishable key not configured');
  }

  return (
    <StripeNativeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.lifeplace.app"
      urlScheme="lifeplace"
    >
      {children}
    </StripeNativeProvider>
  );
}

export default StripeProvider;
```

### 7.2.2 Add to Root Layout

Update [app/_layout.tsx](app/_layout.tsx):

```typescript
// Add import
import { StripeProvider } from '@/providers/StripeProvider';

// Update provider hierarchy (insert after QueryClientProvider):
<QueryClientProvider client={queryClient}>
  <StripeProvider>
    <AuthProvider>
      {/* ... rest of providers */}
    </AuthProvider>
  </StripeProvider>
</QueryClientProvider>
```

### 7.2.3 Create Provider Index

**File:** `src/providers/index.ts`

```typescript
export { StripeProvider } from './StripeProvider';
```

---

## 7.3 Payment Sheet Implementation

### 7.3.1 Backend API Requirements

Verify backend endpoints exist (from [src/apis/payments.api.ts](src/apis/payments.api.ts)):
- `POST /payments/invoices/:id/create_payment_intent/` - Returns `{ client_secret, payment_intent_id }`

Create new booking payment intent endpoint if needed:
- `POST /payments/booking/create-intent/` - For booking flow payments

### 7.3.2 Create usePaymentSheet Hook

**File:** `src/hooks/usePaymentSheet.ts`

```typescript
/**
 * usePaymentSheet Hook
 *
 * Manages Stripe PaymentSheet lifecycle for collecting payments.
 * Supports both booking flow and invoice payments.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  useStripe,
  PaymentSheetError,
  InitPaymentSheetResult,
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
  const initialize = useCallback(async (
    clientSecret: string,
    customerConfig?: {
      customerId?: string;
      customerEphemeralKeySecret?: string;
    }
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isInitializing: true, error: null }));

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
        setState(prev => ({
          ...prev,
          isInitializing: false,
          error: error.message
        }));
        return false;
      }

      setState(prev => ({
        ...prev,
        isInitializing: false,
        isReady: true
      }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize payment';
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: message
      }));
      return false;
    }
  }, [initPaymentSheet]);

  // Present PaymentSheet
  const present = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!state.isReady) {
      return { success: false, error: 'Payment sheet not ready' };
    }

    setState(prev => ({ ...prev, isPresenting: true, error: null }));

    try {
      const { error } = await presentPaymentSheet();

      setState(prev => ({ ...prev, isPresenting: false }));

      if (error) {
        if (error.code === PaymentSheetError.Canceled) {
          // User cancelled - not an error
          return { success: false, error: 'Payment cancelled' };
        }

        const errorMessage = error.message || 'Payment failed';
        setState(prev => ({ ...prev, error: errorMessage }));
        options?.onError?.(errorMessage);
        return { success: false, error: errorMessage };
      }

      showToast('Payment successful!', 'success');
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setState(prev => ({ ...prev, isPresenting: false, error: message }));
      options?.onError?.(message);
      return { success: false, error: message };
    }
  }, [state.isReady, presentPaymentSheet, options, showToast]);

  // Complete flow: create intent -> initialize -> present
  const payInvoice = useCallback(async (invoiceId: number): Promise<{
    success: boolean;
    paymentIntentId?: string;
    error?: string;
  }> => {
    setState(prev => ({ ...prev, isInitializing: true, error: null }));

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
      setState(prev => ({ ...prev, isInitializing: false, error: message }));
      return { success: false, error: message };
    }
  }, [createIntent, initialize, present, state.error, options]);

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
```

### 7.3.3 Create useBookingPayment Hook

**File:** `src/hooks/booking/useBookingPayment.ts`

```typescript
/**
 * useBookingPayment Hook
 *
 * Specialized hook for handling payments within the booking flow.
 * Integrates with BookingContext and handles payment intent creation.
 */

import { useState, useCallback } from 'react';
import { useStripe, CardFieldInput } from '@stripe/stripe-react-native';
import { useMutation } from '@tanstack/react-query';
import { useBookingContext } from '@/contexts/BookingContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/utils/api';

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
}

export function useBookingPayment() {
  const { confirmPayment, createPaymentMethod } = useStripe();
  const { state, actions } = useBookingContext();
  const { showToast } = useToast();

  const [paymentState, setPaymentState] = useState<UseBookingPaymentState>({
    isCreatingIntent: false,
    isConfirming: false,
    cardComplete: false,
    error: null,
    paymentIntentId: null,
  });

  // Create payment intent for booking session
  const createPaymentIntent = useMutation({
    mutationFn: async (params: {
      sessionId: string;
      amount: number;
      paymentType: 'FULL' | 'DEPOSIT';
    }): Promise<BookingPaymentIntent> => {
      const response = await api.post('/payments/booking/create-intent/', {
        booking_session_id: params.sessionId,
        amount: Math.round(params.amount * 100), // Convert to cents
        payment_type: params.paymentType,
      });
      return response.data;
    },
  });

  // Handle card field change
  const handleCardChange = useCallback((details: CardFieldInput.Details) => {
    setPaymentState(prev => ({
      ...prev,
      cardComplete: details.complete,
      error: details.validationError?.message || null,
    }));
  }, []);

  // Initialize payment intent for current booking
  const initializePayment = useCallback(async (
    amount: number,
    paymentType: 'FULL' | 'DEPOSIT'
  ) => {
    if (!state.currentSession?.session_id) {
      setPaymentState(prev => ({
        ...prev,
        error: 'No active booking session'
      }));
      return null;
    }

    setPaymentState(prev => ({ ...prev, isCreatingIntent: true, error: null }));

    try {
      const intent = await createPaymentIntent.mutateAsync({
        sessionId: state.currentSession.session_id,
        amount,
        paymentType,
      });

      setPaymentState(prev => ({
        ...prev,
        isCreatingIntent: false,
        paymentIntentId: intent.payment_intent_id,
      }));

      return intent;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize payment';
      setPaymentState(prev => ({
        ...prev,
        isCreatingIntent: false,
        error: message,
      }));
      return null;
    }
  }, [state.currentSession, createPaymentIntent]);

  // Confirm payment with collected card details
  const confirmBookingPayment = useCallback(async (
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

    setPaymentState(prev => ({ ...prev, isConfirming: true, error: null }));

    try {
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: billingDetails || {},
        },
      });

      if (error) {
        setPaymentState(prev => ({
          ...prev,
          isConfirming: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      if (paymentIntent?.status === 'Succeeded') {
        setPaymentState(prev => ({ ...prev, isConfirming: false }));
        showToast('Payment successful!', 'success');
        return { success: true };
      }

      // Handle other statuses
      const statusMessage = `Payment status: ${paymentIntent?.status || 'unknown'}`;
      setPaymentState(prev => ({
        ...prev,
        isConfirming: false,
        error: statusMessage,
      }));
      return { success: false, error: statusMessage };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment confirmation failed';
      setPaymentState(prev => ({
        ...prev,
        isConfirming: false,
        error: message,
      }));
      return { success: false, error: message };
    }
  }, [paymentState.cardComplete, confirmPayment, showToast]);

  // Reset payment state
  const resetPayment = useCallback(() => {
    setPaymentState({
      isCreatingIntent: false,
      isConfirming: false,
      cardComplete: false,
      error: null,
      paymentIntentId: null,
    });
  }, []);

  return {
    ...paymentState,
    isLoading: paymentState.isCreatingIntent || paymentState.isConfirming,
    handleCardChange,
    initializePayment,
    confirmBookingPayment,
    resetPayment,
  };
}

export default useBookingPayment;
```

---

## 7.4 Payment Components

### 7.4.1 Create StripeCardField Component

**File:** `src/components/payment/StripeCardField.tsx`

```typescript
/**
 * StripeCardField
 *
 * Styled wrapper around Stripe's CardField component.
 * Provides consistent styling with LifePlace design system.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CardField, CardFieldInput } from '@stripe/stripe-react-native';
import { Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout } from '@/theme';

interface StripeCardFieldProps {
  onCardChange: (details: CardFieldInput.Details) => void;
  error?: string | null;
  disabled?: boolean;
  testID?: string;
}

export function StripeCardField({
  onCardChange,
  error,
  disabled = false,
  testID,
}: StripeCardFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Card Information</Text>

      <View style={[
        styles.fieldContainer,
        error && styles.fieldContainerError,
        disabled && styles.fieldContainerDisabled,
      ]}>
        <CardField
          postalCodeEnabled={false}
          placeholders={{
            number: '4242 4242 4242 4242',
            expiration: 'MM/YY',
            cvc: 'CVC',
          }}
          cardStyle={{
            backgroundColor: colors.neutral.white,
            textColor: colors.primary.black,
            textErrorColor: colors.semantic.error,
            placeholderColor: colors.neutral.gray,
            fontSize: 16,
            fontFamily: 'System',
          }}
          style={styles.cardField}
          onCardChange={onCardChange}
          testID={testID}
          disabled={disabled}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Warning size={14} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.brandsContainer}>
        <Text style={styles.acceptedText}>
          We accept Visa, Mastercard, and American Express
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  fieldContainer: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
    overflow: 'hidden',
  },
  fieldContainerError: {
    borderColor: colors.semantic.error,
  },
  fieldContainerDisabled: {
    backgroundColor: colors.neutral.sand,
    opacity: 0.7,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
  },
  brandsContainer: {
    marginTop: spacing.sm,
  },
  acceptedText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
});

export default StripeCardField;
```

### 7.4.2 Create PaymentConfirmationModal

**File:** `src/components/payment/PaymentConfirmationModal.tsx`

```typescript
/**
 * PaymentConfirmationModal
 *
 * Modal for confirming payment details before processing.
 * Shows amount breakdown and final confirmation.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Shield, X, Check, Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { formatCurrency } from '@/utils/currency';

interface PaymentConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  currency?: string;
  paymentType: 'FULL' | 'DEPOSIT';
  depositPercentage?: number;
  totalAmount?: number;
  isLoading?: boolean;
  error?: string | null;
}

export function PaymentConfirmationModal({
  visible,
  onClose,
  onConfirm,
  amount,
  currency = 'PHP',
  paymentType,
  depositPercentage,
  totalAmount,
  isLoading = false,
  error,
}: PaymentConfirmationModalProps) {
  const balanceDue = paymentType === 'DEPOSIT' && totalAmount
    ? totalAmount - amount
    : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Confirm Payment</Text>
          <TouchableOpacity onPress={onClose} disabled={isLoading}>
            <X size={24} color={colors.primary.black} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Amount Card */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>
              {paymentType === 'DEPOSIT'
                ? `Reservation Fee (${depositPercentage}%)`
                : 'Total Amount'
              }
            </Text>
            <Text style={styles.amountValue}>
              {formatCurrency(amount, { currency })}
            </Text>

            {paymentType === 'DEPOSIT' && balanceDue > 0 && (
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceText}>
                  Balance of {formatCurrency(balanceDue, { currency })} due before event
                </Text>
              </View>
            )}
          </View>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Shield size={20} color={colors.secondary.forest} weight="duotone" />
            <Text style={styles.securityText}>
              Your payment is secured with 256-bit SSL encryption
            </Text>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Warning size={18} color={colors.semantic.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              isLoading && styles.confirmButtonDisabled,
            ]}
            onPress={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.neutral.white} />
            ) : (
              <>
                <Check size={20} color={colors.neutral.white} weight="bold" />
                <Text style={styles.confirmButtonText}>
                  Pay {formatCurrency(amount, { currency })}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  title: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  amountCard: {
    backgroundColor: colors.primary.black,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  amountLabel: {
    ...typeScale.bodyMedium,
    color: colors.neutral.warmGray,
    marginBottom: spacing.xs,
  },
  amountValue: {
    ...typeScale.displaySmall,
    color: colors.neutral.white,
    fontWeight: '700',
  },
  balanceInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.darkGray,
  },
  balanceText: {
    ...typeScale.bodySmall,
    color: colors.neutral.warmGray,
    textAlign: 'center',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary.forestSubtle,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
  },
  securityText: {
    ...typeScale.bodySmall,
    color: colors.secondary.forestDark,
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.semantic.error + '10',
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    marginTop: spacing.md,
  },
  errorText: {
    ...typeScale.bodySmall,
    color: colors.semantic.error,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
  },
  cancelButtonText: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.secondary.forest,
    borderRadius: layout.borderRadius.md,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
});

export default PaymentConfirmationModal;
```

### 7.4.3 Component Index

**File:** `src/components/payment/index.ts`

```typescript
export { StripeCardField } from './StripeCardField';
export { PaymentConfirmationModal } from './PaymentConfirmationModal';
export { PaymentMethodCard } from './PaymentMethodCard';
export { PaymentPlanCard } from './PaymentPlanCard';
export { InstallmentSchedule } from './InstallmentSchedule';
```

---

## 7.5 Update PaymentStep

### 7.5.1 Enhanced PaymentStep Component

Update [src/components/booking/steps/PaymentStep.tsx](src/components/booking/steps/PaymentStep.tsx) to integrate Stripe:

**Key Changes:**
1. Add CardField component for Stripe gateway
2. Integrate useBookingPayment hook
3. Handle payment intent creation on gateway selection
4. Add payment confirmation flow
5. Handle card validation states

```typescript
// Key additions to existing PaymentStep:

import { CardField, CardFieldInput } from '@stripe/stripe-react-native';
import { useBookingPayment } from '@/hooks/booking/useBookingPayment';
import { StripeCardField } from '@/components/payment/StripeCardField';
import { PaymentConfirmationModal } from '@/components/payment/PaymentConfirmationModal';

// Inside component:
const {
  cardComplete,
  isLoading: isPaymentLoading,
  error: paymentError,
  handleCardChange,
  initializePayment,
  confirmBookingPayment,
} = useBookingPayment();

// Add card field when Stripe is selected
{selectedGateway === 'stripe' && (
  <View style={styles.cardFieldSection}>
    <StripeCardField
      onCardChange={handleCardChange}
      error={paymentError}
      disabled={isPaymentLoading}
    />
  </View>
)}
```

### 7.5.2 Update Data Change Handler

```typescript
const handleGatewaySelect = useCallback(async (gateway: PaymentGateway) => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setSelectedGateway(gateway);

  onDataChange({
    ...data,
    selected_gateway: gateway,
    payment_method: gateway === 'stripe' ? 'CREDIT_CARD' : gateway.toUpperCase(),
  });

  // Initialize payment intent for Stripe
  if (gateway === 'stripe') {
    await initializePayment(amountToPay, paymentOption === 'full' ? 'FULL' : 'DEPOSIT');
  }
}, [data, onDataChange, amountToPay, paymentOption, initializePayment]);
```

---

## 7.6 Add Payment Method Management

### 7.6.1 Create add-method Screen

**File:** `app/payments/add-method.tsx`

```typescript
/**
 * Add Payment Method Screen
 *
 * Allows authenticated users to add and save payment methods.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaretLeft, Check } from 'phosphor-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { StripeCardField } from '@/components/payment/StripeCardField';
import { Button } from '@/components/common/Button';
import { colors, spacing, typeScale, layout } from '@/theme';
import { useToast } from '@/contexts/ToastContext';
import api from '@/utils/api';

export default function AddPaymentMethodScreen() {
  const router = useRouter();
  const { createPaymentMethod } = useStripe();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Save payment method to backend
  const savePaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await api.post('/payments/client/payment-methods/', {
        stripe_payment_method_id: paymentMethodId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      showToast('Payment method added successfully', 'success');
      router.back();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to save payment method';
      showToast(message, 'error');
    },
  });

  const handleCardChange = (details: any) => {
    setCardComplete(details.complete);
    setCardError(details.validationError?.message || null);
  };

  const handleAddMethod = async () => {
    if (!cardComplete) {
      Alert.alert('Incomplete', 'Please complete the card details');
      return;
    }

    setIsLoading(true);

    try {
      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (error) {
        setCardError(error.message);
        setIsLoading(false);
        return;
      }

      if (paymentMethod) {
        await savePaymentMethod.mutateAsync(paymentMethod.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add payment method';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <CaretLeft size={24} color={colors.primary.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Payment Method</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.subtitle}>
          Add a credit or debit card for faster checkout
        </Text>

        <StripeCardField
          onCardChange={handleCardChange}
          error={cardError}
          disabled={isLoading}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your card information is securely stored with Stripe.
            We never store your full card number.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Add Card"
          onPress={handleAddMethod}
          loading={isLoading || savePaymentMethod.isPending}
          disabled={!cardComplete}
          icon={<Check size={20} color={colors.neutral.white} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  title: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.xl,
  },
  infoBox: {
    backgroundColor: colors.neutral.sand,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    marginTop: spacing.lg,
  },
  infoText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
});
```

### 7.6.2 Create SavedPaymentMethods Component

**File:** `src/components/payment/SavedPaymentMethods.tsx`

```typescript
/**
 * SavedPaymentMethods
 *
 * Displays and manages user's saved payment methods.
 * Allows selection for payment and management (delete, set default).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Check, Trash, Star } from 'phosphor-react-native';
import { useRouter } from 'expo-router';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useToast } from '@/contexts/ToastContext';
import api from '@/utils/api';

interface SavedPaymentMethod {
  id: number;
  last_four: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

interface SavedPaymentMethodsProps {
  selectedId?: number;
  onSelect?: (method: SavedPaymentMethod) => void;
  showAddButton?: boolean;
  allowManagement?: boolean;
}

export function SavedPaymentMethods({
  selectedId,
  onSelect,
  showAddButton = true,
  allowManagement = true,
}: SavedPaymentMethodsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch saved payment methods
  const { data: methods, isLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: async () => {
      const response = await api.get<SavedPaymentMethod[]>(
        '/payments/client/payment-methods/'
      );
      return response.data;
    },
  });

  // Delete payment method
  const deleteMethod = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/payments/client/payment-methods/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      showToast('Payment method removed', 'success');
    },
  });

  // Set default payment method
  const setDefault = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/payments/client/payment-methods/${id}/set_default/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      showToast('Default payment method updated', 'success');
    },
  });

  const getBrandIcon = (brand: string) => {
    // Could use brand-specific icons here
    return <CreditCard size={24} color={colors.primary.black} weight="duotone" />;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.secondary.forest} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved Cards</Text>

      {methods?.length === 0 ? (
        <Text style={styles.emptyText}>No saved payment methods</Text>
      ) : (
        <View style={styles.methodsList}>
          {methods?.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedId === method.id && styles.methodCardSelected,
              ]}
              onPress={() => onSelect?.(method)}
            >
              <View style={styles.methodLeft}>
                {getBrandIcon(method.brand)}
                <View>
                  <Text style={styles.methodBrand}>
                    {method.brand} •••• {method.last_four}
                  </Text>
                  <Text style={styles.methodExpiry}>
                    Expires {method.exp_month}/{method.exp_year}
                  </Text>
                </View>
              </View>

              <View style={styles.methodRight}>
                {method.is_default && (
                  <View style={styles.defaultBadge}>
                    <Star size={12} color={colors.accent.gold} weight="fill" />
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}

                {selectedId === method.id && (
                  <View style={styles.selectedCheck}>
                    <Check size={16} color={colors.neutral.white} weight="bold" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showAddButton && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/payments/add-method')}
        >
          <Plus size={20} color={colors.secondary.forest} />
          <Text style={styles.addButtonText}>Add New Card</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    padding: spacing.lg,
  },
  methodsList: {
    gap: spacing.sm,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.xs,
  },
  methodCardSelected: {
    borderColor: colors.secondary.forest,
    backgroundColor: colors.secondary.forestSubtle,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  methodBrand: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    textTransform: 'capitalize',
  },
  methodExpiry: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  methodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.accent.goldSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.full,
  },
  defaultText: {
    ...typeScale.labelSmall,
    color: colors.accent.gold,
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.secondary.forest,
  },
  addButtonText: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
  },
});

export default SavedPaymentMethods;
```

---

## 7.7 Payment Plan Support

### 7.7.1 Create usePaymentPlan Hook

**File:** `src/hooks/usePaymentPlan.ts`

```typescript
/**
 * usePaymentPlan Hook
 *
 * Manages payment plans and installment schedules.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import api from '@/utils/api';

export interface PaymentPlan {
  id: number;
  event_id: number;
  total_amount: string;
  currency: string;
  installments_count: number;
  installments: Installment[];
  created_at: string;
}

export interface Installment {
  id: number;
  payment_plan_id: number;
  installment_number: number;
  amount: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at?: string;
}

export const paymentPlanKeys = {
  all: ['paymentPlans'] as const,
  list: () => [...paymentPlanKeys.all, 'list'] as const,
  detail: (id: number) => [...paymentPlanKeys.all, 'detail', id] as const,
  installments: () => [...paymentPlanKeys.all, 'installments'] as const,
};

export function usePaymentPlans() {
  return useQuery({
    queryKey: paymentPlanKeys.list(),
    queryFn: async () => {
      const response = await api.get<PaymentPlan[]>('/payments/client/payment-plans/');
      return response.data;
    },
  });
}

export function usePaymentPlan(id: number) {
  return useQuery({
    queryKey: paymentPlanKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<PaymentPlan>(`/payments/client/payment-plans/${id}/`);
      return response.data;
    },
    enabled: id > 0,
  });
}

export function useInstallments() {
  return useQuery({
    queryKey: paymentPlanKeys.installments(),
    queryFn: async () => {
      const response = await api.get<Installment[]>('/payments/client/installments/');
      return response.data;
    },
  });
}

export function usePayInstallment() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      installmentId,
      paymentMethodId,
    }: {
      installmentId: number;
      paymentMethodId?: string;
    }) => {
      const response = await api.post(
        `/payments/client/installments/${installmentId}/pay/`,
        { payment_method_id: paymentMethodId }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentPlanKeys.all });
      showToast('Payment successful!', 'success');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Payment failed';
      showToast(message, 'error');
    },
  });
}
```

### 7.7.2 Create PaymentPlanCard Component

**File:** `src/components/payment/PaymentPlanCard.tsx`

```typescript
/**
 * PaymentPlanCard
 *
 * Displays a payment plan with progress and next installment info.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, CreditCard, CaretRight } from 'phosphor-react-native';
import { useRouter } from 'expo-router';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import type { PaymentPlan } from '@/hooks/usePaymentPlan';

interface PaymentPlanCardProps {
  plan: PaymentPlan;
  onPayNow?: () => void;
}

export function PaymentPlanCard({ plan, onPayNow }: PaymentPlanCardProps) {
  const router = useRouter();

  const paidInstallments = plan.installments.filter(i => i.status === 'paid').length;
  const progress = (paidInstallments / plan.installments_count) * 100;

  const nextInstallment = plan.installments.find(i => i.status === 'pending');
  const overdueInstallment = plan.installments.find(i => i.status === 'overdue');

  const totalPaid = plan.installments
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + parseFloat(i.amount), 0);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/payments/plans/${plan.id}`)}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Payment Plan</Text>
          <Text style={styles.subtitle}>
            {paidInstallments} of {plan.installments_count} payments
          </Text>
        </View>
        <CaretRight size={20} color={colors.neutral.gray} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            {formatCurrency(totalPaid, { currency: plan.currency })} paid
          </Text>
          <Text style={styles.progressText}>
            {formatCurrency(parseFloat(plan.total_amount), { currency: plan.currency })} total
          </Text>
        </View>
      </View>

      {/* Next Payment Info */}
      {(nextInstallment || overdueInstallment) && (
        <View style={[
          styles.nextPayment,
          overdueInstallment && styles.nextPaymentOverdue,
        ]}>
          <View style={styles.nextPaymentInfo}>
            <Calendar
              size={18}
              color={overdueInstallment ? colors.semantic.error : colors.secondary.forest}
            />
            <View>
              <Text style={[
                styles.nextPaymentLabel,
                overdueInstallment && styles.textError,
              ]}>
                {overdueInstallment ? 'Overdue' : 'Next Payment'}
              </Text>
              <Text style={styles.nextPaymentAmount}>
                {formatCurrency(
                  parseFloat((overdueInstallment || nextInstallment)!.amount),
                  { currency: plan.currency }
                )}
              </Text>
            </View>
          </View>

          {onPayNow && (
            <TouchableOpacity
              style={[
                styles.payNowButton,
                overdueInstallment && styles.payNowButtonUrgent,
              ]}
              onPress={onPayNow}
            >
              <CreditCard size={16} color={colors.neutral.white} />
              <Text style={styles.payNowText}>Pay Now</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  subtitle: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral.sand,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary.forest,
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  progressText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  nextPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.secondary.forestSubtle,
    padding: spacing.sm,
    borderRadius: layout.borderRadius.md,
  },
  nextPaymentOverdue: {
    backgroundColor: colors.semantic.error + '10',
  },
  nextPaymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextPaymentLabel: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
  },
  nextPaymentAmount: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
  },
  textError: {
    color: colors.semantic.error,
  },
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary.forest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.borderRadius.md,
  },
  payNowButtonUrgent: {
    backgroundColor: colors.semantic.error,
  },
  payNowText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
});

export default PaymentPlanCard;
```

### 7.7.3 Create InstallmentSchedule Component

**File:** `src/components/payment/InstallmentSchedule.tsx`

```typescript
/**
 * InstallmentSchedule
 *
 * Displays the full installment schedule for a payment plan.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Clock, Warning } from 'phosphor-react-native';
import { format } from 'date-fns';

import { colors, spacing, typeScale, layout } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import type { Installment } from '@/hooks/usePaymentPlan';

interface InstallmentScheduleProps {
  installments: Installment[];
  currency?: string;
}

export function InstallmentSchedule({
  installments,
  currency = 'PHP'
}: InstallmentScheduleProps) {
  const getStatusIcon = (status: Installment['status']) => {
    switch (status) {
      case 'paid':
        return <Check size={16} color={colors.semantic.success} weight="bold" />;
      case 'overdue':
        return <Warning size={16} color={colors.semantic.error} weight="bold" />;
      default:
        return <Clock size={16} color={colors.neutral.gray} />;
    }
  };

  const getStatusColor = (status: Installment['status']) => {
    switch (status) {
      case 'paid':
        return colors.semantic.success;
      case 'overdue':
        return colors.semantic.error;
      default:
        return colors.neutral.darkGray;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Schedule</Text>

      <View style={styles.timeline}>
        {installments.map((installment, index) => (
          <View key={installment.id} style={styles.installmentRow}>
            {/* Timeline dot and line */}
            <View style={styles.timelineIndicator}>
              <View style={[
                styles.dot,
                { backgroundColor: getStatusColor(installment.status) }
              ]}>
                {getStatusIcon(installment.status)}
              </View>
              {index < installments.length - 1 && (
                <View style={[
                  styles.line,
                  installment.status === 'paid' && styles.lineCompleted
                ]} />
              )}
            </View>

            {/* Installment details */}
            <View style={styles.installmentDetails}>
              <View style={styles.installmentHeader}>
                <Text style={styles.installmentNumber}>
                  Payment {installment.installment_number}
                </Text>
                <Text style={[
                  styles.installmentStatus,
                  { color: getStatusColor(installment.status) }
                ]}>
                  {installment.status.charAt(0).toUpperCase() + installment.status.slice(1)}
                </Text>
              </View>

              <View style={styles.installmentMeta}>
                <Text style={styles.installmentAmount}>
                  {formatCurrency(parseFloat(installment.amount), { currency })}
                </Text>
                <Text style={styles.installmentDate}>
                  {installment.status === 'paid' && installment.paid_at
                    ? `Paid ${format(new Date(installment.paid_at), 'MMM d, yyyy')}`
                    : `Due ${format(new Date(installment.due_date), 'MMM d, yyyy')}`
                  }
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.lg,
  },
  timeline: {
    gap: 0,
  },
  installmentRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 32,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.neutral.warmGray,
    marginVertical: spacing.xs,
  },
  lineCompleted: {
    backgroundColor: colors.semantic.success,
  },
  installmentDetails: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  installmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  installmentNumber: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
  },
  installmentStatus: {
    ...typeScale.labelSmall,
    fontWeight: '600',
  },
  installmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  installmentAmount: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  installmentDate: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
});

export default InstallmentSchedule;
```

---

## 7.8 Testing & Verification

### 7.8.1 EAS Build Configuration

Create development build for Stripe testing:

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS Build
eas build:configure

# Create development build for iOS
eas build --profile development --platform ios

# Create development build for Android
eas build --profile development --platform android
```

### 7.8.2 Test Scenarios

| Scenario | Test Steps | Expected Result |
|----------|------------|-----------------|
| Stripe Card Entry | Enter valid test card (4242 4242 4242 4242) | Card field shows valid state |
| Invalid Card | Enter invalid card number | Shows validation error |
| Expired Card | Use test card with past expiry | Shows expiry error |
| Payment Success | Complete payment with test card | Payment confirmed, success toast |
| Payment Failure | Use declining test card (4000 0000 0000 0002) | Shows failure error |
| Saved Methods | Add card, view in saved methods | Card appears in list |
| Payment Plan | View payment plan with installments | Shows progress and schedule |

### 7.8.3 Stripe Test Cards

| Card Number | Scenario |
|-------------|----------|
| 4242 4242 4242 4242 | Succeeds |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0027 6000 3184 | 3D Secure required |

---

## 7.9 Implementation Checklist

### Phase 7.1: Stripe SDK Setup
- [ ] Install @stripe/stripe-react-native
- [ ] Update app.json with Stripe plugin
- [ ] Create/update app.config.js for env vars
- [ ] Verify EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env

### Phase 7.2: StripeProvider
- [ ] Create `src/providers/StripeProvider.tsx`
- [ ] Add StripeProvider to root layout
- [ ] Create `src/providers/index.ts` export

### Phase 7.3: Payment Hooks
- [ ] Create `src/hooks/usePaymentSheet.ts`
- [ ] Create `src/hooks/booking/useBookingPayment.ts`
- [ ] Update `src/hooks/booking/index.ts` exports

### Phase 7.4: Payment Components
- [ ] Create `src/components/payment/StripeCardField.tsx`
- [ ] Create `src/components/payment/PaymentConfirmationModal.tsx`
- [ ] Create `src/components/payment/index.ts`

### Phase 7.5: PaymentStep Update
- [ ] Update `src/components/booking/steps/PaymentStep.tsx`
- [ ] Add Stripe CardField integration
- [ ] Implement payment confirmation flow

### Phase 7.6: Payment Methods
- [ ] Create `app/payments/add-method.tsx`
- [ ] Create `src/components/payment/SavedPaymentMethods.tsx`
- [ ] Update payments navigation

### Phase 7.7: Payment Plans
- [ ] Create `src/hooks/usePaymentPlan.ts`
- [ ] Create `src/components/payment/PaymentPlanCard.tsx`
- [ ] Create `src/components/payment/InstallmentSchedule.tsx`

### Phase 7.8: Testing
- [ ] Configure EAS Build profiles
- [ ] Create development build
- [ ] Test all payment scenarios
- [ ] Verify error handling

---

## File Structure Summary

```
mobile-app/
├── app.json                          # Updated with Stripe plugin
├── app.config.js                     # Environment variable handling
├── app/
│   ├── _layout.tsx                   # Updated with StripeProvider
│   └── payments/
│       ├── add-method.tsx            # NEW: Add payment method screen
│       └── plans/
│           └── [id].tsx              # NEW: Payment plan detail
├── src/
│   ├── providers/
│   │   ├── index.ts                  # NEW: Provider exports
│   │   └── StripeProvider.tsx        # NEW: Stripe context provider
│   ├── hooks/
│   │   ├── usePaymentSheet.ts        # NEW: PaymentSheet hook
│   │   ├── usePaymentPlan.ts         # NEW: Payment plan hook
│   │   └── booking/
│   │       └── useBookingPayment.ts  # NEW: Booking payment hook
│   └── components/
│       ├── payment/
│       │   ├── index.ts              # NEW: Payment component exports
│       │   ├── StripeCardField.tsx   # NEW: Styled card input
│       │   ├── PaymentConfirmationModal.tsx # NEW: Confirm modal
│       │   ├── SavedPaymentMethods.tsx      # NEW: Saved cards list
│       │   ├── PaymentPlanCard.tsx          # NEW: Plan summary card
│       │   └── InstallmentSchedule.tsx      # NEW: Schedule display
│       └── booking/
│           └── steps/
│               └── PaymentStep.tsx   # UPDATED: Stripe integration
```

---

## Dependencies Added

```json
{
  "dependencies": {
    "@stripe/stripe-react-native": "^0.x.x"
  }
}
```

---

## Security Considerations

1. **Never log full card numbers** - Only last 4 digits
2. **Use SecureStore for sensitive data** - Payment tokens if needed
3. **Validate amounts server-side** - Don't trust client amounts
4. **Implement rate limiting** - Prevent payment spam
5. **Handle webhook signatures** - Verify Stripe webhooks
6. **PCI Compliance** - Stripe handles card data, we never see full numbers

---

## Notes

- This phase requires **EAS development builds** - Expo Go will not work
- Backend must have payment intent creation endpoints ready
- Apple Pay requires merchant ID configuration in Apple Developer account
- Google Pay requires Google Pay API setup in Google Play Console
- Test thoroughly with Stripe test mode before going live
