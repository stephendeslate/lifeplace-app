/**
 * Core Booking API
 *
 * Session management, flow operations, and booking completion.
 * Adapted from: frontend/client-portal/src/apis/booking/core.api.ts
 */

import api from '@/utils/api';
import type {
  EventType,
  BookingFlow,
  BookingFlowStep,
  BookingSessionCreate,
  BookingSessionStartResponse,
  BookingSessionGetResponse,
  BookingSessionUpdateResponse,
  BookingCompletionResult,
  StepValidationResult,
  PaymentGatewayResponse,
  PricingCalculation,
} from '@/types/booking';

// =============================================================================
// BOOKING CORE API
// =============================================================================

export const BookingCoreAPI = {
  // ===========================================================================
  // EVENT TYPES & FLOWS
  // ===========================================================================

  /**
   * Get all available event types.
   *
   * GET /events/event-types/
   */
  getEventTypes: async (): Promise<EventType[]> => {
    const response = await api.get<EventType[]>('/events/event-types/');
    return response.data;
  },

  /**
   * Get available booking flows, optionally filtered by event type.
   *
   * GET /bookingflow/public/flows/
   */
  getAvailableFlows: async (eventTypeId?: number): Promise<BookingFlow[]> => {
    const params = eventTypeId ? { event_type: eventTypeId } : {};
    const response = await api.get<BookingFlow[]>('/bookingflow/public/flows/', { params });
    return response.data;
  },

  /**
   * Get a specific booking flow by ID.
   *
   * GET /bookingflow/public/flows/:flowId/
   */
  getFlowById: async (flowId: number): Promise<BookingFlow> => {
    const response = await api.get<BookingFlow>(`/bookingflow/public/flows/${flowId}/`);
    return response.data;
  },

  /**
   * Get flow steps configuration.
   *
   * Returns ordered list of steps with their configurations.
   */
  getFlowSteps: async (flowId: number): Promise<BookingFlowStep[]> => {
    const flow = await BookingCoreAPI.getFlowById(flowId);
    return flow.steps || [];
  },

  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================

  /**
   * Start a new booking session for a flow.
   *
   * POST /bookingflow/public/flows/:flowId/start_session/
   */
  startSession: async (
    flowId: number,
    sessionData?: Partial<BookingSessionCreate>
  ): Promise<BookingSessionStartResponse> => {
    const data: BookingSessionCreate = {
      booking_flow: flowId,
      ip_address: sessionData?.ip_address,
      user_agent: sessionData?.user_agent,
      referrer_url: sessionData?.referrer_url,
    };

    const response = await api.post<BookingSessionStartResponse>(
      `/bookingflow/public/flows/${flowId}/start_session/`,
      data
    );
    return response.data;
  },

  /**
   * Get session data by session UUID.
   *
   * GET /bookingflow/public/flows/session/:sessionId/
   */
  getSession: async (sessionId: string): Promise<BookingSessionGetResponse> => {
    const response = await api.get<BookingSessionGetResponse>(
      `/bookingflow/public/flows/session/${sessionId}/`
    );
    return response.data;
  },

  /**
   * Update session data for a step.
   *
   * PATCH /bookingflow/public/flows/session/:sessionId/update/
   */
  updateSessionData: async (
    sessionId: string,
    stepId: number,
    data: Record<string, unknown>,
    markCompleted: boolean = false
  ): Promise<BookingSessionUpdateResponse> => {
    const payload = {
      step_id: stepId,
      step_data: data.booking_data || data,
      mark_completed: markCompleted,
    };

    const response = await api.patch<BookingSessionUpdateResponse>(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      payload
    );

    return response.data;
  },

  /**
   * Navigate to a specific step.
   *
   * PATCH /bookingflow/public/flows/session/:sessionId/go-to-step/
   */
  goToStep: async (sessionId: string, stepId: number): Promise<Record<string, unknown>> => {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/go-to-step/`,
      { step_id: stepId }
    );
    return response.data as Record<string, unknown>;
  },

  /**
   * Validate step data without saving.
   *
   * POST /bookingflow/public/flows/session/:sessionId/validate/
   */
  validateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: Record<string, unknown>
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
   * Abandon a booking session.
   *
   * POST /bookingflow/public/flows/session/:sessionId/abandon/
   */
  abandonSession: async (sessionId: string, reason?: string): Promise<void> => {
    const data = reason ? { reason } : {};
    await api.post(`/bookingflow/public/flows/session/${sessionId}/abandon/`, data);
  },

  // ===========================================================================
  // DATE AVAILABILITY (Race Condition Prevention)
  // ===========================================================================

  /**
   * Validate date availability and create a temporary reservation.
   *
   * IMPORTANT: This should be called BEFORE processing payment to prevent
   * charging the customer for an unavailable date.
   *
   * The reservation is valid for 5 minutes, during which the payment
   * should be processed.
   *
   * POST /bookingflow/public/flows/session/:sessionId/validate-availability/
   *
   * @param sessionId - The booking session UUID
   * @returns Promise with availability status and reservation token
   *
   * @example
   * const result = await BookingCoreAPI.validateAvailability(sessionId);
   * if (result.available) {
   *   // Proceed with payment, pass reservation_token to completeBooking
   *   await BookingCoreAPI.completeBooking(sessionId, 'payment', result.reservation_token);
   * } else {
   *   // Show error, date is no longer available
   *   showDateUnavailableModal(result.error);
   * }
   */
  validateAvailability: async (
    sessionId: string
  ): Promise<{
    available: boolean;
    reservation_token?: string;
    expires_at?: string;
    error?: string;
    blocking_event_id?: number;
    message?: string;
  }> => {
    const response = await api.post<{
      available: boolean;
      reservation_token?: string;
      expires_at?: string;
      error?: string;
      blocking_event_id?: number;
      message?: string;
    }>(`/bookingflow/public/flows/session/${sessionId}/validate-availability/`);
    return response.data;
  },

  /**
   * Release a date reservation.
   *
   * This should be called if:
   * 1. Payment fails
   * 2. User cancels during payment
   * 3. Any error occurs after reservation was created
   *
   * POST /bookingflow/public/flows/session/:sessionId/release-reservation/
   *
   * @param sessionId - The booking session UUID
   * @param reservationToken - The reservation token to release
   * @returns Promise with success status
   */
  releaseReservation: async (
    sessionId: string,
    reservationToken: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    const response = await api.post<{
      success: boolean;
      error?: string;
      message?: string;
    }>(`/bookingflow/public/flows/session/${sessionId}/release-reservation/`, {
      reservation_token: reservationToken,
    });
    return response.data;
  },

  // ===========================================================================
  // PRICING & COMPLETION
  // ===========================================================================

  /**
   * Calculate pricing for current session state.
   *
   * POST /bookingflow/public/flows/session/:sessionId/calculate-pricing/
   */
  calculatePricing: async (
    sessionId: string,
    discountCode?: string,
    venueAdditionalHours?: Record<string, number>
  ): Promise<PricingCalculation> => {
    const data: Record<string, unknown> = {};

    if (discountCode) {
      data.discount_code = discountCode;
    }

    if (venueAdditionalHours && Object.keys(venueAdditionalHours).length > 0) {
      data.venue_additional_hours = venueAdditionalHours;
    }

    const response = await api.post<PricingCalculation>(
      `/bookingflow/public/flows/session/${sessionId}/calculate-pricing/`,
      data
    );

    return response.data;
  },

  /**
   * Complete the booking and create event.
   *
   * POST /bookingflow/public/flows/session/:sessionId/complete/
   *
   * @param sessionId - The booking session UUID
   * @param completionType - 'payment' for immediate payment, 'quote' for quote request
   * @param reservationToken - Optional reservation token from validateAvailability
   * @returns Promise<BookingCompletionResult> - Contains event details and completion status
   *
   * @example
   * // For immediate payment with pre-validation
   * const validation = await BookingCoreAPI.validateAvailability(sessionId);
   * if (validation.available) {
   *   const result = await BookingCoreAPI.completeBooking(sessionId, 'payment', validation.reservation_token);
   * }
   *
   * @example
   * // For quote request (no pre-validation needed)
   * const result = await BookingCoreAPI.completeBooking(sessionId, 'quote');
   */
  completeBooking: async (
    sessionId: string,
    completionType: 'payment' | 'quote' = 'payment',
    reservationToken?: string
  ): Promise<BookingCompletionResult> => {
    const payload: Record<string, unknown> = {
      completion_type: completionType,
    };
    if (reservationToken) {
      payload.reservation_token = reservationToken;
    }

    const response = await api.post<BookingCompletionResult>(
      `/bookingflow/public/flows/session/${sessionId}/complete/`,
      payload
    );
    return response.data;
  },

  // ===========================================================================
  // PAYMENT GATEWAYS
  // ===========================================================================

  /**
   * Get available payment gateways for a flow.
   *
   * GET /bookingflow/public/flows/:flowId/payment_gateways/
   */
  getFlowPaymentGateways: async (flowId: number): Promise<PaymentGatewayResponse> => {
    const response = await api.get<PaymentGatewayResponse>(
      `/bookingflow/public/flows/${flowId}/payment_gateways/`
    );
    return response.data;
  },

  // ===========================================================================
  // DATA FORMATTING HELPERS
  // ===========================================================================

  /**
   * Format step data according to backend expectations.
   */
  formatStepData: (stepType: string, data: Record<string, unknown>): Record<string, unknown> => {
    const formatted = { ...data };

    switch (stepType) {
      case 'introduction':
        return {
          acknowledged: Boolean(formatted.acknowledged),
        };

      case 'date_time':
        return {
          start_date: formatted.start_date || '',
          start_time: formatted.start_time || '',
          end_date: formatted.end_date || '',
          end_time: formatted.end_time || '',
          duration: Number(formatted.duration) || 0,
          venue_preference: formatted.venue_preference || '',
          resource_requirements: Array.isArray(formatted.resource_requirements)
            ? formatted.resource_requirements
            : [],
        };

      case 'venue_selection':
        return {
          selected_venue_ids: Array.isArray(formatted.selected_venue_ids)
            ? formatted.selected_venue_ids
            : [],
        };

      case 'questionnaire':
        return {
          responses: formatted.responses || {},
          uploaded_files: formatted.uploaded_files || {},
        };

      case 'package_selection':
        return {
          selected_packages: Array.isArray(formatted.selected_packages)
            ? formatted.selected_packages
            : [],
          venue_additional_hours: formatted.venue_additional_hours || {},
          use_custom_bundle: Boolean(formatted.use_custom_bundle),
        };

      case 'addon_selection':
        return {
          selected_addons: Array.isArray(formatted.selected_addons)
            ? formatted.selected_addons
            : [],
        };

      case 'pricing_summary':
        return {
          subtotal: String(formatted.subtotal || '0.00'),
          tax: String(formatted.tax || '0.00'),
          discount: String(formatted.discount || '0.00'),
          total: String(formatted.total || '0.00'),
          applied_discount: formatted.applied_discount || null,
          terms_accepted: Boolean(formatted.terms_accepted),
          special_requests: formatted.special_requests || '',
        };

      case 'contact_info':
        return {
          full_name: formatted.full_name || '',
          email: formatted.email || '',
          phone: formatted.phone || '',
          address: formatted.address || '',
          city: formatted.city || '',
          postal_code: formatted.postal_code || '',
          country: formatted.country || '',
          company: formatted.company || '',
          create_account: Boolean(formatted.create_account),
          password: formatted.password || '',
          custom_fields: formatted.custom_fields || {},
        };

      case 'payment_info':
        return {
          payment_method: formatted.payment_method || '',
          payment_type: formatted.payment_type || 'FULL',
          payment_gateway_id: formatted.payment_gateway_id || null,
          payment_gateway_code: formatted.payment_gateway_code || null,
          billing_address: formatted.billing_address || null,
          save_payment_method: Boolean(formatted.save_payment_method),
        };

      case 'confirmation':
        return {
          booking_reference: formatted.booking_reference || '',
          completion_status: formatted.completion_status || 'pending',
        };

      default:
        return formatted;
    }
  },

  // ===========================================================================
  // SESSION HELPERS
  // ===========================================================================

  /**
   * Check if session is expired.
   */
  isSessionExpired: (expiresAt: string): boolean => {
    return new Date(expiresAt) <= new Date();
  },

  /**
   * Get session time remaining.
   */
  getSessionTimeRemaining: (
    expiresAt: string
  ): {
    hours: number;
    minutes: number;
    expired: boolean;
  } => {
    const expiryTime = new Date(expiresAt).getTime();
    const currentTime = new Date().getTime();
    const diffMs = expiryTime - currentTime;

    if (diffMs <= 0) {
      return { hours: 0, minutes: 0, expired: true };
    }

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;

    return { hours, minutes, expired: false };
  },
};

export default BookingCoreAPI;
