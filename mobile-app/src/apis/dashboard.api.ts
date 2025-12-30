/**
 * Dashboard API
 *
 * Aggregates data from multiple sources to power the dashboard.
 * This is a client-side aggregation since there's no dedicated backend endpoint.
 */

import { eventsApi } from './events.api';
import { quotesApi } from './quotes.api';
import { contractsApi } from './contracts.api';
import { paymentsApi } from './payments.api';
import { communicationsApi } from './communications.api';
import type {
  DashboardData,
  CriticalActions,
  EventStatus,
  FinancialSummary,
  Communications,
  UrgentTask,
  PendingContract,
} from '@/types/dashboard.types';
import type { Event, EventTask } from '@/types/events.types';

// =============================================================================
// HELPERS
// =============================================================================

function calculateDaysUntilExpiry(dateString: string | null): number | null {
  if (!dateString) return null;
  const now = new Date();
  const expiryDate = new Date(dateString);
  return Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// =============================================================================
// API
// =============================================================================

export const dashboardApi = {
  /**
   * Fetch all dashboard data
   */
  getDashboardData: async (): Promise<DashboardData> => {
    // Fetch all data in parallel
    const [
      events,
      pendingQuotes,
      overduePayments,
      financialSummary,
      pendingContracts,
      unreadCountResult,
      recentMessages,
    ] = await Promise.all([
      eventsApi.getEvents(),
      quotesApi.getPendingQuotes(),
      paymentsApi.getOverduePayments(),
      paymentsApi.getFinancialSummary(),
      contractsApi.getPendingSignatureContracts(),
      communicationsApi.getUnreadCount().catch(() => ({ unread_count: 0 })),
      communicationsApi.getRecentMessages(5).catch(() => []),
    ]);

    // Process critical actions
    const criticalActions = dashboardApi.buildCriticalActions(
      events,
      pendingQuotes,
      overduePayments,
      pendingContracts
    );

    // Process event status
    const eventStatus = dashboardApi.buildEventStatus(events);

    // Build communications from real API data
    const communications: Communications = {
      unread_count: unreadCountResult.unread_count,
      recent_messages: recentMessages,
      important_notifications: dashboardApi.buildNotifications(
        pendingQuotes,
        overduePayments,
        pendingContracts
      ),
    };

    return {
      critical_actions: criticalActions,
      event_status: eventStatus,
      financial_summary: financialSummary,
      communications,
      last_updated: new Date().toISOString(),
    };
  },

  /**
   * Build critical actions from various sources
   */
  buildCriticalActions: (
    events: Event[],
    pendingQuotes: CriticalActions['quotes_needing_response'],
    overduePayments: CriticalActions['overdue_payments'],
    pendingContracts: Awaited<ReturnType<typeof contractsApi.getPendingSignatureContracts>>
  ): CriticalActions => {
    // Extract urgent tasks from events
    const urgentTasks: UrgentTask[] = [];
    events.forEach((event) => {
      // We need event details to get tasks, so this is a simplified version
      // In the actual hook, we'll fetch event details for events with upcoming tasks
    });

    // Map pending contracts to dashboard format
    const contractsNeedingSignature: PendingContract[] = pendingContracts.map((contract) => ({
      id: contract.id.toString(),
      event_id: contract.event.id,
      event_name: contract.event.title,
      template_name: contract.template.name,
      status: contract.status,
      expires_at: contract.expires_at,
      days_until_expiry: calculateDaysUntilExpiry(contract.expires_at),
      signature_progress: contract.signature_progress,
    }));

    return {
      quotes_needing_response: pendingQuotes.sort(
        (a, b) => b.urgency_score - a.urgency_score
      ),
      overdue_payments: overduePayments.sort((a, b) => b.days_past_due - a.days_past_due),
      urgent_tasks: urgentTasks,
      contracts_needing_signature: contractsNeedingSignature,
      total_count:
        pendingQuotes.length +
        overduePayments.length +
        urgentTasks.length +
        contractsNeedingSignature.length,
    };
  },

  /**
   * Build event status from events list
   */
  buildEventStatus: (events: Event[]): EventStatus => {
    const now = new Date();

    // Find next upcoming event
    const upcomingEvents = events
      .filter((event) => {
        const startDate = new Date(event.start_date);
        return startDate > now && event.status !== 'CANCELLED';
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const nextUpcomingEvent = upcomingEvents[0] || null;

    // Count events this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const eventsThisMonth = events.filter((event) => {
      const startDate = new Date(event.start_date);
      return startDate >= startOfMonth && startDate <= endOfMonth;
    }).length;

    // Count active events
    const totalActiveEvents = events.filter(
      (event) => event.status === 'CONFIRMED' || event.status === 'IN_PROGRESS'
    ).length;

    return {
      next_upcoming_event: nextUpcomingEvent,
      events_this_month: eventsThisMonth,
      total_active_events: totalActiveEvents,
      recent_updates: [], // Would need timeline API aggregation
    };
  },

  /**
   * Build important notifications from critical items
   */
  buildNotifications: (
    quotes: CriticalActions['quotes_needing_response'],
    payments: CriticalActions['overdue_payments'],
    contracts: Awaited<ReturnType<typeof contractsApi.getPendingSignatureContracts>>
  ): Communications['important_notifications'] => {
    const notifications: Communications['important_notifications'] = [];

    // Quote expiry notifications
    quotes.forEach((quote) => {
      if (quote.days_until_expiry <= 3) {
        notifications.push({
          id: `quote-${quote.id}`,
          type: 'quote_expiry',
          message: `Quote for "${quote.event_name}" expires in ${quote.days_until_expiry} day${quote.days_until_expiry !== 1 ? 's' : ''}`,
          created_at: quote.valid_until,
          severity: quote.days_until_expiry <= 1 ? 'error' : 'warning',
        });
      }
    });

    // Overdue payment notifications
    payments.forEach((payment) => {
      notifications.push({
        id: `payment-${payment.id}`,
        type: 'payment_overdue',
        message: `Payment for "${payment.event_name}" is ${payment.days_past_due} day${payment.days_past_due !== 1 ? 's' : ''} overdue`,
        created_at: payment.due_date,
        severity: 'error',
      });
    });

    // Contract expiry notifications
    contracts.forEach((contract) => {
      const daysUntil = calculateDaysUntilExpiry(contract.expires_at);
      if (daysUntil !== null && daysUntil <= 7) {
        notifications.push({
          id: `contract-${contract.id}`,
          type: 'contract_expiry',
          message: `Contract for "${contract.event.title}" needs signature${daysUntil <= 3 ? ' urgently' : ''}`,
          created_at: contract.expires_at || new Date().toISOString(),
          severity: daysUntil <= 3 ? 'error' : 'warning',
        });
      }
    });

    // Sort by severity then date
    const severityOrder = { error: 3, warning: 2, info: 1 };
    return notifications.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  /**
   * Fetch urgent tasks from events (requires fetching event details)
   */
  getUrgentTasks: async (): Promise<UrgentTask[]> => {
    const events = await eventsApi.getEvents();
    const urgentTasks: UrgentTask[] = [];

    // Only fetch details for events that might have tasks
    const activeEvents = events.filter(
      (event) => event.status === 'CONFIRMED' || event.status === 'IN_PROGRESS'
    );

    // Fetch event details in parallel (limit to first 5 to avoid too many requests)
    const eventDetails = await Promise.all(
      activeEvents.slice(0, 5).map((event) => eventsApi.getEvent(event.id))
    );

    eventDetails.forEach((detail) => {
      if (detail.upcoming_tasks) {
        const clientTasks = detail.upcoming_tasks
          .filter(
            (task: EventTask) =>
              task.requires_client_input &&
              task.status === 'PENDING' &&
              (task.priority === 'HIGH' || task.priority === 'URGENT')
          )
          .map((task: EventTask) => ({
            ...task,
            event_id: detail.id,
            event_name: detail.name,
          }));
        urgentTasks.push(...clientTasks);
      }
    });

    // Sort by priority and due date
    return urgentTasks.sort((a, b) => {
      const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  },
};

export default dashboardApi;
