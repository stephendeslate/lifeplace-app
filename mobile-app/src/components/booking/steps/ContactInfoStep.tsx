/**
 * ContactInfoStep
 *
 * Contact information collection with validation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  User,
  Envelope,
  Phone,
  MapPin,
  Buildings,
  IdentificationCard,
  Warning,
  Check,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import type { StepComponentProps } from '../StepRenderer';
import type { ContactInfoStepData, ContactInfoStepConfiguration } from '@/types/booking';
import * as Haptics from 'expo-haptics';

type ContactInfoStepProps = StepComponentProps<ContactInfoStepData, ContactInfoStepConfiguration>;

interface FormField {
  key: keyof ContactInfoStepData;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  required?: boolean;
  multiline?: boolean;
}

export function ContactInfoStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: ContactInfoStepProps) {
  const { state } = useBookingContext();

  const {
    required_fields = ['first_name', 'last_name', 'email', 'phone'],
    show_company_fields = true,
    show_address_fields = true,
    collect_emergency_contact = false,
    terms_url,
    privacy_url,
  } = configuration || {};

  const [formData, setFormData] = useState<ContactInfoStepData>(data);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleFieldChange = useCallback((field: keyof ContactInfoStepData, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onDataChange(newData);
  }, [formData, onDataChange]);

  const handleFieldFocus = (field: string) => {
    setFocusedField(field);
  };

  const handleFieldBlur = () => {
    setFocusedField(null);
  };

  const isFieldRequired = (field: string): boolean => {
    return required_fields.includes(field);
  };

  const getFieldError = (field: string): string | undefined => {
    const fieldErrors = validationErrors?.[field];
    return fieldErrors?.[0];
  };

  const personalFields: FormField[] = [
    {
      key: 'first_name',
      label: 'First Name',
      placeholder: 'Enter your first name',
      icon: <User size={20} color={colors.neutral.gray} />,
      autoCapitalize: 'words',
      required: isFieldRequired('first_name'),
    },
    {
      key: 'last_name',
      label: 'Last Name',
      placeholder: 'Enter your last name',
      icon: <User size={20} color={colors.neutral.gray} />,
      autoCapitalize: 'words',
      required: isFieldRequired('last_name'),
    },
    {
      key: 'email',
      label: 'Email Address',
      placeholder: 'Enter your email',
      icon: <Envelope size={20} color={colors.neutral.gray} />,
      keyboardType: 'email-address',
      autoCapitalize: 'none',
      required: isFieldRequired('email'),
    },
    {
      key: 'phone',
      label: 'Phone Number',
      placeholder: '+63 XXX XXX XXXX',
      icon: <Phone size={20} color={colors.neutral.gray} />,
      keyboardType: 'phone-pad',
      required: isFieldRequired('phone'),
    },
  ];

  const companyFields: FormField[] = [
    {
      key: 'company_name',
      label: 'Company Name',
      placeholder: 'Enter company name (optional)',
      icon: <Buildings size={20} color={colors.neutral.gray} />,
      autoCapitalize: 'words',
      required: isFieldRequired('company_name'),
    },
    {
      key: 'company_position',
      label: 'Position/Title',
      placeholder: 'Enter your position',
      icon: <IdentificationCard size={20} color={colors.neutral.gray} />,
      autoCapitalize: 'words',
      required: isFieldRequired('company_position'),
    },
  ];

  const addressFields: FormField[] = [
    {
      key: 'address_line1',
      label: 'Address',
      placeholder: 'Street address',
      icon: <MapPin size={20} color={colors.neutral.gray} />,
      autoCapitalize: 'words',
      required: isFieldRequired('address_line1'),
    },
    {
      key: 'city',
      label: 'City',
      placeholder: 'Enter city',
      icon: <MapPin size={20} color={colors.neutral.gray} />,
      autoCapitalize: 'words',
      required: isFieldRequired('city'),
    },
  ];

  const renderField = (field: FormField) => {
    const error = getFieldError(field.key);
    const isFocused = focusedField === field.key;
    const hasValue = !!formData[field.key];

    return (
      <View key={field.key} style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          {field.required && <Text style={styles.requiredMark}>*</Text>}
        </View>
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            error && styles.inputContainerError,
            hasValue && !error && styles.inputContainerFilled,
          ]}
        >
          {field.icon}
          <TextInput
            style={[styles.input, field.multiline && styles.inputMultiline]}
            value={formData[field.key] || ''}
            onChangeText={(value) => handleFieldChange(field.key, value)}
            onFocus={() => handleFieldFocus(field.key)}
            onBlur={handleFieldBlur}
            placeholder={field.placeholder}
            placeholderTextColor={colors.neutral.gray}
            keyboardType={field.keyboardType || 'default'}
            autoCapitalize={field.autoCapitalize || 'sentences'}
            multiline={field.multiline}
            numberOfLines={field.multiline ? 3 : 1}
          />
          {hasValue && !error && (
            <Check size={18} color={colors.secondary.forest} weight="bold" />
          )}
        </View>
        {error && (
          <View style={styles.errorRow}>
            <Warning size={14} color={colors.semantic.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Contact Information</Text>
          <Text style={styles.subtitle}>
            Please provide your contact details for booking confirmation
          </Text>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <View style={styles.fieldsGrid}>
            {personalFields.map(renderField)}
          </View>
        </View>

        {/* Company Information */}
        {show_company_fields && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Information</Text>
            <Text style={styles.sectionSubtitle}>Optional - for corporate bookings</Text>
            <View style={styles.fieldsGrid}>
              {companyFields.map(renderField)}
            </View>
          </View>
        )}

        {/* Address Information */}
        {show_address_fields && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <View style={styles.fieldsGrid}>
              {addressFields.map(renderField)}
            </View>
          </View>
        )}

        {/* Special Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Requests</Text>
          <Text style={styles.sectionSubtitle}>
            Any additional requirements or notes for your booking
          </Text>
          <View style={styles.fieldContainer}>
            <View
              style={[
                styles.inputContainer,
                styles.textAreaContainer,
                focusedField === 'special_requests' && styles.inputContainerFocused,
              ]}
            >
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.special_requests || ''}
                onChangeText={(value) => handleFieldChange('special_requests', value)}
                onFocus={() => handleFieldFocus('special_requests')}
                onBlur={handleFieldBlur}
                placeholder="Enter any special requests or notes..."
                placeholderTextColor={colors.neutral.gray}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Terms & Privacy */}
        {(terms_url || privacy_url) && (
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              {terms_url && (
                <Text style={styles.termsLink}>Terms of Service</Text>
              )}
              {terms_url && privacy_url && ' and '}
              {privacy_url && (
                <Text style={styles.termsLink}>Privacy Policy</Text>
              )}
            </Text>
          </View>
        )}

        {/* Required fields note */}
        <View style={styles.requiredNote}>
          <Text style={styles.requiredNoteText}>
            <Text style={styles.requiredMark}>*</Text> Required fields
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.md,
  },
  fieldsGrid: {
    gap: spacing.md,
  },
  fieldContainer: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  fieldLabel: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  requiredMark: {
    ...typeScale.labelMedium,
    color: colors.semantic.error,
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
    ...shadows.sm,
  },
  inputContainerError: {
    borderColor: colors.semantic.error,
    backgroundColor: colors.semantic.error + '08',
  },
  inputContainerFilled: {
    borderColor: colors.secondary.forest,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  input: {
    flex: 1,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
  },
  termsSection: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
  },
  termsText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.tertiary.teal,
    textDecorationLine: 'underline',
  },
  requiredNote: {
    alignItems: 'center',
  },
  requiredNoteText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
});

export default ContactInfoStep;
