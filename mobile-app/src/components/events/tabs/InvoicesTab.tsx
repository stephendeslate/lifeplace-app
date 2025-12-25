/**
 * InvoicesTab Component
 *
 * Displays event invoices with payment status.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  Pressable,
  Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Receipt, CreditCard, CheckCircle, Clock, Warning } from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventInvoices } from '@/hooks/useFinancial';
import { Skeleton, EmptyState, Card, Badge, Button } from '@/components/common';
import { formatCurrency, formatCardDate } from '@/utils/formatting';
import type { Invoice } from '@/apis/payments.api';

export interface InvoicesTabProps {
  eventId: number;
}

export function InvoicesTab({ eventId }: InvoicesTabProps) {
  const { data: invoices, isLoading, refetch, isRefetching } = useEventInvoices(eventId);

  const handlePayNow = async (invoice: Invoice) => {
    if (!invoice.can_pay_online || !invoice.payment_url) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Linking.openURL(invoice.payment_url);
    } catch (error) {
      console.error('Failed to open payment URL:', error);
    }
  };

  const getStatusConfig = (status: Invoice['status']) => {
    switch (status) {
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
      case 'OVERDUE':
        return {
          icon: Warning,
          color: theme.colors.error[500],
          label: 'Overdue',
          variant: 'error' as const,
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

  if (!invoices || invoices.length === 0) {
    return (
      <EmptyState
        icon="document"
        title="No Invoices"
        description="Invoices for this event will appear here."
      />
    );
  }

  const renderItem = ({ item: invoice }: { item: Invoice }) => {
    const statusConfig = getStatusConfig(invoice.status);
    const StatusIcon = statusConfig.icon;
    const amountDue = parseFloat(invoice.amount_due);
    const isPaid = invoice.status === 'PAID';

    return (
      <Card style={styles.invoiceCard}>
        {/* Header */}
        <View style={styles.invoiceHeader}>
          <View>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <Text style={styles.invoiceDate}>
              Issued: {formatCardDate(invoice.issued_date)}
            </Text>
          </View>
          <Badge
            label={statusConfig.label}
            variant={statusConfig.variant}
            icon={<StatusIcon size={12} color={statusConfig.color} weight="bold" />}
          />
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(invoice.total_amount, invoice.currency)}
            </Text>
          </View>
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
                invoice.status === 'OVERDUE' && styles.dueDateOverdue,
              ]}
            >
              {formatCardDate(invoice.due_date)}
            </Text>
          </View>
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
      </Card>
    );
  };

  return (
    <FlatList
      data={invoices}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[theme.colors.primary[500]]}
          tintColor={theme.colors.primary[500]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  invoiceCard: {
    marginBottom: theme.spacing.md,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
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
  payButton: {
    marginTop: theme.spacing.md,
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
