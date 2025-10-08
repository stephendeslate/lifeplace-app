// frontend/client-portal/src/hooks/useDashboardData.ts

import { useMemo } from 'react';
import { useEvents } from './useEvents';
import { usePendingQuotes } from './useEventQuotes';
import { useFinancialOverview } from './useFinancial';
import { useCommunications } from './useCommunications';
import type { Event, EventTask } from '../types/events.types';
import type { EventQuote } from '../types/quotes.types';
import type { Payment, Invoice } from '../types/financial.types';

// Core dashboard data interface with priority-based aggregation
export interface DashboardData {
  // Critical Actions (highest priority - client must act)
  criticalActions: {
    quotesNeedingResponse: Array<EventQuote & { urgencyScore: number; daysUntilExpiry: number }>;
    overduePayments: Array<Payment & { daysPastDue: number }>;
    urgentTasks: Array<EventTask & { eventName: string; eventId: number }>;
    contractsNeedingSignature: Array<{
      id: string;
      eventId: number;
      eventName: string;
      templateName: string;
      expiresAt: string | null;
      daysUntilExpiry: number | null;
      signatureProgress: {
        total_required: number;
        signed_count: number;
        percentage: number;
      };
    }>;
  };

  // Event Status Overview (next priority - current state)
  eventStatus: {
    nextUpcomingEvent: Event | null;
    currentEventProgress: {
      event: Event;
      completedTasks: number;
      totalTasks: number;
      progressPercentage: number;
    } | null;
    recentUpdates: Array<{
      id: number;
      eventId: number;
      eventName: string;
      action_type: string;
      description: string;
      created_at: string;
    }>;
  };

  // Financial Summary (important - money matters)
  financialSummary: {
    outstandingInvoices: Array<Invoice & { daysPastDue: number }>;
    recentPayments: Payment[];
    totalOutstanding: string;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  };

  // Communication Highlights (background info)
  communications: {
    unreadCount: number;
    recentMessages: Array<{
      id: string;
      channel: string;
      subject?: string;
      created_at: string;
      is_opened: boolean;
    }>;
    importantNotifications: Array<{
      id: string;
      type: string;
      message: string;
      created_at: string;
      severity: 'info' | 'warning' | 'error';
    }>;
  };

  // Meta information
  loading: boolean;
  error: string | null;
  lastUpdated: Date;
}

// Helper function to calculate urgency score for quotes
const calculateQuoteUrgencyScore = (quote: EventQuote): number => {
  if (!quote.valid_until) return 0;

  const now = new Date();
  const expiryDate = new Date(quote.valid_until);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Urgency scale: 10 = immediate action needed, 0 = not urgent
  if (daysUntilExpiry <= 0) return 10; // Expired
  if (daysUntilExpiry <= 1) return 9;  // Expires today/tomorrow
  if (daysUntilExpiry <= 3) return 7;  // Expires within 3 days
  if (daysUntilExpiry <= 7) return 5;  // Expires within a week
  if (daysUntilExpiry <= 14) return 3; // Expires within 2 weeks
  if (daysUntilExpiry <= 30) return 1; // Expires within a month
  return 0; // Not urgent
};

