/**
 * InvoiceDetailsModal
 *
 * Modal for displaying invoice details including line items,
 * totals breakdown, and payment history.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Receipt,
  Calendar,
  Clock,
  CheckCircle,
  Warning,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoiceLineItem } from './InvoiceLineItem';
import { formatCurrency, formatCardDate } from '@/utils/formatting';
import type { Invoice, Payment } from '@/apis/payments.api';

export interface InvoiceDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export function InvoiceDetailsModal({
  visible,
  onClose,
  invoice,
}: InvoiceDetailsModalProps) {
  const insets = useSafeAreaInsets();

  if (!invoice) return null;

  const subtotal = parseFloat(invoice.subtotal) || 0;
  const taxAmount = parseFloat(invoice.tax_amount) || 0;
  const discountAmount = parseFloat(invoice.discount_amount) || 0;
  const totalAmount = parseFloat(invoice.total_amount) || 0;
  const amountPaid = parseFloat(invoice.amount_paid) || 0;
  const remainingAmount = parseFloat(invoice.remaining_amount) || 0;
  const isPaid = invoice.status === 'PAID';
  const isOverdue = invoice.status === 'OVERDUE';
  const hasLineItems = invoice.line_items && invoice.line_items.length > 0;
  const hasPayments = invoice.payments && invoice.payments.length > 0;
  const completedPayments = invoice.payments?.filter(p => p.status === 'COMPLETED') || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Receipt size={24} color={theme.colors.primary[500]} />
            <Text style={styles.title}>{invoice.invoice_number}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.neutral[800]} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Status & Dates Section */}
          <View style={styles.section}>
            <View style={styles.statusRow}>
              <InvoiceStatusBadge status={invoice.status} size="medium" />
              {isOverdue && (
                <View style={styles.overdueChip}>
                  <Warning size={14} color={theme.colors.error[600]} weight="fill" />
                  <Text style={styles.overdueText}>Payment Overdue</Text>
                </View>
              )}
              {isPaid && (
                <View style={styles.paidChip}>
                  <CheckCircle size={14} color={theme.colors.success[600]} weight="fill" />
                  <Text style={styles.paidText}>Fully Paid</Text>
                </View>
              )}
            </View>

            <View style={styles.datesContainer}>
              <View style={styles.dateRow}>
                <Calendar size={16} color={theme.colors.neutral[500]} />
                <Text style={styles.dateLabel}>Issued:</Text>
                <Text style={styles.dateValue}>{formatCardDate(invoice.issued_date)}</Text>
              </View>
              <View style={styles.dateRow}>
                <Clock size={16} color={isOverdue ? theme.colors.error[500] : theme.colors.neutral[500]} />
                <Text style={[styles.dateLabel, isOverdue && styles.dateLabelOverdue]}>Due:</Text>
                <Text style={[styles.dateValue, isOverdue && styles.dateValueOverdue]}>
                  {formatCardDate(invoice.due_date)}
                </Text>
              </View>
              {invoice.paid_date && (
                <View style={styles.dateRow}>
                  <CheckCircle size={16} color={theme.colors.success[500]} />
                  <Text style={styles.dateLabel}>Paid:</Text>
                  <Text style={[styles.dateValue, styles.dateValueSuccess]}>
                    {formatCardDate(invoice.paid_date)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Line Items Section */}
          {hasLineItems && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items</Text>
              <View style={styles.lineItemsContainer}>
                {invoice.line_items.map((item) => (
                  <InvoiceLineItem
                    key={item.id}
                    item={item}
                    currency={invoice.currency}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Totals Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(subtotal, invoice.currency)}
                </Text>
              </View>

              {taxAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(taxAmount, invoice.currency)}
                  </Text>
                </View>
              )}

              {discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={[styles.totalValue, styles.discountValue]}>
                    -{formatCurrency(discountAmount, invoice.currency)}
                  </Text>
                </View>
              )}

              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(totalAmount, invoice.currency)}
                </Text>
              </View>

              {amountPaid > 0 && !isPaid && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Amount Paid</Text>
                    <Text style={[styles.totalValue, styles.paidValue]}>
                      -{formatCurrency(amountPaid, invoice.currency)}
                    </Text>
                  </View>
                  <View style={[styles.totalRow, styles.balanceRow]}>
                    <Text style={styles.balanceLabel}>Balance Due</Text>
                    <Text style={[styles.balanceValue, isOverdue && styles.balanceValueOverdue]}>
                      {formatCurrency(remainingAmount, invoice.currency)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Payment History Section */}
          {hasPayments && completedPayments.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              <View style={styles.paymentsContainer}>
                {completedPayments.map((payment) => (
                  <PaymentItem key={payment.id} payment={payment} />
                ))}
              </View>
            </View>
          )}

          {/* Event Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event</Text>
            <View style={styles.eventContainer}>
              <Text style={styles.eventName}>{invoice.event_name}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Simple payment item component for displaying within invoice context
function PaymentItem({ payment }: { payment: Payment }) {
  const amount = parseFloat(payment.amount);
  const isCompleted = payment.status === 'COMPLETED';

  return (
    <View style={styles.paymentItem}>
      <View style={styles.paymentIcon}>
        <CheckCircle
          size={16}
          color={isCompleted ? theme.colors.success[500] : theme.colors.neutral[400]}
          weight="fill"
        />
      </View>
      <View style={styles.paymentContent}>
        <Text style={styles.paymentNumber}>{payment.payment_number}</Text>
        <Text style={styles.paymentDate}>
          {formatCardDate(payment.paid_on || payment.created_at)}
        </Text>
      </View>
      <Text style={styles.paymentAmount}>
        {formatCurrency(amount, payment.currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.neutral[800],
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  overdueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.error[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  overdueText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.error[700],
  },
  paidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.success[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  paidText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.success[700],
  },
  datesContainer: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dateLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
    width: 50,
  },
  dateLabelOverdue: {
    color: theme.colors.error[600],
  },
  dateValue: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[800],
  },
  dateValueOverdue: {
    color: theme.colors.error[600],
  },
  dateValueSuccess: {
    color: theme.colors.success[600],
  },
  lineItemsContainer: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  totalsContainer: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
  totalValue: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[800],
  },
  discountValue: {
    color: theme.colors.success[600],
  },
  paidValue: {
    color: theme.colors.success[600],
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  grandTotalLabel: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  grandTotalValue: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
  },
  balanceRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  balanceLabel: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[700],
  },
  balanceValue: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.primary[600],
  },
  balanceValueOverdue: {
    color: theme.colors.error[600],
  },
  paymentsContainer: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  paymentIcon: {
    marginRight: theme.spacing.sm,
  },
  paymentContent: {
    flex: 1,
  },
  paymentNumber: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[800],
  },
  paymentDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  paymentAmount: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.success[600],
  },
  eventContainer: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  eventName: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
});

export default InvoiceDetailsModal;
