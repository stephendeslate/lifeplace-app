/**
 * ToggleField - Boolean Toggle/Switch Field
 *
 * Toggle switch for yes/no or true/false values.
 */

import React from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';
import * as Haptics from 'expo-haptics';

interface ToggleFieldProps {
  field: QuestionnaireField;
  value: boolean | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

export function ToggleField({ field, value, onChange, error }: ToggleFieldProps) {
  const {
    label,
    help_text,
    is_required,
    options,
  } = field;

  // Get custom labels from options if provided
  const onLabel = options?.find((o) => o.value === 'true')?.label || 'Yes';
  const offLabel = options?.find((o) => o.value === 'false')?.label || 'No';

  const handleToggle = async (newValue: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: newValue,
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toggleContainer, error && styles.toggleContainerError]}
        onPress={() => handleToggle(!value)}
        activeOpacity={0.8}
      >
        <View style={styles.labelContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{label}</Text>
            {is_required && <Text style={styles.required}>*</Text>}
          </View>
          {help_text && (
            <Text style={styles.helpText}>{help_text}</Text>
          )}
        </View>

        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, !value && styles.switchLabelActive]}>
            {offLabel}
          </Text>
          <Switch
            value={value || false}
            onValueChange={handleToggle}
            trackColor={{
              false: colors.neutral.warmGray,
              true: colors.secondary.forest,
            }}
            thumbColor={colors.neutral.white}
            ios_backgroundColor={colors.neutral.warmGray}
          />
          <Text style={[styles.switchLabel, value && styles.switchLabelActive]}>
            {onLabel}
          </Text>
        </View>
      </TouchableOpacity>

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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral.warmGray,
    padding: spacing.md,
    ...shadows.xs,
  },
  toggleContainerError: {
    borderColor: colors.semantic.error,
  },
  labelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  helpText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.xxs,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  switchLabelActive: {
    color: colors.primary.black,
    fontWeight: '600',
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

export default ToggleField;
