/**
 * Delete Account Screen
 *
 * 3-step account deletion flow (Right to Erasure).
 * Phase 10: Profile & Settings
 * Reference: CONSENT_MANAGEMENT_UI.md Section 4.6
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Warning,
  Trash,
  CheckCircle,
  XCircle,
  Lock,
  Eye,
  EyeSlash,
} from 'phosphor-react-native';

import { useAccountDeletion } from '@/hooks/usePrivacy';
import { useAuth } from '@/hooks/useAuth';
import { DeletionStepIndicator } from '@/components/privacy';
import { colors, spacing, typeScale, layout, shadows, theme } from '@/theme';
import type { DeletionStep } from '@/types/privacy.types';

// What gets deleted
const DELETED_DATA = [
  'Your account and profile',
  'Notification preferences',
  'Device registrations',
  'Communication history',
];

// What gets retained
const RETAINED_DATA = [
  { data: 'Financial records', reason: 'BIR requirement (10 years)' },
  { data: 'Signed contracts', reason: 'Legal evidentiary value (10 years)' },
  { data: 'Transaction history', reason: 'Anonymized for analytics' },
];

// Confirmation checkboxes
const CONFIRMATIONS = [
  { id: 'permanent', label: 'This action is permanent and cannot be undone' },
  { id: 'immediate', label: 'I will lose access to my account immediately' },
  { id: 'retained', label: 'Some data must be retained for legal compliance' },
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const deleteAccount = useAccountDeletion();

  const [currentStep, setCurrentStep] = useState<DeletionStep>('warning');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({});

  const allConfirmed = CONFIRMATIONS.every((c) => confirmations[c.id]);
  const isConfirmTextValid = confirmText.toUpperCase() === 'DELETE';

  const handleContinueToVerification = () => {
    setCurrentStep('verification');
  };

  const handleContinueToConfirmation = () => {
    if (!password) {
      Alert.alert('Password Required', 'Please enter your password to continue.');
      return;
    }
    setCurrentStep('confirmation');
  };

  const handleDelete = async () => {
    if (!allConfirmed || !isConfirmTextValid) {
      Alert.alert(
        'Confirmation Required',
        'Please confirm all requirements and type DELETE to proceed.'
      );
      return;
    }

    deleteAccount.mutate(
      {
        confirmation: 'DELETE MY ACCOUNT',
        password,
        reason: 'User requested deletion',
      },
      {
        onSuccess: async (response) => {
          if (response.status === 'processing') {
            Alert.alert(
              'Account Deletion Requested',
              response.message || 'Your deletion request is being processed.',
              [
                {
                  text: 'OK',
                  onPress: async () => {
                    await logout();
                  },
                },
              ]
            );
          } else if (response.status === 'blocked') {
            Alert.alert(
              'Cannot Delete Account',
              response.message || 'There are active obligations that must be resolved first.',
              [{ text: 'OK' }]
            );
          }
        },
        onError: (error: Error & { response?: { data?: { message?: string; blocking_reasons?: Array<{ description: string }> } } }) => {
          const message =
            error?.response?.data?.message ||
            error?.response?.data?.blocking_reasons?.[0]?.description ||
            'Failed to delete account. Please try again.';
          Alert.alert('Error', message);
        },
      }
    );
  };

  const toggleConfirmation = (id: string) => {
    setConfirmations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Step 1: Warning
  if (currentStep === 'warning') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DeletionStepIndicator currentStep={currentStep} />

        <View style={styles.warningHeader}>
          <View style={styles.warningIconContainer}>
            <Warning size={40} color={colors.semantic.error} weight="fill" />
          </View>
          <Text style={styles.warningTitle}>Delete Your Account?</Text>
          <Text style={styles.warningDescription}>
            This action is permanent and cannot be undone. Please read carefully
            before proceeding.
          </Text>
        </View>

        {/* What Will Be Deleted */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Will Be Deleted</Text>
          <View style={styles.card}>
            {DELETED_DATA.map((item, index) => (
              <View
                key={item}
                style={[
                  styles.listItem,
                  index < DELETED_DATA.length - 1 && styles.listItemBorder,
                ]}
              >
                <XCircle size={18} color={colors.semantic.error} weight="fill" />
                <Text style={styles.listItemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* What We Must Retain */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Must Retain (Legal)</Text>
          <View style={styles.card}>
            {RETAINED_DATA.map((item, index) => (
              <View
                key={item.data}
                style={[
                  styles.retainedItem,
                  index < RETAINED_DATA.length - 1 && styles.listItemBorder,
                ]}
              >
                <View style={styles.retainedIcon}>
                  <Lock size={16} color={colors.neutral.gray} />
                </View>
                <View style={styles.retainedContent}>
                  <Text style={styles.retainedData}>{item.data}</Text>
                  <Text style={styles.retainedReason}>{item.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Buttons */}
        <Pressable
          style={styles.dangerButton}
          onPress={handleContinueToVerification}
        >
          <Text style={styles.dangerButtonText}>Continue to Delete</Text>
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // Step 2: Verification
  if (currentStep === 'verification') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <DeletionStepIndicator currentStep={currentStep} />

          <View style={styles.verificationHeader}>
            <Text style={styles.verificationTitle}>Verify Your Identity</Text>
            <Text style={styles.verificationDescription}>
              For your security, please confirm your identity by entering your
              password.
            </Text>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Lock size={20} color={colors.neutral.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.neutral.gray}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                hitSlop={8}
              >
                {showPassword ? (
                  <EyeSlash size={20} color={colors.neutral.gray} />
                ) : (
                  <Eye size={20} color={colors.neutral.gray} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Buttons */}
          <Pressable
            style={[styles.dangerButton, !password && styles.buttonDisabled]}
            onPress={handleContinueToConfirmation}
            disabled={!password}
          >
            <Text style={styles.dangerButtonText}>Verify & Continue</Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => setCurrentStep('warning')}
          >
            <Text style={styles.cancelButtonText}>Go Back</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Step 3: Confirmation
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DeletionStepIndicator currentStep={currentStep} />

        <View style={styles.confirmationHeader}>
          <View style={styles.trashIconContainer}>
            <Trash size={40} color={colors.semantic.error} weight="fill" />
          </View>
          <Text style={styles.confirmationTitle}>Final Confirmation</Text>
          <Text style={styles.confirmationDescription}>
            This is your last chance to cancel. Type "DELETE" below and confirm
            all checkboxes to proceed.
          </Text>
        </View>

        {/* Confirmation Checkboxes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I understand that:</Text>
          <View style={styles.card}>
            {CONFIRMATIONS.map((item, index) => (
              <Pressable
                key={item.id}
                style={[
                  styles.checkboxItem,
                  index < CONFIRMATIONS.length - 1 && styles.listItemBorder,
                ]}
                onPress={() => toggleConfirmation(item.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    confirmations[item.id] && styles.checkboxChecked,
                  ]}
                >
                  {confirmations[item.id] && (
                    <CheckCircle size={18} color={colors.neutral.white} weight="fill" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Type DELETE */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Type "DELETE" to confirm:</Text>
          <TextInput
            style={[
              styles.confirmInput,
              isConfirmTextValid && styles.confirmInputValid,
            ]}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE"
            placeholderTextColor={colors.neutral.gray}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        {/* Delete Button */}
        <Pressable
          style={[
            styles.deleteButton,
            (!allConfirmed || !isConfirmTextValid || deleteAccount.isPending) &&
              styles.buttonDisabled,
          ]}
          onPress={handleDelete}
          disabled={!allConfirmed || !isConfirmTextValid || deleteAccount.isPending}
        >
          <Trash size={20} color={colors.neutral.white} />
          <Text style={styles.deleteButtonText}>
            {deleteAccount.isPending
              ? 'Deleting Account...'
              : 'Permanently Delete Account'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.cancelButton}
          onPress={() => setCurrentStep('verification')}
          disabled={deleteAccount.isPending}
        >
          <Text style={styles.cancelButtonText}>Go Back</Text>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },
  warningHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.error[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  warningTitle: {
    ...typeScale.headlineSmall,
    color: colors.semantic.error,
    marginBottom: spacing.sm,
  },
  warningDescription: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.sand,
  },
  listItemText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  retainedItem: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  retainedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  retainedContent: {
    flex: 1,
  },
  retainedData: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    fontWeight: '500',
  },
  retainedReason: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  dangerButton: {
    backgroundColor: colors.semantic.error,
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dangerButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  verificationHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  verificationTitle: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  verificationDescription: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
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
  inputIcon: {
    marginHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    ...typeScale.bodyLarge,
    color: colors.primary.black,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
  },
  eyeButton: {
    padding: spacing.md,
  },
  confirmationHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  trashIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.error[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  confirmationTitle: {
    ...typeScale.headlineSmall,
    color: colors.semantic.error,
    marginBottom: spacing.sm,
  },
  confirmationDescription: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral.warmGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.semantic.error,
    borderColor: colors.semantic.error,
  },
  checkboxLabel: {
    flex: 1,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  confirmInput: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 2,
    borderColor: colors.neutral.warmGray,
    ...typeScale.bodyLarge,
    color: colors.primary.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '600',
    ...shadows.sm,
  },
  confirmInputValid: {
    borderColor: colors.semantic.error,
    backgroundColor: theme.colors.error[50],
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.semantic.error,
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  deleteButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
});
