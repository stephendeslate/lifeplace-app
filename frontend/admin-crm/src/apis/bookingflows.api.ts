// frontend/admin-crm/src/apis/bookingflows.api.ts

import api from "../utils/api";
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
  BookingSessionFilters,
  BookingFlowAnalyticsFilters,
  ReorderStepsData,
  DuplicateFlowData,
  AssignQuestionnairesData,
  StepConfiguration,
  PaymentTermsConfiguration,
} from "../types/bookingflows.types";
import type {
  PaginatedResponse,
  PaginationParams,
} from "../types/common.types";

export interface BookingFlowQueryParams extends PaginationParams {
  search?: string;
  event_type?: number;
  is_active?: boolean;
  ordering?: string;
}

export interface BookingFlowStepQueryParams extends PaginationParams {
  search?: string;
  flow_id?: number;
  step_type?: string;
  ordering?: string;
}

export const bookingFlowsApi = {
  // Booking Flows CRUD
  getBookingFlows: async (
    params?: BookingFlowQueryParams,
  ): Promise<PaginatedResponse<BookingFlow>> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.event_type !== undefined)
      searchParams.append("event_type", params.event_type.toString());
    if (params?.is_active !== undefined)
      searchParams.append("is_active", params.is_active.toString());
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.page_size)
      searchParams.append("page_size", params.page_size.toString());
    if (params?.ordering) searchParams.append("ordering", params.ordering);

    const response = await api.get<PaginatedResponse<BookingFlow>>(
      `/bookingflow/flows/?${searchParams.toString()}`,
    );
    return response.data;
  },

  getBookingFlow: async (id: number): Promise<BookingFlowDetail> => {
    const response = await api.get<BookingFlowDetail>(
      `/bookingflow/flows/${id}/`,
    );
    return response.data;
  },

  createBookingFlow: async (
    data: CreateBookingFlowData,
  ): Promise<BookingFlow> => {
    const response = await api.post<BookingFlow>("/bookingflow/flows/", data);
    return response.data;
  },

  updateBookingFlow: async (
    id: number,
    data: UpdateBookingFlowData,
  ): Promise<BookingFlow> => {
    const response = await api.patch<BookingFlow>(
      `/bookingflow/flows/${id}/`,
      data,
    );
    return response.data;
  },

  deleteBookingFlow: async (id: number): Promise<void> => {
    await api.delete(`/bookingflow/flows/${id}/`);
  },

  duplicateBookingFlow: async (
    id: number,
    data: DuplicateFlowData,
  ): Promise<BookingFlow> => {
    const response = await api.post<BookingFlow>(
      `/bookingflow/flows/${id}/duplicate/`,
      data,
    );
    return response.data;
  },

  getActiveBookingFlows: async (): Promise<BookingFlow[]> => {
    const response = await api.get<PaginatedResponse<BookingFlow>>(
      "/bookingflow/flows/active/",
    );

    // Handle paginated response
    if (
      response.data &&
      typeof response.data === "object" &&
      "results" in response.data
    ) {
      return response.data.results;
    }

    return Array.isArray(response.data) ? response.data : [];
  },

  // FIXED: Payment gateways endpoint based on backend views
  getFlowPaymentGateways: async (
    flowId: number,
  ): Promise<{
    available_gateways: Array<{
      id: number;
      name: string;
      code: string;
      description: string;
      is_active: boolean;
      public_config: Record<string, unknown>;
    }>;
    default_gateway: number | null;
    require_immediate_payment: boolean;
  }> => {
    const response = await api.get<{
      available_gateways: Array<{
        id: number;
        name: string;
        code: string;
        description: string;
        is_active: boolean;
        public_config: Record<string, unknown>;
      }>;
      default_gateway: number | null;
      require_immediate_payment: boolean;
    }>(`/bookingflow/flows/${flowId}/payment_gateways/`);
    return response.data;
  },

  // Flow Steps Management
  getFlowSteps: async (flowId: number): Promise<BookingFlowStep[]> => {
    const response = await api.get<BookingFlowStep[]>(
      `/bookingflow/flows/${flowId}/steps/`,
    );
    return response.data;
  },

  getBookingFlowSteps: async (
    params?: BookingFlowStepQueryParams,
  ): Promise<PaginatedResponse<BookingFlowStep>> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.flow_id)
      searchParams.append("flow_id", params.flow_id.toString());
    if (params?.step_type) searchParams.append("step_type", params.step_type);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.page_size)
      searchParams.append("page_size", params.page_size.toString());
    if (params?.ordering) searchParams.append("ordering", params.ordering);

    const response = await api.get<PaginatedResponse<BookingFlowStep>>(
      `/bookingflow/steps/?${searchParams.toString()}`,
    );
    return response.data;
  },

  getBookingFlowStep: async (id: number): Promise<BookingFlowStep> => {
    const response = await api.get<BookingFlowStep>(
      `/bookingflow/steps/${id}/`,
    );
    return response.data;
  },

  createBookingFlowStep: async (
    data: CreateBookingFlowStepData,
  ): Promise<BookingFlowStep> => {
    const response = await api.post<BookingFlowStep>(
      "/bookingflow/steps/",
      data,
    );
    return response.data;
  },

  updateBookingFlowStep: async (
    id: number,
    data: UpdateBookingFlowStepData,
  ): Promise<BookingFlowStep> => {
    const response = await api.patch<BookingFlowStep>(
      `/bookingflow/steps/${id}/`,
      data,
    );
    return response.data;
  },

  deleteBookingFlowStep: async (id: number): Promise<void> => {
    await api.delete(`/bookingflow/steps/${id}/`);
  },

  reorderSteps: async (data: ReorderStepsData): Promise<BookingFlowStep[]> => {
    const response = await api.post<BookingFlowStep[]>(
      "/bookingflow/steps/reorder/",
      data,
    );
    return response.data;
  },

  // FIXED: Available step types endpoint based on backend
  getAvailableStepTypes: async (): Promise<{
    step_types: Array<{ value: string; label: string }>;
    total_count: number;
    removed_types: Array<{
      value: string;
      label: string;
      reason: string;
      migration_available: boolean;
    }>;
  }> => {
    const response = await api.get<{
      step_types: Array<{ value: string; label: string }>;
      total_count: number;
      removed_types: Array<{
        value: string;
        label: string;
        reason: string;
        migration_available: boolean;
      }>;
    }>("/bookingflow/steps/available_step_types/");
    return response.data;
  },

  // Step Configuration Management
  getStepConfiguration: async (
    stepId: number,
  ): Promise<StepConfiguration | null> => {
    try {
      const response = await api.get<StepConfiguration>(
        `/bookingflow/steps/${stepId}/configuration/`,
      );
      return response.data;
    } catch (error) {
      if (
        (error as { response?: { status?: number } }).response?.status === 404
      ) {
        return null;
      }
      throw error;
    }
  },

  updateStepConfiguration: async (
    stepId: number,
    data: Record<string, unknown>,
  ): Promise<StepConfiguration> => {
    const response = await api.patch<StepConfiguration>(
      `/bookingflow/steps/${stepId}/update_configuration/`,
      data,
    );
    return response.data;
  },

  // Payment Terms Configuration (for payment_info steps)
  getPaymentTermsConfiguration: async (
    stepId: number,
  ): Promise<PaymentTermsConfiguration | null> => {
    try {
      const response = await api.get<PaymentTermsConfiguration>(
        `/bookingflow/steps/${stepId}/payment_terms_configuration/`,
      );
      return response.data;
    } catch (error) {
      if (
        (error as { response?: { status?: number } }).response?.status === 404
      ) {
        return null;
      }
      throw error;
    }
  },

  updatePaymentTermsConfiguration: async (
    stepId: number,
    data: Partial<PaymentTermsConfiguration>,
  ): Promise<PaymentTermsConfiguration> => {
    const response = await api.patch<PaymentTermsConfiguration>(
      `/bookingflow/steps/${stepId}/update_payment_terms_configuration/`,
      data,
    );
    return response.data;
  },

  // FIXED: Availability step migration endpoint
  migrateAvailabilityToDateTime: async (
    stepId: number,
  ): Promise<BookingFlowStep> => {
    const response = await api.post<BookingFlowStep>(
      `/bookingflow/steps/${stepId}/migrate_availability_to_datetime/`,
    );
    return response.data;
  },

  // FIXED: Step validation rules endpoint
  getStepValidationRules: async (
    stepId: number,
  ): Promise<{
    step_type: string;
    validation_rules: Record<string, unknown>;
    custom_rules: Record<string, unknown>;
  }> => {
    const response = await api.get<{
      step_type: string;
      validation_rules: Record<string, unknown>;
      custom_rules: Record<string, unknown>;
    }>(`/bookingflow/steps/${stepId}/step_validation_rules/`);
    return response.data;
  },

  // FIXED: Availability settings endpoint for date_time steps
  getAvailabilitySettings: async (
    stepId: number,
  ): Promise<{
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
    available_time_slots: Array<{
      start_time: string;
      end_time: string;
      day_of_week?: number;
      is_available: boolean;
    }>;
    buffer_before_hours: number;
    buffer_after_hours: number;
  }> => {
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
      available_time_slots: Array<{
        start_time: string;
        end_time: string;
        day_of_week?: number;
        is_available: boolean;
      }>;
      buffer_before_hours: number;
      buffer_after_hours: number;
    }>(`/bookingflow/steps/${stepId}/availability_settings/`);
    return response.data;
  },

  // FIXED: Payment options endpoint for payment_info steps
  getPaymentOptions: async (
    stepId: number,
  ): Promise<{
    available_gateways: Array<{
      id: number;
      name: string;
      code: string;
      description: string;
      supported_methods: string[];
      public_config: Record<string, unknown>;
    }>;
    saved_payment_methods: Array<{
      id: number;
      type: string;
      last_four: string;
      expires_at?: string;
      is_default: boolean;
    }>;
    require_immediate_payment: boolean;
    accept_deposit: boolean;
    deposit_amount: string | null;
    deposit_type: string | null;
    allow_payment_plans: boolean;
    payment_terms: string;
  }> => {
    const response = await api.get<{
      available_gateways: Array<{
        id: number;
        name: string;
        code: string;
        description: string;
        supported_methods: string[];
        public_config: Record<string, unknown>;
      }>;
      saved_payment_methods: Array<{
        id: number;
        type: string;
        last_four: string;
        expires_at?: string;
        is_default: boolean;
      }>;
      require_immediate_payment: boolean;
      accept_deposit: boolean;
      deposit_amount: string | null;
      deposit_type: string | null;
      allow_payment_plans: boolean;
      payment_terms: string;
    }>(`/bookingflow/steps/${stepId}/payment_options/`);
    return response.data;
  },

  // Questionnaire Step Configuration
  getAvailableQuestionnaires: async (
    stepId: number,
  ): Promise<
    Array<{
      id: number;
      name: string;
      event_type: number | null;
      is_active: boolean;
      order: number;
      created_at: string;
      updated_at: string;
    }>
  > => {
    const response = await api.get<
      Array<{
        id: number;
        name: string;
        event_type: number | null;
        is_active: boolean;
        order: number;
        created_at: string;
        updated_at: string;
      }>
    >(`/bookingflow/steps/${stepId}/available_questionnaires/`);
    return response.data;
  },

  assignQuestionnaires: async (
    stepId: number,
    data: AssignQuestionnairesData,
  ): Promise<StepConfiguration> => {
    const response = await api.post<StepConfiguration>(
      `/bookingflow/steps/${stepId}/assign_questionnaires/`,
      data,
    );
    return response.data;
  },

  // Package Selection Step Configuration
  getAvailablePackages: async (
    stepId: number,
  ): Promise<
    Array<{
      id: number;
      name: string;
      description: string;
      category: number;
      pricing_model: string;
      base_price: string;
      currency: string;
      type: string;
      is_active: boolean;
    }>
  > => {
    const response = await api.get<
      Array<{
        id: number;
        name: string;
        description: string;
        category: number;
        pricing_model: string;
        base_price: string;
        currency: string;
        type: string;
        is_active: boolean;
      }>
    >(`/bookingflow/steps/${stepId}/available_packages/`);
    return response.data;
  },

  // Addon Selection Step Configuration
  getAvailableAddons: async (
    stepId: number,
  ): Promise<
    Array<{
      id: number;
      name: string;
      description: string;
      category: number;
      pricing_model: string;
      base_price: string;
      currency: string;
      type: string;
      is_active: boolean;
    }>
  > => {
    const response = await api.get<
      Array<{
        id: number;
        name: string;
        description: string;
        category: number;
        pricing_model: string;
        base_price: string;
        currency: string;
        type: string;
        is_active: boolean;
      }>
    >(`/bookingflow/steps/${stepId}/available_addons/`);
    return response.data;
  },

  // Product Categories (for step configuration)
  getAvailableCategories: async (
    stepId: number,
  ): Promise<
    Array<{
      id: number;
      name: string;
      description: string;
      slug: string;
      parent: number | null;
      is_active: boolean;
      sort_order: number;
      requires_venue: boolean;
      typical_duration_hours: number | null;
    }>
  > => {
    const response = await api.get<
      Array<{
        id: number;
        name: string;
        description: string;
        slug: string;
        parent: number | null;
        is_active: boolean;
        sort_order: number;
        requires_venue: boolean;
        typical_duration_hours: number | null;
      }>
    >(`/bookingflow/steps/${stepId}/available_categories/`);
    return response.data;
  },

  // Booking Sessions Management
  getBookingSessions: async (
    filters?: BookingSessionFilters,
  ): Promise<BookingSession[]> => {
    const params = new URLSearchParams();
    if (filters?.booking_flow)
      params.append("booking_flow", filters.booking_flow.toString());
    if (filters?.is_completed !== undefined)
      params.append("is_completed", filters.is_completed.toString());
    if (filters?.is_abandoned !== undefined)
      params.append("is_abandoned", filters.is_abandoned.toString());

    const response = await api.get<PaginatedResponse<BookingSession>>(
      `/bookingflow/sessions/?${params.toString()}`,
    );

    // Handle paginated response
    if (
      response.data &&
      typeof response.data === "object" &&
      "results" in response.data
    ) {
      return response.data.results;
    }

    return Array.isArray(response.data) ? response.data : [];
  },

  getBookingSession: async (id: number): Promise<BookingSession> => {
    const response = await api.get<BookingSession>(
      `/bookingflow/sessions/${id}/`,
    );
    return response.data;
  },

  createBookingSession: async (
    data: CreateBookingSessionData,
  ): Promise<BookingSession> => {
    const response = await api.post<BookingSession>(
      "/bookingflow/sessions/",
      data,
    );
    return response.data;
  },

  updateBookingSessionData: async (
    id: number,
    data: UpdateBookingSessionData,
  ): Promise<BookingSession> => {
    const response = await api.patch<BookingSession>(
      `/bookingflow/sessions/${id}/update_data/`,
      data,
    );
    return response.data;
  },

  completeBooking: async (
    id: number,
  ): Promise<{
    detail: string;
    event: {
      id: number;
      name: string;
      event_date: string;
      status: string;
      client_id: number;
      total_price: string;
    };
    session: BookingSession;
  }> => {
    const response = await api.post<{
      detail: string;
      event: {
        id: number;
        name: string;
        event_date: string;
        status: string;
        client_id: number;
        total_price: string;
      };
      session: BookingSession;
    }>(`/bookingflow/sessions/${id}/complete_booking/`);
    return response.data;
  },

  abandonSession: async (
    id: number,
    reason?: string,
  ): Promise<BookingSession> => {
    const response = await api.post<BookingSession>(
      `/bookingflow/sessions/${id}/abandon/`,
      { reason },
    );
    return response.data;
  },

  // Public Booking Flow Endpoints (for client portal)
  getPublicBookingFlows: async (): Promise<BookingFlow[]> => {
    const response = await api.get<BookingFlow[]>("/bookingflow/public/flows/");
    return Array.isArray(response.data) ? response.data : [];
  },

  startPublicSession: async (
    flowId: number,
  ): Promise<{
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

  // FIXED: Public payment gateways endpoint
  getPublicPaymentGateways: async (
    flowId: number,
  ): Promise<{
    available_gateways: Array<{
      id: number;
      name: string;
      code: string;
      description: string;
      public_config: Record<string, unknown>;
    }>;
    default_gateway: number | null;
    require_immediate_payment: boolean;
  }> => {
    const response = await api.get<{
      available_gateways: Array<{
        id: number;
        name: string;
        code: string;
        description: string;
        public_config: Record<string, unknown>;
      }>;
      default_gateway: number | null;
      require_immediate_payment: boolean;
    }>(`/bookingflow/public/flows/${flowId}/payment_gateways/`);
    return response.data;
  },

  // Analytics
  getFlowAnalytics: async (
    flowId: number,
    filters?: BookingFlowAnalyticsFilters,
  ): Promise<BookingFlowAnalytics[]> => {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append("start_date", filters.start_date);
    if (filters?.end_date) params.append("end_date", filters.end_date);

    const response = await api.get<BookingFlowAnalytics[]>(
      `/bookingflow/flows/${flowId}/analytics/?${params.toString()}`,
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  getAllAnalytics: async (
    filters?: BookingFlowAnalyticsFilters,
  ): Promise<BookingFlowAnalytics[]> => {
    const params = new URLSearchParams();
    if (filters?.flow_id) params.append("flow_id", filters.flow_id.toString());
    if (filters?.start_date) params.append("start_date", filters.start_date);
    if (filters?.end_date) params.append("end_date", filters.end_date);

    const response = await api.get<PaginatedResponse<BookingFlowAnalytics>>(
      `/bookingflow/analytics/?${params.toString()}`,
    );

    // Handle paginated response
    if (
      response.data &&
      typeof response.data === "object" &&
      "results" in response.data
    ) {
      return response.data.results;
    }

    return Array.isArray(response.data) ? response.data : [];
  },

  updateDailyAnalytics: async (
    flowId: number,
    date?: string,
  ): Promise<BookingFlowAnalytics> => {
    const response = await api.post<BookingFlowAnalytics>(
      "/bookingflow/analytics/update_daily/",
      {
        flow_id: flowId,
        date,
      },
    );
    return response.data;
  },
};
