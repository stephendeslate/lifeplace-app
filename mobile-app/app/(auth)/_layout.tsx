/**
 * Auth Layout
 *
 * Stack navigation for authentication screens.
 *
 * BEHAVIOR:
 * - If user is already authenticated, redirect to main app
 * - Otherwise, show auth screens (login, register, etc.)
 *
 * EXPO ROUTER CONCEPTS:
 * - (auth) folder with parentheses is a "group" - doesn't affect URL
 * - _layout.tsx defines navigation for all screens in this folder
 * - Redirect component navigates programmatically
 *
 * NOTE: We use useAuthStore directly here instead of useAuth/useAuthContext
 * because expo-router initializes all layouts upfront, before the AuthProvider
 * in _layout.tsx wraps them. The Zustand store is available immediately.
 */

import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // Show loading while hydrating auth state
  if (!isHydrated || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.neutral.cream,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary.black} />
      </View>
    );
  }

  // If authenticated, redirect to main app
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  // Show auth screens
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.neutral.cream },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="accept-invitation/[id]" />
    </Stack>
  );
}
