/**
 * Root Layout
 *
 * This is the entry point for the app's navigation structure.
 *
 * PROVIDER HIERARCHY (order matters!):
 * 1. GestureHandlerRootView - Required for gestures (swipe, pan, etc.)
 * 2. SafeAreaProvider - Provides safe area insets (notch, home indicator)
 * 3. QueryClientProvider - React Query for server state
 * 4. StripeProvider - Stripe payment processing context
 * 5. AuthProvider - Authentication state and methods
 * 6. ToastProvider - Global toast notifications
 *
 * NAVIGATION STRUCTURE:
 * - (auth) - Auth screens (login, register) - shown when not authenticated
 * - (tabs) - Main app with bottom tabs - shown when authenticated
 * - events - Event screens (has nested [id] route)
 * - payments - Payment screens (has nested [id] route)
 * - contracts - Contract screens (has nested [id] route)
 * - quotes - Quote screens (has nested [id] route)
 * - actions - Action center
 */

import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as SplashScreen from 'expo-splash-screen';

import { queryClient } from '@/utils/queryClient';
import { asyncStoragePersister, shouldPersistQuery } from '@/utils/queryPersister';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { StripeProvider } from '@/providers/StripeProvider';
import { SecurityProvider } from '@/providers/SecurityProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { SessionTimeoutWarning } from '@/components/common/SessionTimeoutWarning';
import { useAuthStore } from '@/stores/authStore';
import { useDeepLinking } from '@/hooks/useDeepLinking';
import { useNotifications } from '@/hooks/useNotifications';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useOfflineMutations } from '@/hooks/useOfflineMutations';
import { crashReporter } from '@/utils/crashReporting';
import { colors } from '@/theme';

// Prevent splash screen from auto-hiding until we're ready
SplashScreen.preventAutoHideAsync();

// =============================================================================
// NOTIFICATION INITIALIZER
// =============================================================================

/**
 * Initializes push notifications when the app starts.
 * Must be rendered inside AuthProvider and ToastProvider.
 */
function NotificationInitializer() {
  useNotifications();
  return null;
}

// =============================================================================
// OFFLINE MUTATIONS PROCESSOR
// =============================================================================

/**
 * Processes queued offline mutations when the device comes back online.
 * Must be rendered inside ToastProvider.
 */
function OfflineMutationsProcessor() {
  useOfflineMutations();
  return null;
}

// =============================================================================
// SESSION TIMEOUT MANAGER
// =============================================================================

/**
 * Manages session timeout with warning modal.
 * Must be rendered inside AuthProvider and ToastProvider.
 */
function SessionTimeoutManager() {
  const { logout } = useAuthContext();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  const handleWarning = useCallback((remaining: number) => {
    setRemainingMs(remaining);
    setShowWarning(true);
  }, []);

  const handleTimeout = useCallback(() => {
    setShowWarning(false);
  }, []);

  const { updateActivity } = useSessionTimeout({
    enabled: true,
    timeoutMs: 30 * 60 * 1000, // 30 minutes
    warningMs: 5 * 60 * 1000, // 5 minutes before timeout
    onWarning: handleWarning,
    onTimeout: handleTimeout,
  });

  const handleContinue = useCallback(async () => {
    await updateActivity();
    setShowWarning(false);
  }, [updateActivity]);

  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    await logout();
  }, [logout]);

  return (
    <SessionTimeoutWarning
      visible={showWarning}
      remainingMs={remainingMs}
      onContinue={handleContinue}
      onLogout={handleLogout}
    />
  );
}

// =============================================================================
// ROOT LAYOUT
// =============================================================================

export default function RootLayout() {
  // Wait for auth hydration before hiding splash screen
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // Initialize deep linking handler
  useDeepLinking({
    handleInitialLink: true,
    onDeepLinkReceived: (url) => {
      console.log('Deep link received:', url);
    },
  });

  useEffect(() => {
    if (isHydrated) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isHydrated]);

  return (
    <ErrorBoundary
      onError={(error) => {
        crashReporter.captureException(error, { location: 'RootErrorBoundary' });
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <SecurityProvider>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{
                persister: asyncStoragePersister,
                maxAge: 1000 * 60 * 60 * 24, // 24 hours
                dehydrateOptions: {
                  shouldDehydrateQuery: (query) => {
                    return (
                      query.state.status === 'success' &&
                      shouldPersistQuery(query.queryKey)
                    );
                  },
                },
              }}
            >
              <StripeProvider>
                <AuthProvider>
                  <ToastProvider>
                    <NotificationInitializer />
                    <OfflineMutationsProcessor />
                    <SessionTimeoutManager />
                    <OfflineBanner />
                    <StatusBar style="dark" />
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.neutral.cream },
                        animation: 'slide_from_right',
                      }}
                    >
                      {/* Main entry point - will redirect based on auth state */}
                      <Stack.Screen name="index" />

                      {/* Auth screens - fade transition */}
                      <Stack.Screen
                        name="(auth)"
                        options={{
                          animation: 'fade',
                        }}
                      />

                      {/* Main app with tabs - fade transition */}
                      <Stack.Screen
                        name="(tabs)"
                        options={{
                          animation: 'fade',
                        }}
                      />

                      {/* Events section - has its own _layout.tsx for nested routes */}
                      <Stack.Screen name="events" />

                      {/* Payments section - has its own _layout.tsx for nested routes */}
                      <Stack.Screen name="payments" />

                      {/* Contracts section - has its own _layout.tsx for nested routes */}
                      <Stack.Screen name="contracts" />

                      {/* Quotes section - has its own _layout.tsx for nested routes */}
                      <Stack.Screen name="quotes" />

                      {/* Action Center */}
                      <Stack.Screen name="actions" />

                      {/* Settings */}
                      <Stack.Screen name="settings" />
                    </Stack>
                  </ToastProvider>
                </AuthProvider>
              </StripeProvider>
            </PersistQueryClientProvider>
          </SecurityProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
