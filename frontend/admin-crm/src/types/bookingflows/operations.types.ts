// frontend/admin-crm/src/types/bookingflows/operations.types.ts
// Session, analytics, CRUD, filter, action, form, and component prop types

import type { BookingFlow, BookingFlowDetail, BookingFlowStep, StepType } from './core.types';
import type { StepConfiguration } from './configurations.types';

// Booking Session Types
export interface BookingSession {
  id: number;
  session_id: string;
  booking_flow: number;
  booking_flow_details?: {
    id: number;
    name: string;
    event_type_name: string;
    total_steps: number;
  };
  client: number | null;
  current_step: number | null;
  current_step_details?: BookingFlowStep;
  booking_data: Record<string, unknown>;
  validation_errors: Record<string, unknown>;
  is_completed: boolean;
  is_abandoned: boolean;
  completed_at: string | null;
  expires_at: string;
  progress_percentage: number;
  total_price: string;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
}

// Analytics Types
export interface BookingFlowAnalytics {
  id: number;
  booking_flow: number;
  booking_flow_name: string;
  date: string;
  total_sessions: number;
  completed_bookings: number;
  abandoned_sessions: number;
  conversion_rate: string;
  step_completion_data: Record<string, number>;
  step_drop_off_data: Record<string, number>;
  total_revenue: string;
  average_booking_value: string;
  average_completion_time: string | null;
  bounce_rate: string;
  created_at: string;
  updated_at: string;
}

// Create/Update Data Types - FIXED to match backend exactly
export interface CreateBookingFlowData {
  name: string;
  description?: string;
  event_type?: number | null;
  workflow_template?: number | null;
  confirmation_email_template?: number | null;
  reminder_email_template?: number | null;
  is_active?: boolean;
  allow_guest_booking?: boolean;
  require_account_creation?: boolean;
  auto_approve_bookings?: boolean;
  enable_progress_saving?: boolean;
  max_advance_booking_days?: number;
  min_advance_booking_days?: number;
  allow_discounts?: boolean;
  available_discounts?: number[];
  // ADDED: Payment gateway fields from evolved backend
  allowed_payment_gateways?: number[];
  default_payment_gateway?: number | null;
  require_immediate_payment?: boolean;
  redirect_url?: string;
  success_message?: string;
  conversion_tracking_code?: string;
}

export type UpdateBookingFlowData = Partial<CreateBookingFlowData>;

export interface CreateBookingFlowStepData {
  booking_flow?: number;
  step_type: StepType;
  description?: string;
  order?: number;
  is_enabled?: boolean;
  is_required?: boolean;
  is_skippable?: boolean;
  display_conditions?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  validation_rules?: Record<string, unknown>;
}

export type UpdateBookingFlowStepData = Partial<CreateBookingFlowStepData>;

export interface CreateBookingSessionData {
  booking_flow: number;
  ip_address?: string;
  user_agent?: string;
  referrer_url?: string;
}

export interface UpdateBookingSessionData {
  session_id: string;
  step_id: number;
  step_data: Record<string, unknown>;
  mark_completed?: boolean;
}

// Filter Types
export interface BookingFlowFilters {
  search?: string;
  event_type?: number;
  is_active?: boolean;
  has_active_sessions?: boolean;
}

export interface BookingFlowStepFilters {
  flow_id?: number;
  step_type?: StepType;
}

export interface BookingSessionFilters {
  booking_flow?: number;
  is_completed?: boolean;
  is_abandoned?: boolean;
}

export interface BookingFlowAnalyticsFilters {
  flow_id?: number;
  start_date?: string;
  end_date?: string;
}

// Action Data Types
export interface ReorderStepsData {
  flow_id: number;
  order_mapping: Record<string, number>;
}

export interface DuplicateFlowData {
  name: string;
  copy_steps?: boolean;
  copy_configuration?: boolean;
}

export interface AssignQuestionnairesData {
  questionnaire_ids: number[];
}

