/**
 * Quotes Layout
 *
 * Stack navigator for the quotes section.
 */

import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function QuotesLayout() {
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
