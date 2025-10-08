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
}

interface UseEventAvailabilityOptions {
  /** Current month being displayed in calendar */
  currentMonth: Date;
  /** Optional event type ID to filter by */
  eventTypeId?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * React Query hook for fetching event availability data for booking flow calendars
 *
 * Fetches CONFIRMED events for the specified month to show unavailable dates
 */
export const useEventAvailability = ({
  currentMonth,
  eventTypeId,
  enabled = true,
}: UseEventAvailabilityOptions) => {
  // Calculate date range for the month
  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);

  // Format dates as YYYY-MM-DD for API
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['eventAvailability', startDateStr, endDateStr, eventTypeId],
    queryFn: async () => {
      const response = await eventsApi.getPublicEventAvailability({
        start_date: startDateStr,
        end_date: endDateStr,
        event_type_id: eventTypeId,
      });
      return response.events;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
  });
};

export type { EventAvailabilityData };
