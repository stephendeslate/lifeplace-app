/**
 * useActionCenter Hook
 *
 * Aggregates pending quotes, contracts, payments, and tasks
 * into a unified action center view with filtering and sorting.
 */

import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingQuotes } from './useQuotes';
import { usePendingContracts } from './useContracts';
import { useOverduePayments, useInvoices } from './useFinancial';
import { useUrgentTasks } from './useDashboard';
import type { PendingQuote, OverduePayment, PendingContract, UrgentTask } from '@/types/dashboard.types';
import type { Invoice } from '@/apis/payments.api';
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
  UrgencyLevel,
} from '@/types/action-center.types';
import {
  URGENCY_SCORES,
  calculateUrgencyFromDays,
  calculateUrgencyFromPriority,
  calculateDaysUntil,
  calculateDaysPastDue,
} from '@/types/action-center.types';

// Re-export helpers for use in components
export {
  calculateUrgencyFromDays,
  calculateUrgencyFromPriority,
  isTaskAction,
  isQuoteAction,
  isContractAction,
  isPaymentAction,
  ACTION_TYPE_CONFIGS,
  URGENCY_CONFIGS,
  URGENCY_SCORES,
} from '@/types/action-center.types';

// =============================================================================
// TRANSFORM FUNCTIONS
// =============================================================================

/**
 * Transform a task into a TaskActionItem
 */
function transformTaskToAction(task: UrgentTask): TaskActionItem {
  const urgency = calculateUrgencyFromPriority(task.priority);

  return {
    id: `task-${task.id}`,
    type: 'TASK',
    title: task.title,
    description: task.description || 'Complete this task',
    eventId: task.event_id,
    eventName: task.event_name,
    urgency,
    urgencyScore: URGENCY_SCORES[urgency],
    dueDate: task.due_date,
    createdAt: task.due_date,
    taskId: task.id,
    priority: task.priority,
    status: task.status,
    canComplete: task.can_update ?? true,
    requiresClientInput: task.requires_client_input ?? true,
    originalTask: task,
  };
}

/**
 * Transform a pending quote into a QuoteActionItem
 */
function transformQuoteToAction(quote: PendingQuote): QuoteActionItem {
  const daysUntilExpiry = quote.days_until_expiry;
  const isExpired = daysUntilExpiry <= 0;
  const isExpiringSoon = !isExpired && daysUntilExpiry <= 3;
  const urgency = calculateUrgencyFromDays(daysUntilExpiry, isExpired);

  return {
    id: `quote-${quote.id}`,
    type: 'QUOTE',
    title: `Quote #${quote.quote_number}`,
    description: isExpired
      ? 'This quote has expired'
      : isExpiringSoon
        ? `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`
        : 'Review and respond to this quote',
    eventId: quote.event_id,
    eventName: quote.event_name,
    urgency,
    urgencyScore: URGENCY_SCORES[urgency],
    dueDate: quote.valid_until,
    createdAt: quote.created_at,
    quoteId: quote.id,
    quoteNumber: quote.quote_number,
    totalAmount: quote.total_amount.toString(),
    currency: quote.currency,
    daysUntilExpiry,
    isExpiringSoon,
    isExpired,
    validUntil: quote.valid_until,
  };
}

/**
 * Transform a pending contract into a ContractActionItem
 */
function transformContractToAction(contract: PendingContract): ContractActionItem {
  const daysUntilExpiry = contract.days_until_expiry;
  const isExpired = contract.status === 'EXPIRED' || (daysUntilExpiry !== null && daysUntilExpiry <= 0);
  const isExpiringSoon = !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 3;
  const urgency = isExpired ? 'CRITICAL' : calculateUrgencyFromDays(daysUntilExpiry, false);

  return {
    id: `contract-${contract.id}`,
    type: 'CONTRACT',
    title: contract.template_name,
    description: isExpired
      ? 'Contract has expired'
      : `${contract.signature_progress.signed_count} of ${contract.signature_progress.total_required} signatures`,
    eventId: contract.event_id,
    eventName: contract.event_name,
    urgency: isExpired ? 'CRITICAL' : (isExpiringSoon ? 'HIGH' : urgency),
    urgencyScore: URGENCY_SCORES[isExpired ? 'CRITICAL' : (isExpiringSoon ? 'HIGH' : urgency)],
    dueDate: contract.expires_at,
    createdAt: new Date().toISOString(),
    contractId: parseInt(contract.id, 10),
    templateName: contract.template_name,
    signatureProgress: contract.signature_progress,
    contractStatus: contract.status,
    expiresAt: contract.expires_at,
    daysUntilExpiry,
    canClientSign: !isExpired,
    signDisabledReason: isExpired ? 'Contract has expired' : null,
    isExpired,
  };
}

