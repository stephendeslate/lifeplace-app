/**
 * Dashboard Screen
 *
 * Hybrid dashboard showing:
 * - Critical actions requiring attention
 * - Next upcoming event preview
 * - Financial summary
 * - Quick actions
 * - Explore section (venues/packages)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MagnifyingGlass, Bell, ArrowRight } from 'phosphor-react-native';

import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { theme } from '@/theme';
import { colors, spacing, typeScale, layout } from '@/theme';
import {
  ActionCard,
  EventPreviewCard,
  FinancialSummaryCard,
  QuickActionRow,
} from '@/components/dashboard';
import { Skeleton, Card, EmptyState } from '@/components/common';
import type { QuickActionType } from '@/components/dashboard';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: dashboardData, isLoading, refetch, isRefetching } = useDashboard();

  const handleQuickAction = (action: QuickActionType) => {
    switch (action) {
      case 'new-booking':
        router.push('/booking' as never);
        break;
      case 'my-events':
        router.push('/events');
        break;
      case 'documents':
        router.push('/events');
        break;
      case 'support':
        // Could open support chat or help screen
        break;
    }
  };

  const handleViewAllEvents = () => {
    router.push('/events');
  };

  const handleEventPress = (eventId: number) => {
    router.push(`/events/${eventId}` as never);
  };

  const handleQuotePress = (eventId: number) => {
    router.push(`/events/${eventId}?tab=quotes` as never);
  };

  const handlePaymentPress = (eventId: number) => {
    router.push(`/events/${eventId}?tab=invoices` as never);
  };

  const handleContractPress = (eventId: number) => {
    router.push(`/events/${eventId}?tab=contracts` as never);
  };

  const hasCriticalActions =
    dashboardData?.criticalActions &&
    (dashboardData.criticalActions.pendingQuotes.length > 0 ||
      dashboardData.criticalActions.overduePayments.length > 0 ||
      dashboardData.criticalActions.pendingContracts.length > 0 ||
      dashboardData.criticalActions.urgentTasks.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Welcome{user?.first_name ? `, ${user.first_name}` : ''}!
            </Text>
            <Text style={styles.subGreeting}>
              {hasCriticalActions
                ? 'You have items requiring attention'
                : 'Your events at a glance'}
            </Text>
          </View>
          <Pressable style={styles.notificationButton}>
            <Bell size={24} color={colors.primary.black} />
          </Pressable>
        </View>

        {/* Loading State */}
        {isLoading && (
          <>
            <Skeleton variant="rounded" height={120} style={styles.skeleton} />
            <Skeleton variant="rounded" height={180} style={styles.skeleton} />
            <Skeleton variant="rounded" height={100} style={styles.skeleton} />
          </>
        )}

        {/* Critical Actions */}
        {!isLoading && hasCriticalActions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Action Required</Text>

            {/* Pending Quotes */}
            {dashboardData?.criticalActions.pendingQuotes.map((quote) => (
              <ActionCard
                key={`quote-${quote.id}`}
                type="quote"
                title="Quote Ready for Review"
                subtitle={quote.event_name}
                urgency="medium"
                onPress={() => handleQuotePress(quote.event_id)}
              />
            ))}

            {/* Overdue Payments */}
            {dashboardData?.criticalActions.overduePayments.map((payment) => (
              <ActionCard
                key={`payment-${payment.id}`}
                type="payment"
                title="Payment Overdue"
                subtitle={payment.event_name}
                urgency="high"
                onPress={() => handlePaymentPress(payment.event_id)}
              />
            ))}

            {/* Pending Contracts */}
            {dashboardData?.criticalActions.pendingContracts.map((contract) => (
              <ActionCard
                key={`contract-${contract.id}`}
                type="contract"
                title="Contract Awaiting Signature"
                subtitle={contract.event_name}
                urgency="medium"
                onPress={() => handleContractPress(contract.event_id)}
              />
            ))}

            {/* Urgent Tasks */}
            {dashboardData?.criticalActions.urgentTasks.map((task) => (
              <ActionCard
                key={`task-${task.id}`}
                type="task"
                title={task.title}
                subtitle={task.event_name}
                urgency={task.priority === 'URGENT' ? 'high' : 'medium'}
                onPress={() => handleEventPress(task.event_id)}
              />
            ))}
          </View>
        )}

        {/* Next Event Preview */}
        {!isLoading && dashboardData?.nextEvent && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Next Event</Text>
              <Pressable
                style={styles.viewAllButton}
                onPress={handleViewAllEvents}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <ArrowRight size={16} color={theme.colors.primary[600]} />
              </Pressable>
            </View>
            <EventPreviewCard
              event={dashboardData.nextEvent}
              onPress={() => handleEventPress(dashboardData.nextEvent!.id)}
            />
          </View>
        )}

        {/* No Events State */}
        {!isLoading && !dashboardData?.nextEvent && !hasCriticalActions && (
          <View style={styles.section}>
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="calendar"
                title="No Upcoming Events"
                description="Start planning your next event with us!"
                actionLabel="Book Now"
                onAction={() => router.push('/booking' as never)}
              />
            </Card>
          </View>
        )}

        {/* Financial Summary */}
        {!isLoading && dashboardData?.financialSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Overview</Text>
            <FinancialSummaryCard summary={dashboardData.financialSummary} />
          </View>
        )}

        {/* Quick Actions */}
        {!isLoading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <QuickActionRow
              actions={[
                {
                  type: 'new-booking',
                  label: 'New Booking',
                },
                {
                  type: 'my-events',
                  label: 'My Events',
                },
                {
                  type: 'documents',
                  label: 'Documents',
                },
                {
                  type: 'support',
                  label: 'Get Help',
                },
              ]}
              onActionPress={handleQuickAction}
            />
          </View>
        )}

        {/* Explore Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore</Text>

          {/* Search Bar */}
          <Pressable style={styles.searchBar}>
            <MagnifyingGlass size={20} color={colors.neutral.gray} />
            <Text style={styles.searchPlaceholder}>
              Search venues, packages...
            </Text>
          </Pressable>

          {/* Featured Venues Placeholder */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Featured Venues</Text>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                Venue discovery coming soon
              </Text>
            </View>
          </View>

          {/* Popular Packages Placeholder */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Popular Packages</Text>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                Package browsing coming soon
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.bottomNavHeight + spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typeScale.headlineLarge,
    color: theme.colors.neutral[900],
  },
  subGreeting: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[600],
    marginTop: spacing.xxs,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typeScale.titleLarge,
    color: theme.colors.neutral[900],
    marginBottom: spacing.md,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
  },
  subsection: {
    marginBottom: spacing.lg,
  },
  subsectionTitle: {
    ...typeScale.titleMedium,
    color: theme.colors.neutral[800],
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: layout.borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchPlaceholder: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[500],
  },
  placeholder: {
    backgroundColor: theme.colors.surface,
    padding: spacing.xxl,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  placeholderText: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[500],
  },
  skeleton: {
    marginBottom: spacing.md,
  },
  emptyCard: {
    padding: spacing.xl,
  },
});
