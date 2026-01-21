/**
 * useVenues Hook
 *
 * React Query hooks for venue selection and management.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { VenuesAPI } from '@/apis/booking';
import { useToast } from '@/contexts/ToastContext';
import type {
  RentableVenueWithEventType,
  VenueAvailabilityResponse,
  FindMatchingPackagesResponse,
  CustomPackageEstimate,
  VenueSelectionStepData,
  StepValidationResult,
} from '@/types/booking';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const venueKeys = {
  all: ['venues'] as const,
  active: () => [...venueKeys.all, 'active'] as const,
  rentable: (eventTypeId?: number) => [...venueKeys.all, 'rentable', { eventTypeId }] as const,
  venue: (venueId: number) => [...venueKeys.all, 'venue', venueId] as const,
  availability: (venueId: number, startDate: string, endDate: string) =>
    [...venueKeys.all, 'availability', venueId, startDate, endDate] as const,
  matchingPackages: (venueIds: number[], eventTypeId?: number) =>
    [...venueKeys.all, 'matchingPackages', { venueIds, eventTypeId }] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch all active bookable venues.
 */
export function useActiveVenues() {
  return useQuery({
    queryKey: venueKeys.active(),
    queryFn: () => VenuesAPI.getActiveVenues(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch rentable venues with optional event type pricing.
 */
export function useRentableVenues(eventTypeId?: number) {
  return useQuery({
    queryKey: venueKeys.rentable(eventTypeId),
    queryFn: () => VenuesAPI.getRentableVenues(eventTypeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a specific venue by ID.
 */
export function useVenue(venueId: number) {
  return useQuery({
    queryKey: venueKeys.venue(venueId),
    queryFn: () => VenuesAPI.getVenue(venueId),
    enabled: venueId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch venue availability for a date range.
 */
export function useVenueAvailability(venueId: number, startDate: string, endDate: string) {
  return useQuery({
    queryKey: venueKeys.availability(venueId, startDate, endDate),
    queryFn: () => VenuesAPI.getVenueAvailability(venueId, startDate, endDate),
    enabled: venueId > 0 && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Find matching packages for selected venues.
 */
export function useFindMatchingPackages() {
  return useMutation({
    mutationFn: ({
      venueIds,
      eventTypeId,
    }: {
      venueIds: number[];
      eventTypeId?: number;
    }) => VenuesAPI.findMatchingPackages({ venue_ids: venueIds, event_type_id: eventTypeId }),
  });
}

/**
 * Create custom package from selected venues.
 */
export function useCreateFromVenues() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      venueIds,
      eventTypeId,
      sessionId,
    }: {
      venueIds: number[];
      eventTypeId?: number;
      sessionId?: string;
    }) =>
      VenuesAPI.createFromVenues({
        venue_ids: venueIds,
        event_type_id: eventTypeId,
        session_id: sessionId,
      }),
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to create custom package.';
      showToast(message, 'error');
    },
  });
}

/**
 * Calculate event times based on venue rules.
 */
export function useCalculateVenueTimes() {
  return useMutation({
    mutationFn: ({
      venueId,
      eventDate,
      programHours,
    }: {
      venueId: number;
      eventDate: string;
      programHours: number;
    }) => VenuesAPI.calculateTimes(venueId, { event_date: eventDate, program_hours: programHours }),
  });
}

/**
 * Check date availability for a venue.
 */
export function useCheckDateAvailability() {
  return useMutation({
    mutationFn: ({
      venueId,
      date,
    }: {
      venueId: number;
      date: string;
    }) => VenuesAPI.isDateAvailable(venueId, date),
  });
}

/**
 * Validate venue selection step data.
 */
export function useValidateVenueSelection() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
    }: {
      sessionId: string;
      stepId: number;
      stepData: VenueSelectionStepData;
    }) => VenuesAPI.validateStepData(sessionId, stepId, stepData),
  });
}

/**
 * Update venue selection step data.
 */
export function useUpdateVenueSelection() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
      markCompleted,
    }: {
      sessionId: string;
      stepId: number;
      stepData: VenueSelectionStepData;
      markCompleted?: boolean;
    }) => VenuesAPI.updateStepData(sessionId, stepId, stepData, markCompleted),
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Calculate custom package estimate from selected venues.
 *
 * This is a client-side calculation for immediate feedback.
 */
export function useCustomPackageEstimate(
  venues: RentableVenueWithEventType[],
  selectedVenueIds: number[]
): CustomPackageEstimate {
  return VenuesAPI.calculateCustomPackageEstimate(venues, selectedVenueIds);
}

/**
 * Prefetch venue data.
 */
export function usePrefetchVenue() {
  const queryClient = useQueryClient();

  return (venueId: number) => {
    queryClient.prefetchQuery({
      queryKey: venueKeys.venue(venueId),
      queryFn: () => VenuesAPI.getVenue(venueId),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Invalidate venue queries.
 */
export function useInvalidateVenues() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: venueKeys.all });
  };
}
