// frontend/admin-crm/src/apis/bookingflows.api.ts

import api from '../utils/api';
import type {
  BookingFlow,
  BookingFlowDetail,
  BookingFlowStep,
  BookingSession,
  BookingFlowAnalytics,
  CreateBookingFlowData,
  UpdateBookingFlowData,
  CreateBookingFlowStepData,
  UpdateBookingFlowStepData,
  CreateBookingSessionData,
  UpdateBookingSessionData,
  BookingFlowFilters,
  BookingFlowStepFilters,
  BookingSessionFilters,
  BookingFlowAnalyticsFilters,
  ReorderStepsData,
  DuplicateFlowData,
  AssignQuestionnairesData,
  ConfigurePackagesData,
  ConfigureAddonsData,
  StepPreviewData,
  StepConfiguration,
} from '../types/bookingflows.types';

export const bookingFlowsApi = {
  // Booking Flows CRUD
  getBookingFlows: async (filters?: BookingFlowFilters): Promise<BookingFlow[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_type) params.append('event_type', filters.event_type.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.has_active_sessions !== undefined) params.append('has_active_sessions', filters.has_active_sessions.toString());
    
    const response = await api.get(`/bookingflow/flows/?${params.toString()}`);
    
    // Handle paginated response - extract results array
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results as BookingFlow[];
    }
    
    // Fallback for direct array response
    return Array.isArray(response.data) ? response.data : [];
  },

  getBookingFlow: async (id: number): Promise<BookingFlowDetail> => {
    const response = await api.get<BookingFlowDetail>(`/bookingflow/flows/${id}/`);
    return response.data;
  },

  createBookingFlow: async (data: CreateBookingFlowData): Promise<BookingFlow> => {
    const response = await api.post<BookingFlow>('/bookingflow/flows/', data);
    return response.data;
  },

  updateBookingFlow: async (id: number, data: UpdateBookingFlowData): Promise<BookingFlow> => {
    const response = await api.patch<BookingFlow>(`/bookingflow/flows/${id}/`, data);
    return response.data;
  },

  deleteBookingFlow: async (id: number): Promise<void> => {
    await api.delete(`/bookingflow/flows/${id}/`);
  },

  duplicateBookingFlow: async (id: number, data: DuplicateFlowData): Promise<BookingFlow> => {
    const response = await api.post<BookingFlow>(`/bookingflow/flows/${id}/duplicate/`, data);
    return response.data;
  },

  getActiveBookingFlows: async (): Promise<BookingFlow[]> => {
    const response = await api.get('/bookingflow/flows/active/');
    return Array.isArray(response.data) ? response.data : [];
  },

  // Flow Steps Management
  getFlowSteps: async (flowId: number): Promise<BookingFlowStep[]> => {
    const response = await api.get<BookingFlowStep[]>(`/bookingflow/flows/${flowId}/steps/`);
    return response.data;
  },

  getBookingFlowSteps: async (filters?: BookingFlowStepFilters): Promise<BookingFlowStep[]> => {
    const params = new URLSearchParams();
    if (filters?.flow_id) params.append('flow_id', filters.flow_id.toString());
    if (filters?.step_type) params.append('step_type', filters.step_type);
    
    const response = await api.get(`/bookingflow/steps/?${params.toString()}`);
    
    // Handle paginated response
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results as BookingFlowStep[];
    }
    
    return Array.isArray(response.data) ? response.data : [];
  },

  getBookingFlowStep: async (id: number): Promise<BookingFlowStep> => {
    const response = await api.get<BookingFlowStep>(`/bookingflow/steps/${id}/`);
    return response.data;
  },

  createBookingFlowStep: async (data: CreateBookingFlowStepData): Promise<BookingFlowStep> => {
    const response = await api.post<BookingFlowStep>('/bookingflow/steps/', data);
    return response.data;
  },

  updateBookingFlowStep: async (id: number, data: UpdateBookingFlowStepData): Promise<BookingFlowStep> => {
    const response = await api.patch<BookingFlowStep>(`/bookingflow/steps/${id}/`, data);
    return response.data;
  },

  deleteBookingFlowStep: async (id: number): Promise<void> => {
    await api.delete(`/bookingflow/steps/${id}/`);
  },

  reorderSteps: async (data: ReorderStepsData): Promise<BookingFlowStep[]> => {
    const response = await api.post<BookingFlowStep[]>('/bookingflow/steps/reorder/', data);
    return response.data;
  },

  // Step Configuration Management
  getStepConfiguration: async (stepId: number): Promise<StepConfiguration | null> => {
    const response = await api.get<StepConfiguration | null>(`/bookingflow/steps/${stepId}/configuration/`);
    return response.data;
  },

  updateStepConfiguration: async (stepId: number, data: Record<string, any>): Promise<StepConfiguration> => {
    const response = await api.patch<StepConfiguration>(`/bookingflow/steps/${stepId}/update_configuration/`, data);
    return response.data;
  },

  previewStepConfiguration: async (stepId: number): Promise<StepPreviewData> => {
    const response = await api.get<StepPreviewData>(`/bookingflow/steps/${stepId}/preview_configuration/`);
    return response.data;
  },

  duplicateStepConfiguration: async (stepId: number, sourceStepId: number): Promise<StepConfiguration> => {
    const response = await api.post<StepConfiguration>(`/bookingflow/steps/${stepId}/duplicate_configuration/`, {
      source_step_id: sourceStepId
    });
    return response.data;
  },

  // Questionnaire Step Configuration
  getAvailableQuestionnaires: async (stepId: number): Promise<any[]> => {
    const response = await api.get<any[]>(`/bookingflow/steps/${stepId}/available_questionnaires/`);
    return response.data;
  },

  assignQuestionnaires: async (stepId: number, data: AssignQuestionnairesData): Promise<StepConfiguration> => {
    const response = await api.post<StepConfiguration>(`/bookingflow/steps/${stepId}/assign_questionnaires/`, data);
    return response.data;
  },

  // Package Selection Step Configuration
  getAvailablePackages: async (stepId: number): Promise<any[]> => {
    const response = await api.get<any[]>(`/bookingflow/steps/${stepId}/available_packages/`);
    return response.data;
  },

  configurePackages: async (stepId: number, data: ConfigurePackagesData): Promise<StepConfiguration> => {
    const response = await api.post<StepConfiguration>(`/bookingflow/steps/${stepId}/configure_packages/`, data);
    return response.data;
  },

  // Addon Selection Step Configuration
  getAvailableAddons: async (stepId: number): Promise<any[]> => {
    const response = await api.get<any[]>(`/bookingflow/steps/${stepId}/available_addons/`);
    return response.data;
  },

  configureAddons: async (stepId: number, data: ConfigureAddonsData): Promise<StepConfiguration> => {
    const response = await api.post<StepConfiguration>(`/bookingflow/steps/${stepId}/configure_addons/`, data);
    return response.data;
  },

  // Product Categories (for step configuration)
  getAvailableCategories: async (stepId: number): Promise<any[]> => {
    const response = await api.get<any[]>(`/bookingflow/steps/${stepId}/available_categories/`);
    return response.data;
  },

  // Booking Sessions Management
  getBookingSessions: async (filters?: BookingSessionFilters): Promise<BookingSession[]> => {
    const params = new URLSearchParams();
    if (filters?.booking_flow) params.append('booking_flow', filters.booking_flow.toString());
    if (filters?.is_completed !== undefined) params.append('is_completed', filters.is_completed.toString());
    if (filters?.is_abandoned !== undefined) params.append('is_abandoned', filters.is_abandoned.toString());
    
    const response = await api.get(`/bookingflow/sessions/?${params.toString()}`);
    
    // Handle paginated response
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results as BookingSession[];
    }
    
    return Array.isArray(response.data) ? response.data : [];
  },

  getBookingSession: async (id: number): Promise<BookingSession> => {
    const response = await api.get<BookingSession>(`/bookingflow/sessions/${id}/`);
    return response.data;
  },

  createBookingSession: async (data: CreateBookingSessionData): Promise<BookingSession> => {
    const response = await api.post<BookingSession>('/bookingflow/sessions/', data);
    return response.data;
  },

  updateBookingSessionData: async (id: number, data: UpdateBookingSessionData): Promise<BookingSession> => {
    const response = await api.patch<BookingSession>(`/bookingflow/sessions/${id}/update_data/`, data);
    return response.data;
  },

  completeBooking: async (id: number): Promise<{ event: any; session: BookingSession }> => {
    const response = await api.post<{ event: any; session: BookingSession }>(`/bookingflow/sessions/${id}/complete_booking/`);
    return response.data;
  },

  abandonSession: async (id: number, reason?: string): Promise<BookingSession> => {
    const response = await api.post<BookingSession>(`/bookingflow/sessions/${id}/abandon/`, { reason });
    return response.data;
  },

  // Public Booking Flow Endpoints (for client portal)
  getPublicBookingFlows: async (): Promise<BookingFlow[]> => {
    const response = await api.get('/bookingflow/public/flows/');
    return Array.isArray(response.data) ? response.data : [];
  },

  startPublicSession: async (flowId: number): Promise<{
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
  }>(`/bookingflow/public/flows/${flowId}/start_session/`);
    return response.data;
  },

  // Analytics
  getFlowAnalytics: async (flowId: number, filters?: BookingFlowAnalyticsFilters): Promise<BookingFlowAnalytics[]> => {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    const response = await api.get(`/bookingflow/flows/${flowId}/analytics/?${params.toString()}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  getAllAnalytics: async (filters?: BookingFlowAnalyticsFilters): Promise<BookingFlowAnalytics[]> => {
    const params = new URLSearchParams();
    if (filters?.flow_id) params.append('flow_id', filters.flow_id.toString());
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    const response = await api.get(`/bookingflow/analytics/?${params.toString()}`);
    
    // Handle paginated response
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results as BookingFlowAnalytics[];
    }
    
    return Array.isArray(response.data) ? response.data : [];
  },

  updateDailyAnalytics: async (flowId: number, date?: string): Promise<BookingFlowAnalytics> => {
    const response = await api.post<BookingFlowAnalytics>('/bookingflow/analytics/update_daily/', {
      flow_id: flowId,
      date
    });
    return response.data;
  },
};