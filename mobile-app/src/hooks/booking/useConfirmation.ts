/**
 * useConfirmation Hook
 *
 * React Query hooks for booking confirmation and completion.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmationAPI, BookingCoreAPI } from '@/apis/booking';
import { useToast } from '@/contexts/ToastContext';
import type { BookingDetails } from '@/apis/booking/confirmation.api';
import type {
  ConfirmationStepData,
  BookingCompletionResult,
  StepValidationResult,
} from '@/types/booking';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const confirmationKeys = {
  all: ['confirmations'] as const,
  details: (sessionId: string) => [...confirmationKeys.all, 'details', sessionId] as const,
  receipt: (sessionId: string) => [...confirmationKeys.all, 'receipt', sessionId] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch booking details after completion.
 */
export function useBookingDetails(sessionId: string) {
  return useQuery({
    queryKey: confirmationKeys.details(sessionId),
    queryFn: () => ConfirmationAPI.getBookingDetails(sessionId),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch receipt URL.
 */
export function useReceiptUrl(sessionId: string) {
  return useQuery({
    queryKey: confirmationKeys.receipt(sessionId),
    queryFn: () => ConfirmationAPI.getReceiptUrl(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

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
    }) => ConfirmationAPI.completeBooking(sessionId, completionType),
    onSuccess: (response, variables) => {
      if (response.status === 'completed') {
        showToast('Booking completed successfully!', 'success');
      } else if (response.status === 'pending') {
        showToast('Booking submitted. Awaiting confirmation.', 'success');
      }

      // Invalidate session queries
      queryClient.invalidateQueries({
        queryKey: ['bookingSessions', 'session', variables.sessionId],
      });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to complete booking.';
      showToast(message, 'error');
    },
  });
}

/**
 * Resend confirmation email.
 */
export function useResendConfirmation() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (sessionId: string) => ConfirmationAPI.resendConfirmation(sessionId),
    onSuccess: () => {
      showToast('Confirmation email sent!', 'success');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to resend confirmation.';
      showToast(message, 'error');
    },
  });
}

/**
 * Validate confirmation step data.
 */
export function useValidateConfirmation() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
    }: {
      sessionId: string;
      stepId: number;
      stepData: ConfirmationStepData;
    }) => ConfirmationAPI.validateStepData(sessionId, stepId, stepData),
  });
}

/**
 * Update confirmation step data.
 */
export function useUpdateConfirmation() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
      markCompleted,
    }: {
      sessionId: string;
      stepId: number;
      stepData: ConfirmationStepData;
      markCompleted?: boolean;
    }) => ConfirmationAPI.updateStepData(sessionId, stepId, stepData, markCompleted),
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Format booking reference for display.
 */
export function useFormatBookingReference(reference: string): string {
  return ConfirmationAPI.formatBookingReference(reference);
}

/**
 * Get completion status display.
 */
export function useStatusDisplay(
  status: string
): { label: string; color: 'success' | 'warning' | 'error' | 'info' } {
  return ConfirmationAPI.getStatusDisplay(status);
}

/**
 * Get payment status display.
 */
export function usePaymentStatusDisplay(
  status: string
): { label: string; color: 'success' | 'warning' | 'error' | 'info' } {
  return ConfirmationAPI.getPaymentStatusDisplay(status);
}

/**
 * Generate calendar event data.
 */
export function useCalendarEvent(details: BookingDetails) {
  return ConfirmationAPI.generateCalendarEvent(details);
}

/**
 * Get next steps based on completion result.
 */
export function useNextSteps(
  completionResult: BookingCompletionResult
): Array<{ title: string; description: string; action?: string }> {
  return ConfirmationAPI.getNextSteps(completionResult);
}

/**
 * Check if booking is fully confirmed.
 */
export function useIsFullyConfirmed(completionResult: BookingCompletionResult): boolean {
  return ConfirmationAPI.isFullyConfirmed(completionResult);
}

/**
 * Invalidate confirmation queries.
 */
export function useInvalidateConfirmations() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: confirmationKeys.all });
  };
}
