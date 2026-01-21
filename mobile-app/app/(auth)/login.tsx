import React from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Envelope, Lock } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthContext as useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Input, PasswordInput, Button, Logo } from '@/components/common';
import { colors, spacing, typeScale, layout } from '@/theme';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const { showToast } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      // Navigation is handled automatically by AuthContext
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Invalid email or password';
      showToast(message, 'error');
    }
  };

  return (
    <LinearGradient
      colors={['#F0F7F4', '#FAFBFC']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.4 }}
      style={styles.gradientContainer}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Logo variant="full" color="dark" size="xl" style={styles.logo} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to manage your events
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
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

            {/* Password Input */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  label="Password"
                  placeholder="Enter your password"
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

            {/* Forgot Password Link */}
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotPasswordLink}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </Link>

            {/* Login Button */}
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              style={styles.submitButton}
            >
              Sign In
            </Button>
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typeScale.displayMedium,
    color: colors.primary.black,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.xl,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
    marginTop: -spacing.sm,
  },
  forgotPasswordText: {
    ...typeScale.labelMedium,
    color: colors.tertiary.teal,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  registerLink: {
    ...typeScale.bodyMedium,
    color: colors.tertiary.teal,
    fontWeight: '600',
  },
});
