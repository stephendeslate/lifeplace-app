/**
 * PhoneField - Phone Number Input Field
 *
 * Phone input with country code support and formatting.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Phone, Warning, Check } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';

interface PhoneFieldProps {
  field: QuestionnaireField;
  value: string | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

export function PhoneField({ field, value, onChange, error }: PhoneFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const {
    label,
    placeholder,
    help_text,
    is_required,
  } = field;

  const formatPhoneNumber = (text: string): string => {
    // Remove non-digits
    const digits = text.replace(/\D/g, '');

    // Format for Philippines (+63)
    if (digits.startsWith('63')) {
      const local = digits.slice(2);
      if (local.length <= 3) return `+63 ${local}`;
      if (local.length <= 6) return `+63 ${local.slice(0, 3)} ${local.slice(3)}`;
      return `+63 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 10)}`;
    }

    // Format for local (0xxx)
    if (digits.startsWith('0')) {
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
    }

    // Default formatting
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  };

  const handleChange = (text: string) => {
    const formattedValue = formatPhoneNumber(text);
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: formattedValue,
    });
  };

  const isValidPhone = (phone: string | undefined): boolean => {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 12;
  };

  const hasValue = !!value && value.length > 0;
  const isValid = hasValue && isValidPhone(value) && !error;

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
        <Phone size={20} color={colors.neutral.gray} />
        <TextInput
          style={styles.input}
          value={value || ''}
          onChangeText={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || '+63 XXX XXX XXXX'}
          placeholderTextColor={colors.neutral.gray}
          keyboardType="phone-pad"
          maxLength={17} // +63 XXX XXX XXXX
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

export default PhoneField;
