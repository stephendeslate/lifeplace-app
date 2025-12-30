/**
 * Deletion Step Indicator Component
 *
 * Progress indicator for the account deletion flow.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'phosphor-react-native';

import { colors, spacing, typeScale } from '@/theme';
import type { DeletionStep } from '@/types/privacy.types';

interface DeletionStepIndicatorProps {
  currentStep: DeletionStep;
}

const STEPS: { key: DeletionStep; label: string }[] = [
  { key: 'warning', label: 'Warning' },
  { key: 'verification', label: 'Verify' },
  { key: 'confirmation', label: 'Confirm' },
];

export function DeletionStepIndicator({ currentStep }: DeletionStepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === STEPS.length - 1;

        return (
          <React.Fragment key={step.key}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isCurrent && styles.circleCurrent,
                ]}
              >
                {isCompleted ? (
                  <Check size={14} color={colors.neutral.white} weight="bold" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      (isCompleted || isCurrent) && styles.stepNumberActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  (isCompleted || isCurrent) && styles.stepLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>

            {!isLast && (
              <View
                style={[
                  styles.connector,
                  isCompleted && styles.connectorCompleted,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  stepItem: {
    alignItems: 'center',
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral.white,
    borderWidth: 2,
    borderColor: colors.neutral.warmGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: colors.semantic.error,
    borderColor: colors.semantic.error,
  },
  circleCurrent: {
    borderColor: colors.semantic.error,
  },
  stepNumber: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    fontWeight: '600',
  },
  stepNumberActive: {
    color: colors.semantic.error,
  },
  stepLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  stepLabelActive: {
    color: colors.primary.black,
    fontWeight: '600',
  },
  connector: {
    width: 40,
    height: 2,
    backgroundColor: colors.neutral.warmGray,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.lg, // Offset for label
  },
  connectorCompleted: {
    backgroundColor: colors.semantic.error,
  },
});