/**
 * Transform an overdue payment into a PaymentActionItem
 */
function transformOverduePaymentToAction(payment: OverduePayment): PaymentActionItem {
  const daysPastDue = payment.days_past_due;
  const urgency: UrgencyLevel = daysPastDue > 14 ? 'CRITICAL' : daysPastDue > 7 ? 'HIGH' : 'MEDIUM';

  return {
    id: `payment-${payment.id}`,
    type: 'PAYMENT',
    title: `Payment ${payment.payment_number}`,
    description: `${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} overdue`,
    eventId: payment.event_id,
    eventName: payment.event_name,
    urgency,
    urgencyScore: URGENCY_SCORES[urgency],
    dueDate: payment.due_date,
    createdAt: payment.due_date,
    invoiceId: payment.id,
    invoiceNumber: payment.payment_number,
    amount: payment.amount.toString(),
    amountDue: payment.amount.toString(),
    currency: payment.currency,
    daysPastDue,
    isOverdue: true,
    canPayOnline: true,
  };
}

/**
 * Transform a pending invoice into a PaymentActionItem
 */
function transformInvoiceToAction(invoice: Invoice): PaymentActionItem {
  const daysPastDue = calculateDaysPastDue(invoice.due_date);
  const daysUntilDue = calculateDaysUntil(invoice.due_date);
  const isOverdue = daysPastDue > 0;
  const urgency: UrgencyLevel = isOverdue
    ? (daysPastDue > 7 ? 'CRITICAL' : 'HIGH')
    : calculateUrgencyFromDays(daysUntilDue, false);

  return {
    id: `invoice-${invoice.id}`,
    type: 'PAYMENT',
    title: `Invoice ${invoice.invoice_number}`,
    description: isOverdue
      ? `${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} overdue`
      : `Due ${new Date(invoice.due_date).toLocaleDateString()}`,
    eventId: invoice.event,
    eventName: invoice.event_name,
    urgency,
    urgencyScore: URGENCY_SCORES[urgency],
    dueDate: invoice.due_date,
    createdAt: invoice.created_at,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    amount: invoice.total_amount,
    amountDue: invoice.remaining_amount,
    currency: invoice.currency,
    daysPastDue,
    isOverdue,
    canPayOnline: invoice.can_pay_online,
  };
}

// =============================================================================
// SORTING FUNCTION
// =============================================================================

function sortActions(
  actions: AnyActionItem[],
  sortBy: ActionCenterSortOption,
  direction: 'asc' | 'desc' = 'desc'
): AnyActionItem[] {
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
}

// =============================================================================
// MAIN HOOK
// =============================================================================

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
  isRefetching: boolean;
  error: string | null;

  // Actions - prefer type-specific refetch for targeted invalidation
  refetch: () => void;
  refetchByType: (type: ActionType) => void;
  refetchQuotes: () => void;
  refetchContracts: () => void;
  refetchPayments: () => void;
  refetchTasks: () => void;

  // Computed
  hasActions: boolean;
  hasCriticalActions: boolean;
}

