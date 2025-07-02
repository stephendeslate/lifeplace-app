// frontend/client-portal/src/types/booking.types.ts

// Core booking flow types matching backend BookingFlow model
export interface BookingFlow {
  id: number;
  name: string;
  description: string;
  event_type: number | null;
  event_type_name: string;
  workflow_template: number | null;
  confirmation_email_template: number | null;
  reminder_email_template: number | null;
  is_active: boolean;
  allow_guest_booking: boolean;
  require_account_creation: boolean;
  auto_approve_bookings: boolean;
  enable_progress_saving: boolean;
  max_advance_booking_days: number;
  min_advance_booking_days: number;
  allow_discounts: boolean;
  available_discounts: number[];
  allowed_payment_gateways: number[];
  default_payment_gateway: number | null;
  require_immediate_payment: boolean;
  redirect_url: string;
  success_message: string;
  is_test_mode: boolean;
  conversion_tracking_code: string;
  total_steps: number;
  enabled_steps_count: number;
  created_at: string;
  updated_at: string;
}

// Public booking flow for client-facing endpoints - matches PublicBookingFlowSerializer
export interface PublicBookingFlow {
  id: number;
  name: string;
  description: string;
  event_type_name: string;
  allow_guest_booking: boolean;
  require_account_creation: boolean;
  enable_progress_saving: boolean;
  max_advance_booking_days: number;
  min_advance_booking_days: number;
  enabled_steps: BookingFlowStep[];
  total_steps: number;
}

// Booking flow step configuration matching backend BookingFlowStep model
export interface BookingFlowStep {
  id: number;
  booking_flow: number;
  step_type: BookingStepType;
  step_type_display: string;
  name: string;
  description: string;
  order: number;
  is_enabled: boolean;
  is_required: boolean;
  is_skippable: boolean;
  display_conditions: Record<string, any>;
  configuration: Record<string, any>;
  validation_rules: Record<string, any>;
  configuration_data: StepConfigurationData | null;
  created_at: string;
  updated_at: string;
}

// Step types from backend STEP_TYPES choices (excluding removed availability_check)
export type BookingStepType = 
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

// Union type for all step configuration data
export type StepConfigurationData = 
  | IntroductionStepConfiguration
  | DateTimeStepConfiguration
  | QuestionnaireStepConfiguration
  | PackageSelectionStepConfiguration
  | AddonSelectionStepConfiguration
  | ContactInfoStepConfiguration
  | PaymentInfoStepConfiguration
  | ConfirmationStepConfiguration;

// Step configuration interfaces matching backend models exactly
export interface IntroductionStepConfiguration {
  id: number;
  step: number;
  title: string;
  content: string;
  show_event_details: boolean;
  show_pricing_overview: boolean;
  custom_css: string;
  background_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface DateTimeStepConfiguration {
  id: number;
  step: number;
  allow_time_selection: boolean;
  allow_multi_day: boolean;
  show_calendar_view: boolean;
  min_duration_hours: number;
  max_duration_hours: number;
  default_duration_hours: number;
  enable_real_time_availability: boolean;
  show_availability_status: boolean;
  auto_check_conflicts: boolean;
  blocked_dates: string[];
  available_days_of_week: number[];
  available_time_slots: any[];
  buffer_before_hours: number;
  buffer_after_hours: number;
  check_venue_availability: boolean;
  check_resource_availability: boolean;
  check_staff_availability: boolean;
  availability_display_mode: 'FULL' | 'LIMITED' | 'SIMPLE';
  allow_overbooking: boolean;
  overbooking_threshold: number;
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
  questionnaire_details: QuestionnaireBasic;
  order: number;
  is_conditional: boolean;
  show_conditions: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireBasic {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

export interface PackageSelectionStepConfiguration {
  id: number;
  step: number;
  available_categories: number[];
  available_categories_details: ProductCategory[];
  available_packages: number[];
  available_packages_details: ProductOption[];
  selection_type: 'SINGLE' | 'MULTIPLE';
  min_selection: number;
  max_selection: number;
  show_pricing: boolean;
  show_descriptions: boolean;
  show_images: boolean;
  enable_comparison: boolean;
  enable_dynamic_pricing: boolean;
  pricing_factors: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AddonSelectionStepConfiguration {
  id: number;
  step: number;
  available_categories: number[];
  available_categories_details: ProductCategory[];
  available_addons: number[];
  available_addons_details: ProductOption[];
  min_selection: number;
  max_selection: number;
  group_by_category: boolean;
  show_recommendations: boolean;
  recommendation_logic: Record<string, any>;
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
  custom_fields: any[];
  offer_account_creation: boolean;
  require_account_creation: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentInfoStepConfiguration {
  id: number;
  step: number;
  accept_full_payment: boolean;
  accept_deposit: boolean;
  deposit_type: 'PERCENTAGE' | 'FIXED';
  deposit_amount: string;
  available_payment_methods: string[];
  require_immediate_payment: boolean;
  allow_payment_plans: boolean;
  payment_terms: string;
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
  send_confirmation_email: boolean;
  send_calendar_invite: boolean;
  create_event_immediately: boolean;
  created_at: string;
  updated_at: string;
}

// Product types from products domain - exact match to backend
export interface ProductCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductOption {
  id: number;
  name: string;
  description: string;
  type: 'PACKAGE' | 'PRODUCT';
  category: number;
  base_price: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Event types from events domain - matches EventTypeSerializer
export interface EventType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Payment gateway types - matches backend booking_flow_views.py payment_gateways endpoint
export interface PaymentGateway {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  public_config: Record<string, any>;
}

// Payment gateway response for booking flows - matches backend response
export interface BookingFlowPaymentGateways {
  available_gateways: PaymentGateway[];
  default_gateway: number | null;
  require_immediate_payment: boolean;
}

// Availability check request/response - matches backend validation logic
export interface AvailabilityCheckRequest {
  start_date: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  duration?: number;
  guest_count?: number;
  venue_preference?: string;
  resource_requirements?: string[];
  staff_requirements?: string[];
  special_requirements?: string;
}

export interface AvailabilityCheckResponse {
  available: boolean;
  message: string;
  conflicts?: string[];
  alternative_dates?: string[];
  alternative_times?: string[];
}

// Payment options response - matches booking_step_views.py payment_options endpoint
export interface PaymentOptionsResponse {
  available_gateways: PaymentGatewayConfig[];
  saved_payment_methods: SavedPaymentMethod[];
  require_immediate_payment: boolean;
  accept_deposit: boolean;
  deposit_amount?: string;
  deposit_type?: 'PERCENTAGE' | 'FIXED';
  allow_payment_plans: boolean;
  payment_terms?: string;
}

export interface PaymentGatewayConfig {
  id: number;
  name: string;
  code: string;
  description: string;
  public_config: Record<string, any>;
  supported_methods: string[];
}

export interface SavedPaymentMethod {
  id: string;
  type: string;
  last_four: string;
  brand: string;
  expires_at: string;
  is_default: boolean;
}