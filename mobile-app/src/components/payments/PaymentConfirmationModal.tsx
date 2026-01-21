/**
 * PaymentConfirmationModal
 *
 * Modal for confirming payment details before processing.
 * Shows amount breakdown and final confirmation.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Shield, X, Check, Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { formatCurrency, type CurrencyCode } from '@/utils/currency';

export interface PaymentConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  currency?: CurrencyCode;
  paymentType: 'FULL' | 'DEPOSIT';
  depositPercentage?: number;
  totalAmount?: number;
  isLoading?: boolean;
  error?: string | null;
}

export function PaymentConfirmationModal({
  visible,
  onClose,
  onConfirm,
  amount,
  currency = 'PHP',
  paymentType,
  depositPercentage,
  totalAmount,
  isLoading = false,
  error,
}: PaymentConfirmationModalProps) {
  const balanceDue = paymentType === 'DEPOSIT' && totalAmount ? totalAmount - amount : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Confirm Payment</Text>
          <TouchableOpacity onPress={onClose} disabled={isLoading}>
            <X size={24} color={colors.primary.black} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Amount Card */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>
              {paymentType === 'DEPOSIT'
                ? `Reservation Fee (${depositPercentage}%)`
                : 'Total Amount'}
            </Text>
            <Text style={styles.amountValue}>
              {formatCurrency(amount, { currency })}
            </Text>

            {paymentType === 'DEPOSIT' && balanceDue > 0 && (
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceText}>
                  Balance of {formatCurrency(balanceDue, { currency })} due before event
                </Text>
              </View>
            )}
          </View>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Shield size={20} color={colors.secondary.forest} weight="duotone" />
            <Text style={styles.securityText}>
              Your payment is secured with 256-bit SSL encryption
            </Text>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Warning size={18} color={colors.semantic.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
            onPress={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.neutral.white} />
            ) : (
              <>
                <Check size={20} color={colors.neutral.white} weight="bold" />
                <Text style={styles.confirmButtonText}>
                  Pay {formatCurrency(amount, { currency })}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  title: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  amountCard: {
    backgroundColor: colors.primary.black,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  amountLabel: {
    ...typeScale.bodyMedium,
    color: colors.neutral.warmGray,
    marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  balanceInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.darkGray,
  },
  balanceText: {
    ...typeScale.bodySmall,
    color: colors.neutral.warmGray,
    textAlign: 'center',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary.forestSubtle,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
  },
  securityText: {
    ...typeScale.bodySmall,
    color: colors.secondary.forestDark,
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.semantic.error + '10',
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    marginTop: spacing.md,
  },
  errorText: {
    ...typeScale.bodySmall,
    color: colors.semantic.error,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
  },
  cancelButtonText: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.secondary.forest,
    borderRadius: layout.borderRadius.md,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
  },
});

export default PaymentConfirmationModal;
