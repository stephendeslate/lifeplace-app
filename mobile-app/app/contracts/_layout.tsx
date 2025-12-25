/**
 * Contracts Layout
 *
 * Stack navigator for the contracts section.
 */

import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function ContractsLayout() {
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
