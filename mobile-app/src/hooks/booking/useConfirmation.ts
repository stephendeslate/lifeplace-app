/**
 * useConfirmation Hook
 *
 * React Query hooks for booking confirmation and completion.
 * Enhanced with completion state management and quote support.
 * Adapted from: frontend/client-portal/src/hooks/booking/useConfirmation.tsx
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmationAPI, BookingCoreAPI } from '@/apis/booking';
import { useToast } from '@/contexts/ToastContext';
import { clearBookingSession } from '@/utils/bookingStorage';
import type { BookingDetails } from '@/apis/booking/confirmation.api';
import type {
  ConfirmationStepData,
  ConfirmationStepConfiguration,
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

// =============================================================================
// UNIFIED CONFIRMATION MANAGER HOOK
// =============================================================================

/**
 * Completion status type
 */
export type CompletionStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Unified hook for managing confirmation step and booking completion.
 * Handles both payment and quote completion types.
 *
 * @param sessionId The booking session ID
 * @param config Step configuration
 * @returns Confirmation management utilities
 */
export function useConfirmationManager(
  sessionId?: string,
  config?: ConfirmationStepConfiguration | null
) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionResult, setCompletionResult] = useState<BookingCompletionResult | null>(null);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('pending');

  // Fetch booking details
  const {
    data: bookingDetails,
    isLoading: detailsLoading,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: confirmationKeys.details(sessionId || ''),
    queryFn: () => ConfirmationAPI.getBookingDetails(sessionId!),
    enabled: !!sessionId && completionStatus === 'completed',
    staleTime: 5 * 60 * 1000,
  });

  // Extract completion type from session data
  const getCompletionType = useCallback(
    (sessionData?: Record<string, unknown>): 'payment' | 'quote' => {
      if (!sessionData) return 'quote'; // Default to quote

      // Check root level
      if (sessionData.completion_type === 'quote' || sessionData.completion_type === 'payment') {
        return sessionData.completion_type as 'payment' | 'quote';
      }

      // Search through step data
      for (const [, stepData] of Object.entries(sessionData)) {
        if (typeof stepData === 'object' && stepData !== null) {
          const data = stepData as Record<string, unknown>;
          if (data.completion_type === 'quote' || data.completion_type === 'payment') {
            return data.completion_type as 'payment' | 'quote';
          }
        }
      }

      return 'quote'; // Default to quote if not found
    },
    []
  );

  // Complete the booking
  const completeBooking = useCallback(
    async (providedCompletionType?: 'payment' | 'quote'): Promise<boolean> => {
      if (!sessionId) {
        setError('Session information missing');
        return false;
      }

      setCompleting(true);
      setCompletionStatus('processing');
      setError(null);

      try {
        // Use provided type or default to quote
        const completionType = providedCompletionType || 'quote';

        const result = await BookingCoreAPI.completeBooking(sessionId, completionType);
        setCompletionResult(result);
        setCompletionStatus('completed');

        // Clear local storage for this session
        await clearBookingSession(sessionId);

        // Invalidate session queries
        queryClient.invalidateQueries({
          queryKey: ['bookingSessions', 'session', sessionId],
        });

        // Show appropriate success message
        if (completionType === 'quote') {
          showToast('Quote request submitted successfully!', 'success');
        } else {
          showToast('Booking completed successfully!', 'success');
        }

        // Refetch details
        refetchDetails();

        return true;
      } catch (err) {
        const errorObj = err as { response?: { data?: { detail?: string } } };
        const errorMessage = errorObj.response?.data?.detail || 'Failed to complete booking';
        setError(errorMessage);
        setCompletionStatus('failed');
        showToast(errorMessage, 'error');
        return false;
      } finally {
        setCompleting(false);
      }
    },
    [sessionId, queryClient, showToast, refetchDetails]
  );

  // Generate booking reference
  const bookingReference = useMemo(() => {
    if (completionResult?.booking_reference) {
      return completionResult.booking_reference;
    }
    if (bookingDetails?.booking_reference) {
      return bookingDetails.booking_reference;
    }
    if (!sessionId) return '';
    // Generate a reference from session ID
    return ConfirmationAPI.formatBookingReference(sessionId);
  }, [sessionId, completionResult, bookingDetails]);

  // Get next steps content
  const nextSteps = useMemo(() => {
    if (!completionResult) return [];
    return ConfirmationAPI.getNextSteps(completionResult);
  }, [completionResult]);

  // Get confirmation content from config
  const confirmationContent = useMemo(
    () => ({
      title: config?.custom_success_message || 'Booking Confirmed!',
      message: config?.show_next_steps
        ? "Thank you for your booking. We'll be in touch soon!"
        : 'Your booking has been received.',
    }),
    [config]
  );

  // Check if booking is completed
  const isCompleted = useMemo(() => {
    return completionStatus === 'completed' || !!completionResult;
  }, [completionStatus, completionResult]);

  // Check if it's a quote completion
  const isQuoteCompletion = useMemo(() => {
    return completionResult?.payment_type === 'quote';
  }, [completionResult]);

  // Format event summary for display
  const eventSummary = useMemo(() => {
    if (!bookingDetails) return null;

    return {
      date: bookingDetails.event_date,
      venue: bookingDetails.venue_name,
      contact: bookingDetails.contact_info,
      totalPrice: bookingDetails.total_amount,
      paymentStatus: bookingDetails.payment_status,
      balanceDue: bookingDetails.balance_due,
    };
  }, [bookingDetails]);

  // Clear errors
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset completion state
  const resetCompletion = useCallback(() => {
    setCompletionResult(null);
    setCompletionStatus('pending');
    setError(null);
  }, []);

  return {
    // Data
    bookingDetails,
    completionResult,
    eventSummary,
    bookingReference,
    nextSteps,
    confirmationContent,

    // Actions
    completeBooking,
    getCompletionType,
    clearError,
    resetCompletion,
    refetchDetails,

    // State
    loading: loading || detailsLoading,
    completing,
    error,
    completionStatus,

    // Status flags
    isCompleted,
    isQuoteCompletion,

    // Configuration flags
    showBookingSummary: config?.show_booking_summary !== false,
    showNextSteps: config?.show_next_steps !== false,
    showAddToCalendar: config?.show_add_to_calendar !== false,
    showShareButtons: config?.show_share_buttons !== false,
  };
}