// Helper function to calculate days until expiry
const calculateDaysUntilExpiry = (dateString: string | null): number => {
  if (!dateString) return Infinity;

  const now = new Date();
  const expiryDate = new Date(dateString);
  return Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

// Type guard for signature progress data structure
interface SignatureProgressVariantA {
  total_required: number;
  signed_count: number;
  percentage: number;
}

interface SignatureProgressVariantB {
  total: number;
  completed: number;
  percentage: number;
}

type SignatureProgressData = SignatureProgressVariantA | SignatureProgressVariantB;

// Helper to normalize signature progress from different backend formats
const normalizeSignatureProgress = (progress: SignatureProgressData | undefined): {
  total_required: number;
  signed_count: number;
  percentage: number;
} => {
  if (!progress) {
    return { total_required: 0, signed_count: 0, percentage: 0 };
  }

  // Check if it's variant A (has total_required)
  if ('total_required' in progress && 'signed_count' in progress) {
    return {
      total_required: progress.total_required,
      signed_count: progress.signed_count,
      percentage: progress.percentage
    };
  }

  // Otherwise it's variant B (has total and completed)
  if ('total' in progress && 'completed' in progress) {
    return {
      total_required: progress.total,
      signed_count: progress.completed,
      percentage: progress.percentage
    };
  }

  return { total_required: 0, signed_count: 0, percentage: 0 };
};

// Helper function to calculate days past due
const calculateDaysPastDue = (dueDateString: string): number => {
  const now = new Date();
  const dueDate = new Date(dueDateString);
  const diffTime = now.getTime() - dueDate.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

// Helper function to calculate financial urgency level
const calculateFinancialUrgencyLevel = (
  overduePayments: Payment[],
  outstandingInvoices: Invoice[]
): 'low' | 'medium' | 'high' | 'critical' => {
  const overdueCount = overduePayments.length;
  const overdueInvoiceCount = outstandingInvoices.filter(inv =>
    calculateDaysPastDue(inv.due_date) > 0
  ).length;

  const totalOverdueItems = overdueCount + overdueInvoiceCount;

  if (totalOverdueItems >= 3) return 'critical';
  if (totalOverdueItems >= 2) return 'high';
  if (totalOverdueItems >= 1) return 'medium';
  return 'low';
};

/**
 * Intelligent dashboard data hook that aggregates and prioritizes data
 * from verified APIs to create a user-first experience
 */
export const useDashboardData = (): DashboardData => {
  // Fetch data from existing hooks
  const { useEventsList, useUpcomingEvents } = useEvents();
  const eventsQuery = useEventsList();
  const upcomingEventsQuery = useUpcomingEvents();

  const pendingQuotesQuery = usePendingQuotes();

  const financialOverview = useFinancialOverview();

  const { useRecords } = useCommunications();
  const communicationsQuery = useRecords(); // Get recent communications

  // Calculate loading state
  const loading = eventsQuery.isLoading ||
                 upcomingEventsQuery.isLoading ||
                 pendingQuotesQuery.isLoading ||
                 financialOverview.isLoading ||
                 communicationsQuery.isLoading;

  // Calculate error state
  const error = eventsQuery.error ||
               upcomingEventsQuery.error ||
               pendingQuotesQuery.error ||
               financialOverview.error ||
               communicationsQuery.error;

  // Memoized dashboard data calculation
  const dashboardData = useMemo((): DashboardData => {
    const now = new Date();

    // Get all events and ensure they're arrays
    const allEvents = Array.isArray(eventsQuery.data) ? eventsQuery.data : [];
    const upcomingEvents = Array.isArray(upcomingEventsQuery.data) ? upcomingEventsQuery.data : [];

    // Get quotes data
    const pendingQuotes = Array.isArray(pendingQuotesQuery.data?.results) ? pendingQuotesQuery.data.results : [];

    // Get financial data
    const payments = financialOverview.payments || [];
    const invoices = financialOverview.invoices || [];

    // Get communications data
    const communications = Array.isArray(communicationsQuery.data) ? communicationsQuery.data : [];

    // ============ CRITICAL ACTIONS ============

    // Process quotes needing response (highest priority)
    const quotesNeedingResponse = pendingQuotes
      .filter(quote => quote.status === 'SENT')
      .map(quote => ({
        ...quote,
        urgencyScore: calculateQuoteUrgencyScore(quote),
        daysUntilExpiry: calculateDaysUntilExpiry(quote.valid_until ?? null)
      }))
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 5); // Limit to top 5 most urgent

    // Process overdue payments
    const overduePayments = payments
      .filter(payment =>
        payment.status === 'PENDING' &&
        calculateDaysPastDue(payment.due_date) > 0
      )
      .map(payment => ({
        ...payment,
        daysPastDue: calculateDaysPastDue(payment.due_date)
      }))
      .sort((a, b) => b.daysPastDue - a.daysPastDue);

    // Process urgent tasks requiring client input
    const urgentTasks: Array<EventTask & { eventName: string; eventId: number }> = [];
    allEvents.forEach((event: Event) => {
      // Check if event has upcoming_tasks (from EventDetail interface)
      const eventDetail = event as Event & { upcoming_tasks?: EventTask[] }; // Type assertion for accessing upcoming_tasks
      if (eventDetail.upcoming_tasks && Array.isArray(eventDetail.upcoming_tasks)) {
        const clientTasks = eventDetail.upcoming_tasks
          .filter((task: EventTask) =>
            task.requires_client_input &&
            task.status === 'PENDING' &&
            (task.priority === 'HIGH' || task.priority === 'URGENT')
          )
          .map((task: EventTask) => ({
            ...task,
            eventName: event.name,
            eventId: event.id
          }));
        urgentTasks.push(...clientTasks);
      }
    });

    // Sort urgent tasks by priority and due date
    urgentTasks.sort((a, b) => {
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, sort by due date
      const aDueDate = new Date(a.due_date);
      const bDueDate = new Date(b.due_date);
      return aDueDate.getTime() - bDueDate.getTime();
    });

    // Process contracts needing signature
    const contractsNeedingSignature: Array<{
      id: string;
      eventId: number;
      eventName: string;
      templateName: string;
      expiresAt: string | null;
      daysUntilExpiry: number | null;
      signatureProgress: {
        total_required: number;
        signed_count: number;
        percentage: number;
      };
    }> = [];

    allEvents.forEach((event: Event) => {
      // Check if event has contracts (from EventDetail interface)
      const eventDetail = event as Event & {
        contracts?: Array<{
          id: number;
          can_client_sign: boolean;
          status: string;
          template_name: string;
          expires_at?: string;
          signature_progress?: SignatureProgressData;
        }>;
      };
      if (eventDetail.contracts && eventDetail.pending_signature_required && Array.isArray(eventDetail.contracts)) {
        eventDetail.contracts.forEach((contract) => {
          if (contract.can_client_sign && contract.status === 'SENT') {
            contractsNeedingSignature.push({
              id: contract.id.toString(),
              eventId: event.id,
              eventName: event.name,
              templateName: contract.template_name,
              expiresAt: contract.expires_at || null,
              daysUntilExpiry: contract.expires_at ? calculateDaysUntilExpiry(contract.expires_at) : null,
              signatureProgress: normalizeSignatureProgress(contract.signature_progress)
            });
          }
        });
      }
    });

    // Sort contracts by urgency (expiry date)
    contractsNeedingSignature.sort((a, b) => {
      if (a.daysUntilExpiry === null && b.daysUntilExpiry === null) return 0;
      if (a.daysUntilExpiry === null) return 1;
      if (b.daysUntilExpiry === null) return -1;
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });

    // ============ EVENT STATUS ============

    // Find next upcoming event
    const nextUpcomingEvent = upcomingEvents
      .filter((event: Event) => new Date(event.start_date) > now)
      .sort((a: Event, b: Event) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0] || null;

    // Calculate current event progress
    let currentEventProgress = null;
    const currentEvent = allEvents.find((event: Event) =>
      event.status === 'IN_PROGRESS' ||
      (new Date(event.start_date) <= now && new Date(event.end_date) >= now)
    );

    if (currentEvent) {
      const currentEventDetail = currentEvent as Event & { upcoming_tasks?: EventTask[] };
      if (currentEventDetail.upcoming_tasks && Array.isArray(currentEventDetail.upcoming_tasks)) {
        const totalTasks = currentEventDetail.upcoming_tasks.length;
        const completedTasks = currentEventDetail.upcoming_tasks.filter((task: EventTask) => task.status === 'COMPLETED').length;

        currentEventProgress = {
          event: currentEvent,
          completedTasks,
          totalTasks,
          progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        };
      }
    }

    // Recent updates from all events
    const recentUpdates: Array<{
      id: number;
      eventId: number;
      eventName: string;
      action_type: string;
      description: string;
      created_at: string;
    }> = [];

    allEvents.forEach((event: Event) => {
      // Check if event has recent_updates (from EventDetail interface)
      const eventDetail = event as Event & { recent_updates?: Array<{ id: number; title: string; description: string; created_at: string; type: string }> }; // Type assertion for accessing recent_updates
      if (eventDetail.recent_updates && Array.isArray(eventDetail.recent_updates)) {
        eventDetail.recent_updates.forEach((update) => {
          recentUpdates.push({
            id: update.id,
            eventId: event.id,
            eventName: event.name,
            action_type: update.type,
            description: update.description,
            created_at: update.created_at
          });
        });
      }
    });

    // Sort by most recent and limit to 5
    recentUpdates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const limitedRecentUpdates = recentUpdates.slice(0, 5);

    // ============ FINANCIAL SUMMARY ============

    // Process outstanding invoices
    const outstandingInvoices = invoices
      .filter(invoice => invoice.status === 'ISSUED')
      .map(invoice => ({
        ...invoice,
        daysPastDue: calculateDaysPastDue(invoice.due_date)
      }))
      .sort((a, b) => b.daysPastDue - a.daysPastDue);

    // Calculate total outstanding amount
    const totalOutstanding = outstandingInvoices
      .reduce((sum, invoice) => sum + parseFloat(invoice.total_amount), 0)
      .toFixed(2);

    // Recent payments (already processed in financialOverview)
    const recentPayments = payments
      .filter(payment => payment.status === 'COMPLETED')
      .sort((a, b) => new Date(b.paid_on || b.created_at).getTime() - new Date(a.paid_on || a.created_at).getTime())
      .slice(0, 5);

    // Calculate financial urgency level
    const urgencyLevel = calculateFinancialUrgencyLevel(overduePayments, outstandingInvoices);

    // ============ COMMUNICATIONS ============

    // Count unread messages
    const unreadCount = communications.filter(comm => !comm.is_opened).length;

    // Recent messages (limit to 5)
    const recentMessages = communications
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(comm => ({
        id: comm.id,
        channel: comm.channel,
        subject: comm.subject || '',
        created_at: comm.created_at,
        is_opened: comm.is_opened
      }));

    // Important notifications (derived from various sources)
    const importantNotifications: Array<{
      id: string;
      type: string;
      message: string;
      created_at: string;
      severity: 'info' | 'warning' | 'error';
    }> = [];

    // Add quote expiry notifications
    quotesNeedingResponse.forEach(quote => {
      if (quote.daysUntilExpiry <= 3) {
        importantNotifications.push({
          id: `quote-${quote.id}`,
          type: 'quote_expiry',
          message: `Quote for ${quote.event_details.name || 'your event'} expires in ${quote.daysUntilExpiry} day${quote.daysUntilExpiry !== 1 ? 's' : ''}`,
          created_at: quote.valid_until ?? now.toISOString(),
          severity: quote.daysUntilExpiry <= 1 ? 'error' : 'warning'
        });
      }
    });

    // Add overdue payment notifications
    overduePayments.forEach(payment => {
      importantNotifications.push({
        id: `payment-${payment.id}`,
        type: 'payment_overdue',
        message: `Payment ${payment.payment_number} is ${payment.daysPastDue} day${payment.daysPastDue !== 1 ? 's' : ''} overdue`,
        created_at: payment.due_date,
        severity: 'error'
      });
    });

    // Sort notifications by severity and date
    importantNotifications.sort((a, b) => {
      const severityOrder = { 'error': 3, 'warning': 2, 'info': 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return {
      criticalActions: {
        quotesNeedingResponse,
        overduePayments,
        urgentTasks: urgentTasks.slice(0, 5), // Limit to top 5
        contractsNeedingSignature: contractsNeedingSignature.slice(0, 5) // Limit to top 5
      },
      eventStatus: {
        nextUpcomingEvent,
        currentEventProgress,
        recentUpdates: limitedRecentUpdates
      },
      financialSummary: {
        outstandingInvoices,
        recentPayments,
        totalOutstanding,
        urgencyLevel
      },
      communications: {
        unreadCount,
        recentMessages,
        importantNotifications: importantNotifications.slice(0, 10) // Limit to top 10
      },
      loading: false,
      error: null,
      lastUpdated: now
    };
  }, [
    eventsQuery.data,
    upcomingEventsQuery.data,
    pendingQuotesQuery.data,
    financialOverview,
    communicationsQuery.data
  ]);

  return {
    ...dashboardData,
    loading,
    error: error ? (error as Error).message || 'An error occurred loading dashboard data' : null,
  };
};

// Export as default for consistency with other hooks
export default useDashboardData;