/**
 * Change Password Screen
 *
 * Form for changing user password with requirements display.
 * Phase 10: Profile & Settings
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeSlash,
  Check,
  X,
  Lock,
  ShieldCheck,
} from 'phosphor-react-native';

import { useChangePassword } from '@/hooks/useAuth';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';

// Password requirements
const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', regex: /.{8,}/ },
  { id: 'uppercase', label: 'One uppercase letter', regex: /[A-Z]/ },
  { id: 'lowercase', label: 'One lowercase letter', regex: /[a-z]/ },
  { id: 'number', label: 'One number', regex: /[0-9]/ },
  { id: 'special', label: 'One special character', regex: /[^A-Za-z0-9]/ },
];

// Validation schema
const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const changePassword = useChangePassword();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const newPassword = watch('new_password');

  // Calculate password strength
  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0;
    let strength = 0;
    PASSWORD_REQUIREMENTS.forEach((req) => {
      if (req.regex.test(newPassword)) strength += 1;
    });
    return strength;
  }, [newPassword]);

  // Get strength label and color
  const getStrengthInfo = () => {
    if (passwordStrength <= 1) return { label: 'Weak', color: colors.semantic.error };
    if (passwordStrength <= 3) return { label: 'Medium', color: colors.semantic.warning };
    return { label: 'Strong', color: colors.semantic.success };
  };

  const strengthInfo = getStrengthInfo();

  // Handle form submission
  const onSubmit = async (data: ChangePasswordFormData) => {
    changePassword.mutate(
      {
        current_password: data.current_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      },
      {
        onSuccess: () => {
          router.back();
        },
      }
    );
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
        {/* Header Icon */}
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <ShieldCheck size={40} color={colors.accent.wood} weight="duotone" />
          </View>
          <Text style={styles.headerText}>
            Choose a strong password to protect your account
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Current Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Current Password</Text>
            <Controller
              control={control}
              name="current_password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.inputContainer, errors.current_password && styles.inputError]}>
                  <Lock size={20} color={colors.neutral.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.neutral.gray}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.eyeButton}
                    hitSlop={8}
                  >
                    {showCurrentPassword ? (
                      <EyeSlash size={20} color={colors.neutral.gray} />
                    ) : (
                      <Eye size={20} color={colors.neutral.gray} />
                    )}
                  </Pressable>
                </View>
              )}
            />
            {errors.current_password && (
              <Text style={styles.errorText}>{errors.current_password.message}</Text>
            )}
          </View>

          {/* New Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New Password</Text>
            <Controller
              control={control}
              name="new_password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.inputContainer, errors.new_password && styles.inputError]}>
                  <Lock size={20} color={colors.neutral.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.neutral.gray}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeButton}
                    hitSlop={8}
                  >
                    {showNewPassword ? (
                      <EyeSlash size={20} color={colors.neutral.gray} />
                    ) : (
                      <Eye size={20} color={colors.neutral.gray} />
                    )}
                  </Pressable>
                </View>
              )}
            />
            {errors.new_password && (
              <Text style={styles.errorText}>{errors.new_password.message}</Text>
            )}

            {/* Password Strength Indicator */}
            {newPassword && (
              <View style={styles.strengthSection}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthSegment,
                        level <= passwordStrength && {
                          backgroundColor: strengthInfo.color,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strengthInfo.color }]}>
                  {strengthInfo.label}
                </Text>
              </View>
            )}
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>Password Requirements</Text>
            {PASSWORD_REQUIREMENTS.map((req) => {
              const isMet = newPassword ? req.regex.test(newPassword) : false;
              return (
                <View key={req.id} style={styles.requirementRow}>
                  {isMet ? (
                    <Check size={16} color={colors.semantic.success} weight="bold" />
                  ) : (
                    <X size={16} color={colors.neutral.gray} />
                  )}
                  <Text
                    style={[
                      styles.requirementText,
                      isMet && styles.requirementMet,
                    ]}
                  >
                    {req.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <Controller
              control={control}
              name="confirm_password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.inputContainer, errors.confirm_password && styles.inputError]}>
                  <Lock size={20} color={colors.neutral.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.neutral.gray}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                    hitSlop={8}
                  >
                    {showConfirmPassword ? (
                      <EyeSlash size={20} color={colors.neutral.gray} />
                    ) : (
                      <Eye size={20} color={colors.neutral.gray} />
                    )}
                  </Pressable>
                </View>
              )}
            />
            {errors.confirm_password && (
              <Text style={styles.errorText}>{errors.confirm_password.message}</Text>
            )}
          </View>
        </View>

        {/* Change Password Button */}
        <Pressable
          style={[
            styles.submitButton,
            changePassword.isPending && styles.buttonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={changePassword.isPending}
        >
          <Text style={styles.submitButtonText}>
            {changePassword.isPending ? 'Changing Password...' : 'Change Password'}
          </Text>
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
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent.woodSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
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
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
  },
  inputIcon: {
    marginHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.semantic.error,
  },
  eyeButton: {
    padding: spacing.md,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    marginTop: spacing.xxs,
  },
  strengthSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  strengthBar: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral.warmGray,
  },
  strengthLabel: {
    ...typeScale.labelSmall,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  requirementsCard: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  requirementsTitle: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  requirementText: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
  requirementMet: {
    color: colors.semantic.success,
  },
  submitButton: {
    backgroundColor: colors.primary.black,
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
