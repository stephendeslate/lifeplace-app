/**
 * SelectField - Single/Multiple Selection Field
 *
 * Radio buttons for single select, checkboxes for multi-select.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Circle, Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';
import * as Haptics from 'expo-haptics';

interface SelectFieldProps {
  field: QuestionnaireField;
  value: string | string[] | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

export function SelectField({ field, value, onChange, error }: SelectFieldProps) {
  const {
    label,
    help_text,
    is_required,
    options = [],
    field_type,
  } = field;

  const isMultiple = field_type === 'MULTISELECT' || field_type === 'CHECKBOX';
  const selectedValues = isMultiple
    ? Array.isArray(value) ? value : []
    : value;

  const handleSelect = async (optionValue: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isMultiple) {
      const current = Array.isArray(selectedValues) ? selectedValues : [];
      const newValue = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];

      onChange({
        field_id: field.id,
        field_type: field.field_type,
        value: newValue,
      });
    } else {
      onChange({
        field_id: field.id,
        field_type: field.field_type,
        value: optionValue,
      });
    }
  };

  const isSelected = (optionValue: string): boolean => {
    if (isMultiple) {
      return Array.isArray(selectedValues) && selectedValues.includes(optionValue);
    }
    return selectedValues === optionValue;
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {is_required && <Text style={styles.required}>*</Text>}
      </View>

      {/* Hint for multi-select */}
      {isMultiple && (
        <Text style={styles.hint}>Select all that apply</Text>
      )}

      {/* Options */}
      <View style={styles.optionsList}>
        {options.map((option) => {
          const selected = isSelected(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => handleSelect(option.value)}
              activeOpacity={0.7}
            >
              <View style={[
                isMultiple ? styles.checkbox : styles.radio,
                selected && (isMultiple ? styles.checkboxSelected : styles.radioSelected),
              ]}>
                {selected && (
                  isMultiple ? (
                    <Check size={14} color={colors.neutral.white} weight="bold" />
                  ) : (
                    <View style={styles.radioInner} />
                  )
                )}
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                {option.description && (
                  <Text style={styles.optionDescription}>{option.description}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
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
  hint: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  optionsList: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.neutral.warmGray,
    gap: spacing.md,
  },
  optionSelected: {
    borderColor: colors.secondary.forest,
    backgroundColor: colors.secondary.forestSubtle,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: layout.borderRadius.xs,
    borderWidth: 2,
    borderColor: colors.neutral.gray,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSelected: {
    backgroundColor: colors.secondary.forest,
    borderColor: colors.secondary.forest,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.neutral.gray,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioSelected: {
    borderColor: colors.secondary.forest,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary.forest,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  optionLabelSelected: {
    fontWeight: '600',
  },
  optionDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.xxs,
  },
  helpText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.sm,
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

export default SelectField;
