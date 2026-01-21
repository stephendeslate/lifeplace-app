/**
 * ContactInfoStep
 *
 * Contact information collection with validation.
 * Features:
 * - Auto-prefill from authenticated user
 * - Real-time validation states (validating/valid/invalid)
 * - Phone number formatting for Philippines
 * - Full name validation (first + last name)
 * - Validation strength indicators
 *
 * Adapted from: frontend/client-portal/src/components/booking/steps/EnhancedContactInfoStep.tsx
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
  ActivityIndicator,
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
  CheckCircle,
  Star,
  Spinner,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { useContactInfoManager } from '@/hooks/booking/useContactInfo';
import type { StepComponentProps } from '../StepRenderer';
import type { ContactInfoStepData, ContactInfoStepConfiguration } from '@/types/booking';
import * as Haptics from 'expo-haptics';

// =============================================================================
// TYPES
// =============================================================================

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

interface FieldValidationStates {
  full_name: ValidationState;
  email: ValidationState;
  phone: ValidationState;
}

type ContactInfoStepProps = StepComponentProps<ContactInfoStepData, ContactInfoStepConfiguration> & {
  /** Whether step is currently being validated */
  isValidating?: boolean;
};

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Format phone number for Philippines format.
 * Converts to +63 XXX XXX XXXX format as user types.
 */
const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  if (cleaned.length <= 11) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // For international format starting with 63
  if (cleaned.startsWith('63')) {
    return `+63 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 12)}`;
  }

  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
};

/**
 * Validate email format.
 */
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number for Philippines.
 */
const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  // Accept 10-11 digit numbers, or international format starting with 63
  return (
    cleaned.length >= 10 &&
    (cleaned.length <= 11 || (cleaned.startsWith('63') && cleaned.length === 12))
  );
};

/**
 * Validate full name (should have at least first and last name).
 */
const validateFullName = (name: string): boolean => {
  return name.trim().length > 0 && name.includes(' ');
};

