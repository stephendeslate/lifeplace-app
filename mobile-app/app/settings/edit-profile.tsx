/**
 * Edit Profile Screen
 *
 * Form for editing user profile information.
 * Phase 10: Profile & Settings
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Phone, Buildings, Check } from 'phosphor-react-native';

import { useAuth, useUpdateProfile } from '@/hooks/useAuth';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';

// Validation schema
const editProfileSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name too long'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+63|0)?[0-9]{10,11}$/.test(val.replace(/\s/g, '')),
      'Invalid Philippine phone number'
    ),
  company: z.string().max(100, 'Company name too long').optional(),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const [hasChanges, setHasChanges] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.profile?.phone || '',
      company: user?.profile?.company || '',
    },
  });

  // Track changes
  useEffect(() => {
    setHasChanges(isDirty);
  }, [isDirty]);

  // Handle form submission
  const onSubmit = async (data: EditProfileFormData) => {
    updateProfile.mutate(data, {
      onSuccess: async () => {
        await refreshUser();
        router.back();
      },
    });
  };

  // Handle back navigation with unsaved changes warning
  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* User Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <User size={40} color={colors.neutral.white} />
          </View>
          <Text style={styles.avatarHint}>
            Photo upload coming soon
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* First Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>First Name *</Text>
            <Controller
              control={control}
              name="first_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      errors.first_name && styles.inputError,
                    ]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter first name"
                    placeholderTextColor={colors.neutral.gray}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              )}
            />
            {errors.first_name && (
              <Text style={styles.errorText}>{errors.first_name.message}</Text>
            )}
          </View>

          {/* Last Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <Controller
              control={control}
              name="last_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      errors.last_name && styles.inputError,
                    ]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter last name"
                    placeholderTextColor={colors.neutral.gray}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              )}
            />
            {errors.last_name && (
              <Text style={styles.errorText}>{errors.last_name.message}</Text>
            )}
          </View>

          {/* Email (Read-only) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <TextInput
                style={[styles.input, styles.inputTextDisabled]}
                value={user?.email || ''}
                editable={false}
              />
            </View>
            <Text style={styles.hintText}>
              Contact support to change your email
            </Text>
          </View>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Phone
                    size={20}
                    color={colors.neutral.gray}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon, errors.phone && styles.inputError]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="+63 or 09XX XXX XXXX"
                    placeholderTextColor={colors.neutral.gray}
                    keyboardType="phone-pad"
                  />
                </View>
              )}
            />
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone.message}</Text>
            )}
            <Text style={styles.hintText}>Philippine phone format</Text>
          </View>

          {/* Company */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Company / Organization</Text>
            <Controller
              control={control}
              name="company"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Buildings
                    size={20}
                    color={colors.neutral.gray}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Optional"
                    placeholderTextColor={colors.neutral.gray}
                    autoCapitalize="words"
                  />
                </View>
              )}
            />
            {errors.company && (
              <Text style={styles.errorText}>{errors.company.message}</Text>
            )}
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          style={[
            styles.saveButton,
            (!hasChanges || updateProfile.isPending) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={!hasChanges || updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <Text style={styles.saveButtonText}>Saving...</Text>
          ) : (
            <>
              <Check size={20} color={colors.neutral.white} weight="bold" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent.wood,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarHint: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
  form: {
    gap: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
    ...shadows.sm,
  },
  input: {
    flex: 1,
    ...typeScale.bodyLarge,
    color: colors.primary.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputIcon: {
    marginLeft: spacing.md,
  },
  inputError: {
    borderColor: colors.semantic.error,
  },
  inputDisabled: {
    backgroundColor: colors.neutral.sand,
  },
  inputTextDisabled: {
    color: colors.neutral.gray,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    marginTop: spacing.xxs,
  },
  hintText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.black,
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  saveButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
