/**
 * Booking Flow Entry - Introduction Step
 *
 * Entry point for a specific booking flow. Loads flow configuration
 * and displays the introduction step.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, spacing, typeScale } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { useBookingFlow, useStartSession } from '@/hooks/booking';
import { BookingContainer } from '@/components/booking';
import { ErrorHandler } from '@/utils/errorHandler';

export default function BookingFlowScreen() {
  const { flowId } = useLocalSearchParams<{ flowId: string }>();
  const { state, actions } = useBookingContext();
  const numericFlowId = flowId ? parseInt(flowId, 10) : 0;

  const {
    data: flow,
    isLoading: flowLoading,
    error: flowError,
  } = useBookingFlow(numericFlowId);

  const startSessionMutation = useStartSession();

  // Initialize session when flow loads
  useEffect(() => {
    if (flow && !state.currentSession) {
      startSessionMutation.mutate(
        {
          flowId: numericFlowId,
        },
        {
          onSuccess: async (response) => {
            // Load the session into context
            await actions.loadSession(response.session_id);
            actions.selectFlow(flow);
          },
          onError: (error) => {
            ErrorHandler.handle(error, {
              context: 'Starting booking session',
              showNotification: true,
            });
          },
        }
      );
    }
  }, [flow, numericFlowId, state.currentSession]);

  // Update progress when flow changes
  useEffect(() => {
    if (flow?.steps && flow.steps.length > 0 && state.progress.currentStepIndex === 0) {
      actions.goToStep(0);
    }
  }, [flow?.steps]);

  if (flowLoading || startSessionMutation.isPending) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Loading booking...</Text>
      </View>
    );
  }

  if (flowError || !flow) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to Load Booking</Text>
        <Text style={styles.errorText}>
          {flowError?.message || 'The booking flow could not be found. Please try again.'}
        </Text>
      </View>
    );
  }

  return <BookingContainer />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.sand,
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.sand,
    padding: spacing.xxl,
  },
  errorTitle: {
    ...typeScale.titleMedium,
    color: colors.semantic.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
});
