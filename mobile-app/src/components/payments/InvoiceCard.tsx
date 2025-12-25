/**
 * InvoiceCard Component
 *
 * Card displaying invoice summary with status and amount.
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Receipt, CaretRight, Clock, Warning } from 'phosphor-react-native';
import { theme } from '@/theme';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { formatCurrency, formatCardDate } from '@/utils/formatting';
import type { Invoice } from '@/apis/payments.api';

interface InvoiceCardProps {
  invoice: Invoice;
  onPress: () => void;
  testID?: string;
}

export function InvoiceCard({ invoice, onPress, testID }: InvoiceCardProps) {
  const amountDue = parseFloat(invoice.amount_due);
  const totalAmount = parseFloat(invoice.total_amount);
  const amountPaid = parseFloat(invoice.amount_paid);
  const paymentProgress = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;
  const isPartiallyPaid = invoice.status === 'PARTIALLY_PAID';
  const isOverdue = invoice.status === 'OVERDUE';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <View style={styles.iconContainer}>
        <Receipt size={24} color={theme.colors.secondary.forest} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <InvoiceStatusBadge status={invoice.status} size="small" />
          </View>
          <Text style={styles.eventName} numberOfLines={1}>
            {invoice.event_name}
          </Text>
        </View>

        {/* Payment Progress for partial payments */}
        {isPartiallyPaid && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${paymentProgress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {formatCurrency(amountPaid, invoice.currency)} of{' '}
              {formatCurrency(totalAmount, invoice.currency)} paid
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>
              {invoice.status === 'PAID' ? 'Amount Paid' : 'Amount Due'}
            </Text>
            <Text style={[styles.amount, isOverdue && styles.amountOverdue]}>
              {formatCurrency(
                invoice.status === 'PAID' ? totalAmount : amountDue,
                invoice.currency
              )}
            </Text>
          </View>

          <View style={styles.dueDateSection}>
            {isOverdue ? (
              <View style={styles.overdueIndicator}>
                <Warning size={14} color={theme.colors.semantic.error} weight="fill" />
                <Text style={styles.overdueText}>Overdue</Text>
              </View>
            ) : invoice.status !== 'PAID' ? (
              <View style={styles.dueDate}>
                <Clock size={14} color={theme.colors.neutral.gray} />
                <Text style={styles.dueDateText}>
                  Due {formatCardDate(invoice.due_date)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <CaretRight size={20} color={theme.colors.neutral.gray} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.secondary.forestSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: theme.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 2,
  },
  invoiceNumber: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
  },
  eventName: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  progressSection: {
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.neutral.warmGray,
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.secondary.forest,
    borderRadius: 2,
  },
  progressText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  amountSection: {},
  amountLabel: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  amount: {
    ...theme.typeScale.titleMedium,
    color: theme.colors.primary.black,
  },
  amountOverdue: {
    color: theme.colors.semantic.error,
  },
  dueDateSection: {},
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  overdueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overdueText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.semantic.error,
    fontWeight: '600',
  },
});

export default InvoiceCard;
