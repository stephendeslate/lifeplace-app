// frontend/client-portal/src/apis/bookingflow.api.ts

import api from '../utils/api';
import type {
  BookingFlow,
  BookingSession,
  BookingSessionUpdateRequest,
  PaymentGateway,
  BookingFlowStep,
  SessionStepData,
  BookingCompletionResponse,
} from '../types/bookingflow.types';

export const bookingFlowApi = {
  /**
   * Get all active booking flows (public endpoint)
   */
  getActiveFlows: async (): Promise<BookingFlow[]> => {
    const response = await api.get<BookingFlow[]>('/bookingflow/public/');
    return response.data;
  },

  /**
   * Get a specific booking flow by ID (public endpoint)
   */
  getFlow: async (flowId: number): Promise<BookingFlow> => {
    const response = await api.get<BookingFlow>(`/bookingflow/public/${flowId}/`);
    return response.data;
  },

  /**
   * Get available payment gateways for a booking flow (public endpoint)
   */
  getFlowPaymentGateways: async (flowId: number): Promise<{
    available_gateways: PaymentGateway[];
    default_gateway: number | null;
    require_immediate_payment: boolean;
  }> => {
    const response = await api.get<{
    available_gateways: PaymentGateway[];
    default_gateway: number | null;
    require_immediate_payment: boolean;
  }>(`/bookingflow/public/${flowId}/payment_gateways/`);
    return response.data;
  },

  /**
   * Start a new booking session for a flow (public endpoint)
   */
  startSession: async (flowId: number): Promise<{
    session_id: string;
    current_step: BookingFlowStep | null;
    expires_at: string;
    progress_percentage: number;
  }> => {
    const response = await api.post<{
    session_id: string;
    current_step: BookingFlowStep | null;
    expires_at: string;
    progress_percentage: number;
  }>(`/bookingflow/public/${flowId}/start_session/`);
    return response.data;
  },

  /**
   * Get booking session details
   */
  getSession: async (sessionId: string): Promise<BookingSession> => {
    const response = await api.get<BookingSession>(`/bookingflow/sessions/${sessionId}/`);
    return response.data;
  },

  /**
   * Update booking session data for a step
   */
  updateSessionData: async (
    sessionId: string,
    stepId: number,
    stepData: SessionStepData,
    markCompleted: boolean = false
  ): Promise<BookingSession> => {
    const updateData: BookingSessionUpdateRequest = {
      session_id: sessionId,
      step_id: stepId,
      step_data: stepData,
      mark_completed: markCompleted,
    };

    const response = await api.patch<BookingSession>(
      `/bookingflow/sessions/${sessionId}/update_data/`,
      updateData
    );
    return response.data;
  },

  /**
   * Complete the booking and create event
   */
  completeBooking: async (sessionId: string): Promise<BookingCompletionResponse> => {
    const response = await api.post<BookingCompletionResponse>(
      `/bookingflow/sessions/${sessionId}/complete_booking/`
    );
    return response.data;
  },

  /**
   * Abandon a booking session
   */
  abandonSession: async (sessionId: string, reason?: string): Promise<BookingSession> => {
    const response = await api.post<BookingSession>(
      `/bookingflow/sessions/${sessionId}/abandon/`,
      { reason }
    );
    return response.data;
  },

  /**
   * Get user's booking sessions
   */
  getUserSessions: async (params?: {
    booking_flow?: number;
    is_completed?: boolean;
    is_abandoned?: boolean;
  }): Promise<BookingSession[]> => {
    const searchParams = new URLSearchParams();
    if (params?.booking_flow) searchParams.append('booking_flow', params.booking_flow.toString());
    if (params?.is_completed !== undefined) searchParams.append('is_completed', params.is_completed.toString());
    if (params?.is_abandoned !== undefined) searchParams.append('is_abandoned', params.is_abandoned.toString());

    const queryString = searchParams.toString();
    const url = `/bookingflow/sessions/${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get<BookingSession[]>(url);
    return response.data;
  },

  /**
   * Validate discount code
   */
  validateDiscount: async (
    sessionId: string,
    discountCode: string
  ): Promise<{
    valid: boolean;
    discount: any | null;
    discount_amount: number;
    error?: string;
  }> => {
    const response = await api.post<{
    valid: boolean;
    discount: any | null;
    discount_amount: number;
    error?: string;
  }>(`/bookingflow/sessions/${sessionId}/validate_discount/`, {
      discount_code: discountCode,
    });
    return response.data;
  },

  /**
   * Calculate pricing for current session
   */
  calculatePricing: async (
    sessionId: string,
    updates?: SessionStepData
  ): Promise<{
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    pricing_breakdown: any[];
  }> => {
    const response = await api.post<{
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    pricing_breakdown: any[];
  }>(`/bookingflow/sessions/${sessionId}/calculate_pricing/`, {
      updates,
    });
    return response.data;
  },

  /**
   * Check availability for dates/times
   */
  checkAvailability: async (
    flowId: number,
    date: string,
    duration?: number
  ): Promise<{
    date: string;
    available: boolean;
    available_times: string[];
    blocked_times: string[];
  }> => {
    const response = await api.post<{
    date: string;
    available: boolean;
    available_times: string[];
    blocked_times: string[];
  }>(`/bookingflow/public/${flowId}/check_availability/`, {
      date,
      duration,
    });
    return response.data;
  },

  /**
   * Get available products for a step
   */
  getStepProducts: async (
    stepId: number,
    params?: {
      category?: number;
      type?: 'PACKAGE' | 'PRODUCT';
      guest_count?: number;
    }
  ): Promise<any[]> => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category.toString());
    if (params?.type) searchParams.append('type', params.type);
    if (params?.guest_count) searchParams.append('guest_count', params.guest_count.toString());

    const queryString = searchParams.toString();
    const url = `/bookingflow/steps/${stepId}/available_products/${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get<any[]>(url);
    return response.data;
  },

  /**
   * Get questionnaires for a questionnaire step
   */
  getStepQuestionnaires: async (stepId: number): Promise<any[]> => {
    const response = await api.get<any[]>(`/bookingflow/steps/${stepId}/questionnaires/`);
    return response.data;
  },

  /**
   * Save progress (auto-save functionality)
   */
  saveProgress: async (
    sessionId: string,
    stepData: SessionStepData
  ): Promise<{ saved: boolean }> => {
    const response = await api.post<{ saved: boolean }>(`/bookingflow/sessions/${sessionId}/save_progress/`, stepData);
    return response.data;
  },

  /**
   * Restore session from auto-save
   */
  restoreSession: async (sessionId: string): Promise<BookingSession> => {
    const response = await api.post<BookingSession>(`/bookingflow/sessions/${sessionId}/restore/`);
    return response.data;
  },

  /**
   * Get session navigation info (next/previous steps)
   */
  getSessionNavigation: async (sessionId: string): Promise<{
    current_step: BookingFlowStep | null;
    next_step: BookingFlowStep | null;
    previous_step: BookingFlowStep | null;
    can_navigate_back: boolean;
    can_navigate_forward: boolean;
    completed_steps: number[];
  }> => {
    const response = await api.get<{
    current_step: BookingFlowStep | null;
    next_step: BookingFlowStep | null;
    previous_step: BookingFlowStep | null;
    can_navigate_back: boolean;
    can_navigate_forward: boolean;
    completed_steps: number[];
  }>(`/bookingflow/sessions/${sessionId}/navigation/`);
    return response.data;
  },
};

export default bookingFlowApi;