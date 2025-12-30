/**
 * Packages Layout
 */

import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function PackagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.neutral.cream },
      }}
    />
  );
}
