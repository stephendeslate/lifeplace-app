/**
 * InvoicesTab Component
 *
 * Displays event invoices with payment status, progress bars,
 * due date warnings, and PDF viewing capability.
 * Matches client-portal EventInvoices patterns.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Receipt,
  CheckCircle,
  Clock,
  Warning,
  DownloadSimple,
  Eye,
} from 'phosphor-react-native';
import { differenceInDays, isBefore } from 'date-fns';
import { theme } from '@/theme';
import { useEventInvoices } from '@/hooks/useFinancial';
import { paymentsApi } from '@/apis/payments.api';
import { Skeleton, EmptyState, Card, Badge, Button, PDFViewerModal } from '@/components/common';
import { InvoiceDetailsModal, InvoicePaymentModal } from '@/components/payments';
import { formatCurrency, formatCardDate } from '@/utils/formatting';
import { useAuthStore } from '@/stores/authStore';
import type { Invoice } from '@/apis/payments.api';

export interface InvoicesTabProps {
  eventId: number;
}

export function InvoicesTab({ eventId }: InvoicesTabProps) {
  const { data: invoices, isLoading, refetch, isRefetching } = useEventInvoices(eventId);
  const { accessToken } = useAuthStore();

  // Payment modal state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  // PDF viewer state
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Details modal state
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [detailsInvoice, setDetailsInvoice] = useState<Invoice | null>(null);

  // Get auth headers for PDF download
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (accessToken) {
      return { Authorization: `Bearer ${accessToken}` };
    }
    return {};
  };

  // Calculate overdue count
  const overdueCount = useMemo(() => {
    if (!invoices) return 0;
    return invoices.filter((inv) => isInvoiceOverdue(inv)).length;
  }, [invoices]);

  // Handle Pay Now - open payment modal
  const handlePayNow = useCallback((invoice: Invoice) => {
    if (!invoice.can_pay_online) {
      Alert.alert(
        'Payment Not Available',
        'Online payment is not available for this invoice. Please contact us for payment options.'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaymentInvoice(invoice);
    setPaymentModalVisible(true);
  }, []);

  // Handle payment success - refresh data
  const handlePaymentSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  // Close payment modal
  const handleClosePaymentModal = useCallback(() => {
    setPaymentModalVisible(false);
    setPaymentInvoice(null);
  }, []);

  const handleViewPdf = (invoice: Invoice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedInvoice(invoice);
    setPdfViewerVisible(true);
  };

  const handleClosePdf = () => {
    setPdfViewerVisible(false);
    setSelectedInvoice(null);
  };

  const handleDownloadPdf = async () => {
    if (!selectedInvoice) return;
    // Open in external browser for download
    const pdfUrl = paymentsApi.getInvoicePdfUrl(selectedInvoice.id);
    try {
      await Linking.openURL(pdfUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to download the invoice.');
    }
  };

  const handleViewDetails = (invoice: Invoice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetailsInvoice(invoice);
    setDetailsModalVisible(true);
  };

  const handleCloseDetails = () => {
    setDetailsModalVisible(false);
    setDetailsInvoice(null);
  };

  const getStatusConfig = (invoice: Invoice) => {
    const overdue = isInvoiceOverdue(invoice);

    if (overdue) {
      return {
        icon: Warning,
        color: theme.colors.error[500],
        label: 'Overdue',
        variant: 'error' as const,
      };
    }

    switch (invoice.status) {
      case 'PAID':
        return {
          icon: CheckCircle,
          color: theme.colors.success[500],
          label: 'Paid',
          variant: 'success' as const,
        };
      case 'PARTIALLY_PAID':
        return {
          icon: Clock,
          color: theme.colors.warning[500],
          label: 'Partially Paid',
          variant: 'warning' as const,
        };
      default:
        return {
          icon: Receipt,
          color: theme.colors.neutral[500],
          label: 'Pending',
          variant: 'default' as const,
        };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={14} />
            <Skeleton variant="rounded" width="100%" height={60} />
          </View>
        ))}
      </View>
    );
  }

  const renderEmptyState = () => (
    <EmptyState
      icon="document"
      title="No Invoices"
      description="Invoices for this event will appear here. Pull down to refresh."
    />
  );

  const renderItem = ({ item: invoice }: { item: Invoice }) => {
    const statusConfig = getStatusConfig(invoice);
    const StatusIcon = statusConfig.icon;
    const amountDue = parseFloat(invoice.remaining_amount) || 0;
    const amountPaid = parseFloat(invoice.amount_paid);
    const totalAmount = parseFloat(invoice.total_amount);
    const isPaid = invoice.status === 'PAID';
    const isOverdue = isInvoiceOverdue(invoice);
    const daysUntilDue = getDaysUntilDue(invoice);
    const paymentProgress = getPaymentProgress(totalAmount, amountPaid);
    const isPartiallyPaid = invoice.status === 'PARTIALLY_PAID';

    return (
      <Card style={[styles.invoiceCard, isOverdue && styles.invoiceCardOverdue]}>
        {/* Header */}
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceHeaderLeft}>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <Text style={styles.invoiceDate}>
              Issued: {formatCardDate(invoice.issued_date)}
            </Text>
          </View>
          <View style={styles.invoiceHeaderRight}>
            <Badge
              label={statusConfig.label}
              variant={statusConfig.variant}
              icon={<StatusIcon size={12} color={statusConfig.color} weight="bold" />}
            />
            {/* Due date warning chip */}
            {!isPaid && !isOverdue && daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7 && (
              <View style={styles.dueSoonChip}>
                <Text style={styles.dueSoonText}>
                  {daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} left`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(invoice.total_amount, invoice.currency)}
            </Text>
          </View>
          {isPartiallyPaid && (
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Paid</Text>
              <Text style={[styles.amountValue, styles.amountPaid]}>
                {formatCurrency(amountPaid, invoice.currency)}
              </Text>
            </View>
          )}
          {!isPaid && (
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Amount Due</Text>
              <Text style={[styles.amountValue, styles.amountDue]}>
                {formatCurrency(amountDue, invoice.currency)}
              </Text>
            </View>
          )}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Due Date</Text>
            <Text
              style={[
                styles.dueDate,
                isOverdue && styles.dueDateOverdue,
              ]}
            >
              {formatCardDate(invoice.due_date)}
            </Text>
          </View>
        </View>

        {/* Payment Progress Bar for partially paid */}
        {isPartiallyPaid && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Payment Progress</Text>
              <Text style={styles.progressPercent}>{Math.round(paymentProgress)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${paymentProgress}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {/* View Actions Row */}
          <View style={styles.viewActionsRow}>
            {isPaid ? (
              <Pressable
                onPress={() => handleViewPdf(invoice)}
                style={styles.viewButton}
              >
                <DownloadSimple size={18} color={theme.colors.primary[500]} />
                <Text style={styles.viewButtonText}>View PDF</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => handleViewDetails(invoice)}
                style={styles.viewButton}
              >
                <Eye size={18} color={theme.colors.primary[500]} />
                <Text style={styles.viewButtonText}>View Details</Text>
              </Pressable>
            )}
          </View>

          {/* Pay button */}
          {invoice.can_pay_online && amountDue > 0 && (
            <Button
              onPress={() => handlePayNow(invoice)}
              variant="primary"
              style={styles.payButton}
            >
              Pay Now
            </Button>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      {/* Overdue Warning Banner */}
      {overdueCount > 0 && (
        <View style={styles.overdueAlert}>
          <Warning size={18} color={theme.colors.error[600]} weight="fill" />
          <Text style={styles.overdueAlertText}>
            You have {overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''}. Please make a payment to avoid late fees.
          </Text>
        </View>
      )}

      <FlatList
        data={invoices ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContainer,
          (!invoices || invoices.length === 0) && styles.emptyListContainer,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      />

      {/* PDF Viewer Modal */}
      {selectedInvoice && (
        <PDFViewerModal
          visible={pdfViewerVisible}
          onClose={handleClosePdf}
          title={`Invoice ${selectedInvoice.invoice_number}`}
          pdfUrl={paymentsApi.getInvoicePdfUrl(selectedInvoice.id)}
          onDownload={handleDownloadPdf}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {/* Invoice Details Modal */}
      <InvoiceDetailsModal
        visible={detailsModalVisible}
        onClose={handleCloseDetails}
        invoice={detailsInvoice}
      />

      {/* Invoice Payment Modal */}
      {paymentInvoice && (
        <InvoicePaymentModal
          visible={paymentModalVisible}
          onClose={handleClosePaymentModal}
          invoice={paymentInvoice}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </View>
  );
}

// Helper functions
function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'PAID' || invoice.status === 'VOID' || invoice.status === 'CANCELLED') {
    return false;
  }
  return isBefore(new Date(invoice.due_date), new Date());
}

function getDaysUntilDue(invoice: Invoice): number | null {
  if (!invoice.due_date) return null;
  return differenceInDays(new Date(invoice.due_date), new Date());
}

function getPaymentProgress(total: number, paid: number): number {
  if (total <= 0) return 0;
  return Math.min((paid / total) * 100, 100);
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  overdueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.error[50],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error[100],
  },
  overdueAlertText: {
    flex: 1,
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error[700],
  },
  invoiceCard: {
    marginBottom: theme.spacing.md,
  },
  invoiceCardOverdue: {
    borderWidth: 1,
    borderColor: theme.colors.error[100],
    backgroundColor: theme.colors.error[50],
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  invoiceHeaderLeft: {
    flex: 1,
  },
  invoiceHeaderRight: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  invoiceNumber: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
  },
  invoiceDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  dueSoonChip: {
    backgroundColor: theme.colors.warning[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.warning[500],
  },
  dueSoonText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.warning[700],
  },
  amountSection: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
  amountValue: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  amountPaid: {
    color: theme.colors.success[600],
  },
  amountDue: {
    color: theme.colors.primary[600],
  },
  dueDate: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
  },
  dueDateOverdue: {
    color: theme.colors.error[500],
  },
  progressSection: {
    marginTop: theme.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  progressLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
  progressPercent: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.success[600],
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.success[500],
    borderRadius: 3,
  },
  actionsContainer: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  viewActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    backgroundColor: theme.colors.primary[50],
  },
  viewButtonText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
  },
  payButton: {
    width: '100%',
  },
  skeletonItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
});

export default InvoicesTab;
