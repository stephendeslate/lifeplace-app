// frontend/client-portal/src/hooks/useActionCenter.ts

import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEvents } from './useEvents';
import { usePendingQuotes } from './useEventQuotes';
import { useFinancialOverview } from './useFinancial';
import { useContracts } from '../contexts/ContractsContext';
import type { Event, EventTask, EventDetail } from '../types/events.types';
import type { EventQuote } from '../types/quotes.types';
import type { Invoice } from '../types/financial.types';
import type {
  ActionType,
  AnyActionItem,
  TaskActionItem,
  QuoteActionItem,
  ContractActionItem,
  PaymentActionItem,
  ActionCenterFilters,
  ActionCenterSortOption,
  ActionCounts,
  EventFilterOption,
} from '../types/action-center.types';
import {
  URGENCY_SCORES,
  calculateUrgencyFromDays,
  calculateUrgencyFromPriority,
} from '../types/action-center.types';

// Re-export urgency helpers for use in components
export { calculateUrgencyFromDays, calculateUrgencyFromPriority } from '../types/action-center.types';

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate days until a date (negative if past)
 */
const calculateDaysUntil = (dateString: string | null): number | null => {
  if (!dateString) return null;
  const now = new Date();
  const targetDate = new Date(dateString);
  return Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Calculate days past due (0 if not past)
 */
const calculateDaysPastDue = (dateString: string): number => {
  const days = calculateDaysUntil(dateString);
  return days !== null && days < 0 ? Math.abs(days) : 0;
};

/**
 * Transform a task into an ActionItem
 */
const transformTaskToAction = (
  task: EventTask,
  eventId: number,
  eventName: string
): TaskActionItem => {
  const urgency = calculateUrgencyFromPriority(task.priority);

  return {
    id: `task-${task.id}`,
    type: 'TASK',
    title: task.title,
    description: task.description || 'Complete this task',
    eventId,
    eventName,
    urgency,
    urgencyScore: URGENCY_SCORES[urgency],
    dueDate: task.due_date,
    createdAt: task.due_date, // Tasks don't have created_at, use due_date
    taskId: task.id,
    priority: task.priority,
    status: task.status,
    canComplete: task.can_update ?? true,
    requiresClientInput: task.requires_client_input ?? true,
    originalTask: task,
  };
};

/**
 * Transform a quote into an ActionItem
 */
const transformQuoteToAction = (quote: EventQuote): QuoteActionItem => {
  const daysUntilExpiry = calculateDaysUntil(quote.valid_until ?? null) ?? Infinity;
  const isExpired = daysUntilExpiry <= 0;
  const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 3;
  const urgency = calculateUrgencyFromDays(daysUntilExpiry, isExpired);

  return {
    id: `quote-${quote.id}`,
    type: 'QUOTE',
    title: `Quote for ${quote.event_details.name || 'Event'}`,
    description: isExpired
      ? 'This quote has expired'
      : isExpiringSoon
        ? `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`
        : 'Review and respond to this quote',
    eventId: quote.event_details.id,
    eventName: quote.event_details.name || 'Event',
    urgency,
    urgencyScore: URGENCY_SCORES[urgency],
    dueDate: quote.valid_until ?? null,
    createdAt: quote.created_at,
    quoteId: quote.id,
    totalAmount: quote.total_amount,
    currency: 'USD', // Default, could be extended
    daysUntilExpiry: daysUntilExpiry === Infinity ? -1 : daysUntilExpiry,
    isExpiringSoon,
    isExpired,
    validUntil: quote.valid_until ?? null,
    originalQuote: quote,
  };
};

/**
 * Transform a contract into an ActionItem
 */
const transformContractToAction = (contract: {
  id: string;
  eventId: number;
  eventName: string;
  templateName: string;
  expiresAt: string | null;
  signatureProgress: {
    total_required: number;
    signed_count: number;
    percentage: number;
  };
  status: 'SENT' | 'PARTIALLY_SIGNED' | 'EXPIRED';
  canClientSign?: boolean;
  signDisabledReason?: string | null;
  isExpired?: boolean;
}): ContractActionItem => {
  const daysUntilExpiry = calculateDaysUntil(contract.expiresAt);
  const isExpired = contract.isExpired || (daysUntilExpiry !== null && daysUntilExpiry <= 0) || contract.status === 'EXPIRED';
  const isExpiringSoon = !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  const urgency = isExpired ? 'CRITICAL' : calculateUrgencyFromDays(daysUntilExpiry, false);

  return {
    id: `contract-${contract.id}`,
    type: 'CONTRACT',
    title: contract.templateName,
    description: isExpired
      ? 'Contract has expired'
      : `${contract.signatureProgress.signed_count} of ${contract.signatureProgress.total_required} signatures`,
    eventId: contract.eventId,
    eventName: contract.eventName,
    urgency: isExpired ? 'CRITICAL' : (isExpiringSoon ? 'HIGH' : urgency),
    urgencyScore: URGENCY_SCORES[isExpired ? 'CRITICAL' : (isExpiringSoon ? 'HIGH' : urgency)],
    dueDate: contract.expiresAt,
    createdAt: new Date().toISOString(), // Not available from contract data
    contractId: contract.id,
    templateName: contract.templateName,
    signatureProgress: {
      total_required: contract.signatureProgress.total_required,
      signed_count: contract.signatureProgress.signed_count,
      percentage: contract.signatureProgress.percentage,
      required_roles: [],
      signed_roles: [],
      missing_roles: [],
    },
    contractStatus: contract.status,
    expiresAt: contract.expiresAt,
    daysUntilExpiry,
    canClientSign: !isExpired && (contract.canClientSign ?? true),
    signDisabledReason: isExpired ? (contract.signDisabledReason || 'Contract has expired') : null,
    isExpired,
  };
};

/**
 * Transform an invoice into a PaymentActionItem
 */
const transformInvoiceToAction = (invoice: Invoice): PaymentActionItem => {
  const daysPastDue = calculateDaysPastDue(invoice.due_date);
  const isOverdue = daysPastDue > 0;
  const urgency = isOverdue
    ? (daysPastDue > 7 ? 'CRITICAL' : 'HIGH')
    : calculateUrgencyFromDays(calculateDaysUntil(invoice.due_date), false);

  return {
    id: `payment-invoice-${invoice.id}`,
    type: 'PAYMENT',
    title: `Invoice ${invoice.invoice_id}`,
    description: isOverdue
      ? `${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} overdue`
      : `Due ${new Date(invoice.due_date).toLocaleDateString()}`,
    eventId: invoice.event,
    eventName: invoice.event_details?.name || 'Event',
    urgency,
    urgencyScore: URGENCY_SCORES[urgency],
    dueDate: invoice.due_date,
    createdAt: invoice.created_at,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_id,
    amount: invoice.remaining_amount || invoice.total_amount,
    currency: invoice.currency,
    daysPastDue,
    isOverdue,
    originalInvoice: invoice,
  };
};

// ==================== SORTING FUNCTIONS ====================

const sortActions = (
  actions: AnyActionItem[],
  sortBy: ActionCenterSortOption,
  direction: 'asc' | 'desc' = 'desc'
): AnyActionItem[] => {
  const sorted = [...actions].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'urgency':
        comparison = b.urgencyScore - a.urgencyScore;
        break;
      case 'dueDate':
        if (a.dueDate === null && b.dueDate === null) comparison = 0;
        else if (a.dueDate === null) comparison = 1;
        else if (b.dueDate === null) comparison = -1;
        else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'event':
        comparison = a.eventName.localeCompare(b.eventName);
        break;
      default:
        comparison = b.urgencyScore - a.urgencyScore;
    }

    return direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
};

