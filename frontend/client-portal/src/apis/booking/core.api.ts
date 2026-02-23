// frontend/client-portal/src/apis/booking/core.api.ts

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

  /**
   * Local storage helpers for session persistence
   */
  static saveSessionToLocal(sessionId: string, sessionData: Record<string, unknown>): void {
    try {
      const storageKey = `booking_session_${sessionId}`;
      const dataToStore = {
        ...sessionData,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to save session to local storage:', error);
    }
  }

  /**
   * Load session from local storage
   */
  static loadSessionFromLocal(sessionId: string): Record<string, unknown> | null {
    try {
      const storageKey = `booking_session_${sessionId}`;
      const storedData = localStorage.getItem(storageKey);

      if (!storedData) {
        return null;
      }

      const sessionData = JSON.parse(storedData);

      // Check if session is expired
      if (sessionData.expires_at && this.isSessionExpired(sessionData.expires_at)) {
        this.clearSessionFromLocal(sessionId);
        return null;
      }

      return sessionData;
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to load session from local storage:', error);
      return null;
    }
  }

  /**
   * Clear session from local storage
   */
  static clearSessionFromLocal(sessionId: string): void {
    try {
      const storageKey = `booking_session_${sessionId}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to clear session from local storage:', error);
    }
  }

  /**
   * Clean up expired sessions from local storage
   */
  static cleanupExpiredSessions(): void {
    try {
      const keys = Object.keys(localStorage);
      const sessionKeys = keys.filter((key) => key.startsWith('booking_session_'));

      sessionKeys.forEach((key) => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.expires_at && this.isSessionExpired(data.expires_at)) {
            localStorage.removeItem(key);
          }
        } catch {
          // Remove invalid data
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Clear ALL booking sessions from local storage
   * Used when user clicks "Start Over" to ensure a clean slate
   */
  static clearAllSessionsFromLocal(): void {
    try {
      const keys = Object.keys(localStorage);
      const sessionKeys = keys.filter((key) => key.startsWith('booking_session_'));
      sessionKeys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      if (import.meta.env.DEV)
        console.warn('Failed to clear all sessions from local storage:', error);
    }
  }

  // Data formatting helpers

  /**
   * Format step data according to backend expectations
   */
  static formatStepData(stepType: string, data: Record<string, unknown>): Record<string, unknown> {
    // Ensure required fields are present and properly formatted
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
        };

      case 'addon_selection':
        return {
          selected_addons: Array.isArray(formatted.selected_addons)
            ? formatted.selected_addons
            : [],
        };

      case 'pricing_summary':
        // ADD THIS CASE - Format pricing summary data
        return {
          subtotal: String(formatted.subtotal || '0.00'),
          tax: String(formatted.tax || '0.00'),
          discount: String(formatted.discount || '0.00'),
          total: String(formatted.total || '0.00'),
          applied_discount: formatted.applied_discount || null,
        };

      case 'contact_info':
        return {
          full_name: formatted.full_name || '',
          email: formatted.email || '',
          phone: formatted.phone || '',
          address: formatted.address || '',
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
          billing_address: formatted.billing_address || null,
          save_payment_method: Boolean(formatted.save_payment_method),
        };

      default:
        return formatted;
    }
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

  /**
   * Handle API errors and extract user-friendly message
   */
  static handleApiError(error: unknown): string {
    if (error instanceof Error) {
      // Check for Axios error structure
      const axiosError = error as {
        response?: { data?: { detail?: string; message?: string } };
      };
      if (axiosError.response?.data?.detail) {
        return axiosError.response.data.detail;
      }
      if (axiosError.response?.data?.message) {
        return axiosError.response.data.message;
      }
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}

export default BookingCoreApi;
