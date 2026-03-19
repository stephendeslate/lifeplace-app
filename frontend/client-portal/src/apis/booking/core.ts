// frontend/client-portal/src/apis/booking/core.ts

import api from '../../utils/api';
import { getServerNow } from '../../utils/serverClock';
import type {
  EventType,
  BookingFlow,
  BookingSessionCreate,
  BookingSessionStartResponse,
  BookingSessionGetResponse,
  BookingSessionUpdateResponse,
  BookingCompletionResult,
  StepValidationResult,
  PaymentGatewayResponse,
} from '../../types/booking';
import type { PricingCalculation } from '../../types/booking/stepData.types';
import { BookingSessionStorage } from './session-storage';
import { BookingFormatters } from './booking-formatters';

/**
 * Core booking API functions for managing booking flows and sessions
 */
export class BookingCoreApi {
  /**
   * Get all available event types
   */
  static async getEventTypes(): Promise<EventType[]> {
    const response = await api.get<EventType[]>('/events/event-types/');
    return response.data;
  }

  /**
   * Get available booking flows, optionally filtered by event type
   */
  static async getAvailableFlows(eventTypeId?: number): Promise<BookingFlow[]> {
    const params = eventTypeId ? { event_type: eventTypeId } : {};
    const response = await api.get<BookingFlow[]>('/bookingflow/public/flows/', { params });
    return response.data;
  }

  /**
   * Get a specific booking flow by ID
   */
  static async getFlowById(flowId: number): Promise<BookingFlow> {
    const response = await api.get<BookingFlow>(`/bookingflow/public/flows/${flowId}/`);
    return response.data;
  }

  /**
   * Start a new booking session for a flow
   */
  static async startSession(
    flowId: number,
    sessionData?: Partial<BookingSessionCreate>,
  ): Promise<BookingSessionStartResponse> {
    const data: BookingSessionCreate = {
      booking_flow: flowId,
      ip_address: sessionData?.ip_address,
      user_agent: sessionData?.user_agent,
      referrer_url: sessionData?.referrer_url,
    };

    const response = await api.post<BookingSessionStartResponse>(
      `/bookingflow/public/flows/${flowId}/start_session/`,
      data,
    );
    return response.data;
  }

  /**
   * Get session data by session UUID
   */
  static async getSession(sessionId: string): Promise<BookingSessionGetResponse> {
    const response = await api.get<BookingSessionGetResponse>(
      `/bookingflow/public/flows/session/${sessionId}/`,
    );
    return response.data;
  }

  /**
   * Update session data for a step
   */
  static async updateSessionData(
    sessionId: string,
    stepId: number,
    data: Record<string, unknown>,
    proceedToNext: boolean = false,
  ): Promise<BookingSessionUpdateResponse> {
    // Ensure we're sending the data in the correct format
    const payload = {
      step_id: stepId,
      step_data: data.booking_data || data, // Use booking_data if provided, otherwise use data directly
      mark_completed: proceedToNext,
    };

    // FIXED: Changed from api.put to api.patch
    const response = await api.patch<BookingSessionUpdateResponse>(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      payload,
    );

    return response.data;
  }

