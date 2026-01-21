/**
 * Financial Portal Screen
 *
 * Main screen for managing payments and invoices with tabs
 * for Invoices, Payment History, and Payment Methods.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeft,
  Receipt,
  ClockCounterClockwise,
  CreditCard,
  Warning,
  Wallet,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import {
  useFinancialOverview,
  useInvoices,
  usePayments,
} from '@/hooks/useFinancial';
import {
  InvoiceCard,
  PaymentHistoryItem,
  PaymentMethodCard,
} from '@/components/payments';
import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenErrorBoundary } from '@/components/common/ScreenErrorBoundary';
import { formatCurrency } from '@/utils/formatting';
import type { Invoice, Payment, InvoiceStatus } from '@/apis/payments.api';

type TabId = 'invoices' | 'history' | 'methods';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof Receipt;
}

const TABS: Tab[] = [
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'history', label: 'History', icon: ClockCounterClockwise },
  { id: 'methods', label: 'Methods', icon: CreditCard },
];

type InvoiceFilterId = 'all' | 'pending' | 'paid' | 'overdue';

interface InvoiceFilter {
  id: InvoiceFilterId;
  label: string;
  status?: InvoiceStatus | InvoiceStatus[];
}

const INVOICE_FILTERS: InvoiceFilter[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending', status: 'ISSUED' },
  { id: 'overdue', label: 'Overdue', status: 'OVERDUE' },
  { id: 'paid', label: 'Paid', status: 'PAID' },
];

function FinancialPortalScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabId>('invoices');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilterId>('all');

  // Fetch data
  const {
    data: overview,
    isLoading: overviewLoading,
    refetch: refetchOverview,
  } = useFinancialOverview();

  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    refetch: refetchInvoices,
    isFetching: invoicesFetching,
  } = useInvoices();

  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    refetch: refetchPayments,
    isFetching: paymentsFetching,
  } = usePayments({ status: 'COMPLETED' });

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (!invoicesData?.results) return [];
    if (invoiceFilter === 'all') return invoicesData.results;

    const filter = INVOICE_FILTERS.find((f) => f.id === invoiceFilter);
    if (!filter?.status) return invoicesData.results;

    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    return invoicesData.results.filter((inv) => statuses.includes(inv.status));
  }, [invoicesData?.results, invoiceFilter]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    refetchOverview();
    if (activeTab === 'invoices') {
      refetchInvoices();
    } else if (activeTab === 'history') {
      refetchPayments();
    }
  }, [activeTab, refetchOverview, refetchInvoices, refetchPayments]);

  // Navigation
  const handleInvoicePress = useCallback(
    (invoice: Invoice) => {
      router.push(`/payments/${invoice.id}`);
    },
    [router]
  );

  // Render overview card
  const renderOverviewCard = () => {
    if (overviewLoading) {
      return (
        <Card style={styles.overviewCard}>
          <Skeleton width={120} height={16} />
          <Skeleton width={160} height={32} style={{ marginTop: 8 }} />
          <Skeleton width="100%" height={40} style={{ marginTop: 16 }} />
        </Card>
      );
    }

    if (!overview) return null;

    const totalOutstanding = parseFloat(overview.total_outstanding);
    const hasOverdue = overview.overdue_invoices_count > 0;

    return (
      <Card style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <Wallet size={24} color={theme.colors.accent.wood} />
          <Text style={styles.overviewLabel}>Total Outstanding</Text>
        </View>

        <Text style={styles.overviewAmount}>
          {formatCurrency(totalOutstanding, overview.currency)}
        </Text>

        {hasOverdue && (
          <View style={styles.overdueWarning}>
            <Warning size={16} color={theme.colors.semantic.error} weight="fill" />
            <Text style={styles.overdueText}>
              {overview.overdue_invoices_count} overdue invoice
              {overview.overdue_invoices_count !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {overview.next_payment_due && (
          <View style={styles.nextPayment}>
            <Text style={styles.nextPaymentLabel}>Next payment due:</Text>
            <Text style={styles.nextPaymentAmount}>
              {formatCurrency(overview.next_payment_due.amount, overview.currency)}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  // Render tab bar
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Icon
              size={20}
              color={isActive ? theme.colors.primary.black : theme.colors.neutral.gray}
              weight={isActive ? 'fill' : 'regular'}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Render invoice filters
  const renderInvoiceFilters = () => (
    <View style={styles.filterRow}>
      {INVOICE_FILTERS.map((filter) => {
        const isActive = invoiceFilter === filter.id;
        return (
          <TouchableOpacity
            key={filter.id}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={() => setInvoiceFilter(filter.id)}
          >
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Render invoice item
  const renderInvoiceItem = ({ item }: { item: Invoice }) => (
    <InvoiceCard
      invoice={item}
      onPress={() => handleInvoicePress(item)}
      testID={`invoice-${item.id}`}
    />
  );

  // Render payment history item
  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <PaymentHistoryItem payment={item} testID={`payment-${item.id}`} />
  );

  // Render invoices tab
  const renderInvoicesTab = () => {
    if (invoicesLoading) {
      return (
        <View style={styles.skeletonList}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={120} borderRadius={12} />
          ))}
        </View>
      );
    }

    if (filteredInvoices.length === 0) {
      return (
        <EmptyState
          icon="document"
          title="No Invoices"
          description={
            invoiceFilter === 'all'
              ? "You don't have any invoices yet."
              : `No ${invoiceFilter} invoices found.`
          }
        />
      );
    }

    return (
      <FlashList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={invoicesFetching} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  // Render history tab
  const renderHistoryTab = () => {
    if (paymentsLoading) {
      return (
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={60} borderRadius={8} />
          ))}
        </View>
      );
    }

    const payments = paymentsData?.results || [];

    if (payments.length === 0) {
      return (
        <EmptyState
          icon="calendar"
          title="No Payment History"
          description="Your completed payments will appear here."
        />
      );
    }

    return (
      <FlashList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={paymentsFetching} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  // Render methods tab (placeholder - payment methods usually managed server-side)
  const renderMethodsTab = () => {
    return (
      <View style={styles.methodsContainer}>
        <Text style={styles.methodsSectionTitle}>Saved Payment Methods</Text>
        <PaymentMethodCard
          method="STRIPE"
          label="Credit Card"
          last4="4242"
          isDefault
        />
        <View style={{ height: theme.spacing.md }} />
        <PaymentMethodCard method="BANK_TRANSFER" label="Bank Account" />

        <Text style={[styles.methodsSectionTitle, { marginTop: theme.spacing.xl }]}>
          Other Payment Options
        </Text>
        <Text style={styles.methodsDescription}>
          We accept bank transfers, checks, and other payment methods. Contact us for
          details on alternative payment options.
        </Text>
      </View>
    );
  };

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'invoices':
        return (
          <>
            {renderInvoiceFilters()}
            {renderInvoicesTab()}
          </>
        );
      case 'history':
        return renderHistoryTab();
      case 'methods':
        return renderMethodsTab();
      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <CaretLeft size={24} color={theme.colors.primary.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Financial Portal</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Overview Card */}
        {renderOverviewCard()}

        {/* Tab Bar */}
        {renderTabBar()}

        {/* Tab Content */}
        <View style={styles.tabContent}>{renderTabContent()}</View>
      </View>
    </>
  );
}

