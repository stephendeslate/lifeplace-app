/**
 * Booking Flow Layout
 *
 * Wraps all booking screens with BookingProvider and handles session recovery.
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BookingProvider, useBookingContext } from '@/contexts/BookingContext';
import { SessionRecoverySheet } from '@/components/booking';
import { colors } from '@/theme';

function BookingLayoutContent() {
  const { state, actions } = useBookingContext();

  // Check for recoverable session on mount
  useEffect(() => {
    actions.checkForRecoverableSession();
  }, []);

  const handleResumeSession = async () => {
    if (state.recoverableSession) {
      await actions.recoverSession(state.recoverableSession.sessionId);
    }
  };

  const handleDiscardSession = async () => {
    await actions.discardRecoverableSession();
  };

  const handleDismissRecovery = () => {
    actions.clearRecoverableSession();
  };

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.neutral.white },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Choose Event Type',
          }}
        />
        <Stack.Screen
          name="[flowId]"
          options={{
            title: 'Booking',
            presentation: 'card',
          }}
        />
      </Stack>

      {/* Session Recovery Sheet */}
      <SessionRecoverySheet
        visible={state.showRecoveryPrompt}
        session={state.recoverableSession}
        onResume={handleResumeSession}
        onDiscard={handleDiscardSession}
        onDismiss={handleDismissRecovery}
      />
    </>
  );
}

export default function BookingLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BookingProvider>
        <BookingLayoutContent />
      </BookingProvider>
    </GestureHandlerRootView>
  );
}
