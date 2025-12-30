/**
 * RatingField - Star Rating Field
 *
 * Star-based rating input.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star, Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';
import * as Haptics from 'expo-haptics';

interface RatingFieldProps {
  field: QuestionnaireField;
  value: number | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

export function RatingField({ field, value, onChange, error }: RatingFieldProps) {
  const {
    label,
    help_text,
    is_required,
    validation_rules,
  } = field;

  const maxStars = validation_rules?.max_value ?? 5;
  const currentValue = value ?? 0;

  const handleRate = async (rating: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Toggle off if clicking same rating
    const newValue = rating === currentValue ? 0 : rating;
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: newValue > 0 ? newValue : undefined,
    });
  };

  const getRatingLabel = (rating: number): string => {
    const labels: Record<number, string> = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent',
    };
    return labels[rating] || '';
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {is_required && <Text style={styles.required}>*</Text>}
      </View>

      {/* Rating Container */}
      <View style={[styles.ratingContainer, error && styles.ratingContainerError]}>
        <View style={styles.starsRow}>
          {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleRate(star)}
              style={styles.starButton}
            >
              <Star
                size={36}
                weight={star <= currentValue ? 'fill' : 'regular'}
                color={star <= currentValue ? colors.semantic.warning : colors.neutral.warmGray}
              />
            </TouchableOpacity>
          ))}
        </View>

        {currentValue > 0 && (
          <Text style={styles.ratingLabel}>
            {getRatingLabel(currentValue)}
          </Text>
        )}
      </View>

      {/* Help text */}
      {help_text && !error && (
        <Text style={styles.helpText}>{help_text}</Text>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorRow}>
          <Warning size={14} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  required: {
    ...typeScale.labelMedium,
    color: colors.semantic.error,
    marginLeft: spacing.xxs,
  },
  ratingContainer: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral.warmGray,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.xs,
  },
  ratingContainerError: {
    borderColor: colors.semantic.error,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  starButton: {
    padding: spacing.xxs,
  },
  ratingLabel: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  helpText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
  },
});

export default RatingField;
