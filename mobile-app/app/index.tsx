/**
 * Root Index
 *
 * Entry point that redirects based on authentication state.
 *
 * BEHAVIOR:
 * - If authenticated -> redirect to (tabs)
 * - If not authenticated -> redirect to (auth)/login
 * - While loading -> show loading indicator
 */

import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme';

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // Show loading while hydrating auth state from SecureStore
  if (!isHydrated) {
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

  // Redirect based on auth state
  // Note: Using "/" redirects to (tabs)/index, "/login" to (auth)/login
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
