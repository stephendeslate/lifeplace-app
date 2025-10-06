// frontend/admin-crm/src/types/bookingflows.types.ts

export interface BookingFlow {
  id: number;
  name: string;
  description: string;
  event_type: number | null;
  event_type_name: string; // Always provided by backend serializer
  
  // Integration with other domains
  workflow_template: number | null;
  workflow_template_details?: {
    id: number;
    name: string;
  };
  confirmation_email_template: number | null;
  confirmation_email_template_details?: {
    id: number;
    name: string;
  };
  reminder_email_template: number | null;
  reminder_email_template_details?: {
    id: number;
    name: string;
  };
  
  // Flow configuration
  is_active: boolean;
  allow_guest_booking: boolean;
  require_account_creation: boolean;
  auto_approve_bookings: boolean;
  enable_progress_saving: boolean;
  max_advance_booking_days: number;
  min_advance_booking_days: number;
  
  // Pricing and discounts
  allow_discounts: boolean;
  available_discounts: number[];
  available_discounts_details?: {
    id: number;
    name: string;
    code: string;
  }[];
  
  // Payment configuration - NEW fields from evolved backend
  allowed_payment_gateways: number[];
  default_payment_gateway: number | null;
  require_immediate_payment: boolean;
  
  // Completion actions
  redirect_url: string;
  success_message: string;
  
  // Analytics and testing
  is_test_mode: boolean;
  conversion_tracking_code: string;
  
  // Computed fields
  total_steps: number;
  enabled_steps_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface BookingFlowDetail extends BookingFlow {
  steps: BookingFlowStep[];
}

export interface BookingFlowStep {
  id: number;
  booking_flow: number;
  step_type: StepType;
  step_type_display: string;
  name: string;
  description: string;
  order: number;
  
  // Step behavior
  is_enabled: boolean;
  is_required: boolean;
  is_skippable: boolean;
  
  // Conditional display
  display_conditions: Record<string, unknown>;
  
  // Step configuration
  configuration: Record<string, unknown>;
  configuration_data?: StepConfiguration;
  
  // Validation rules
  validation_rules: Record<string, unknown>;
  
  created_at: string;
  updated_at: string;
}

// FIXED: Removed non-existent and deprecated step types
export type StepType = 
  | 'introduction'
  | 'date_time'
  | 'questionnaire'
  | 'package_selection'
  | 'addon_selection'
  | 'pricing_summary'
  | 'contact_info'
  | 'payment_info'
  | 'review_booking'
  | 'confirmation';

// FIXED: Updated to match backend STEP_TYPES exactly
export const STEP_TYPES = [
  { value: 'introduction', label: 'Introduction' },
  { value: 'date_time', label: 'Date & Time Selection' },
  { value: 'questionnaire', label: 'Questionnaire' },
  { value: 'package_selection', label: 'Package Selection' },
  { value: 'addon_selection', label: 'Add-on Selection' },
  { value: 'pricing_summary', label: 'Pricing Summary' },
  { value: 'contact_info', label: 'Contact Information' },
  { value: 'payment_info', label: 'Payment Information' },
  { value: 'review_booking', label: 'Review Booking' },
  { value: 'confirmation', label: 'Confirmation' },
] as const;

// Step Configuration Types - UPDATED to match backend models exactly
export interface IntroductionStepConfiguration {
  id: number;
  step: number;
  title: string;
  content: string;
  show_event_details: boolean;
  show_pricing_overview: boolean;
  custom_css: string;
  background_image?: string;
  created_at: string;
  updated_at: string;
}

// FIXED: Enhanced DateTimeStepConfiguration to match evolved backend
export interface DateTimeStepConfiguration {
  id: number;
  step: number;
  allow_time_selection: boolean;
  allow_multi_day: boolean;
  show_calendar_view: boolean;
  min_duration_hours: number;
  max_duration_hours: number;
  default_duration_hours: number;
  
  // Enhanced availability settings from evolved backend
  enable_real_time_availability: boolean;
  show_availability_status: boolean;
  auto_check_conflicts: boolean;
  show_next_available_date: boolean;
  show_conflict_details: boolean;
  
  blocked_dates: string[];
  available_days_of_week: number[];
  available_time_slots: Array<{
    start_time: string;
    end_time: string;
    day_of_week?: number;
    is_available: boolean;
  }>;
  
  // Buffer settings
  buffer_before_hours: number;
  buffer_after_hours: number;
  
  // Availability checking configuration
  check_venue_availability: boolean;
  check_resource_availability: boolean;
  check_staff_availability: boolean;
  
  // Availability display settings
  availability_display_mode: 'FULL' | 'LIMITED' | 'SIMPLE';
  
  // Conflict resolution
  allow_overbooking: boolean;
  overbooking_threshold: number;
  
