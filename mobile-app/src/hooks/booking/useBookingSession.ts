/**
 * useBookingSession Hook
 *
 * React Query hooks for managing booking sessions.
 * Handles session creation, loading, updating, and completion.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookingCoreAPI, ConfirmationAPI } from '@/apis/booking';
import { useToast } from '@/contexts/ToastContext';
import {
  saveBookingSession,
  loadBookingSession,
  clearBookingSession,
  getRecoverableSession,
  markSessionSynced,
} from '@/utils/bookingStorage';
import type {
  BookingSessionStartResponse,
  BookingSessionUpdateResponse,
  BookingCompletionResult,
  StepValidationResult,
  StoredSession,
  SessionRecoveryInfo,
} from '@/types/booking';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const bookingSessionKeys = {
  all: ['bookingSessions'] as const,
  session: (sessionId: string) => [...bookingSessionKeys.all, 'session', sessionId] as const,
  recoverable: () => [...bookingSessionKeys.all, 'recoverable'] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch session data by session ID.
 */
export function useBookingSession(sessionId: string | null) {
  return useQuery({
    queryKey: bookingSessionKeys.session(sessionId || ''),
    queryFn: () => BookingCoreAPI.getSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds - session data changes frequently
    refetchOnWindowFocus: true,
  });
}

/**
 * Check for recoverable session from local storage.
 */
export function useRecoverableSession() {
  return useQuery({
    queryKey: bookingSessionKeys.recoverable(),
    queryFn: () => getRecoverableSession(),
    staleTime: 60 * 1000, // 1 minute
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Start a new booking session.
 */
export function useStartSession() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      flowId,
      sessionData,
    }: {
      flowId: number;
      sessionData?: { ip_address?: string; user_agent?: string; referrer_url?: string };
    }) => BookingCoreAPI.startSession(flowId, sessionData),
    onSuccess: async (response) => {
      // Cache the session
      queryClient.setQueryData(bookingSessionKeys.session(response.session_id), response);

      // Save to local storage for recovery
      await saveBookingSession(response.session_id, {
        session_id: response.session_id,
        booking_flow_id: response.booking_flow_id,
        expires_at: response.expires_at,
        completed_steps: response.completed_steps || [],
        booking_data: response.booking_data || {},
      });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to start booking session.';
      showToast(message, 'error');
    },
  });
}

/**
 * Update session data for a step.
 */
export function useUpdateSessionData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      data,
      markCompleted,
    }: {
      sessionId: string;
      stepId: number;
      data: Record<string, unknown>;
      markCompleted?: boolean;
    }) => BookingCoreAPI.updateSessionData(sessionId, stepId, data, markCompleted),
    onSuccess: async (response, variables) => {
      // Update cached session
      queryClient.setQueryData(bookingSessionKeys.session(variables.sessionId), (old: BookingSessionStartResponse | undefined) => {
        if (!old) return response;
        return {
          ...old,
          ...response,
        };
      });

      // Update local storage
      await saveBookingSession(variables.sessionId, {
        session_id: variables.sessionId,
        booking_data: response.booking_data,
        completed_steps: response.completed_steps,
        current_step_id: response.current_step_id,
        total_price: response.total_price,
        pending_sync: false,
      });
    },
    onError: async (_, variables) => {
      // Mark as pending sync for retry later
      await saveBookingSession(variables.sessionId, {
        pending_sync: true,
      });
    },
  });
}

/**
 * Validate step data without saving.
 */
export function useValidateStepData() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
    }: {
      sessionId: string;
      stepId: number;
      stepData: Record<string, unknown>;
    }) => BookingCoreAPI.validateStepData(sessionId, stepId, stepData),
  });
}

/**
 * Navigate to a specific step.
 */
export function useGoToStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
    }: {
      sessionId: string;
      stepId: number;
    }) => BookingCoreAPI.goToStep(sessionId, stepId),
    onSuccess: (response, variables) => {
      // Update cached session
      queryClient.setQueryData(bookingSessionKeys.session(variables.sessionId), (old: BookingSessionStartResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          current_step_id: variables.stepId,
          ...response,
        };
      });
    },
  });
}

/**
 * Calculate pricing for the session.
 */
export function useCalculatePricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      discountCode,
      venueAdditionalHours,
    }: {
      sessionId: string;
      discountCode?: string;
      venueAdditionalHours?: Record<string, number>;
    }) => BookingCoreAPI.calculatePricing(sessionId, discountCode, venueAdditionalHours),
    onSuccess: (response, variables) => {
      // Update cached session with new pricing
      queryClient.setQueryData(bookingSessionKeys.session(variables.sessionId), (old: BookingSessionStartResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          total_price: response.total,
          pricing: response,
        };
      });
    },
  });
}

/**
 * Complete the booking.
 */
export function useCompleteBooking() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      sessionId,
      completionType,
    }: {
      sessionId: string;
      completionType?: 'payment' | 'quote';
    }) => BookingCoreAPI.completeBooking(sessionId, completionType),
    onSuccess: async (response, variables) => {
      showToast('Booking completed successfully!', 'success');

      // Clear local storage for this session
      await clearBookingSession(variables.sessionId);

      // Invalidate session queries
      queryClient.invalidateQueries({ queryKey: bookingSessionKeys.session(variables.sessionId) });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to complete booking. Please try again.';
      showToast(message, 'error');
    },
  });
}

/**
 * Abandon a booking session.
 */
export function useAbandonSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      reason,
    }: {
      sessionId: string;
      reason?: string;
    }) => BookingCoreAPI.abandonSession(sessionId, reason),
    onSuccess: async (_, variables) => {
      // Clear local storage
      await clearBookingSession(variables.sessionId);

      // Remove from cache
      queryClient.removeQueries({ queryKey: bookingSessionKeys.session(variables.sessionId) });
    },
  });
}

/**
 * Recover a session from local storage.
 */
export function useRecoverSession() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      // First try to load from backend
      const session = await BookingCoreAPI.getSession(sessionId);
      return session;
    },
    onSuccess: (response, sessionId) => {
      showToast('Session recovered successfully', 'success');

      // Cache the session
      queryClient.setQueryData(bookingSessionKeys.session(sessionId), response);
    },
    onError: async (error: unknown, sessionId) => {
      const err = error as { response?: { status?: number } };

      // If session not found on backend (404), clear local storage
      if (err.response?.status === 404) {
        await clearBookingSession(sessionId);
        showToast('Session has expired. Please start a new booking.', 'error');
      } else {
        showToast('Failed to recover session. Please try again.', 'error');
      }
    },
  });
}

/**
 * Discard recoverable session.
 */
export function useDiscardRecoverableSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await clearBookingSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingSessionKeys.recoverable() });
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Invalidate all session queries.
 */
export function useInvalidateBookingSessions() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: bookingSessionKeys.all });
  };
}

/**
 * Get cached session from query client.
 */
export function useGetCachedSession() {
  const queryClient = useQueryClient();

  return (sessionId: string): BookingSessionStartResponse | undefined => {
    return queryClient.getQueryData(bookingSessionKeys.session(sessionId));
  };
}
