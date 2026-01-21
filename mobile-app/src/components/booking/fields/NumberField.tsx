/**
 * NumberField - Numeric Input Field
 *
 * Number input with optional stepper controls.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Hash, Plus, Minus, Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';
import * as Haptics from 'expo-haptics';

interface NumberFieldProps {
  field: QuestionnaireField;
  value: number | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

export function NumberField({ field, value, onChange, error }: NumberFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const {
    label,
    placeholder,
    help_text,
    is_required,
    validation_rules,
  } = field;

  const min = validation_rules?.min_value ?? 0;
  const max = validation_rules?.max_value ?? 9999;
  const step = validation_rules?.step ?? 1;
  const showStepper = field.field_type === 'NUMBER';

  const handleChange = (text: string) => {
    const numValue = text === '' ? undefined : parseInt(text, 10);
    if (numValue === undefined || (!isNaN(numValue) && numValue >= min && numValue <= max)) {
      onChange({
        field_id: field.id,
        field_type: field.field_type,
        value: numValue,
      });
    }
  };

  const handleStep = async (delta: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentValue = value ?? min;
    const newValue = Math.max(min, Math.min(max, currentValue + delta * step));
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: newValue,
    });
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {is_required && <Text style={styles.required}>*</Text>}
      </View>

      {/* Input with stepper */}
      <View style={styles.inputRow}>
        {showStepper && (
          <TouchableOpacity
            style={[styles.stepButton, (value ?? min) <= min && styles.stepButtonDisabled]}
            onPress={() => handleStep(-1)}
            disabled={(value ?? min) <= min}
          >
            <Minus size={20} color={(value ?? min) <= min ? colors.neutral.gray : colors.primary.black} weight="bold" />
          </TouchableOpacity>
        )}

        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            error && styles.inputContainerError,
            showStepper && styles.inputContainerStepper,
          ]}
        >
          <Hash size={20} color={colors.neutral.gray} />
          <TextInput
            style={styles.input}
            value={value?.toString() || ''}
            onChangeText={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder || '0'}
            placeholderTextColor={colors.neutral.gray}
            keyboardType="numeric"
            textAlign={showStepper ? 'center' : 'left'}
          />
        </View>

        {showStepper && (
          <TouchableOpacity
            style={[styles.stepButton, (value ?? 0) >= max && styles.stepButtonDisabled]}
            onPress={() => handleStep(1)}
            disabled={(value ?? 0) >= max}
          >
            <Plus size={20} color={(value ?? 0) >= max ? colors.neutral.gray : colors.primary.black} weight="bold" />
          </TouchableOpacity>
        )}
      </View>

      {/* Range hint */}
      {(min !== 0 || max !== 9999) && (
        <Text style={styles.rangeHint}>
          Range: {min} - {max}
        </Text>
      )}

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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: {
    opacity: 0.5,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral.warmGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    ...shadows.xs,
  },
  inputContainerFocused: {
    borderColor: colors.primary.black,
  },
  inputContainerError: {
    borderColor: colors.semantic.error,
  },
  inputContainerStepper: {
    flex: 0,
    minWidth: 100,
  },
  input: {
    flex: 1,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    padding: 0,
  },
  rangeHint: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginTop: spacing.xs,
    textAlign: 'center',
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

export default NumberField;
