/**
 * BookingProgressIndicator
 *
 * Visual progress indicator for booking flow steps.
 * Supports linear, stepper, and compact variants.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Check } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout } from '@/theme';
import type { BookingFlowStep } from '@/types/booking';

export type ProgressVariant = 'linear' | 'stepper' | 'compact';

interface BookingProgressIndicatorProps {
  steps: BookingFlowStep[];
  currentStepIndex: number;
  completedSteps: number[];
  variant?: ProgressVariant;
  showLabels?: boolean;
  onStepPress?: (stepIndex: number) => void;
  allowNavigation?: boolean;
}

export function BookingProgressIndicator({
  steps,
  currentStepIndex,
  completedSteps,
  variant = 'stepper',
  showLabels = false,
  onStepPress,
  allowNavigation = false,
}: BookingProgressIndicatorProps) {
  const totalSteps = steps.length;
  const progressPercentage = useMemo(() => {
    if (totalSteps === 0) return 0;
    return Math.round(((currentStepIndex + 1) / totalSteps) * 100);
  }, [currentStepIndex, totalSteps]);

  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId);
  const isStepAccessible = (index: number) => {
    if (!allowNavigation) return false;
    // Can access completed steps and the current step
    return index <= currentStepIndex || steps.slice(0, index).every((s) => isStepCompleted(s.id));
  };

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactText}>
          Step {currentStepIndex + 1} of {totalSteps}
        </Text>
        <View style={styles.compactBarContainer}>
          <View style={[styles.compactBarFill, { width: `${progressPercentage}%` }]} />
        </View>
      </View>
    );
  }

  if (variant === 'linear') {
    return (
      <View style={styles.linearContainer}>
        <View style={styles.linearBarContainer}>
          <Animated.View style={[styles.linearBarFill, { width: `${progressPercentage}%` }]} />
        </View>
        <Text style={styles.linearText}>{progressPercentage}% Complete</Text>
      </View>
    );
  }

  // Stepper variant (default)
  return (
    <View style={styles.stepperContainer}>
      <View style={styles.stepsRow}>
        {steps.map((step, index) => {
          const isCompleted = isStepCompleted(step.id);
          const isCurrent = index === currentStepIndex;
          const isAccessible = isStepAccessible(index);
          const isPast = index < currentStepIndex;

          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <View
                  style={[styles.connector, (isPast || isCompleted) && styles.connectorCompleted]}
                />
              )}
              <TouchableOpacity
                style={[
                  styles.stepDot,
                  isCompleted && styles.stepDotCompleted,
                  isCurrent && styles.stepDotCurrent,
                  !isCompleted && !isCurrent && styles.stepDotPending,
                ]}
                onPress={() => isAccessible && onStepPress?.(index)}
                disabled={!isAccessible}
                activeOpacity={isAccessible ? 0.7 : 1}
              >
                {isCompleted ? (
                  <Check size={14} color={colors.neutral.white} weight="bold" />
                ) : (
                  <Text style={[styles.stepNumber, isCurrent && styles.stepNumberCurrent]}>
                    {index + 1}
                  </Text>
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      {showLabels && (
        <View style={styles.labelsRow}>
          {steps.map((step, index) => {
            const isCurrent = index === currentStepIndex;
            return (
              <Text
                key={step.id}
                style={[styles.stepLabel, isCurrent && styles.stepLabelCurrent]}
                numberOfLines={1}
              >
                {step.title || getStepDisplayName(step.step_type)}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

function getStepDisplayName(stepType: string): string {
  const names: Record<string, string> = {
    introduction: 'Welcome',
    venue_selection: 'Venue',
    date_time: 'Date & Time',
    package_selection: 'Package',
    addon_selection: 'Add-ons',
    questionnaire: 'Details',
    pricing_summary: 'Summary',
    contact_info: 'Contact',
    payment_info: 'Payment',
    confirmation: 'Done',
  };
  return names[stepType] || stepType;
}

const styles = StyleSheet.create({
  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  compactBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: colors.neutral.warmGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactBarFill: {
    height: '100%',
    backgroundColor: colors.secondary.forest,
    borderRadius: 2,
  },

  // Linear variant
  linearContainer: {
    gap: spacing.xs,
  },
  linearBarContainer: {
    height: 6,
    backgroundColor: colors.neutral.warmGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  linearBarFill: {
    height: '100%',
    backgroundColor: colors.secondary.forest,
    borderRadius: 3,
  },
  linearText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },

  // Stepper variant
  stepperContainer: {
    gap: spacing.sm,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    height: 2,
    flex: 1,
    backgroundColor: colors.neutral.warmGray,
    marginHorizontal: spacing.xxs,
    maxWidth: 40,
  },
  connectorCompleted: {
    backgroundColor: colors.secondary.forest,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    backgroundColor: colors.secondary.forest,
  },
  stepDotCurrent: {
    backgroundColor: colors.primary.black,
  },
  stepDotPending: {
    backgroundColor: colors.neutral.warmGray,
  },
  stepNumber: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    fontWeight: '600',
  },
  stepNumberCurrent: {
    color: colors.neutral.white,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  stepLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    textAlign: 'center',
    flex: 1,
  },
  stepLabelCurrent: {
    color: colors.primary.black,
    fontWeight: '600',
  },
});

export default BookingProgressIndicator;
