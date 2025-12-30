/**
 * useBookingFlows Hook
 *
 * React Query hooks for fetching booking flows and event types.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookingCoreAPI } from '@/apis/booking';
import type { EventType, BookingFlow, BookingFlowStep } from '@/types/booking';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const bookingFlowKeys = {
  all: ['bookingFlows'] as const,
  eventTypes: () => [...bookingFlowKeys.all, 'eventTypes'] as const,
  flows: () => [...bookingFlowKeys.all, 'flows'] as const,
  flowsByEventType: (eventTypeId?: number) =>
    [...bookingFlowKeys.flows(), { eventTypeId }] as const,
  flow: (flowId: number) => [...bookingFlowKeys.all, 'flow', flowId] as const,
  flowSteps: (flowId: number) => [...bookingFlowKeys.all, 'flowSteps', flowId] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch all available event types.
 */
export function useEventTypes() {
  return useQuery({
    queryKey: bookingFlowKeys.eventTypes(),
    queryFn: () => BookingCoreAPI.getEventTypes(),
    staleTime: 10 * 60 * 1000, // 10 minutes - event types rarely change
  });
}

/**
 * Fetch available booking flows, optionally filtered by event type.
 */
export function useAvailableFlows(eventTypeId?: number) {
  return useQuery({
    queryKey: bookingFlowKeys.flowsByEventType(eventTypeId),
    queryFn: () => BookingCoreAPI.getAvailableFlows(eventTypeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a specific booking flow by ID.
 */
export function useBookingFlow(flowId: number) {
  return useQuery({
    queryKey: bookingFlowKeys.flow(flowId),
    queryFn: () => BookingCoreAPI.getFlowById(flowId),
    enabled: flowId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch flow steps configuration.
 */
export function useFlowSteps(flowId: number) {
  return useQuery({
    queryKey: bookingFlowKeys.flowSteps(flowId),
    queryFn: () => BookingCoreAPI.getFlowSteps(flowId),
    enabled: flowId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Prefetch booking flow data.
 */
export function usePrefetchBookingFlow() {
  const queryClient = useQueryClient();

  return (flowId: number) => {
    queryClient.prefetchQuery({
      queryKey: bookingFlowKeys.flow(flowId),
      queryFn: () => BookingCoreAPI.getFlowById(flowId),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Invalidate all booking flow queries.
 */
export function useInvalidateBookingFlows() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: bookingFlowKeys.all });
  };
}

/**
 * Get cached flow from query client.
 */
export function useGetCachedFlow() {
  const queryClient = useQueryClient();

  return (flowId: number): BookingFlow | undefined => {
    return queryClient.getQueryData(bookingFlowKeys.flow(flowId));
  };
}

/**
 * Get cached event types from query client.
 */
export function useGetCachedEventTypes() {
  const queryClient = useQueryClient();

  return (): EventType[] | undefined => {
    return queryClient.getQueryData(bookingFlowKeys.eventTypes());
  };
}
