import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  User,
  Envelope,
  Phone,
  Lock,
  CheckSquare,
  Square,
} from 'phosphor-react-native';

import { useAuthContext as useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Input, PasswordInput, Button, Logo } from '@/components/common';
import { colors, spacing, typeScale, layout } from '@/theme';

const registerSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      ),
    confirm_password: z.string(),
    accept_terms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const { showToast } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
      accept_terms: false,
    },
  });

  const acceptTerms = watch('accept_terms');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        confirm_password: data.confirm_password,
      });
      showToast('Account created successfully!', 'success');
      // Navigation is handled automatically by AuthContext
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.email?.[0] ||
        error?.message ||
        'Failed to create account';
      showToast(message, 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={layout.iconSize.md} color={colors.primary.black} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Logo variant="full" color="dark" size="lg" style={styles.logo} />

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join LifePlace to book your next event
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Row */}
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Controller
                  control={control}
                  name="first_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="First Name"
                      placeholder="First name"
                      autoCapitalize="words"
                      autoComplete="given-name"
                      textContentType="givenName"
                      leftIcon={
                        <User
                          size={layout.iconSize.sm}
                          color={colors.neutral.gray}
                        />
                      }
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.first_name?.message}
                    />
                  )}
                />
              </View>
              <View style={styles.nameField}>
                <Controller
                  control={control}
                  name="last_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Last Name"
                      placeholder="Last name"
                      autoCapitalize="words"
                      autoComplete="family-name"
                      textContentType="familyName"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.last_name?.message}
                    />
                  )}
                />
              </View>
            </View>

            {/* Email */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  leftIcon={
                    <Envelope
                      size={layout.iconSize.sm}
                      color={colors.neutral.gray}
                    />
                  }
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            {/* Phone (Optional) */}
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Phone (Optional)"
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  leftIcon={
                    <Phone
                      size={layout.iconSize.sm}
                      color={colors.neutral.gray}
                    />
                  }
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                />
              )}
            />

            {/* Password */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  label="Password"
                  placeholder="Create a password"
                  textContentType="newPassword"
                  leftIcon={
                    <Lock
                      size={layout.iconSize.sm}
                      color={colors.neutral.gray}
                    />
                  }
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            {/* Confirm Password */}
            <Controller
              control={control}
              name="confirm_password"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  textContentType="newPassword"
                  leftIcon={
                    <Lock
                      size={layout.iconSize.sm}
                      color={colors.neutral.gray}
                    />
                  }
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirm_password?.message}
                />
              )}
            />

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setValue('accept_terms', !acceptTerms)}
              activeOpacity={0.7}
            >
              {acceptTerms ? (
                <CheckSquare
                  size={layout.iconSize.md}
                  color={colors.secondary.forest}
                  weight="fill"
                />
              ) : (
                <Square
                  size={layout.iconSize.md}
                  color={colors.neutral.gray}
                />
              )}
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
            {errors.accept_terms && (
              <Text style={styles.termsError}>
                {errors.accept_terms.message}
              </Text>
            )}

            {/* Register Button */}
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              variant="cta"
              style={styles.submitButton}
            >
              Create Account
            </Button>
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  titleContainer: {
    marginBottom: spacing.xxl,
  },
  title: {
    ...typeScale.displayMedium,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  form: {
    marginBottom: spacing.xl,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  nameField: {
    flex: 1,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  termsText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.tertiary.teal,
    fontWeight: '600',
  },
  termsError: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  loginLink: {
    ...typeScale.bodyMedium,
    color: colors.tertiary.teal,
    fontWeight: '600',
  },
});