interface FormField {
  key: string;
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
  isValidating = false,
}: ContactInfoStepProps) {
  const { state } = useBookingContext();

  // Use the contact info manager for auth prefill
  const {
    getInitialData,
    isAuthenticated,
    user,
    fieldRequirements,
  } = useContactInfoManager(configuration);

  const {
    required_fields = ['first_name', 'last_name', 'email', 'phone'],
    show_company_fields = true,
    show_address_fields = true,
    collect_emergency_contact = false,
    terms_url,
    privacy_url,
    title = 'Contact Information',
    description,
  } = configuration || {};

  // Initialize form data with auth prefill if available
  const [formData, setFormData] = useState<ContactInfoStepData>(() => {
    // If we have existing data, use it
    if (data && Object.keys(data).length > 0) {
      return data;
    }
    // Otherwise try to prefill from authenticated user
    return getInitialData();
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [validationStates, setValidationStates] = useState<FieldValidationStates>({
    full_name: 'idle',
    email: 'idle',
    phone: 'idle',
  });
  const [fieldStrengths, setFieldStrengths] = useState({
    email: 0,
    phone: 0,
  });

  // Sync prefilled data to parent on mount for authenticated users
  useEffect(() => {
    if (isAuthenticated && user && (!data || Object.keys(data).length === 0)) {
      onDataChange(formData);
    }
  }, []); // Only run on mount

  useEffect(() => {
    // Only update if data changed from parent
    if (data && JSON.stringify(data) !== JSON.stringify(formData)) {
      setFormData(data);
    }
  }, [data]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    let processedValue = value;

    // Format phone number as user types
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value);
    }

    const newData = { ...formData, [field]: processedValue };
    setFormData(newData);
    onDataChange(newData);

    // Real-time validation for specific fields
    if (field === 'email') {
      setValidationStates((prev) => ({ ...prev, email: 'validating' }));
      setTimeout(() => {
        const isValid = validateEmail(processedValue);
        setValidationStates((prev) => ({ ...prev, email: isValid ? 'valid' : 'invalid' }));
        setFieldStrengths((prev) => ({
          ...prev,
          email: isValid ? (processedValue.includes('.com') ? 100 : 80) : 0,
        }));
      }, 500);
    }

    if (field === 'phone') {
      setValidationStates((prev) => ({ ...prev, phone: 'validating' }));
      setTimeout(() => {
        const isValid = validatePhoneNumber(processedValue);
        setValidationStates((prev) => ({ ...prev, phone: isValid ? 'valid' : 'invalid' }));
        setFieldStrengths((prev) => ({ ...prev, phone: isValid ? 100 : 0 }));
      }, 500);
    }

    if (field === 'full_name') {
      setValidationStates((prev) => ({ ...prev, full_name: 'validating' }));
      setTimeout(() => {
        const hasFullName = validateFullName(processedValue);
        setValidationStates((prev) => ({ ...prev, full_name: hasFullName ? 'valid' : 'invalid' }));
      }, 300);
    }
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

  // Get validation state icon for a field
  const getValidationIcon = (field: keyof FieldValidationStates) => {
    const state = validationStates[field];
    switch (state) {
      case 'validating':
        return <ActivityIndicator size="small" color={colors.tertiary.teal} />;
      case 'valid':
        return <CheckCircle size={18} color={colors.secondary.forest} weight="fill" />;
      case 'invalid':
        return null;
      default:
        return null;
    }
  };

  // Get field strength indicator
  const getFieldStrength = (field: 'email' | 'phone'): number => {
    return fieldStrengths[field];
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
    const fieldKey = field.key as keyof FieldValidationStates;
    const isValidatedField = ['full_name', 'email', 'phone'].includes(field.key);
    const validationIcon = isValidatedField ? getValidationIcon(fieldKey) : null;
    const strength = (field.key === 'email' || field.key === 'phone') ? getFieldStrength(field.key) : 0;

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
            validationStates[fieldKey] === 'valid' && styles.inputContainerValid,
          ]}
        >
          {field.icon}
          <TextInput
            style={[styles.input, field.multiline && styles.inputMultiline]}
            value={(formData[field.key] as string) || ''}
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
          {validationIcon || (hasValue && !error && !isValidatedField && (
            <Check size={18} color={colors.secondary.forest} weight="bold" />
          ))}
        </View>
        {error && (
          <View style={styles.errorRow}>
            <Warning size={14} color={colors.semantic.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {/* Strength indicator for email and phone */}
        {strength > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBar}>
              <View
                style={[
                  styles.strengthFill,
                  { width: `${strength}%` },
                  strength > 80 ? styles.strengthFillStrong : styles.strengthFillGood,
                ]}
              />
            </View>
            <Text style={[styles.strengthText, strength > 80 ? styles.strengthTextStrong : styles.strengthTextGood]}>
              {strength > 80 ? 'Strong' : 'Good'}
            </Text>
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
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {description || 'Please provide your contact details for booking confirmation'}
          </Text>
        </View>

        {/* Validation Status Chips */}
        <View style={styles.validationChips}>
          {[
            { key: 'full_name', label: 'Name', icon: <User size={14} /> },
            { key: 'email', label: 'Email', icon: <Envelope size={14} /> },
            { key: 'phone', label: 'Phone', icon: <Phone size={14} /> },
          ].map((item) => (
            <View
              key={item.key}
              style={[
                styles.validationChip,
                validationStates[item.key as keyof FieldValidationStates] === 'valid' &&
                  styles.validationChipValid,
              ]}
            >
              {validationStates[item.key as keyof FieldValidationStates] === 'valid' ? (
                <CheckCircle size={14} color={colors.secondary.forest} weight="fill" />
              ) : (
                item.icon
              )}
              <Text
                style={[
                  styles.validationChipText,
                  validationStates[item.key as keyof FieldValidationStates] === 'valid' &&
                    styles.validationChipTextValid,
                ]}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Authenticated User Banner */}
        {isAuthenticated && user && (
          <View style={styles.authBanner}>
            <View style={styles.authBannerIcon}>
              <CheckCircle size={24} color={colors.secondary.forest} weight="fill" />
            </View>
            <View style={styles.authBannerContent}>
              <Text style={styles.authBannerTitle}>Welcome back, {user.first_name}!</Text>
              <Text style={styles.authBannerSubtitle}>
                We've pre-filled your information from your account
              </Text>
            </View>
            <View style={styles.authBannerBadge}>
              <Star size={12} color={colors.secondary.forest} weight="fill" />
              <Text style={styles.authBannerBadgeText}>Verified</Text>
            </View>
          </View>
        )}

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

        {/* Validation indicator */}
        {isValidating && (
          <View style={styles.validatingContainer}>
            <ActivityIndicator size="small" color={colors.neutral.darkGray} />
            <Text style={styles.validatingText}>Validating information...</Text>
          </View>
        )}
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
  inputContainerValid: {
    borderColor: colors.secondary.forest,
    backgroundColor: colors.secondary.forestSubtle,
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
  // Validation chips
  validationChips: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  validationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.alpha.black05,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.full,
    gap: spacing.xxs,
  },
  validationChipValid: {
    backgroundColor: colors.secondary.forestSubtle,
  },
  validationChipText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  validationChipTextValid: {
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  // Auth banner
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.forestSubtle,
    borderWidth: 1,
    borderColor: colors.secondary.forest + '40',
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  authBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary.forest + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authBannerContent: {
    flex: 1,
  },
  authBannerTitle: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
  },
  authBannerSubtitle: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  authBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.forest + '20',
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.sm,
    gap: spacing.xxs,
  },
  authBannerBadgeText: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  // Strength indicators
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.alpha.black10,
    borderRadius: 2,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthFillStrong: {
    backgroundColor: colors.secondary.forest,
  },
  strengthFillGood: {
    backgroundColor: colors.semantic.warning,
  },
  strengthText: {
    ...typeScale.labelSmall,
  },
  strengthTextStrong: {
    color: colors.secondary.forest,
  },
  strengthTextGood: {
    color: colors.semantic.warning,
  },
  // Validation indicator
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  validatingText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
});

export default ContactInfoStep;
