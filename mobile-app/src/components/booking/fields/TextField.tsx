/**
 * TextField - Text Input Field
 *
 * Single line or multiline text input for questionnaire forms.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { TextT, Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';

interface TextFieldProps {
  field: QuestionnaireField;
  value: string | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

export function TextField({ field, value, onChange, error }: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const {
    label,
    placeholder,
    help_text,
    is_required,
    validation_rules,
  } = field;

  const maxLength = validation_rules?.max_length;
  const minLength = validation_rules?.min_length;
  const isMultiline = field.field_type === 'TEXTAREA';

  const handleChange = (text: string) => {
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: text,
    });
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {is_required && <Text style={styles.required}>*</Text>}
      </View>

      {/* Input */}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          isMultiline && styles.inputContainerMultiline,
        ]}
      >
        <TextT size={20} color={colors.neutral.gray} />
        <TextInput
          style={[styles.input, isMultiline && styles.inputMultiline]}
          value={value || ''}
          onChangeText={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.neutral.gray}
          maxLength={maxLength}
          multiline={isMultiline}
          numberOfLines={isMultiline ? 4 : 1}
          textAlignVertical={isMultiline ? 'top' : 'center'}
        />
      </View>

      {/* Character count */}
      {maxLength && (
        <Text style={styles.charCount}>
          {(value?.length || 0)}/{maxLength}
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
  inputContainer: {
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
  inputContainerMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  input: {
    flex: 1,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    padding: 0,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    textAlign: 'right',
    marginTop: spacing.xxs,
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

export default TextField;
