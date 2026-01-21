/**
 * PaymentPlanCard
 *
 * Displays a payment plan with progress and next installment info.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, CreditCard, CaretRight } from 'phosphor-react-native';
import { useRouter } from 'expo-router';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { formatCurrency, type CurrencyCode } from '@/utils/currency';
import type { PaymentPlan } from '@/hooks/usePaymentPlan';

export interface PaymentPlanCardProps {
  plan: PaymentPlan;
  onPayNow?: () => void;
}

export function PaymentPlanCard({ plan, onPayNow }: PaymentPlanCardProps) {
  const router = useRouter();

  const paidInstallments = plan.installments.filter((i) => i.status === 'paid').length;
  const progress = (paidInstallments / plan.installments_count) * 100;

  const nextInstallment = plan.installments.find((i) => i.status === 'pending');
  const overdueInstallment = plan.installments.find((i) => i.status === 'overdue');

  const totalPaid = plan.installments
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + parseFloat(i.amount), 0);

  const currency = (plan.currency as CurrencyCode) || 'PHP';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/payments/plans/${plan.id}`)}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Payment Plan</Text>
          <Text style={styles.subtitle}>
            {paidInstallments} of {plan.installments_count} payments
          </Text>
        </View>
        <CaretRight size={20} color={colors.neutral.gray} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            {formatCurrency(totalPaid, { currency })} paid
          </Text>
          <Text style={styles.progressText}>
            {formatCurrency(parseFloat(plan.total_amount), { currency })}{' '}
            total
          </Text>
        </View>
      </View>

      {/* Next Payment Info */}
      {(nextInstallment || overdueInstallment) && (
        <View
          style={[
            styles.nextPayment,
            overdueInstallment && styles.nextPaymentOverdue,
          ]}
        >
          <View style={styles.nextPaymentInfo}>
            <Calendar
              size={18}
              color={
                overdueInstallment ? colors.semantic.error : colors.secondary.forest
              }
            />
            <View>
              <Text
                style={[
                  styles.nextPaymentLabel,
                  overdueInstallment && styles.textError,
                ]}
              >
                {overdueInstallment ? 'Overdue' : 'Next Payment'}
              </Text>
              <Text style={styles.nextPaymentAmount}>
                {formatCurrency(
                  parseFloat((overdueInstallment || nextInstallment)!.amount),
                  { currency }
                )}
              </Text>
            </View>
          </View>

          {onPayNow && (
            <TouchableOpacity
              style={[
                styles.payNowButton,
                overdueInstallment && styles.payNowButtonUrgent,
              ]}
              onPress={onPayNow}
            >
              <CreditCard size={16} color={colors.neutral.white} />
              <Text style={styles.payNowText}>Pay Now</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  subtitle: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral.sand,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary.forest,
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  progressText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  nextPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.secondary.forestSubtle,
    padding: spacing.sm,
    borderRadius: layout.borderRadius.md,
  },
  nextPaymentOverdue: {
    backgroundColor: colors.semantic.error + '10',
  },
  nextPaymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextPaymentLabel: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
  },
  nextPaymentAmount: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
  },
  textError: {
    color: colors.semantic.error,
  },
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary.forest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.borderRadius.md,
  },
  payNowButtonUrgent: {
    backgroundColor: colors.semantic.error,
  },
  payNowText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
});

export default PaymentPlanCard;
