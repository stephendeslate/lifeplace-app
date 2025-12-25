/**
 * Events Stack Layout
 *
 * Handles navigation within the events section.
 */

import { Stack } from 'expo-router';

export default function EventsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="[id]/index" />
    </Stack>
  );
}
