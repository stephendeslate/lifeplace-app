// frontend/client-portal/src/apis/booking-session.api.ts

import api from '../utils/api';
import type { 
  BookingSession,
  CreateBookingSessionRequest,
  UpdateSessionDataRequest,
  CompleteBookingResponse,
  AbandonSessionRequest
} from '../types/booking-session.types';

class BookingSessionAPI {
  private readonly baseUrl = '/bookingflow/sessions';

  /**
   * Create a new booking session
   * Calls BookingSessionViewSet.create()
   * NOTE: Most clients will use start_session from BookingFlowAPI instead
   */
  async createSession(request: CreateBookingSessionRequest) {
    const response = await api.post<BookingSession>(`${this.baseUrl}/`, request);
    return response.data;
  }

  /**
   * Get a booking session by numeric ID
   * Calls BookingSessionViewSet.retrieve()
   */
  async getSession(sessionId: number) {
    const response = await api.get<BookingSession>(`${this.baseUrl}/${sessionId}/`);
    return response.data;
  }

  /**
   * Get sessions for the current user
   * Calls BookingSessionViewSet.list() - automatically filtered by user in backend
   */
  async getUserSessions(params?: {
    booking_flow?: number;
    is_completed?: boolean;
    is_abandoned?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    
    if (params?.booking_flow) {
      searchParams.append('booking_flow', params.booking_flow.toString());
    }
    if (params?.is_completed !== undefined) {
      searchParams.append('is_completed', params.is_completed.toString());
    }
    if (params?.is_abandoned !== undefined) {
      searchParams.append('is_abandoned', params.is_abandoned.toString());
    }

    const response = await api.get<BookingSession[]>(
      `${this.baseUrl}/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    );
    return response.data;
  }

  /**
   * Get session by UUID (session_id field)
   * The backend BookingSession model uses UUID for session_id field
   * We filter user sessions by session_id since there's no direct UUID endpoint
   */
  async getSessionByUUID(sessionUUID: string) {
    const sessions = await this.getUserSessions();
    const session = sessions.find(s => s.session_id === sessionUUID);
    
    if (!session) {
      throw new Error('Session not found or access denied');
    }
    
    return session;
  }

  /**
   * Update session data for a step using numeric session ID
   * Calls BookingSessionViewSet.update_data()
   * Returns updated session with validation_errors if any
   */
  async updateSessionData(sessionId: number, request: Omit<UpdateSessionDataRequest, 'session_id'>) {
    // Get the session to extract the UUID for the request
    const session = await this.getSession(sessionId);
    
    const fullRequest: UpdateSessionDataRequest = {
      ...request,
      session_id: session.session_id, // Use the UUID from session
    };

    const response = await api.patch<BookingSession>(
      `${this.baseUrl}/${sessionId}/update_data/`,
      fullRequest
    );
    return response.data;
  }

  /**
   * Update session data using UUID (primary method for frontend)
   * This is the main method components will use
   * Includes automatic validation through backend _validate_step_data
   */
  async updateSessionDataByUUID(sessionUUID: string, request: Omit<UpdateSessionDataRequest, 'session_id'>) {
    // First get the session to get the numeric ID
    const session = await this.getSessionByUUID(sessionUUID);
    
    const fullRequest: UpdateSessionDataRequest = {
      ...request,
      session_id: sessionUUID,
    };

    const response = await api.patch<BookingSession>(
      `${this.baseUrl}/${session.id}/update_data/`,
      fullRequest
    );
    return response.data;
  }

  /**
   * Complete the booking and create event using numeric session ID
   * Calls BookingSessionViewSet.complete_booking()
   * Returns event details and updated session
   */
  async completeBooking(sessionId: number) {
    const response = await api.post<CompleteBookingResponse>(
      `${this.baseUrl}/${sessionId}/complete_booking/`
    );
    return response.data;
  }

  /**
   * Complete booking using UUID (primary method for frontend)
   * Triggers event creation and payment processing if configured
   */
  async completeBookingByUUID(sessionUUID: string) {
    const session = await this.getSessionByUUID(sessionUUID);
    return this.completeBooking(session.id);
  }

  /**
   * Abandon a booking session using numeric ID
   * Calls BookingSessionViewSet.abandon()
   */
  async abandonSession(sessionId: number, request?: AbandonSessionRequest) {
    const response = await api.post<BookingSession>(
      `${this.baseUrl}/${sessionId}/abandon/`,
      request || {}
    );
    return response.data;
  }

  /**
   * Abandon session using UUID (primary method for frontend)
   */
  async abandonSessionByUUID(sessionUUID: string, request?: AbandonSessionRequest) {
    const session = await this.getSessionByUUID(sessionUUID);
    return this.abandonSession(session.id, request);
  }

  /**
   * Validate step data without saving
   * Uses the validation that happens in BookingSessionService._validate_step_data
   * Returns validation results without marking step as completed
   */
  async validateStepData(sessionUUID: string, stepId: number, stepData: Record<string, any>) {
    try {
      // Attempt to update session data without marking complete
      const session = await this.updateSessionDataByUUID(sessionUUID, {
        step_id: stepId,
        step_data: stepData,
        mark_completed: false
      });

      // Check validation_errors field from response
      const hasErrors = Object.keys(session.validation_errors || {}).length > 0;
      
      return {
        isValid: !hasErrors,
        errors: session.validation_errors || {}
      };
    } catch (error: any) {
      // If the request failed, extract validation errors from response
      const errors = error.response?.data?.validation_errors || 
                    error.response?.data || 
                    { general: ['Validation failed'] };
      
      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Save session progress (same as updateSessionData without marking complete)
   * Used for autosave functionality
   */
  async saveProgress(sessionUUID: string, stepData: Record<string, any>) {
    const session = await this.getSessionByUUID(sessionUUID);
    
    return this.updateSessionDataByUUID(sessionUUID, {
      step_id: session.current_step || 0,
      step_data: stepData,
      mark_completed: false
    });
  }

  /**
   * Get session pricing summary
   * Uses the total_price field calculated by BookingSession.calculate_total_price()
   * Returns pricing breakdown parsed from session data
   */
  async getSessionPricing(sessionUUID: string) {
    const session = await this.getSessionByUUID(sessionUUID);
    
    return {
      total_price: session.total_price,
      breakdown: this.parsePricingFromSessionData(session.booking_data)
    };
  }

  /**
   * Helper to parse pricing breakdown from session data
   * Matches the calculation logic in BookingSession.calculate_total_price()
   */
  private parsePricingFromSessionData(bookingData: Record<string, any>) {
    const breakdown = {
      packages: [] as Array<{ name: string; quantity: number; price: string }>,
      addons: [] as Array<{ name: string; quantity: number; price: string }>,
      subtotal: '0.00',
      discounts: [] as Array<{ name: string; amount: string; type: string }>,
      total: '0.00'
    };

    let subtotal = 0;

    // Parse packages and addons from session data (matches backend logic)
    Object.values(bookingData).forEach(stepData => {
      if (typeof stepData === 'object' && stepData !== null) {
        // Add selected packages
        if ('selected_packages' in stepData && Array.isArray(stepData.selected_packages)) {
          stepData.selected_packages.forEach((pkg: any) => {
            const price = parseFloat(pkg.price || '0');
            const quantity = pkg.quantity || 1;
            breakdown.packages.push({
              name: pkg.name,
              quantity,
              price: pkg.price
            });
            subtotal += price * quantity;
          });
        }
        
        // Add selected addons
        if ('selected_addons' in stepData && Array.isArray(stepData.selected_addons)) {
          stepData.selected_addons.forEach((addon: any) => {
            const price = parseFloat(addon.price || '0');
            const quantity = addon.quantity || 1;
            breakdown.addons.push({
              name: addon.name,
              quantity,
              price: addon.price
            });
            subtotal += price * quantity;
          });
        }
        
        // Apply discounts
        if ('applied_discount' in stepData && stepData.applied_discount) {
          const discount = stepData.applied_discount;
          breakdown.discounts.push({
            name: discount.code || 'Discount',
            amount: discount.amount || '0',
            type: discount.type || 'FIXED'
          });
          subtotal -= parseFloat(discount.amount || '0');
        }
      }
    });

    breakdown.subtotal = Math.max(subtotal, 0).toFixed(2);
    breakdown.total = breakdown.subtotal;

    return breakdown;
  }
}

export const bookingSessionAPI = new BookingSessionAPI();