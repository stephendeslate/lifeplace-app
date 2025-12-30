/**
 * Booking Index Screen
 *
 * Event type selection screen - entry point for booking flow.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { EventTypeSelection } from '@/components/booking';
import type { EventType } from '@/types/booking';

export default function BookingIndexScreen() {
  const { state, actions } = useBookingContext();

  const handleSelectEventType = useCallback(async (eventType: EventType) => {
    try {
      // Select the event type and fetch available flows
      await actions.selectEventType(eventType);

      // Get the first available flow for this event type
      const flows = state.availableFlows.filter(
        (flow) => flow.event_type?.id === eventType.id || !flow.event_type
      );

      if (flows.length === 1) {
        // If only one flow, start it directly
        actions.selectFlow(flows[0]);
        const sessionId = await actions.startSession(flows[0].id);
        router.push(`/booking/${flows[0].id}`);
      } else if (flows.length > 1) {
        // If multiple flows, could show a flow selector (for now, pick the first)
        actions.selectFlow(flows[0]);
        const sessionId = await actions.startSession(flows[0].id);
        router.push(`/booking/${flows[0].id}`);
      } else {
        // No flows available for this event type - still try to start
        const allFlows = state.availableFlows;
        if (allFlows.length > 0) {
          actions.selectFlow(allFlows[0]);
          const sessionId = await actions.startSession(allFlows[0].id);
          router.push(`/booking/${allFlows[0].id}`);
        }
      }
    } catch (error) {
      console.error('Failed to start booking:', error);
    }
  }, [actions, state.availableFlows]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.cream} />
      <EventTypeSelection
        onSelectEventType={handleSelectEventType}
        selectedEventTypeId={state.selectedEventType?.id}
        title="Plan Your Event"
        subtitle="Select the type of event you'd like to book with us"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
});
