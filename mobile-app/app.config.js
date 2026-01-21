/**
 * Expo App Configuration
 *
 * Dynamic configuration that extends app.json with environment variables.
 * This file enables runtime access to env vars via Constants.expoConfig.extra
 */

export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    // Stripe Configuration
    stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    // API Configuration
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    // Feature Flags
    enablePushNotifications: process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS === 'true',
    enableAnalytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
    // EAS Configuration (projectId from app.json is preserved via config.extra spread)
  },
});
