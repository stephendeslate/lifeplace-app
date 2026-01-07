/**
 * ManagementLayout Component
 *
 * Home screen layout for users WITH active bookings.
 * Focuses on event management, critical actions, and financial overview.
 *
 * Content:
 * - Header with greeting and notification bell
 * - Critical Actions section (quotes, payments, contracts, tasks)
 * - Next Event preview
 * - Quick Actions row
 * - Financial Summary
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Bell, ArrowRight, CaretDown, CaretUp } from 'phosphor-react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
} from 'react-native-reanimated';

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
import type { User } from '@/types/auth.types';
import type { DashboardResult } from '@/hooks/useDashboard';

// =============================================================================
// TYPES
// =============================================================================

export interface ManagementLayoutProps {
  /** Authenticated user data */
  user: User | null;
  /** Aggregated dashboard data */
  dashboardData: DashboardResult | undefined;
  /** Whether data is loading */
  isLoading: boolean;
  /** Whether data is being refreshed */
  isRefetching: boolean;
  /** Function to trigger refresh */
  onRefresh: () => void;
  /** Unread notification count */
  unreadCount: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ManagementLayout({
  user,
  dashboardData,
  isLoading,
  isRefetching,
  onRefresh,
  unreadCount,
}: ManagementLayoutProps) {
  const router = useRouter();

  // Derived state
  const hasCriticalActions =
    dashboardData?.criticalActions &&
    (dashboardData.criticalActions.pendingQuotes.length > 0 ||
      dashboardData.criticalActions.overduePayments.length > 0 ||
      dashboardData.criticalActions.pendingContracts.length > 0 ||
      dashboardData.criticalActions.urgentTasks.length > 0);

  // Check if financial summary requires action (overdue or high urgency)
  const financialRequiresAction = useMemo(() => {
    const summary = dashboardData?.financialSummary;
    if (!summary) return false;
    return summary.urgency_level === 'critical' || summary.urgency_level === 'high';
  }, [dashboardData?.financialSummary]);

  // Financial summary starts expanded if action required, collapsed otherwise
  const [isFinancialExpanded, setIsFinancialExpanded] = useState(financialRequiresAction);

  // Animation for collapsible content
  const progress = useDerivedValue(() => {
    return withTiming(isFinancialExpanded ? 1 : 0, { duration: 200 });
  }, [isFinancialExpanded]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    height: progress.value === 0 ? 0 : 'auto',
    opacity: progress.value,
    overflow: 'hidden',
  }));

  // Helper to calculate days until event
  const getDaysUntilEvent = (dateString: string): number => {
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Helper to format days info text for ActionCards
  const formatDaysInfo = (
    days: number | null | undefined,
    type: 'expiry' | 'overdue' | 'due'
  ): string | undefined => {
    if (days === null || days === undefined) return undefined;

    if (type === 'overdue') {
      if (days === 1) return '1 day overdue';
      return `${days} days overdue`;
    }
    if (type === 'expiry') {
      if (days < 0) return 'Expired';
      if (days === 0) return 'Expires today';
      if (days === 1) return 'Expires tomorrow';
      return `Expires in ${days} days`;
    }
    // type === 'due'
    if (days < 0) return 'Past due';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  // Time-based greeting
  const getTimeGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  };

  // Contextual sub-greeting based on user state
  const getSubGreeting = (): string => {
    if (hasCriticalActions && dashboardData?.criticalActions) {
      const count =
        (dashboardData.criticalActions.pendingQuotes.length || 0) +
        (dashboardData.criticalActions.overduePayments.length || 0) +
        (dashboardData.criticalActions.pendingContracts.length || 0);
      return `${count} item${count !== 1 ? 's' : ''} need${count === 1 ? 's' : ''} your attention`;
    }
    if (dashboardData?.nextEvent) {
      const daysUntil = getDaysUntilEvent(dashboardData.nextEvent.start_date);
      if (daysUntil === 0) return 'Your event is today!';
      if (daysUntil === 1) return 'Your event is tomorrow';
      if (daysUntil <= 7) return `Your event is in ${daysUntil} days`;
    }
    return 'Your events at a glance';
  };

  // Navigation handlers
  const handleQuickAction = (action: QuickActionType) => {
    switch (action) {
      case 'new-booking':
        router.push('/booking' as Href);
        break;
      case 'my-events':
        router.push('/events');
        break;
      case 'support':
        router.push('/settings/help' as Href);
        break;
    }
  };

  const handleViewAllEvents = () => {
    router.push('/events');
  };

  const handleEventPress = (eventId: number) => {
    router.push(`/events/${eventId}` as Href);
  };

  const handleQuotePress = (eventId: number) => {
    router.push(`/events/${eventId}?tab=quotes` as Href);
  };

  const handlePaymentPress = (eventId: number) => {
    router.push(`/events/${eventId}?tab=invoices` as Href);
  };

  const handleContractPress = (eventId: number) => {
    router.push(`/events/${eventId}?tab=contracts` as Href);
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          colors={[theme.colors.primary[500]]}
          tintColor={theme.colors.primary[500]}
        />
      }
    >
      {/* Header - Clean & Minimal */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greetingLabel}>
            {getTimeGreeting()}
          </Text>
          <Text style={styles.userName}>
            {user?.first_name || 'there'}
          </Text>
          <Text style={styles.subGreeting}>{getSubGreeting()}</Text>
        </View>
        <Pressable
          style={styles.notificationButton}
          onPress={() => router.push('/actions' as Href)}
        >
          <Bell size={24} color={colors.primary.black} weight={unreadCount > 0 ? 'fill' : 'regular'} />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Loading State */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Skeleton variant="rounded" height={120} style={styles.skeleton} />
          <Skeleton variant="rounded" height={180} style={styles.skeleton} />
          <Skeleton variant="rounded" height={100} style={styles.skeleton} />
          <Text style={styles.loadingMessage}>Preparing your dashboard...</Text>
        </View>
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
              urgency={quote.days_until_expiry <= 1 ? 'high' : 'medium'}
              primaryActionLabel="Review Quote"
              onPrimaryAction={() => handleQuotePress(quote.event_id)}
              metadata={{
                amount: quote.total_amount,
                currency: quote.currency,
                daysInfo: formatDaysInfo(quote.days_until_expiry, 'expiry'),
              }}
            />
          ))}

          {/* Overdue Payments */}
          {dashboardData?.criticalActions.overduePayments.map((payment) => (
            <ActionCard
              key={`payment-${payment.id}`}
              type="payment"
              title="Payment Overdue"
              subtitle={payment.event_name}
              urgency={payment.days_past_due > 7 ? 'critical' : 'high'}
              primaryActionLabel="Pay Now"
              onPrimaryAction={() => handlePaymentPress(payment.event_id)}
              metadata={{
                amount: payment.amount,
                currency: payment.currency,
                daysInfo: formatDaysInfo(payment.days_past_due, 'overdue'),
              }}
            />
          ))}

          {/* Pending Contracts */}
          {dashboardData?.criticalActions.pendingContracts.map((contract) => (
            <ActionCard
              key={`contract-${contract.id}`}
              type="contract"
              title="Contract Awaiting Signature"
              subtitle={contract.event_name}
              urgency={
                contract.days_until_expiry !== null && contract.days_until_expiry <= 3
                  ? 'high'
                  : 'medium'
              }
              primaryActionLabel="Review & Sign"
              onPrimaryAction={() => handleContractPress(contract.event_id)}
              metadata={{
                signatureProgress: {
                  signed: contract.signature_progress.signed_count,
                  total: contract.signature_progress.total_required,
                },
                daysInfo: formatDaysInfo(contract.days_until_expiry, 'expiry'),
              }}
            />
          ))}

          {/* Urgent Tasks */}
          {dashboardData?.criticalActions.urgentTasks.map((task) => {
            // Calculate days until due for tasks
            const daysUntilDue = task.due_date
              ? Math.ceil(
                  (new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
              : undefined;

            return (
              <ActionCard
                key={`task-${task.id}`}
                type="task"
                title={task.title}
                subtitle={task.event_name}
                urgency={task.priority === 'URGENT' ? 'high' : 'medium'}
                primaryActionLabel="View Task"
                onPrimaryAction={() => handleEventPress(task.event_id)}
                metadata={
                  daysUntilDue !== undefined
                    ? { daysInfo: formatDaysInfo(daysUntilDue, 'due') }
                    : undefined
                }
              />
            );
          })}
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

      {/* No Events State (but has history/completed) */}
      {!isLoading && !dashboardData?.nextEvent && !hasCriticalActions && (
        <View style={styles.section}>
          <Card style={styles.emptyCard}>
            <EmptyState
              icon="calendar"
              title="No Upcoming Events"
              description="Ready to plan your next event?"
              actionLabel="Book Now"
              onAction={() => router.push('/booking' as Href)}
            />
          </Card>
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
                type: 'support',
                label: 'Get Help',
              },
            ]}
            onActionPress={handleQuickAction}
          />
        </View>
      )}

      {/* Financial Summary - Collapsible */}
      {!isLoading && dashboardData?.financialSummary && (
        <View style={styles.section}>
          <Pressable
            style={styles.collapsibleHeader}
            onPress={() => setIsFinancialExpanded(!isFinancialExpanded)}
          >
            <Text style={styles.sectionTitleNoMargin}>Financial Overview</Text>
            <View style={styles.collapsibleIndicator}>
              {financialRequiresAction && (
                <View style={styles.actionRequiredDot} />
              )}
              {isFinancialExpanded ? (
                <CaretUp size={20} color={theme.colors.neutral[600]} />
              ) : (
                <CaretDown size={20} color={theme.colors.neutral[600]} />
              )}
            </View>
          </Pressable>
          <Animated.View style={animatedContentStyle}>
            <View style={styles.collapsibleContent}>
              <FinancialSummaryCard summary={dashboardData.financialSummary} />
            </View>
          </Animated.View>
        </View>
      )}
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl, // More breathing room
  },
  headerContent: {
    flex: 1,
  },
  greetingLabel: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[500], // Subtle
  },
  userName: {
    ...typeScale.displaySmall, // Display font for name
    color: theme.colors.neutral[900],
    marginTop: spacing.xxs,
  },
  subGreeting: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[600],
    marginTop: spacing.xs,
  },
  // Ghost-style notification button (no background)
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    // No background, no shadow for minimal look
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.error[500],
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 10,
    color: theme.colors.surface,
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
  sectionTitleNoMargin: {
    ...typeScale.titleLarge,
    color: theme.colors.neutral[900],
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  collapsibleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  collapsibleContent: {
    overflow: 'hidden',
  },
  actionRequiredDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error[500],
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
  skeleton: {
    marginBottom: spacing.md,
  },
  loadingContainer: {
    // Container for skeleton placeholders and loading message
  },
  loadingMessage: {
    ...typeScale.bodyMedium,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyCard: {
    padding: spacing.xl,
  },
});

export default ManagementLayout;
