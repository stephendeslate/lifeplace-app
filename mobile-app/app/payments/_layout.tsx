/**
 * Payments Layout
 *
 * Stack navigator for the payments/financial section.
 */

import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function PaymentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.neutral.cream,
        },
      }}
    />
  );
}
