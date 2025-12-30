/**
 * Settings Layout
 *
 * Layout for settings screens with consistent header styling.
 * Phase 10: Profile & Settings
 */

import { Stack } from 'expo-router';

import { colors, typeScale } from '@/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.neutral.cream,
        },
        headerTintColor: colors.primary.black,
        headerTitleStyle: {
          ...typeScale.titleMedium,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.neutral.cream,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="edit-profile"
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="change-password"
        options={{ title: 'Change Password' }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="privacy"
        options={{ title: 'Privacy & Data' }}
      />
      <Stack.Screen
        name="consent-history"
        options={{ title: 'Consent History' }}
      />
      <Stack.Screen
        name="my-data"
        options={{ title: 'My Data' }}
      />
      <Stack.Screen
        name="download-data"
        options={{ title: 'Download Data' }}
      />
      <Stack.Screen
        name="delete-account"
        options={{
          title: 'Delete Account',
          headerTintColor: colors.semantic.error,
        }}
      />
      <Stack.Screen
        name="help"
        options={{ title: 'Help & Support' }}
      />
      <Stack.Screen
        name="security"
        options={{ title: 'Security' }}
      />
      <Stack.Screen
        name="biometric"
        options={{ title: 'Biometric Authentication' }}
      />
    </Stack>
  );
}
