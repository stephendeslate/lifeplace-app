/**
 * useDashboard Hook
 *
 * Aggregates data from multiple sources for the dashboard.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { dashboardApi } from '@/apis/dashboard.api';
import { useUpcomingEvents } from './useEvents';
import { usePendingQuotes } from './useQuotes';
import { useOverduePayments, useFinancialSummary } from './useFinancial';
import { usePendingContracts } from './useContracts';
import type {
  FinancialSummary,
  PendingQuote,
  OverduePayment,
  PendingContract,
  UrgentTask,
} from '@/types/dashboard.types';
import type { Event } from '@/types/events.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const dashboardKeys = {
  all: ['dashboard'] as const,
  data: () => [...dashboardKeys.all, 'data'] as const,
  urgentTasks: () => [...dashboardKeys.all, 'urgentTasks'] as const,
};

// =============================================================================
// AGGREGATED DASHBOARD HOOK
// =============================================================================

/**
 * Simplified dashboard data for the mobile app
 */
export interface DashboardResult {
  criticalActions: {
    pendingQuotes: PendingQuote[];
    overduePayments: OverduePayment[];
    pendingContracts: PendingContract[];
    urgentTasks: UrgentTask[];
  };
  nextEvent: Event | null;
  financialSummary: FinancialSummary | null;
}

export interface UseDashboardReturn {
  data: DashboardResult | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Main dashboard hook that aggregates all dashboard data
 */
export function useDashboard(): UseDashboardReturn {
  const queryClient = useQueryClient();

  // Fetch all data sources in parallel
  const upcomingEventsQuery = useUpcomingEvents();
  const pendingQuotesQuery = usePendingQuotes();
  const overduePaymentsQuery = useOverduePayments();
  const financialSummaryQuery = useFinancialSummary();
  const pendingContractsQuery = usePendingContracts();

  // Calculate loading state
  const isLoading =
    upcomingEventsQuery.isLoading ||
    pendingQuotesQuery.isLoading ||
    overduePaymentsQuery.isLoading ||
    financialSummaryQuery.isLoading ||
    pendingContractsQuery.isLoading;

  const isRefetching =
    upcomingEventsQuery.isFetching ||
    pendingQuotesQuery.isFetching ||
    overduePaymentsQuery.isFetching ||
    financialSummaryQuery.isFetching ||
    pendingContractsQuery.isFetching;

  // Calculate error state
  const error =
    upcomingEventsQuery.error ||
    pendingQuotesQuery.error ||
    overduePaymentsQuery.error ||
    financialSummaryQuery.error ||
    pendingContractsQuery.error;

  // Memoized data aggregation
  const data = useMemo<DashboardResult | undefined>(() => {
    // Only return data once we have the main queries loaded
    if (isLoading) return undefined;

    const upcomingEvents = upcomingEventsQuery.data || [];
    const pendingQuotes = pendingQuotesQuery.data || [];
    const overduePayments = overduePaymentsQuery.data || [];
    const pendingContracts = pendingContractsQuery.data || [];

    // Find next upcoming event
    const sortedUpcoming = [...upcomingEvents].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    const nextEvent = sortedUpcoming[0] || null;

    return {
      criticalActions: {
        pendingQuotes: pendingQuotes.slice(0, 5),
        overduePayments: overduePayments.slice(0, 5),
        pendingContracts: pendingContracts.slice(0, 5),
        urgentTasks: [], // TODO: Implement urgent tasks query
      },
      nextEvent,
      financialSummary: financialSummaryQuery.data || null,
    };
  }, [
    isLoading,
    upcomingEventsQuery.data,
    pendingQuotesQuery.data,
    overduePaymentsQuery.data,
    pendingContractsQuery.data,
    financialSummaryQuery.data,
  ]);

  // Refetch function
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  return {
    data,
    isLoading,
    isRefetching,
    error: error as Error | null,
    refetch,
  };
}

// =============================================================================
// URGENT TASKS HOOK
// =============================================================================

/**
 * Fetch urgent tasks that require client input
 */
export function useUrgentTasks() {
  return useQuery({
    queryKey: dashboardKeys.urgentTasks(),
    queryFn: () => dashboardApi.getUrgentTasks(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

