/**
 * Documents Layout
 *
 * Stack navigator for the documents section.
 */

import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function DocumentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
