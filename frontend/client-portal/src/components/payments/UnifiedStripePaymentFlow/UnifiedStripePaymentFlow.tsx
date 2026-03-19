// frontend/client-portal/src/components/payments/UnifiedStripePaymentFlow/UnifiedStripePaymentFlow.tsx

import React, { useMemo, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type {
  UnifiedStripePaymentFlowProps,
  PaymentFlowError,
} from '@/types/unified-payment-flow.types';
import { useStripePaymentLogic } from './useStripePaymentLogic';
import { PaymentFormContent } from './PaymentFormContent';
import { IntentLoading, IntentError, StripeLoading } from './PaymentLoadingStates';

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
  const {
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
  } = useStripePaymentLogic({
    config,
    onSuccess,
    onError,
    isAuthenticated,
    debugMode,
  });

  if (intentLoading) {
    return <IntentLoading />;
  }

  if (intentError) {
    return <IntentError message={intentError} />;
  }

  return (
    <PaymentFormContent
      modeConfig={modeConfig}
      amountText={amountText}
      processing={processing}
      error={error}
      cardState={cardState}
      stripeReady={!!stripe}
      disabled={disabled}
      loading={loading}
      showSecurityBadge={showSecurityBadge}
      showPoweredByStripe={showPoweredByStripe}
      onCancel={onCancel}
      onSubmit={handlePaymentSubmit}
      onCardChange={handleCardChange}
      cardElementOptions={cardElementOptions}
    />
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
  const publishableKey = useMemo(() => {
    return (
      (gateway.public_config?.publishable_key as string) || import.meta.env.VITE_STRIPE_PUBLIC_KEY
    );
  }, [gateway.public_config?.publishable_key]);

  const stripePromise = useMemo(() => {
    if (publishableKey) {
      return loadStripe(publishableKey);
    }
    return null;
  }, [publishableKey]);

  useEffect(() => {
    if (!publishableKey) {
      const errorResult: PaymentFlowError = {
        type: 'backend',
        message: 'Stripe publishable key not configured',
      };
      onError(errorResult);
    }
  }, [publishableKey, onError]);

  if (!stripePromise) {
    return <StripeLoading />;
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
