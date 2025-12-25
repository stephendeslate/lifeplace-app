/**
 * Invoice Detail Screen
 *
 * Displays full invoice details with line items, payment history,
 * and payment options.
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  Receipt,
  Calendar,
  Clock,
  Warning,
  CheckCircle,
  DownloadSimple,
  CreditCard,
  ArrowSquareOut,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { useInvoice, useCreatePaymentIntent } from '@/hooks/useFinancial';
import {
  InvoiceStatusBadge,
  InvoiceLineItem,
  PaymentHistoryItem,
} from '@/components/payments';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { formatCurrency, formatCardDate, getDaysUntil } from '@/utils/formatting';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const invoiceId = parseInt(id || '0', 10);
  const { data: invoice, isLoading, refetch, isFetching } = useInvoice(invoiceId);
  const createPaymentIntent = useCreatePaymentIntent();

  const [isDownloading, setIsDownloading] = useState(false);

  // Calculate derived values
  const subtotal = invoice ? parseFloat(invoice.subtotal) : 0;
  const taxAmount = invoice ? parseFloat(invoice.tax_amount) : 0;
  const discountAmount = invoice ? parseFloat(invoice.discount_amount) : 0;
  const totalAmount = invoice ? parseFloat(invoice.total_amount) : 0;
  const amountPaid = invoice ? parseFloat(invoice.amount_paid) : 0;
  const amountDue = invoice ? parseFloat(invoice.amount_due) : 0;
  const paymentProgress = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;

  const daysUntilDue = invoice?.due_date ? getDaysUntil(invoice.due_date) : null;
  const isOverdue = invoice?.status === 'OVERDUE';
  const isPaid = invoice?.status === 'PAID';
  const canPay = invoice?.can_pay_online && amountDue > 0 && !isPaid;

  // Handle pay now
  const handlePayNow = useCallback(async () => {
    if (!invoice?.can_pay_online) {
      Alert.alert(
        'Payment Not Available',
        'Online payment is not available for this invoice. Please contact us for payment options.'
      );
      return;
    }

    if (invoice.payment_url) {
      // Direct to external payment URL
      const canOpen = await Linking.canOpenURL(invoice.payment_url);
      if (canOpen) {
        await Linking.openURL(invoice.payment_url);
      } else {
        Alert.alert('Error', 'Unable to open payment page.');
      }
    } else {
      // Create payment intent for Stripe
      createPaymentIntent.mutate(invoiceId, {
        onSuccess: (data) => {
          // In a real app, this would navigate to a Stripe payment sheet
          // For now, show an alert
          Alert.alert(
            'Payment Initiated',
            'You will be redirected to complete your payment securely.',
            [{ text: 'OK' }]
          );
        },
      });
    }
  }, [invoice, invoiceId, createPaymentIntent]);

  // Handle download
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      // In a full implementation, this would use expo-file-system and expo-sharing
      // to download and share the PDF
      Alert.alert(
        'Download Invoice',
        'Invoice PDF will be downloaded to your device.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: () => {
              // Implement actual download logic
              Alert.alert('Success', 'Invoice downloaded successfully.');
            },
          },
        ]
      );
    } finally {
      setIsDownloading(false);
    }
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <CaretLeft size={24} color={theme.colors.primary.black} />
          </TouchableOpacity>
          <Skeleton width={150} height={24} />
        </View>
        <View style={styles.skeletonContent}>
          <Skeleton width="100%" height={150} borderRadius={16} />
          <Skeleton width="100%" height={250} borderRadius={16} />
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Warning size={64} color={theme.colors.neutral.gray} weight="light" />
        <Text style={styles.errorTitle}>Invoice Not Found</Text>
        <Text style={styles.errorDescription}>
          This invoice may have been removed or is no longer available.
        </Text>
        <Button variant="secondary" onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <CaretLeft size={24} color={theme.colors.primary.black} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{invoice.invoice_number}</Text>
            <InvoiceStatusBadge status={invoice.status} size="small" />
          </View>
          <TouchableOpacity
            onPress={handleDownload}
            style={styles.downloadButton}
            disabled={isDownloading}
          >
            <DownloadSimple size={20} color={theme.colors.primary.black} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: canPay ? 100 : insets.bottom + 20 },
          ]}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
          }
        >
          {/* Event & Due Date Card */}
          <Card style={styles.card}>
            <View style={styles.eventRow}>
              <Receipt size={24} color={theme.colors.accent.wood} />
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{invoice.event_name}</Text>
                <Text style={styles.eventLabel}>Event</Text>
              </View>
            </View>

            <View style={styles.dateSection}>
              <View style={styles.dateItem}>
                <Calendar size={16} color={theme.colors.neutral.gray} />
                <Text style={styles.dateLabel}>Issued</Text>
                <Text style={styles.dateValue}>{formatCardDate(invoice.issued_date)}</Text>
              </View>

              <View style={styles.dateDivider} />

              <View style={styles.dateItem}>
                {isOverdue ? (
                  <Warning size={16} color={theme.colors.semantic.error} weight="fill" />
                ) : isPaid ? (
                  <CheckCircle size={16} color={theme.colors.semantic.success} weight="fill" />
                ) : (
                  <Clock size={16} color={theme.colors.neutral.gray} />
                )}
                <Text style={styles.dateLabel}>
                  {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Due'}
                </Text>
                <Text
                  style={[
                    styles.dateValue,
                    isOverdue && styles.dateValueOverdue,
                    isPaid && styles.dateValuePaid,
                  ]}
                >
                  {isPaid && invoice.paid_date
                    ? formatCardDate(invoice.paid_date)
                    : formatCardDate(invoice.due_date)}
                </Text>
              </View>
            </View>

            {/* Payment Progress */}
            {invoice.status === 'PARTIALLY_PAID' && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Payment Progress</Text>
                  <Text style={styles.progressPercent}>
                    {Math.round(paymentProgress)}%
                  </Text>
                </View>
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
          </Card>

          {/* Line Items */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Items</Text>
            {invoice.line_items.map((item) => (
              <InvoiceLineItem key={item.id} item={item} currency={invoice.currency} />
            ))}

            {/* Totals */}
            <View style={styles.totalsSection}>
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

              {!isPaid && (
                <View style={[styles.totalRow, styles.amountDueRow]}>
                  <Text style={[styles.totalLabel, styles.amountDueLabel]}>
                    Amount Due
                  </Text>
                  <Text
                    style={[
                      styles.grandTotalValue,
                      isOverdue && styles.amountDueOverdue,
                    ]}
                  >
                    {formatCurrency(amountDue, invoice.currency)}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              {invoice.payments.map((payment) => (
                <PaymentHistoryItem key={payment.id} payment={payment} />
              ))}
            </Card>
          )}

          {/* Paid Status Card */}
          {isPaid && (
            <Card style={[styles.card, styles.paidCard]}>
              <View style={styles.paidContent}>
                <CheckCircle
                  size={24}
                  color={theme.colors.semantic.success}
                  weight="fill"
                />
                <View style={styles.paidText}>
                  <Text style={styles.paidTitle}>Payment Complete</Text>
                  <Text style={styles.paidDescription}>
                    Thank you for your payment. A receipt has been sent to your email.
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </ScrollView>

        {/* Pay Now Button */}
        {canPay && (
          <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Amount Due</Text>
              <Text style={styles.actionAmount}>
                {formatCurrency(amountDue, invoice.currency)}
              </Text>
            </View>
            <Button
              variant="cta"
              onPress={handlePayNow}
              loading={createPaymentIntent.isPending}
              style={styles.payButton}
            >
              Pay Now
            </Button>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral.cream,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typeScale.titleMedium,
    color: theme.colors.primary.black,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.md,
  },
  skeletonContent: {
    padding: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.lg,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    ...theme.typeScale.titleMedium,
    color: theme.colors.primary.black,
  },
  eventLabel: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  dateSection: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.warmGray,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dateDivider: {
    width: 1,
    backgroundColor: theme.colors.neutral.warmGray,
    marginHorizontal: theme.spacing.md,
  },
  dateLabel: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  dateValue: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.primary.black,
    fontWeight: '600',
  },
  dateValueOverdue: {
    color: theme.colors.semantic.error,
  },
  dateValuePaid: {
    color: theme.colors.semantic.success,
  },
  progressSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.warmGray,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressLabel: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  progressPercent: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.secondary.forest,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.neutral.warmGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.secondary.forest,
    borderRadius: 4,
  },
  progressText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
    marginBottom: theme.spacing.sm,
  },
  totalsSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.warmGray,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  totalLabel: {
    ...theme.typeScale.bodySmall,
    color: theme.colors.neutral.gray,
  },
  totalValue: {
    ...theme.typeScale.bodySmall,
    color: theme.colors.primary.black,
  },
  discountValue: {
    color: theme.colors.semantic.success,
  },
  grandTotalRow: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 2,
    borderTopColor: theme.colors.primary.black,
    marginBottom: 0,
  },
  grandTotalLabel: {
    ...theme.typeScale.titleMedium,
    color: theme.colors.primary.black,
  },
  grandTotalValue: {
    ...theme.typeScale.titleLarge,
    color: theme.colors.primary.black,
  },
  amountDueRow: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.warning[50],
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    marginBottom: -theme.spacing.lg,
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
  },
  amountDueLabel: {
    color: theme.colors.primary.black,
    fontWeight: '500',
  },
  amountDueOverdue: {
    color: theme.colors.semantic.error,
  },
  paidCard: {
    backgroundColor: theme.colors.success[50],
  },
  paidContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  paidText: {
    flex: 1,
  },
  paidTitle: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.semantic.success,
  },
  paidDescription: {
    ...theme.typeScale.bodySmall,
    color: theme.colors.neutral.darkGray,
    marginTop: 2,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.neutral.white,
    ...theme.shadows.lg,
  },
  actionInfo: {
    flex: 1,
  },
  actionLabel: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  actionAmount: {
    ...theme.typeScale.titleLarge,
    color: theme.colors.primary.black,
  },
  payButton: {
    minWidth: 140,
  },
  errorTitle: {
    ...theme.typeScale.titleLarge,
    color: theme.colors.primary.black,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  errorDescription: {
    ...theme.typeScale.bodyMedium,
    color: theme.colors.neutral.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
});
