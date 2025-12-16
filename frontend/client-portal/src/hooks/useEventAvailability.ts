// frontend/client-portal/src/hooks/useEventAvailability.ts

import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { eventsApi } from '../apis/events.api';

interface EventAvailabilityData {
  id: number;
  name: string;
  event_type_name: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  payment_status: string;
  /** Whether this event's date is officially blocked (first-to-pay-wins) */
  date_blocked?: boolean;
}

interface DateSummaryData {
  date: string;
  date_blocked: boolean;
  event_count: number;
  events: EventAvailabilityData[];
}

interface EventAvailabilityResponse {
  events: EventAvailabilityData[];
  date_summary: DateSummaryData[];
  blocked_dates: string[];
  start_date: string;
  end_date: string;
  event_count: number;
}

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
  /** Error state */
  error: Error | null;
}

/**
 * React Query hook for fetching event availability data for booking flow calendars
 *
 * Fetches CONFIRMED events for the specified month to show unavailable dates.
 * Uses the date_blocked field to determine true availability:
 * - date_blocked=true: Date is taken (first-to-pay-wins was won)
 * - date_blocked=false: Date has pending bookings but is still available
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
    queryKey: ['eventAvailability', startDateStr, endDateStr, eventTypeId],
    queryFn: async (): Promise<EventAvailabilityResponse> => {
      const response = await eventsApi.getPublicEventAvailability({
        start_date: startDateStr,
        end_date: endDateStr,
        event_type_id: eventTypeId,
      });
      return response as EventAvailabilityResponse;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
  });

  return {
    data: query.data?.events,
    blockedDates: query.data?.blocked_dates ?? [],
    dateSummary: query.data?.date_summary ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
};

export type { EventAvailabilityData, DateSummaryData, EventAvailabilityResponse };
