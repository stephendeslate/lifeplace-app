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
   * UPDATED: Handle direct array response (no pagination)
   */
  async getActiveFlows() {
    const response = await api.get<PublicBookingFlow[]>(`${this.baseUrl}/public/flows/`);
    
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (
      response.data &&
      typeof response.data === 'object' &&
      'results' in response.data &&
      Array.isArray((response.data as { results?: unknown }).results)
    ) {
      // Fallback for paginated response
      return (response.data as { results: PublicBookingFlow[] }).results;
    } else {
      return [];
    }
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
   * FIXED: Use public endpoint
   */
  async startSession(flowId: number): Promise<StartSessionResponse> {
    console.log('API: Starting session for flow', flowId);
    
    const response = await api.post<any>(
      `${this.baseUrl}/public/flows/${flowId}/start_session/`,
      {} // Empty body for POST request
    );
    
    console.log('API: Raw response from start_session:', response.data);
    
    // Handle different possible response structures
    const data = response.data;
    
    // The backend returns a structured response
    let sessionId: string;
    let expiresAt: string;
    let currentStep: number | null = null;

    if (data && typeof data === 'object') {
      // Response is an object
      sessionId = data.session_id;
      expiresAt = data.expires_at;
      currentStep = data.current_step?.id || null;
      
      if (!sessionId) {
        console.error('API: No session ID found in response:', data);
        throw new Error('Invalid session response: missing session_id');
      }
    } else {
      console.error('API: Invalid response structure:', data);
      throw new Error('Invalid session response structure');
    }
    
    const result: StartSessionResponse = {
      session_id: sessionId,
      expires_at: expiresAt,
      current_step: currentStep,
      message: data.message || 'Session started successfully'
    };
    
    console.log('API: Normalized response:', result);
    return result;
  }

  /**
   * Get session data by UUID (public endpoint)
   * Calls PublicBookingFlowViewSet.get_session()
   */
  async getSessionByUUID(sessionUUID: string) {
    const response = await api.get<any>(
      `${this.baseUrl}/public/flows/session/${sessionUUID}/`
    );
    return response.data;
  }

  /**
   * Update session data (public endpoint)
   * Calls PublicBookingFlowViewSet.update_session_data()
   */
  async updateSessionDataByUUID(
    sessionUUID: string, 
    stepId: number, 
    stepData: Record<string, any>, 
    markCompleted: boolean = false
  ) {
    const response = await api.patch<any>(
      `${this.baseUrl}/public/flows/session/${sessionUUID}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted,
      }
    );
    return response.data;
  }

  /**
   * Validate step data (public endpoint)
   * Calls PublicBookingFlowViewSet.validate_step_data()
   */
  async validateStepData(
    sessionUUID: string, 
    stepId: number, 
    stepData: Record<string, any>
  ) {
    const response = await api.post<{ isValid: boolean; errors: Record<string, any> }>(
      `${this.baseUrl}/public/flows/session/${sessionUUID}/validate/`,
      {
        step_id: stepId,
        step_data: stepData,
      }
    );
    return response.data;
  }

  /**
   * Complete booking (public endpoint)
   * Calls PublicBookingFlowViewSet.complete_booking_public()
   */
  async completeBookingByUUID(sessionUUID: string) {
    const response = await api.post<any>(
      `${this.baseUrl}/public/flows/session/${sessionUUID}/complete/`,
      {}
    );
    return response.data;
  }

  /**
   * Get available event types for flow selection
   * NOTE: This calls /events/event-types/ endpoint 
   * UPDATED: Handle direct array response (no pagination)
   */
  async getEventTypes() {
    const response = await api.get<EventType[]>('/events/event-types/');
    
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (
      response.data &&
      typeof response.data === 'object' &&
      'results' in response.data &&
      Array.isArray((response.data as { results?: unknown }).results)
    ) {
      // Fallback for paginated response
      return (response.data as { results: EventType[] }).results;
    } else {
      return [];
    }
  }

  /**
   * Get booking flows by event type
   * Uses query parameter on public flows endpoint
   * UPDATED: Handle direct array response (no pagination)
   */
  async getFlowsByEventType(eventTypeId: number) {
    const response = await api.get<PublicBookingFlow[]>(
      `${this.baseUrl}/public/flows/?event_type=${eventTypeId}`
    );
    
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (
      response.data &&
      typeof response.data === 'object' &&
      'results' in response.data
    ) {
      // Fallback for paginated response
      return (response.data as { results: PublicBookingFlow[] }).results;
    } else {
      return [];
    }
  }

  /**
   * Check availability for date/time step
   * Uses session validation instead of separate endpoint
   * Calls validateStepData and checks validation_errors
   */
  async checkAvailability(sessionUUID: string, stepId: number, request: AvailabilityCheckRequest): Promise<AvailabilityCheckResponse> {
    try {
      // Use the public validate endpoint
      const result = await this.validateStepData(sessionUUID, stepId, request);

      // Check if there are availability-related validation errors
      const availabilityError = result.errors?.availability;
      
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
}

export const bookingFlowAPI = new BookingFlowAPI();