/**
 * Actions Layout
 *
 * Stack navigator for the actions section.
 */

import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function ActionsLayout() {
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
