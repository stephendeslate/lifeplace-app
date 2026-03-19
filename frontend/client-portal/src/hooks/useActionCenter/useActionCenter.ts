// frontend/client-portal/src/hooks/useActionCenter/useActionCenter.ts

import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEvents } from '../useEvents';
import { usePendingQuotes } from '../useEventQuotes';
import { useFinancialOverview } from '../useFinancial';
import { useContracts } from '../../contexts/ContractsContext';
import type { Event, EventTask, EventDetail } from '../../types/events.types';
import type {
  ActionType,
  AnyActionItem,
  ActionCenterFilters,
  ActionCenterSortOption,
  ActionCounts,
  EventFilterOption,
} from '../../types/action-center.types';
import {
  transformTaskToAction,
  transformQuoteToAction,
  transformContractToAction,
  transformInvoiceToAction,
  sortActions,
} from './action-center-helpers';

// Re-export urgency helpers for use in components
export {
  calculateUrgencyFromDays,
  calculateUrgencyFromPriority,
} from '../../types/action-center.types';

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
  const { filters = { types: [] }, sortBy = 'urgency', sortDirection = 'desc' } = options;

  const queryClient = useQueryClient();

  // Fetch data from existing hooks
  const { useEventsList } = useEvents();
  const eventsQuery = useEventsList();
  const pendingQuotesQuery = usePendingQuotes();
  const { invoices, isLoading: financialLoading, error: financialError } = useFinancialOverview();
  const { pendingContracts, isLoading: contractsLoading } = useContracts();

  // Calculate loading state
  const isLoading =
    eventsQuery.isLoading || pendingQuotesQuery.isLoading || financialLoading || contractsLoading;

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
          .filter(
            (task: EventTask) =>
              task.requires_client_input &&
              (task.status === 'PENDING' || task.status === 'IN_PROGRESS'),
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
      .filter((quote) => quote.status === 'SENT')
      .forEach((quote) => {
        actions.push(transformQuoteToAction(quote));
      });

    // ============ CONTRACTS ============
    // Transform pending contracts from context (including expired for visibility)
    pendingContracts.forEach((contract) => {
      // Include contracts that need signing OR are expired (for visibility)
      const isExpiredContract = contract.status === 'EXPIRED' || contract.is_expired;
      const needsSignature =
        contract.can_client_sign || ['SENT', 'PARTIALLY_SIGNED'].includes(contract.status);

      if (needsSignature || isExpiredContract) {
        const eventId =
          typeof contract.event === 'object'
            ? parseInt(contract.event.id, 10)
            : parseInt(contract.id, 10);
        const eventName = typeof contract.event === 'object' ? contract.event.title : 'Event';

        actions.push(
          transformContractToAction({
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
          }),
        );
      }
    });

    // ============ PAYMENTS (Outstanding Invoices) ============
    // Filter invoices that are truly outstanding (not fully paid)
    // Check both status AND remaining_amount/is_fully_paid to handle edge cases
    const outstandingInvoices = invoices.filter(
      (invoice) =>
        (invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID') &&
        !invoice.is_fully_paid &&
        parseFloat(invoice.remaining_amount || '0') > 0,
    );

    outstandingInvoices.forEach((invoice) => {
      actions.push(transformInvoiceToAction(invoice));
    });

    return actions;
  }, [eventsQuery.data, pendingQuotesQuery.data, pendingContracts, invoices]);

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
          action.eventName.toLowerCase().includes(searchLower),
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
    [counts],
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

export default useActionCenter;
