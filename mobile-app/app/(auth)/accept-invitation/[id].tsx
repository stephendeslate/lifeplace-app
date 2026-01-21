import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, CheckCircle, WarningCircle } from 'phosphor-react-native';

import { AuthAPI } from '@/apis/auth.api';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/contexts/ToastContext';
import { PasswordInput, Button } from '@/components/common';
import { colors, spacing, typeScale, layout } from '@/theme';

const acceptInvitationSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      ),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

type InvitationStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'success';

export default function AcceptInvitationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const { setTokens, setUser } = useAuthStore();

  const [status, setStatus] = useState<InvitationStatus>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationData, setInvitationData] = useState<{
    email?: string;
    first_name?: string;
  } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      password: '',
      confirm_password: '',
    },
  });

  useEffect(() => {
    const validateInvitation = async () => {
      if (!id) {
        setStatus('invalid');
        return;
      }

      try {
        // Validate the invitation token
        const response = await AuthAPI.validateInvitation(id);
        setInvitationData({
          email: response.email,
          first_name: response.first_name,
        });
        setStatus('valid');
      } catch (error: any) {
        if (error?.response?.status === 410) {
          setStatus('expired');
        } else {
          setStatus('invalid');
        }
      }
    };

    validateInvitation();
  }, [id]);

  const onSubmit = async (data: AcceptInvitationFormData) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      const response = await AuthAPI.acceptInvitation(id, {
        password: data.password,
        confirm_password: data.confirm_password,
      });

      // Set tokens and user
      setTokens(response.tokens.access, response.tokens.refresh);
      setUser(response.user);

      setStatus('success');
      showToast('Account activated successfully!', 'success');

      // Redirect to main app after short delay
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to activate account';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary.black} />
          <Text style={styles.loadingText}>Validating invitation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Invalid invitation
  if (status === 'invalid') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.errorIcon}>
            <WarningCircle size={64} color={colors.semantic.error} weight="fill" />
          </View>
          <Text style={styles.errorTitle}>Invalid Invitation</Text>
          <Text style={styles.errorMessage}>
            This invitation link is invalid or has already been used.
          </Text>
          <Button
            onPress={() => router.replace('/(auth)/login')}
            style={styles.actionButton}
          >
            Go to Sign In
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Expired invitation
  if (status === 'expired') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.errorIcon}>
            <WarningCircle size={64} color={colors.semantic.warning} weight="fill" />
          </View>
          <Text style={styles.errorTitle}>Invitation Expired</Text>
          <Text style={styles.errorMessage}>
            This invitation has expired. Please contact support for a new
            invitation.
          </Text>
          <Button
            onPress={() => router.replace('/(auth)/login')}
            style={styles.actionButton}
          >
            Go to Sign In
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <CheckCircle size={64} color={colors.secondary.forest} weight="fill" />
          </View>
          <Text style={styles.successTitle}>Account Activated!</Text>
          <Text style={styles.successMessage}>
            Your account has been set up successfully. Redirecting...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Valid invitation - show password form
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Set Up Your Account</Text>
            {invitationData?.first_name && (
              <Text style={styles.greeting}>
                Welcome, {invitationData.first_name}!
              </Text>
            )}
            <Text style={styles.subtitle}>
              Create a password to complete your account setup.
            </Text>
            {invitationData?.email && (
              <View style={styles.emailBadge}>
                <Text style={styles.emailLabel}>Your email:</Text>
                <Text style={styles.emailValue}>{invitationData.email}</Text>
              </View>
            )}
          </View>

          {/* Form */}
          <View style={styles.form}>
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

            <Button
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              variant="cta"
              style={styles.submitButton}
            >
              Activate Account
            </Button>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginTop: spacing.lg,
  },
  // Error states
  errorIcon: {
    marginBottom: spacing.xl,
  },
  errorTitle: {
    ...typeScale.headlineLarge,
    color: colors.primary.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  actionButton: {
    width: '100%',
  },
  // Success state
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
  },
  // Valid invitation form
  titleContainer: {
    marginBottom: spacing.xxl,
  },
  title: {
    ...typeScale.displayMedium,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  greeting: {
    ...typeScale.titleLarge,
    color: colors.secondary.forest,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.lg,
  },
  emailBadge: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
  },
  emailLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginBottom: spacing.xxs,
  },
  emailValue: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    fontWeight: '600',
  },
  form: {
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});
