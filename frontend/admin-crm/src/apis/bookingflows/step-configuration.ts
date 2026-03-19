// frontend/admin-crm/src/apis/bookingflows/step-configuration.ts

import api from '../../utils/api';
import type {
  BookingFlowStep,
  StepConfiguration,
  PaymentTermsConfiguration,
  AssignQuestionnairesData,
} from '../../types/bookingflows';

export const getStepConfiguration = async (stepId: number): Promise<StepConfiguration | null> => {
  try {
    const response = await api.get<StepConfiguration>(
      `/bookingflow/steps/${stepId}/configuration/`,
    );
    return response.data;
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const updateStepConfiguration = async (
  stepId: number,
  data: Record<string, unknown>,
): Promise<StepConfiguration> => {
  const response = await api.patch<StepConfiguration>(
    `/bookingflow/steps/${stepId}/update_configuration/`,
    data,
  );
  return response.data;
};

export const getPaymentTermsConfiguration = async (
  stepId: number,
): Promise<PaymentTermsConfiguration | null> => {
  try {
    const response = await api.get<PaymentTermsConfiguration>(
      `/bookingflow/steps/${stepId}/payment_terms_configuration/`,
    );
    return response.data;
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const updatePaymentTermsConfiguration = async (
  stepId: number,
  data: Partial<PaymentTermsConfiguration>,
): Promise<PaymentTermsConfiguration> => {
  const response = await api.patch<PaymentTermsConfiguration>(
    `/bookingflow/steps/${stepId}/update_payment_terms_configuration/`,
    data,
  );
  return response.data;
};

export const migrateAvailabilityToDateTime = async (stepId: number): Promise<BookingFlowStep> => {
  const response = await api.post<BookingFlowStep>(
    `/bookingflow/steps/${stepId}/migrate_availability_to_datetime/`,
  );
  return response.data;
};

export const getStepValidationRules = async (
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
};

export const getAvailabilitySettings = async (
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
};

export const getPaymentOptions = async (
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
};

export const getAvailableQuestionnaires = async (
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
};

export const assignQuestionnaires = async (
  stepId: number,
  data: AssignQuestionnairesData,
): Promise<StepConfiguration> => {
  const response = await api.post<StepConfiguration>(
    `/bookingflow/steps/${stepId}/assign_questionnaires/`,
    data,
  );
  return response.data;
};

export const getAvailablePackages = async (
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
};

export const getAvailableAddons = async (
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
};

export const getAvailableCategories = async (
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
};
