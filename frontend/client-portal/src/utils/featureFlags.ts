// Feature flags with type safety
export const featureFlags = {
  // Payment features
  ENABLE_PAYPAL: import.meta.env.VITE_ENABLE_PAYPAL === 'true',
  ENABLE_PAYMENT_PLANS: import.meta.env.VITE_ENABLE_PAYMENT_PLANS === 'true',

  // Booking features
  ENABLE_GUEST_BOOKING: import.meta.env.VITE_ENABLE_GUEST_BOOKING === 'true',

  // UI features
  ENABLE_PODCASTS: import.meta.env.VITE_ENABLE_PODCASTS !== 'false', // default true
  ENABLE_HELP_CENTER: import.meta.env.VITE_ENABLE_HELP_CENTER === 'true',

  // Development
  DEBUG_MODE: import.meta.env.VITE_DEBUG === 'true',
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => featureFlags[flag];
