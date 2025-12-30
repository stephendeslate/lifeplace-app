/**
 * Venues Layout
 */

import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function VenuesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.neutral.cream },
      }}
    />
  );
}