export interface ConfigurePackagesData {
  available_categories?: number[];
  available_packages?: number[];
  selection_type?: 'SINGLE' | 'MULTIPLE';
  min_selection?: number;
  max_selection?: number;
  show_pricing?: boolean;
  show_descriptions?: boolean;
  show_images?: boolean;
  enable_comparison?: boolean;
  enable_dynamic_pricing?: boolean;
  pricing_factors?: Record<string, unknown>;
}

export interface ConfigureAddonsData {
  available_categories?: number[];
  available_addons?: number[];
  min_selection?: number;
  max_selection?: number;
  group_by_category?: boolean;
  show_recommendations?: boolean;
  recommendation_logic?: Record<string, unknown>;
}

// API Response Types
export interface SavedPaymentMethod {
  id: number;
  type: string;
  last_four: string;
  expires_at?: string;
  is_default: boolean;
}

export interface ValidationRule {
  field: string;
  rule_type: string;
  parameters: Record<string, unknown>;
  error_message: string;
}

export interface AvailabilityTimeSlot {
  start_time: string;
  end_time: string;
  day_of_week?: number;
  is_available: boolean;
}

export interface CompletedBookingEvent {
  id: number;
  name: string;
  event_date: string;
  status: string;
  client_id: number;
  total_price: string;
}

// Preview Data Types
export interface StepPreviewData {
  step: BookingFlowStep;
  configuration: StepConfiguration | null;
  preview_elements: Array<{
    type: string;
    content: string;
    order: number;
  }>;
  validation: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// Form Data Types
export interface BookingFlowFormData {
  name: string;
  description: string;
  event_type: string; // Will be converted to number | null in API
  workflow_template: string;
  confirmation_email_template: string;
  reminder_email_template: string;
  is_active: boolean;
  allow_guest_booking: boolean;
  require_account_creation: boolean;
  auto_approve_bookings: boolean;
  enable_progress_saving: boolean;
  max_advance_booking_days: string;
  min_advance_booking_days: string;
  allow_discounts: boolean;
  available_discounts: number[];
  // ADDED: Payment gateway form fields
  allowed_payment_gateways: number[];
  default_payment_gateway: string;
  require_immediate_payment: boolean;
  redirect_url: string;
  success_message: string;
  conversion_tracking_code: string;
}

export interface BookingFlowStepFormData {
  step_type: StepType;
  description: string;
  is_enabled: boolean;
  is_required: boolean;
  is_skippable: boolean;
  display_conditions: Record<string, unknown>;
  configuration: Record<string, unknown>;
  validation_rules: Record<string, unknown>;
}

// Component Props Types
export interface BookingFlowTableProps {
  bookingFlows: BookingFlow[];
  isLoading: boolean;
  onEdit: (flow: BookingFlow) => void;
  onPreview: (flow: BookingFlow) => void;
  onDuplicate: (flow: BookingFlow) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface BookingFlowFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingFlow?: BookingFlow | null;
  onSubmit: (data: CreateBookingFlowData | UpdateBookingFlowData) => void;
  isLoading: boolean;
}

export interface BookingFlowCardProps {
  flow: BookingFlow;
  onEdit: (flow: BookingFlow) => void;
  onPreview: (flow: BookingFlow) => void;
  onDuplicate: (flow: BookingFlow) => void;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
}

export interface BookingFlowPreviewProps {
  flow: BookingFlowDetail;
  compact?: boolean;
  showMobileView?: boolean;
}

export interface BookingFlowPreviewWrapperProps {
  flow: BookingFlow;
  compact?: boolean;
  showMobileView?: boolean;
}

export interface BookingFlowStepTableProps {
  steps: BookingFlowStep[];
  isLoading: boolean;
  onEdit: (step: BookingFlowStep) => void;
  onDelete: (id: number) => void;
  onReorder: (steps: BookingFlowStep[]) => void;
  isDeleting: boolean;
}

export interface BookingFlowStepFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingStep?: BookingFlowStep | null;
  flowId?: number;
  onSubmit: (data: CreateBookingFlowStepData | UpdateBookingFlowStepData) => void;
  isLoading: boolean;
}
