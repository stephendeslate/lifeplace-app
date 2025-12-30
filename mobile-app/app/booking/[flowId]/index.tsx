/**
 * Booking Flow Entry - Introduction Step
 *
 * Entry point for a specific booking flow. Loads flow configuration
 * and displays the introduction step.
 */

import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { X } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout } from '@/theme';
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

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  if (flowLoading || startSessionMutation.isPending) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Loading...</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.neutral.darkGray} weight="bold" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary.black} />
          <Text style={styles.loadingText}>Loading booking...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (flowError || !flow) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Error</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.neutral.darkGray} weight="bold" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>Unable to Load Booking</Text>
          <Text style={styles.errorText}>
            {flowError?.message || 'The booking flow could not be found. Please try again.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <BookingContainer />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.neutral.sand,
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.neutral.sand,
  },
  errorContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.sand,
  },
  headerTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.neutral.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
