/**
 * Confirmation Step API
 *
 * API functions for booking confirmation and completion.
 */

import api from '@/utils/api';
import { logger } from '@/utils/logger';
import type {
  ConfirmationStepData,
  BookingCompletionResult,
  StepValidationResult,
} from '@/types/booking';

// =============================================================================
// TYPES
// =============================================================================

export interface BookingDetails {
  booking_reference: string;
  event_id: number;
  event_name: string;
  event_date: string;
  venue_name: string;
  total_amount: string;
  deposit_amount: string | null;
  balance_due: string | null;
  payment_status: 'pending' | 'partial' | 'paid';
  confirmation_sent: boolean;
  calendar_links: {
    google: string;
    outlook: string;
    ical: string;
  };
  contact_info: {
    full_name: string;
    email: string;
    phone: string | null;
  };
}

// =============================================================================
// CONFIRMATION API
// =============================================================================

export const ConfirmationAPI = {
  /**
   * Complete the booking.
   *
   * POST /bookingflow/public/flows/session/:sessionId/complete/
   */
  completeBooking: async (
    sessionId: string,
    completionType: 'payment' | 'quote' = 'payment'
  ): Promise<BookingCompletionResult> => {
    const response = await api.post<BookingCompletionResult>(
      `/bookingflow/public/flows/session/${sessionId}/complete/`,
      { completion_type: completionType }
    );
    return response.data;
  },

  /**
   * Get booking details after completion.
   *
   * Uses the main session endpoint to get session status.
   * Note: The public session endpoint returns minimal data (no booking_data).
   * Full booking details (contact info, dates, etc.) should come from
   * local state in the ConfirmationStep component.
   *
   * GET /bookingflow/public/flows/session/:sessionId/
   */
  getBookingDetails: async (sessionId: string): Promise<BookingDetails> => {
    const response = await api.get<{
      session_id: string;
      booking_flow: number;
      progress_percentage: number;
      expires_at: string;
      is_completed: boolean;
      is_abandoned: boolean;
      total_price: string;
    }>(`/bookingflow/public/flows/session/${sessionId}/`);

    const session = response.data;

    // Return basic session info - full details come from local state
    return {
      booking_reference: session.session_id.slice(0, 8).toUpperCase(),
      event_id: 0,
      event_name: '',
      event_date: '',
      venue_name: '',
      total_amount: session.total_price,
      deposit_amount: null,
      balance_due: null,
      payment_status: session.is_completed ? 'paid' : 'pending',
      confirmation_sent: session.is_completed,
      calendar_links: {
        google: '',
        outlook: '',
        ical: '',
      },
      contact_info: {
        full_name: '',
        email: '',
        phone: null,
      },
    };
  },

  /**
   * Resend confirmation email.
   *
   * POST /bookingflow/public/flows/session/:sessionId/send-confirmation/
   */
  resendConfirmation: async (sessionId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/bookingflow/public/flows/session/${sessionId}/send-confirmation/`
    );
    return response.data;
  },

  /**
   * Get downloadable receipt/invoice.
   *
   * Note: This endpoint is not yet implemented in the backend.
   * Returns a placeholder for now.
   */
  getReceiptUrl: async (_sessionId: string): Promise<{ url: string }> => {
    // Receipt endpoint not yet implemented in backend
    // When implemented, use: `/bookingflow/public/flows/session/${sessionId}/receipt/`
    logger.warn('Receipt URL endpoint not yet implemented');
    return { url: '' };
  },

  /**
   * Validate confirmation step data.
   *
   * POST /bookingflow/public/flows/session/:sessionId/validate/
   */
  validateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: ConfirmationStepData
  ): Promise<StepValidationResult> => {
    const response = await api.post<StepValidationResult>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      {
        step_id: stepId,
        step_data: stepData,
      }
    );
    return response.data;
  },

  /**
   * Update confirmation step data.
   *
   * PATCH /bookingflow/public/flows/session/:sessionId/update/
   */
  updateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: ConfirmationStepData,
    markCompleted: boolean = false
  ): Promise<Record<string, unknown>> => {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted,
      }
    );
    return response.data as Record<string, unknown>;
  },

  /**
   * Format step data for submission.
   */
  formatStepData: (data: ConfirmationStepData): ConfirmationStepData => {
    return {
      booking_reference: data.booking_reference || '',
      completion_status: data.completion_status || 'pending',
    };
  },

  /**
   * Get default data.
   */
  getDefaultData: (): ConfirmationStepData => {
    return {
      completion_status: 'pending',
    };
  },

  // ===========================================================================
  // DISPLAY HELPERS
  // ===========================================================================

  /**
   * Format booking reference for display.
   */
  formatBookingReference: (reference: string): string => {
    if (!reference) return '';

    // If reference is long, show abbreviated version
    if (reference.length > 12) {
      return `${reference.slice(0, 4)}...${reference.slice(-4)}`;
    }

    return reference;
  },

  /**
   * Get completion status display.
   */
  getStatusDisplay: (
    status: string
  ): { label: string; color: 'success' | 'warning' | 'error' | 'info' } => {
    const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' }> = {
      pending: { label: 'Pending', color: 'warning' },
      processing: { label: 'Processing', color: 'info' },
      completed: { label: 'Completed', color: 'success' },
      confirmed: { label: 'Confirmed', color: 'success' },
      failed: { label: 'Failed', color: 'error' },
      cancelled: { label: 'Cancelled', color: 'error' },
    };

    return statusMap[status] || { label: status, color: 'info' };
  },

  /**
   * Get payment status display.
   */
  getPaymentStatusDisplay: (
    status: string
  ): { label: string; color: 'success' | 'warning' | 'error' | 'info' } => {
    const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' }> = {
      pending: { label: 'Payment Pending', color: 'warning' },
      partial: { label: 'Deposit Paid', color: 'info' },
      paid: { label: 'Fully Paid', color: 'success' },
      failed: { label: 'Payment Failed', color: 'error' },
      refunded: { label: 'Refunded', color: 'info' },
    };

    return statusMap[status] || { label: status, color: 'info' };
  },

  /**
   * Generate calendar event data.
   */
  generateCalendarEvent: (details: BookingDetails): {
    title: string;
    description: string;
    startDate: Date;
    location: string;
  } => {
    return {
      title: details.event_name,
      description: `Booking Reference: ${details.booking_reference}\nTotal Amount: ${details.total_amount}`,
      startDate: new Date(details.event_date),
      location: details.venue_name,
    };
  },

  /**
   * Get next steps based on completion status.
   */
  getNextSteps: (
    completionResult: BookingCompletionResult
  ): Array<{ title: string; description: string; action?: string }> => {
    const steps: Array<{ title: string; description: string; action?: string }> = [];

    // Always add confirmation email step
    steps.push({
      title: 'Check Your Email',
      description: 'A confirmation email has been sent with your booking details.',
    });

    // Add calendar step
    steps.push({
      title: 'Add to Calendar',
      description: 'Add this event to your calendar so you dont forget.',
      action: 'add_to_calendar',
    });

    // Payment-specific steps
    if (completionResult.payment_status === 'pending') {
      steps.push({
        title: 'Complete Payment',
        description: 'Your booking is reserved. Please complete payment to confirm.',
        action: 'complete_payment',
      });
    } else if (completionResult.payment_status === 'partial') {
      steps.push({
        title: 'Balance Due',
        description: `Remaining balance of ${completionResult.balance_due} is due before your event.`,
      });
    }

    // Contract step if applicable
    if (completionResult.contract_required) {
      steps.push({
        title: 'Sign Contract',
        description: 'Please review and sign the event contract.',
        action: 'sign_contract',
      });
    }

    return steps;
  },

  /**
   * Check if booking is fully confirmed.
   */
  isFullyConfirmed: (completionResult: BookingCompletionResult): boolean => {
    return (
      completionResult.status === 'completed' &&
      (completionResult.payment_status === 'paid' || completionResult.payment_type === 'quote')
    );
  },
};

export default ConfirmationAPI;
