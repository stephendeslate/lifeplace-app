/**
 * AddressField - Address Input Field
 *
 * Multi-line address input with structured fields.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { MapPin, Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';

interface AddressFieldProps {
  field: QuestionnaireField;
  value: AddressValue | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

interface AddressValue {
  line1: string;
  line2?: string;
  city: string;
  province?: string;
  postal_code?: string;
  country?: string;
}

export function AddressField({ field, value, onChange, error }: AddressFieldProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    label,
    help_text,
    is_required,
    validation_rules,
  } = field;

  const showLine2 = validation_rules?.show_address_line2 !== false;
  const showProvince = validation_rules?.show_province !== false;
  const showPostalCode = validation_rules?.show_postal_code !== false;
  const showCountry = validation_rules?.show_country ?? false;

  const currentValue: AddressValue = value || {
    line1: '',
    city: '',
  };

  const handleFieldChange = (fieldName: keyof AddressValue, fieldValue: string) => {
    const newValue = {
      ...currentValue,
      [fieldName]: fieldValue,
    };
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: newValue,
    });
  };

  const renderInput = (
    name: keyof AddressValue,
    placeholder: string,
    required: boolean = false
  ) => {
    const isFocused = focusedField === name;
    const hasError = error && required && !currentValue[name];

    return (
      <View style={styles.fieldContainer}>
        <TextInput
          style={[
            styles.input,
            isFocused && styles.inputFocused,
            hasError && styles.inputError,
          ]}
          value={currentValue[name] || ''}
          onChangeText={(text) => handleFieldChange(name, text)}
          onFocus={() => setFocusedField(name)}
          onBlur={() => setFocusedField(null)}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral.gray}
          autoCapitalize="words"
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <MapPin size={18} color={colors.neutral.darkGray} />
        <Text style={styles.label}>{label}</Text>
        {is_required && <Text style={styles.required}>*</Text>}
      </View>

      {/* Address Fields */}
      <View style={styles.addressContainer}>
        {renderInput('line1', 'Street address', true)}
        {showLine2 && renderInput('line2', 'Apt, suite, unit, etc. (optional)')}

        <View style={styles.row}>
          <View style={styles.flex2}>
            {renderInput('city', 'City', true)}
          </View>
          {showProvince && (
            <View style={styles.flex1}>
              {renderInput('province', 'Province')}
            </View>
          )}
        </View>

        {(showPostalCode || showCountry) && (
          <View style={styles.row}>
            {showPostalCode && (
              <View style={styles.flex1}>
                {renderInput('postal_code', 'Postal code')}
              </View>
            )}
            {showCountry && (
              <View style={styles.flex2}>
                {renderInput('country', 'Country')}
              </View>
            )}
          </View>
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
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  label: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  required: {
    ...typeScale.labelMedium,
    color: colors.semantic.error,
  },
  addressContainer: {
    gap: spacing.sm,
  },
  fieldContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  input: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral.warmGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    ...shadows.xs,
  },
  inputFocused: {
    borderColor: colors.primary.black,
  },
  inputError: {
    borderColor: colors.semantic.error,
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

export default AddressField;
