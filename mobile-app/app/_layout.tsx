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
 * - booking - Booking flow (slides up from bottom)
 * - events/[id] - Event detail (pushes from right)
 * - And other detail screens...
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
import { colors } from '@/theme';

// Prevent splash screen from auto-hiding until we're ready
SplashScreen.preventAutoHideAsync();

// =============================================================================
// ROOT LAYOUT
// =============================================================================

export default function RootLayout() {
  // Wait for auth hydration before hiding splash screen
  const isHydrated = useAuthStore((state) => state.isHydrated);

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

                {/* Booking flow - slides up from bottom */}
                <Stack.Screen
                  name="booking"
                  options={{
                    presentation: 'card',
                    animation: 'slide_from_bottom',
                  }}
                />

                {/* Event detail - standard push */}
                <Stack.Screen name="events/[id]" />

                {/* Payment screens - standard push */}
                <Stack.Screen name="payments/[id]" />

                {/* Contract screens - standard push */}
                <Stack.Screen name="contracts/[id]" />

                {/* Quote screens - standard push */}
                <Stack.Screen name="quotes/[id]" />
              </Stack>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