export function useActionCenter(options: UseActionCenterOptions = {}): UseActionCenterReturn {
  const {
    filters = { types: [] },
    sortBy = 'urgency',
    sortDirection = 'desc',
  } = options;

  const queryClient = useQueryClient();

  // Fetch data from existing hooks
  const pendingQuotesQuery = usePendingQuotes();
  const pendingContractsQuery = usePendingContracts();
  const overduePaymentsQuery = useOverduePayments();
  const urgentTasksQuery = useUrgentTasks();
  const invoicesQuery = useInvoices({ status: 'ISSUED' });

  // Calculate loading state
  const isLoading =
    pendingQuotesQuery.isLoading ||
    pendingContractsQuery.isLoading ||
    overduePaymentsQuery.isLoading ||
    urgentTasksQuery.isLoading ||
    invoicesQuery.isLoading;

  const isRefetching =
    pendingQuotesQuery.isFetching ||
    pendingContractsQuery.isFetching ||
    overduePaymentsQuery.isFetching ||
    urgentTasksQuery.isFetching ||
    invoicesQuery.isFetching;

  // Calculate error state
  const error = pendingQuotesQuery.error
    ? (pendingQuotesQuery.error as Error).message
    : pendingContractsQuery.error
      ? (pendingContractsQuery.error as Error).message
      : overduePaymentsQuery.error
        ? (overduePaymentsQuery.error as Error).message
        : null;

  // Aggregate all actions
  const allActions = useMemo((): AnyActionItem[] => {
    const actions: AnyActionItem[] = [];

    // Transform quotes
    const pendingQuotes = pendingQuotesQuery.data || [];
    pendingQuotes
      .filter((quote) => quote.status === 'SENT')
      .forEach((quote) => {
        actions.push(transformQuoteToAction(quote));
      });

    // Transform contracts
    const pendingContracts = pendingContractsQuery.data || [];
    pendingContracts.forEach((contract) => {
      actions.push(transformContractToAction(contract));
    });

    // Transform overdue payments
    const overduePayments = overduePaymentsQuery.data || [];
    overduePayments.forEach((payment) => {
      actions.push(transformOverduePaymentToAction(payment));
    });

    // Transform pending invoices (non-overdue)
    const invoices = invoicesQuery.data?.results || [];
    invoices
      .filter((invoice) => {
        // Only include invoices that are not already in overdue payments
        const isAlreadyOverdue = overduePayments.some(
          (op) => op.id === invoice.id
        );
        return !isAlreadyOverdue && parseFloat(invoice.remaining_amount) > 0;
      })
      .forEach((invoice) => {
        actions.push(transformInvoiceToAction(invoice));
      });

    // Transform urgent tasks
    const urgentTasks = urgentTasksQuery.data || [];
    urgentTasks.forEach((task) => {
      actions.push(transformTaskToAction(task));
    });

    return actions;
  }, [
    pendingQuotesQuery.data,
    pendingContractsQuery.data,
    overduePaymentsQuery.data,
    invoicesQuery.data,
    urgentTasksQuery.data,
  ]);

  // Apply filters
  const filteredActions = useMemo((): AnyActionItem[] => {
    let result = [...allActions];

    // Filter by type
    if (filters.types && filters.types.length > 0) {
      result = result.filter((action) => filters.types.includes(action.type));
    }

    // Filter by event
    if (filters.eventId !== undefined) {
      result = result.filter((action) => action.eventId === filters.eventId);
    }

    // Filter by urgency
    if (filters.urgency && filters.urgency.length > 0) {
      result = result.filter((action) => filters.urgency!.includes(action.urgency));
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (action) =>
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
    const taskCount = allActions.filter((a) => a.type === 'TASK').length;
    const quoteCount = allActions.filter((a) => a.type === 'QUOTE').length;
    const contractCount = allActions.filter((a) => a.type === 'CONTRACT').length;
    const paymentCount = allActions.filter((a) => a.type === 'PAYMENT').length;
    const criticalCount = allActions.filter((a) => a.urgency === 'CRITICAL').length;
    const highCount = allActions.filter((a) => a.urgency === 'HIGH').length;

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
  const countsByType = useMemo(
    (): Record<ActionType, number> => ({
      TASK: counts.tasks,
      QUOTE: counts.quotes,
      CONTRACT: counts.contracts,
      PAYMENT: counts.payments,
    }),
    [counts]
  );

  // Event filter options
  const eventOptions = useMemo((): EventFilterOption[] => {
    const eventMap = new Map<number, { name: string; count: number }>();

    allActions.forEach((action) => {
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

  // Type-specific refetch functions for targeted cache invalidation
  const refetchQuotes = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['quotes', 'pending'] });
  }, [queryClient]);

  const refetchContracts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['contracts', 'pending'] });
  }, [queryClient]);

  const refetchPayments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['payments', 'overdue'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  }, [queryClient]);

  const refetchTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'urgent-tasks'] });
  }, [queryClient]);

  // Refetch by action type - more targeted than full refetch
  const refetchByType = useCallback((type: ActionType) => {
    switch (type) {
      case 'QUOTE':
        refetchQuotes();
        break;
      case 'CONTRACT':
        refetchContracts();
        break;
      case 'PAYMENT':
        refetchPayments();
        break;
      case 'TASK':
        refetchTasks();
        break;
    }
  }, [refetchQuotes, refetchContracts, refetchPayments, refetchTasks]);

  // Refetch all data - use sparingly, prefer type-specific refetch
  const refetch = useCallback(() => {
    refetchQuotes();
    refetchContracts();
    refetchPayments();
    refetchTasks();
  }, [refetchQuotes, refetchContracts, refetchPayments, refetchTasks]);

  return {
    actions: sortedActions,
    allActions,
    counts,
    countsByType,
    eventOptions,
    isLoading,
    isRefetching,
    error,
    refetch,
    refetchByType,
    refetchQuotes,
    refetchContracts,
    refetchPayments,
    refetchTasks,
    hasActions: allActions.length > 0,
    hasCriticalActions: counts.critical > 0,
  };
}

// =============================================================================
// LIGHTWEIGHT HOOK FOR BADGE
// =============================================================================

/**
 * Lightweight hook just for getting action count (for badge)
 */
export function useActionCount(): { count: number; criticalCount: number; isLoading: boolean } {
  const { counts, isLoading } = useActionCenter();

  return {
    count: counts.total,
    criticalCount: counts.critical,
    isLoading,
  };
}

export default useActionCenter;
