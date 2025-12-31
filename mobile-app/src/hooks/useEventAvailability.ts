/**
 * useEventAvailability Hook
 *
 * React Query hook for fetching event availability data for booking flow calendars.
 * Adapted from: frontend/client-portal/src/hooks/useEventAvailability.ts
 */

import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { eventsApi } from '@/apis/events.api';
import type {
  EventAvailabilityData,
  DateSummaryData,
  EventAvailabilityResponse,
} from '@/types/events.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const eventAvailabilityKeys = {
  all: ['eventAvailability'] as const,
  month: (startDate: string, endDate: string, eventTypeId?: number) =>
    [...eventAvailabilityKeys.all, startDate, endDate, eventTypeId] as const,
};

// =============================================================================
// TYPES
// =============================================================================

interface UseEventAvailabilityOptions {
  /** Current month being displayed in calendar */
  currentMonth: Date;
  /** Optional event type ID to filter by */
  eventTypeId?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

interface UseEventAvailabilityResult {
  /** List of events for the month */
  data: EventAvailabilityData[] | undefined;
  /** List of dates that are officially blocked (unavailable) */
  blockedDates: string[];
  /** Date summary with availability status per date */
  dateSummary: DateSummaryData[];
  /** Loading state */
  isLoading: boolean;
  /** Error state (boolean) */
  isError: boolean;
  /** Error object */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * React Query hook for fetching event availability data for booking flow calendars.
 *
 * Fetches CONFIRMED events for the specified month to show unavailable dates.
 * Uses the date_blocked field to determine true availability:
 * - date_blocked=true: Date is taken (first-to-pay-wins was won)
 * - date_blocked=false: Date has pending bookings but is still available
 *
 * @example
 * ```tsx
 * const { data, blockedDates, isLoading } = useEventAvailability({
 *   currentMonth: new Date(),
 *   eventTypeId: flow?.event_type,
 *   enabled: true,
 * });
 * ```
 */
export const useEventAvailability = ({
  currentMonth,
  eventTypeId,
  enabled = true,
}: UseEventAvailabilityOptions): UseEventAvailabilityResult => {
  // Calculate date range for the month
  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);

  // Format dates as YYYY-MM-DD for API
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  const query = useQuery({
    queryKey: eventAvailabilityKeys.month(startDateStr, endDateStr, eventTypeId),
    queryFn: async (): Promise<EventAvailabilityResponse> => {
      const response = await eventsApi.getPublicEventAvailability({
        start_date: startDateStr,
        end_date: endDateStr,
        event_type_id: eventTypeId,
      });
      return response;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    data: query.data?.events,
    blockedDates: query.data?.blocked_dates ?? [],
    dateSummary: query.data?.date_summary ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Check if a specific date is blocked.
 */
export const useIsDateBlocked = (
  date: Date,
  blockedDates: string[]
): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return blockedDates.includes(dateStr);
};

/**
 * Get summary for a specific date.
 */
export const useDateSummary = (
  date: Date,
  dateSummary: DateSummaryData[]
): DateSummaryData | null => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return dateSummary.find((s) => s.date === dateStr) || null;
};

export type { EventAvailabilityData, DateSummaryData, EventAvailabilityResponse };
