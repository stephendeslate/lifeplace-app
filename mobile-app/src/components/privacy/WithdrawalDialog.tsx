/**
 * Withdrawal Confirmation Dialog
 *
 * Modal dialog shown when toggling OFF a marketing consent.
 * Reference: CONSENT_MANAGEMENT_UI.md Section 4.4
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { CheckCircle } from 'phosphor-react-native';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { ConsentType } from '@/types/privacy.types';

interface WithdrawalDialogProps {
  visible: boolean;
  consentType: ConsentType;
  consentLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CONSENT_MESSAGES: Record<ConsentType, { title: string; description: string }> = {
  MARKETING_EMAIL: {
    title: 'Turn Off Marketing Emails?',
    description: 'You will no longer receive promotional emails, event announcements, or special offers via email.',
  },
  MARKETING_SMS: {
    title: 'Turn Off Marketing SMS?',
    description: 'You will no longer receive promotional text messages or SMS offers.',
  },
  MARKETING_PUSH: {
    title: 'Turn Off Marketing Push Notifications?',
    description: 'You will no longer receive promotional push notifications.',
  },
  ANALYTICS: {
    title: 'Turn Off Usage Analytics?',
    description: 'Your usage data will no longer be collected to help improve our service.',
  },
  THIRD_PARTY_SHARING: {
    title: 'Turn Off Third-Party Sharing?',
    description: 'Your data will no longer be shared with our partners.',
  },
  SENSITIVE_DATA: {
    title: 'Withdraw Sensitive Data Consent?',
    description: 'We will no longer process your sensitive personal information.',
  },
  PRIVACY_POLICY: {
    title: 'Privacy Policy',
    description: 'Privacy policy acceptance cannot be withdrawn.',
  },
  TERMS_OF_SERVICE: {
    title: 'Terms of Service',
    description: 'Terms of service acceptance cannot be withdrawn.',
  },
};

export function WithdrawalDialog({
  visible,
  consentType,
  consentLabel,
  onConfirm,
  onCancel,
  isLoading = false,
}: WithdrawalDialogProps) {
  const messages = CONSENT_MESSAGES[consentType] || {
    title: `Turn Off ${consentLabel}?`,
    description: 'This will withdraw your consent for this type of processing.',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{messages.title}</Text>

          <Text style={styles.description}>{messages.description}</Text>

          <Text style={styles.reassurance}>
            You can turn this back on anytime in your Privacy settings.
          </Text>

          <View style={styles.unaffectedSection}>
            <Text style={styles.unaffectedTitle}>This won't affect:</Text>
            <View style={styles.unaffectedItem}>
              <CheckCircle size={18} color={colors.secondary.forest} weight="fill" />
              <Text style={styles.unaffectedText}>Booking confirmations</Text>
            </View>
            <View style={styles.unaffectedItem}>
              <CheckCircle size={18} color={colors.secondary.forest} weight="fill" />
              <Text style={styles.unaffectedText}>Payment receipts</Text>
            </View>
            <View style={styles.unaffectedItem}>
              <CheckCircle size={18} color={colors.secondary.forest} weight="fill" />
              <Text style={styles.unaffectedText}>Account notifications</Text>
            </View>
          </View>

          <View style={styles.buttons}>
            <Pressable
              style={[styles.confirmButton, isLoading && styles.buttonDisabled]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              <Text style={styles.confirmButtonText}>
                {isLoading ? 'Processing...' : 'Turn Off'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Keep On</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.alpha.black60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  title: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  reassurance: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  unaffectedSection: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  unaffectedTitle: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  unaffectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  unaffectedText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  buttons: {
    gap: spacing.sm,
  },
  confirmButton: {
    backgroundColor: colors.semantic.error,
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonText: {
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
    opacity: 0.6,
  },
});
