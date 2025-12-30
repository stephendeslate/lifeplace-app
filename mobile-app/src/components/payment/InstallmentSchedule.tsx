/**
 * InstallmentSchedule
 *
 * Displays the full installment schedule for a payment plan.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Clock, Warning } from 'phosphor-react-native';
import { format } from 'date-fns';

import { colors, spacing, typeScale, layout } from '@/theme';
import { formatCurrency, type CurrencyCode } from '@/utils/currency';
import type { Installment } from '@/hooks/usePaymentPlan';

interface InstallmentScheduleProps {
  installments: Installment[];
  currency?: CurrencyCode;
}

export function InstallmentSchedule({
  installments,
  currency = 'PHP',
}: InstallmentScheduleProps) {
  const getStatusIcon = (status: Installment['status']) => {
    switch (status) {
      case 'paid':
        return <Check size={16} color={colors.semantic.success} weight="bold" />;
      case 'overdue':
        return <Warning size={16} color={colors.semantic.error} weight="bold" />;
      default:
        return <Clock size={16} color={colors.neutral.gray} />;
    }
  };

  const getStatusColor = (status: Installment['status']) => {
    switch (status) {
      case 'paid':
        return colors.semantic.success;
      case 'overdue':
        return colors.semantic.error;
      default:
        return colors.neutral.darkGray;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Schedule</Text>

      <View style={styles.timeline}>
        {installments.map((installment, index) => (
          <View key={installment.id} style={styles.installmentRow}>
            {/* Timeline dot and line */}
            <View style={styles.timelineIndicator}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: getStatusColor(installment.status) },
                ]}
              >
                {getStatusIcon(installment.status)}
              </View>
              {index < installments.length - 1 && (
                <View
                  style={[
                    styles.line,
                    installment.status === 'paid' && styles.lineCompleted,
                  ]}
                />
              )}
            </View>

            {/* Installment details */}
            <View style={styles.installmentDetails}>
              <View style={styles.installmentHeader}>
                <Text style={styles.installmentNumber}>
                  Payment {installment.installment_number}
                </Text>
                <Text
                  style={[
                    styles.installmentStatus,
                    { color: getStatusColor(installment.status) },
                  ]}
                >
                  {installment.status.charAt(0).toUpperCase() +
                    installment.status.slice(1)}
                </Text>
              </View>

              <View style={styles.installmentMeta}>
                <Text style={styles.installmentAmount}>
                  {formatCurrency(parseFloat(installment.amount), { currency })}
                </Text>
                <Text style={styles.installmentDate}>
                  {installment.status === 'paid' && installment.paid_at
                    ? `Paid ${format(new Date(installment.paid_at), 'MMM d, yyyy')}`
                    : `Due ${format(new Date(installment.due_date), 'MMM d, yyyy')}`}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.lg,
  },
  timeline: {
    gap: 0,
  },
  installmentRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 32,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.neutral.warmGray,
    marginVertical: spacing.xs,
  },
  lineCompleted: {
    backgroundColor: colors.semantic.success,
  },
  installmentDetails: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  installmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  installmentNumber: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
  },
  installmentStatus: {
    ...typeScale.labelSmall,
    fontWeight: '600',
  },
  installmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  installmentAmount: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  installmentDate: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
});

export default InstallmentSchedule;