  /**
   * Validate step data without saving
   */
  static async validateStepData(
    sessionId: string,
    stepId: number,
    stepData: Record<string, unknown>,
  ): Promise<StepValidationResult> {
    const data = {
      step_id: stepId,
      step_data: stepData,
    };

    const response = await api.post<StepValidationResult>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      data,
    );
    return response.data;
  }

  /**
   * Validate date availability and create a temporary reservation.
   *
   * IMPORTANT: This should be called BEFORE processing payment to prevent
   * charging the customer for an unavailable date.
   *
   * The reservation is valid for 5 minutes, during which the payment
   * should be processed.
   *
   * @param sessionId - The booking session UUID
   * @returns Promise with availability status and reservation token
   *
   * @example
   * const result = await BookingCoreApi.validateAvailability(sessionId);
   * if (result.available) {
   *   // Proceed with payment, pass reservation_token to completeBooking
   *   await BookingCoreApi.completeBooking(sessionId, 'payment', result.reservation_token);
   * } else {
   *   // Show error, date is no longer available
   *   showDateUnavailableModal(result.error);
   * }
   */
  static async validateAvailability(sessionId: string): Promise<{
    available: boolean;
    reservation_token?: string;
    expires_at?: string;
    error?: string;
    blocking_event_id?: number;
    message?: string;
  }> {
    const response = await api.post<{
      available: boolean;
      reservation_token?: string;
      expires_at?: string;
      error?: string;
      blocking_event_id?: number;
      message?: string;
    }>(`/bookingflow/public/flows/session/${sessionId}/validate-availability/`);
    return response.data;
  }

  /**
   * Release a date reservation.
   *
   * This should be called if:
   * 1. Payment fails
   * 2. User cancels during payment
   * 3. Any error occurs after reservation was created
   *
   * @param sessionId - The booking session UUID
   * @param reservationToken - The reservation token to release
   * @returns Promise with success status
   */
  static async releaseReservation(
    sessionId: string,
    reservationToken: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const response = await api.post<{
      success: boolean;
      error?: string;
      message?: string;
    }>(`/bookingflow/public/flows/session/${sessionId}/release-reservation/`, {
      reservation_token: reservationToken,
    });
    return response.data;
  }

  /**
   * Complete the booking and create event
   *
   * This is the primary completion method that should be used by all frontend components.
   *
   * @param sessionId - The booking session UUID
   * @param completionType - 'payment' for immediate payment processing, 'quote' for quote generation only
   * @param reservationToken - Optional reservation token from validateAvailability
   * @returns Promise<BookingCompletionResult> - Contains event details and completion status
   *
   * @example
   * // For immediate payment with pre-validation
   * const validation = await BookingCoreApi.validateAvailability(sessionId);
   * if (validation.available) {
   *   const result = await BookingCoreApi.completeBooking(sessionId, 'payment', validation.reservation_token);
   * }
   *
   * @example
   * // For quote request (no pre-validation needed)
   * const result = await BookingCoreApi.completeBooking(sessionId, 'quote');
   */
  static async completeBooking(
    sessionId: string,
    completionType: 'payment' | 'quote' = 'payment',
    reservationToken?: string,
  ): Promise<BookingCompletionResult> {
    const payload: Record<string, unknown> = {
      completion_type: completionType,
    };
    if (reservationToken) {
      payload.reservation_token = reservationToken;
    }

    const response = await api.post<BookingCompletionResult>(
      `/bookingflow/public/flows/session/${sessionId}/complete/`,
      payload,
    );
    return response.data;
  }

  /**
   * Get available payment gateways for a flow
   */
  static async getFlowPaymentGateways(flowId: number): Promise<PaymentGatewayResponse> {
    const response = await api.get<PaymentGatewayResponse>(
      `/bookingflow/public/flows/${flowId}/payment_gateways/`,
    );
    return response.data;
  }

  /**
   * Abandon a booking session
   */
  static async abandonSession(sessionId: string, reason?: string): Promise<void> {
    const data = reason ? { reason } : {};
    await api.post(`/bookingflow/public/flows/session/${sessionId}/abandon/`, data);
  }

  // Session management helpers

  /**
   * Check if session is expired (uses server-adjusted clock)
   */
  static isSessionExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() <= getServerNow();
  }

  /**
   * Get session time remaining (uses server-adjusted clock)
   */
  static getSessionTimeRemaining(expiresAt: string): {
    hours: number;
    minutes: number;
    expired: boolean;
  } {
    const expiryTime = new Date(expiresAt).getTime();
    const currentTime = getServerNow();
    const diffMs = expiryTime - currentTime;

    if (diffMs <= 0) {
      return { hours: 0, minutes: 0, expired: true };
    }

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;

    return { hours, minutes, expired: false };
  }

  static async goToStep(sessionId: string, stepId: number): Promise<Record<string, unknown>> {
    const response = await api.patch(`/bookingflow/public/flows/session/${sessionId}/go-to-step/`, {
      step_id: stepId,
    });
    return response.data as Record<string, unknown>;
  }

  /**
   * Calculate pricing for current session state
   */
  static async calculatePricing(
    sessionId: string,
    discountCode?: string,
    venueAdditionalHours?: Record<string, number>,
  ): Promise<PricingCalculation> {
    const data: Record<string, unknown> = {};
    if (discountCode) {
      data.discount_code = discountCode;
    }
    // Pass venue_additional_hours directly to avoid race condition with debounced session updates
    if (venueAdditionalHours && Object.keys(venueAdditionalHours).length > 0) {
      data.venue_additional_hours = venueAdditionalHours;
    }

    const response = await api.post<PricingCalculation>(
      `/bookingflow/public/flows/session/${sessionId}/calculate-pricing/`,
      data,
    );

    return response.data;
  }

  // Delegate to extracted modules for backwards compatibility

  static saveSessionToLocal = BookingSessionStorage.saveSessionToLocal;
  static loadSessionFromLocal = BookingSessionStorage.loadSessionFromLocal;
  static clearSessionFromLocal = BookingSessionStorage.clearSessionFromLocal;
  static cleanupExpiredSessions = BookingSessionStorage.cleanupExpiredSessions;
  static clearAllSessionsFromLocal = BookingSessionStorage.clearAllSessionsFromLocal;

  static formatStepData = BookingFormatters.formatStepData;
  static handleApiError = BookingFormatters.handleApiError;
}

export default BookingCoreApi;