  // Integration settings
  sync_with_calendar: boolean;
  calendar_source: 'GOOGLE' | 'OUTLOOK' | 'EXTERNAL' | '';
  
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireStepConfiguration {
  id: number;
  step: number;
  allow_file_uploads: boolean;
  max_file_size_mb: number;
  allowed_file_types: string[];
  questionnaire_items: QuestionnaireStepItem[];
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireStepItem {
  id: number;
  configuration: number;
  questionnaire: number;
  questionnaire_details?: {
    id: number;
    name: string;
    fields_count: number;
  };
  order: number;
  is_conditional: boolean;
  show_conditions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PackageSelectionStepConfiguration {
  id: number;
  step: number;
  
  // Product filtering
  available_categories: number[];
  available_categories_details?: {
    id: number;
    name: string;
  }[];
  available_packages: number[];
  available_packages_details?: {
    id: number;
    name: string;
    base_price: string;
  }[];
  
  // Selection behavior
  selection_type: 'SINGLE' | 'MULTIPLE';
  min_selection: number;
  max_selection: number;
  
  // Display options
  show_pricing: boolean;
  show_descriptions: boolean;
  show_images: boolean;
  enable_comparison: boolean;
  
  // Dynamic pricing
  enable_dynamic_pricing: boolean;
  pricing_factors: Record<string, unknown>;
  
  created_at: string;
  updated_at: string;
}

export interface AddonSelectionStepConfiguration {
  id: number;
  step: number;
  
  // Product filtering
  available_categories: number[];
  available_categories_details?: {
    id: number;
    name: string;
  }[];
  available_addons: number[];
  available_addons_details?: {
    id: number;
    name: string;
    base_price: string;
  }[];
  
  // Selection behavior
  min_selection: number;
  max_selection: number;
  
  // Display options
  group_by_category: boolean;
  show_recommendations: boolean;
  recommendation_logic: Record<string, unknown>;
  
  created_at: string;
  updated_at: string;
}

export interface PricingSummaryStepConfiguration {
  id: number;
  step: number;
  
  // Display options
  show_package_breakdown: boolean;
  show_addon_breakdown: boolean;
  show_tax_breakdown: boolean;
  show_discount_field: boolean;
  show_subtotal: boolean;
  
  // Behavior options
  allow_discount_codes: boolean;
  calculate_tax: boolean;
  
  // Custom messaging
  header_text: string;
  footer_text: string;
  discount_help_text: string;
  
  created_at: string;
  updated_at: string;
}

export interface ContactInfoStepConfiguration {
  id: number;
  step: number;
  require_full_name: boolean;
  require_email: boolean;
  require_phone: boolean;
  require_address: boolean;
  require_company: boolean;
  
  // Additional fields
  custom_fields: Array<{
    name: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
  
  // Account creation
  offer_account_creation: boolean;
  require_account_creation: boolean;
  
  created_at: string;
  updated_at: string;
}

// FULLY CONSOLIDATED: ALL payment business logic now in PaymentSettings (payments domain)
// This configuration contains ONLY UI/UX flags and custom text
//
// REMOVED and moved to PaymentSettings (Phase 2 - Full DRY Compliance):
// - deposit_type, deposit_amount, balance_due_days (payment plan calculation)
// - allow_refunds, refund_deadline_days, refund_percentage, refund_policy_text (refund policy)
// - allowed_gateways, default_gateway, available_payment_methods (payment gateway defaults)
export interface PaymentInfoStepConfiguration {
  id: number;
  step: number;

  // UI/UX FLAGS ONLY - what payment options to show
  accept_full_payment: boolean;
  accept_deposit: boolean;
  allow_payment_plans: boolean;
  allow_quote_request: boolean;
  require_immediate_payment: boolean;

  // UI TEXT CUSTOMIZATION ONLY
  payment_terms: string;
  quote_request_button_text: string;
  quote_request_description: string;

  created_at: string;
  updated_at: string;
}

export interface ConfirmationStepConfiguration {
  id: number;
  step: number;
  title: string;
  message: string;
  show_booking_summary: boolean;
  show_next_steps: boolean;
  next_steps_content: string;
  
  // Auto-actions
  send_confirmation_email: boolean;
  send_calendar_invite: boolean;
  create_event_immediately: boolean;
  
  created_at: string;
  updated_at: string;
}

// REMOVED: EventDetailsStepConfiguration (doesn't exist in backend)

export type StepConfiguration = 
  | IntroductionStepConfiguration
  | DateTimeStepConfiguration
  | QuestionnaireStepConfiguration
  | PackageSelectionStepConfiguration
  | AddonSelectionStepConfiguration
  | PricingSummaryStepConfiguration
  | ContactInfoStepConfiguration
  | PaymentInfoStepConfiguration
  | ConfirmationStepConfiguration;

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
  name: string;
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
export interface PaymentGateway {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  public_config: Record<string, unknown>;
  supported_methods?: string[];
}

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
  name: string;
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