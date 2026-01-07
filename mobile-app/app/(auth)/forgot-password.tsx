import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Envelope, CheckCircle } from 'phosphor-react-native';

import { AuthAPI } from '@/apis/auth.api';
import { useToast } from '@/contexts/ToastContext';
import { Input, Button, Logo } from '@/components/common';
import { colors, spacing, typeScale, layout } from '@/theme';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    try {
      await AuthAPI.requestPasswordReset({ email: data.email });
      setSubmittedEmail(data.email);
      setIsSuccess(true);
    } catch (error: any) {
      // Don't reveal if email exists or not for security
      // Still show success message
      setSubmittedEmail(data.email);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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

        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <CheckCircle
              size={64}
              color={colors.secondary.forest}
              weight="fill"
            />
          </View>

          <Text style={styles.successTitle}>Check Your Email</Text>

          <Text style={styles.successMessage}>
            We've sent password reset instructions to:
          </Text>

          <Text style={styles.successEmail}>{submittedEmail}</Text>

          <Text style={styles.successNote}>
            If you don't see the email, check your spam folder. The link will
            expire in 24 hours.
          </Text>

          <Button
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backToLoginButton}
          >
            Back to Sign In
          </Button>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you instructions to reset
              your password.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
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

            <Button
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              style={styles.submitButton}
            >
              Send Reset Link
            </Button>
          </View>

          {/* Back to Login Link */}
          <TouchableOpacity
            style={styles.backToLoginLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backToLoginText}>
              Remember your password?{' '}
              <Text style={styles.backToLoginHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
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
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  backToLoginLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  backToLoginText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  backToLoginHighlight: {
    color: colors.tertiary.teal,
    fontWeight: '600',
  },
  // Success state styles
  successContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    marginBottom: spacing.xl,
  },
  successTitle: {
    ...typeScale.headlineLarge,
    color: colors.primary.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successMessage: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  successEmail: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  successNote: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  backToLoginButton: {
    width: '100%',
  },
});
