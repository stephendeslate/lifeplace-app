/**
 * SliderField - Range Slider Field
 *
 * Slider for selecting a value within a range.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Warning, Minus, Plus } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';
import * as Haptics from 'expo-haptics';

interface SliderFieldProps {
  field: QuestionnaireField;
  value: number | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

export function SliderField({ field, value, onChange, error }: SliderFieldProps) {
  const [displayValue, setDisplayValue] = useState(value);

  const {
    label,
    help_text,
    is_required,
    validation_rules,
  } = field;

  const min = validation_rules?.min_value ?? 0;
  const max = validation_rules?.max_value ?? 100;
  const step = validation_rules?.step ?? 1;
  const unit = validation_rules?.unit || '';

  const currentValue = value ?? min;

  const handleChange = useCallback((newValue: number) => {
    setDisplayValue(newValue);
  }, []);

  const handleComplete = useCallback(async (newValue: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: newValue,
    });
  }, [field.id, field.field_type, onChange]);

  const formatValue = (val: number): string => {
    if (unit === '%') return `${val}%`;
    if (unit) return `${val} ${unit}`;
    return val.toString();
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {is_required && <Text style={styles.required}>*</Text>}
      </View>

      {/* Slider Container */}
      <View style={[styles.sliderContainer, error && styles.sliderContainerError]}>
        {/* Value Display */}
        <View style={styles.valueDisplay}>
          <Text style={styles.valueText}>
            {formatValue(displayValue ?? currentValue)}
          </Text>
        </View>

        {/* Slider */}
        <View style={styles.sliderRow}>
          <Minus size={16} color={colors.neutral.gray} />
          <Slider
            style={styles.slider}
            minimumValue={min}
            maximumValue={max}
            step={step}
            value={currentValue}
            onValueChange={handleChange}
            onSlidingComplete={handleComplete}
            minimumTrackTintColor={colors.primary.black}
            maximumTrackTintColor={colors.neutral.warmGray}
            thumbTintColor={colors.primary.black}
          />
          <Plus size={16} color={colors.neutral.gray} />
        </View>

        {/* Range Labels */}
        <View style={styles.rangeLabels}>
          <Text style={styles.rangeLabel}>{formatValue(min)}</Text>
          <Text style={styles.rangeLabel}>{formatValue(max)}</Text>
        </View>
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
  sliderContainer: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral.warmGray,
    padding: spacing.md,
    ...shadows.xs,
  },
  sliderContainerError: {
    borderColor: colors.semantic.error,
  },
  valueDisplay: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  valueText: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    fontWeight: '700',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  rangeLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
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

export default SliderField;
