// frontend/client-portal/src/hooks/useGlobalAvailabilityConfig.ts

import { useQuery } from '@tanstack/react-query';
import { BookingCoreApi } from '../apis/booking/core.api';
import { availabilityConfig } from '../config/availability.config';

interface GlobalAvailabilityConfig {
  /** Minimum advance booking days across all active flows (least restrictive) */
  minAdvanceBookingDays: number;
  /** Maximum advance booking days across all active flows (most permissive) */
  maxAdvanceBookingDays: number;
  /** Whether the config is still loading */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
}

/**
 * Hook to get global availability configuration derived from all active booking flows.
 *
 * For the home page calendar (which isn't tied to a specific flow), this returns:
 * - minAdvanceBookingDays: The MINIMUM across all flows (least restrictive - shows most dates)
 * - maxAdvanceBookingDays: The MAXIMUM across all flows (most permissive - shows furthest dates)
 *
 * This ensures that if a date shows as available on the home page,
 * at least one booking flow can accept that date.
 *
 * Falls back to global defaults from availability.config.ts if no flows are available.
 *
 * @example
 * const { minAdvanceBookingDays, maxAdvanceBookingDays, isLoading } = useGlobalAvailabilityConfig();
 *
 * <EventAvailabilityCalendar
 *   minAdvanceBookingDays={minAdvanceBookingDays}
 *   maxAdvanceBookingDays={maxAdvanceBookingDays}
 * />
 */
export const useGlobalAvailabilityConfig = (): GlobalAvailabilityConfig => {
  const { data: flows, isLoading, error } = useQuery({
    queryKey: ['bookingFlows', 'availability'],
    queryFn: () => BookingCoreApi.getAvailableFlows(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Compute the minimum min_advance_booking_days across all flows
  // This is the least restrictive value - shows the most available dates
  const minAdvanceBookingDays = flows && flows.length > 0
    ? Math.min(...flows.map(f => f.min_advance_booking_days))
    : availabilityConfig.minAdvanceBookingDays;

  // Compute the maximum max_advance_booking_days across all flows
  // This is the most permissive value - shows dates furthest in the future
  const maxAdvanceBookingDays = flows && flows.length > 0
    ? Math.max(...flows.map(f => f.max_advance_booking_days))
    : availabilityConfig.maxAdvanceBookingDays;

  return {
    minAdvanceBookingDays,
    maxAdvanceBookingDays,
    isLoading,
    error: error as Error | null,
  };
};

export default useGlobalAvailabilityConfig;
