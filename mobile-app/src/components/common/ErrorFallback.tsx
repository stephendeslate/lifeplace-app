/**
 * Error Fallback Component
 *
 * Lightweight error fallback for inline error states.
 * Use this for individual sections that might fail without
 * crashing the entire screen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WarningCircle, ArrowClockwise } from 'phosphor-react-native';

import { colors, spacing, typeScale } from '@/theme';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  message?: string;
}

export const ErrorFallback = ({
  error,
  resetError,
  title = 'Failed to load',
  message = 'Something went wrong. Please try again.',
}: ErrorFallbackProps) => {
  return (
    <View style={styles.container}>
      <WarningCircle size={48} color={colors.semantic.error} weight="light" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {resetError && (
        <TouchableOpacity style={styles.button} onPress={resetError}>
          <ArrowClockwise size={16} color={colors.tertiary.teal} />
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  message: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    ...typeScale.labelMedium,
    color: colors.tertiary.teal,
  },
});
