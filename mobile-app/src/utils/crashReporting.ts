/**
 * Crash Reporting Setup
 *
 * Placeholder for crash reporting service integration.
 * Replace with actual implementation when integrating:
 * - Sentry: npm install @sentry/react-native
 * - Firebase Crashlytics: included in expo-firebase-analytics
 * - Bugsnag: npm install @bugsnag/react-native
 */

interface CrashReporter {
  initialize: () => void;
  captureException: (error: Error, context?: Record<string, unknown>) => void;
  setUser: (userId: string | null) => void;
  addBreadcrumb: (message: string, category?: string) => void;
}

// Placeholder implementation - replace with actual crash reporting service
export const crashReporter: CrashReporter = {
  initialize: () => {
    if (__DEV__) {
      console.log('[CrashReporter] Initialized in development mode');
    }
    // TODO: Initialize Sentry/Crashlytics/Bugsnag
    // Example for Sentry:
    // Sentry.init({
    //   dsn: 'YOUR_SENTRY_DSN',
    //   enableAutoSessionTracking: true,
    //   sessionTrackingIntervalMillis: 30000,
    // });
  },

  captureException: (error: Error, context?: Record<string, unknown>) => {
    if (__DEV__) {
      console.error('[CrashReporter] Exception:', error.message, context);
    }
    // TODO: Send to crash reporting service
    // Example for Sentry:
    // Sentry.captureException(error, { extra: context });
  },

  setUser: (userId: string | null) => {
    if (__DEV__) {
      console.log('[CrashReporter] User set:', userId);
    }
    // TODO: Set user context in crash reporting service
    // Example for Sentry:
    // Sentry.setUser(userId ? { id: userId } : null);
  },

  addBreadcrumb: (message: string, category = 'app') => {
    if (__DEV__) {
      console.log(`[CrashReporter] Breadcrumb [${category}]:`, message);
    }
    // TODO: Add breadcrumb to crash reporting service
    // Example for Sentry:
    // Sentry.addBreadcrumb({ message, category });
  },
};
