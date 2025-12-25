/**
 * Root Layout
 *
 * This is the entry point for the app's navigation structure.
 *
 * PROVIDER HIERARCHY (order matters!):
 * 1. GestureHandlerRootView - Required for gestures (swipe, pan, etc.)
 * 2. SafeAreaProvider - Provides safe area insets (notch, home indicator)
 * 3. QueryClientProvider - React Query for server state
 * 4. AuthProvider - Authentication state and methods
 * 5. ToastProvider - Global toast notifications
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

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';

import { queryClient } from '@/utils/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { useAuthStore } from '@/stores/authStore';
import { useDeepLinking } from '@/hooks/useDeepLinking';
import { colors } from '@/theme';

// Prevent splash screen from auto-hiding until we're ready
SplashScreen.preventAutoHideAsync();

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
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
              </Stack>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
