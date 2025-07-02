// frontend/client-portal/src/apis/bookingflow.api.ts

import api from '../utils/api';
import type { 
  PublicBookingFlow, 
  BookingFlowPaymentGateways,
  EventType,
  AvailabilityCheckRequest,
  AvailabilityCheckResponse,
  PaymentOptionsResponse,
  ProductCategory,
  ProductOption
} from '../types/booking.types';
import type { StartSessionResponse } from '../types/booking-session.types';

class BookingFlowAPI {
  private readonly baseUrl = '/bookingflow';

  /**
   * Get all active booking flows (public endpoint)
   * Calls PublicBookingFlowViewSet.list()
   */
  async getActiveFlows() {
    const response = await api.get<PublicBookingFlow[]>(`${this.baseUrl}/public/flows/`);
    return response.data;
  }

  /**
   * Get a specific booking flow by ID (public endpoint)
   * Calls PublicBookingFlowViewSet.retrieve()
   */
  async getFlow(flowId: number) {
    const response = await api.get<PublicBookingFlow>(`${this.baseUrl}/public/flows/${flowId}/`);
    return response.data;
  }

  /**
   * Get available payment gateways for a booking flow (public endpoint)
   * Calls PublicBookingFlowViewSet.payment_gateways()
   */
  async getFlowPaymentGateways(flowId: number) {
    const response = await api.get<BookingFlowPaymentGateways>(
      `${this.baseUrl}/public/flows/${flowId}/payment_gateways/`
    );
    return response.data;
  }

  /**
   * Start a new booking session for a specific flow (public endpoint)
   * Calls PublicBookingFlowViewSet.start_session()
   * Returns session_id UUID for further operations
   */
  async startSession(flowId: number) {
    const response = await api.post<StartSessionResponse>(
      `${this.baseUrl}/public/flows/${flowId}/start_session/`,
      {},
      {
        headers: {
          'X-Forwarded-For': this.getClientIP(),
          'User-Agent': navigator.userAgent,
          'Referer': window.location.href,
        }
      }
    );
    return response.data;
  }

  /**
   * Get available event types for flow selection
   * NOTE: This should call /events/event-types/ endpoint 
   * (assuming EventType endpoint exists in events domain)
   */
  async getEventTypes() {
    const response = await api.get<EventType[]>('/events/event-types/');
    return response.data;
  }

  /**
   * Get booking flows by event type
   * Uses query parameter on public flows endpoint
   */
  async getFlowsByEventType(eventTypeId: number) {
    const response = await api.get<PublicBookingFlow[]>(
      `${this.baseUrl}/public/flows/?event_type=${eventTypeId}`
    );
    return response.data;
  }

  /**
   * Check availability for date/time step
   * Uses session validation instead of separate endpoint
   * Calls updateSessionDataByUUID and checks validation_errors
   */
  async checkAvailability(sessionUUID: string, stepId: number, request: AvailabilityCheckRequest): Promise<AvailabilityCheckResponse> {
    try {
      // Import session API to avoid circular dependency
      const { bookingSessionAPI } = await import('./booking-session.api');
      
      // Update session with date/time data and check for validation errors
      const session = await bookingSessionAPI.updateSessionDataByUUID(sessionUUID, {
        step_id: stepId,
        step_data: request,
        mark_completed: false
      });

      // Check if there are availability-related validation errors
      const availabilityError = session.validation_errors?.availability;
      
      if (availabilityError) {
        return {
          available: false,
          message: Array.isArray(availabilityError) ? availabilityError[0] : availabilityError,
          conflicts: [],
          alternative_dates: [],
          alternative_times: []
        };
      }

      return {
        available: true,
        message: 'Time slot is available',
        conflicts: [],
        alternative_dates: [],
        alternative_times: []
      };
    } catch (error: any) {
      return {
        available: false,
        message: error.response?.data?.detail || 'Error checking availability',
        conflicts: [],
        alternative_dates: [],
        alternative_times: []
      };
    }
  }

  /**
   * Get payment options for a specific step
   * Calls BookingFlowStepViewSet.payment_options()
   * NOTE: This is admin endpoint but may be accessible to authenticated users
   */
  async getPaymentOptions(stepId: number) {
    const response = await api.get<PaymentOptionsResponse>(
      `${this.baseUrl}/steps/${stepId}/payment_options/`
    );
    return response.data;
  }

  /**
   * Get availability settings for a date_time step
   * Calls BookingFlowStepViewSet.availability_settings()
   * NOTE: This is admin endpoint but may be accessible to authenticated users
   */
  async getAvailabilitySettings(stepId: number) {
    const response = await api.get<{
      enable_real_time_availability: boolean;
      show_availability_status: boolean;
      auto_check_conflicts: boolean;
      check_venue_availability: boolean;
      check_resource_availability: boolean;
      check_staff_availability: boolean;
      availability_display_mode: string;
      allow_overbooking: boolean;
      overbooking_threshold: number;
      sync_with_calendar: boolean;
      calendar_source: string;
      blocked_dates: string[];
      available_days_of_week: number[];
      available_time_slots: any[];
      buffer_before_hours: number;
      buffer_after_hours: number;
    }>(`${this.baseUrl}/steps/${stepId}/availability_settings/`);
    return response.data;
  }

  /**
   * Get available questionnaires for questionnaire step
   * Calls BookingFlowStepViewSet.available_questionnaires()
   */
  async getAvailableQuestionnaires(stepId: number) {
    const response = await api.get<Array<{
      id: number;
      name: string;
      description: string;
      is_active: boolean;
    }>>(`${this.baseUrl}/steps/${stepId}/available_questionnaires/`);
    return response.data;
  }

  /**
   * Get available packages for package selection step
   * Calls BookingFlowStepViewSet.available_packages()
   */
  async getAvailablePackages(stepId: number) {
    const response = await api.get<ProductOption[]>(
      `${this.baseUrl}/steps/${stepId}/available_packages/`
    );
    return response.data;
  }

  /**
   * Get available add-ons for addon selection step
   * Calls BookingFlowStepViewSet.available_addons()
   */
  async getAvailableAddons(stepId: number) {
    const response = await api.get<ProductOption[]>(
      `${this.baseUrl}/steps/${stepId}/available_addons/`
    );
    return response.data;
  }

  /**
   * Get available product categories
   * Calls BookingFlowStepViewSet.available_categories()
   */
  async getAvailableCategories(stepId: number) {
    const response = await api.get<ProductCategory[]>(
      `${this.baseUrl}/steps/${stepId}/available_categories/`
    );
    return response.data;
  }

  /**
   * Helper method to get client IP (best effort)
   */
  private getClientIP(): string {
    // This is a best effort attempt to get client IP
    // In production, this might come from server-side headers
    return 'unknown';
  }
}
export const bookingFlowAPI = new BookingFlowAPI();