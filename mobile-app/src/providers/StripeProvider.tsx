/**
 * StripeProvider
 *
 * Wraps the app with Stripe context for payment processing.
 * Must be placed inside GestureHandlerRootView but can be app-wide.
 */

import React, { type ReactElement } from 'react';
import { StripeProvider as StripeNativeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

interface StripeProviderProps {
  children: ReactElement | ReactElement[];
}

const STRIPE_PUBLISHABLE_KEY =
  Constants.expoConfig?.extra?.stripePublishableKey ||
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  '';

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
