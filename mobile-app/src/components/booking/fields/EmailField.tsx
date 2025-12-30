/**
 * EmailField - Email Input Field
 *
 * Email input with validation.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Envelope, Warning, Check } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';

interface EmailFieldProps {
  field: QuestionnaireField;
  value: string | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailField({ field, value, onChange, error }: EmailFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const {
    label,
    placeholder,
    help_text,
    is_required,
  } = field;

  const handleChange = (text: string) => {
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: text.toLowerCase().trim(),
    });
  };

  const isValidEmail = (email: string | undefined): boolean => {
    if (!email) return false;
    return EMAIL_REGEX.test(email);
  };

  const hasValue = !!value && value.length > 0;
  const isValid = hasValue && isValidEmail(value) && !error;

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
          isValid && styles.inputContainerValid,
        ]}
      >
        <Envelope size={20} color={colors.neutral.gray} />
        <TextInput
          style={styles.input}
          value={value || ''}
          onChangeText={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || 'email@example.com'}
          placeholderTextColor={colors.neutral.gray}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isValid && (
          <Check size={18} color={colors.secondary.forest} weight="bold" />
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
  inputContainerValid: {
    borderColor: colors.secondary.forest,
  },
  input: {
    flex: 1,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    padding: 0,
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

export default EmailField;