export default function FinancialPortalScreen() {
  return (
    <ScreenErrorBoundary screenName="Financial Portal">
      <FinancialPortalScreenContent />
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral.cream,
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
  headerTitle: {
    flex: 1,
    ...theme.typeScale.titleMedium,
    color: theme.colors.primary.black,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  overviewCard: {
    marginHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  overviewLabel: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.neutral.gray,
  },
  overviewAmount: {
    ...theme.typeScale.headlineMedium,
    color: theme.colors.primary.black,
    marginTop: theme.spacing.xs,
  },
  overdueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.error[50],
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  overdueText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.semantic.error,
    fontWeight: '500',
  },
  nextPayment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.warmGray,
  },
  nextPaymentLabel: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  nextPaymentAmount: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.primary.black,
  },
  tabLabel: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  tabLabelActive: {
    color: theme.colors.neutral.white,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    marginTop: theme.spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.neutral.warmGray,
  },
  filterChipActive: {
    backgroundColor: theme.colors.secondary.forestSubtle,
    borderColor: theme.colors.secondary.forest,
  },
  filterChipText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  filterChipTextActive: {
    color: theme.colors.secondary.forest,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.xl,
  },
  separator: {
    height: theme.spacing.md,
  },
  skeletonList: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.md,
  },
  methodsContainer: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  methodsSectionTitle: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
    marginBottom: theme.spacing.sm,
  },
  methodsDescription: {
    ...theme.typeScale.bodySmall,
    color: theme.colors.neutral.gray,
    lineHeight: 20,
  },
});