// ==================== MAIN HOOK ====================

interface UseActionCenterOptions {
  filters?: ActionCenterFilters;
  sortBy?: ActionCenterSortOption;
  sortDirection?: 'asc' | 'desc';
}

interface UseActionCenterReturn {
  // Data
  actions: AnyActionItem[];
  allActions: AnyActionItem[];

  // Counts
  counts: ActionCounts;
  countsByType: Record<ActionType, number>;

  // Filter options
  eventOptions: EventFilterOption[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  refetch: () => void;

  // Computed
  hasActions: boolean;
  hasCriticalActions: boolean;
}

export const useActionCenter = (options: UseActionCenterOptions = {}): UseActionCenterReturn => {
  const {
    filters = { types: [] },
    sortBy = 'urgency',
    sortDirection = 'desc'
  } = options;

  const queryClient = useQueryClient();

  // Fetch data from existing hooks
  const { useEventsList } = useEvents();
  const eventsQuery = useEventsList();
  const pendingQuotesQuery = usePendingQuotes();
  const { invoices, isLoading: financialLoading, error: financialError } = useFinancialOverview();
  const { pendingContracts, isLoading: contractsLoading } = useContracts();

  // Calculate loading state
  const isLoading = eventsQuery.isLoading ||
                   pendingQuotesQuery.isLoading ||
                   financialLoading ||
                   contractsLoading;

  // Calculate error state
  const error = eventsQuery.error
    ? (eventsQuery.error as Error).message
    : pendingQuotesQuery.error
      ? (pendingQuotesQuery.error as Error).message
      : financialError;

  // Aggregate all actions
  const allActions = useMemo((): AnyActionItem[] => {
    const actions: AnyActionItem[] = [];

    // Get events data
    const events = Array.isArray(eventsQuery.data) ? eventsQuery.data : [];

    // ============ TASKS ============
    // Collect ALL tasks requiring client input (not just urgent ones)
    events.forEach((event: Event) => {
      const eventDetail = event as EventDetail;
      if (eventDetail.upcoming_tasks && Array.isArray(eventDetail.upcoming_tasks)) {
        const clientTasks = eventDetail.upcoming_tasks
          .filter((task: EventTask) =>
            task.requires_client_input &&
            (task.status === 'PENDING' || task.status === 'IN_PROGRESS')
          )
          .map((task: EventTask) => transformTaskToAction(task, event.id, event.name));

        actions.push(...clientTasks);
      }
    });

    // ============ QUOTES ============
    const pendingQuotes = Array.isArray(pendingQuotesQuery.data?.results)
      ? pendingQuotesQuery.data.results
      : [];

    pendingQuotes
      .filter(quote => quote.status === 'SENT')
      .forEach(quote => {
        actions.push(transformQuoteToAction(quote));
      });

    // ============ CONTRACTS ============
    // Transform pending contracts from context (including expired for visibility)
    pendingContracts.forEach(contract => {
      // Include contracts that need signing OR are expired (for visibility)
      const isExpiredContract = contract.status === 'EXPIRED' || contract.is_expired;
      const needsSignature = contract.can_client_sign || ['SENT', 'PARTIALLY_SIGNED'].includes(contract.status);

      if (needsSignature || isExpiredContract) {
        const eventId = typeof contract.event === 'object'
          ? parseInt(contract.event.id, 10)
          : parseInt(contract.id, 10);
        const eventName = typeof contract.event === 'object'
          ? contract.event.title
          : 'Event';

        actions.push(transformContractToAction({
          id: contract.id,
          eventId,
          eventName,
          templateName: contract.template.name,
          expiresAt: contract.valid_until,
          signatureProgress: contract.signature_progress || {
            total_required: 1,
            signed_count: 0,
            percentage: 0,
          },
          status: contract.status as 'SENT' | 'PARTIALLY_SIGNED' | 'EXPIRED',
          canClientSign: contract.can_client_sign,
          signDisabledReason: contract.sign_disabled_reason,
          isExpired: isExpiredContract,
        }));
      }
    });

    // ============ PAYMENTS (Outstanding Invoices) ============
    const outstandingInvoices = invoices.filter(invoice =>
      invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID'
    );

    outstandingInvoices.forEach(invoice => {
      actions.push(transformInvoiceToAction(invoice));
    });

    return actions;
  }, [
    eventsQuery.data,
    pendingQuotesQuery.data,
    pendingContracts,
    invoices
  ]);

  // Apply filters
  const filteredActions = useMemo((): AnyActionItem[] => {
    let result = [...allActions];

    // Filter by type
    if (filters.types && filters.types.length > 0) {
      result = result.filter(action => filters.types.includes(action.type));
    }

    // Filter by event
    if (filters.eventId !== undefined) {
      result = result.filter(action => action.eventId === filters.eventId);
    }

    // Filter by urgency
    if (filters.urgency && filters.urgency.length > 0) {
      result = result.filter(action => filters.urgency!.includes(action.urgency));
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(action =>
        action.title.toLowerCase().includes(searchLower) ||
        action.description.toLowerCase().includes(searchLower) ||
        action.eventName.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [allActions, filters]);

  // Sort actions
  const sortedActions = useMemo(() => {
    return sortActions(filteredActions, sortBy, sortDirection);
  }, [filteredActions, sortBy, sortDirection]);

  // Calculate counts
  const counts = useMemo((): ActionCounts => {
    const taskCount = allActions.filter(a => a.type === 'TASK').length;
    const quoteCount = allActions.filter(a => a.type === 'QUOTE').length;
    const contractCount = allActions.filter(a => a.type === 'CONTRACT').length;
    const paymentCount = allActions.filter(a => a.type === 'PAYMENT').length;
    const criticalCount = allActions.filter(a => a.urgency === 'CRITICAL').length;
    const highCount = allActions.filter(a => a.urgency === 'HIGH').length;

    return {
      total: allActions.length,
      tasks: taskCount,
      quotes: quoteCount,
      contracts: contractCount,
      payments: paymentCount,
      critical: criticalCount,
      high: highCount,
    };
  }, [allActions]);

  // Counts by type for badges
  const countsByType = useMemo((): Record<ActionType, number> => ({
    TASK: counts.tasks,
    QUOTE: counts.quotes,
    CONTRACT: counts.contracts,
    PAYMENT: counts.payments,
  }), [counts]);

  // Event filter options
  const eventOptions = useMemo((): EventFilterOption[] => {
    const eventMap = new Map<number, { name: string; count: number }>();

    allActions.forEach(action => {
      const existing = eventMap.get(action.eventId);
      if (existing) {
        existing.count++;
      } else {
        eventMap.set(action.eventId, { name: action.eventName, count: 1 });
      }
    });

    return Array.from(eventMap.entries())
      .map(([id, { name, count }]) => ({ id, name, actionCount: count }))
      .sort((a, b) => b.actionCount - a.actionCount);
  }, [allActions]);

  // Refetch all data
  const refetch = useCallback(() => {
    eventsQuery.refetch();
    pendingQuotesQuery.refetch();
    queryClient.invalidateQueries({ queryKey: ['financial'] });
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
  }, [eventsQuery, pendingQuotesQuery, queryClient]);

  return {
    // Data
    actions: sortedActions,
    allActions,

    // Counts
    counts,
    countsByType,

    // Filter options
    eventOptions,

    // Loading states
    isLoading,
    error,

    // Actions
    refetch,

    // Computed
    hasActions: allActions.length > 0,
    hasCriticalActions: counts.critical > 0,
  };
};

// ==================== LIGHTWEIGHT HOOK FOR BADGE ====================

/**
 * Lightweight hook just for getting action count (for sidebar badge)
 */
export const useActionCount = (): { count: number; isLoading: boolean } => {
  const { counts, isLoading } = useActionCenter();

  return {
    count: counts.total,
    isLoading,
  };
};

export default useActionCenter;
