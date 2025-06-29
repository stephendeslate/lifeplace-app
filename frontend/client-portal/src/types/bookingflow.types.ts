// frontend/client-portal/src/types/bookingflow.types.ts

// Base types from other domains
export interface EventType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

export interface ProductOption {
  id: number;
  name: string;
  description: string;
  category: number;
  category_name: string;
  pricing_model: 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM';
  base_price: string; // Decimal as string
  currency: string;
  tax_rate: string; // Decimal as string
  type: 'PRODUCT' | 'PACKAGE';
  is_active: boolean;
  is_featured: boolean;
  allow_multiple: boolean;
  requires_approval: boolean;
  has_excess_hours: boolean;
  included_hours?: number;
  excess_hour_price?: string; // Decimal as string
  minimum_hours?: number;
  maximum_hours?: number;
  advance_booking_days: number;
  maximum_booking_days?: number;
  formatted_price: string;
  price_with_tax: string; // Decimal as string
}

export interface PaymentGateway {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  public_config: Record<string, any>;
}

// Booking Flow Types
export interface BookingFlowStep {
  id: number;
  booking_flow: number;
  step_type: 
    | 'introduction' 
    | 'event_details' 
    | 'date_time' 
    | 'questionnaire' 
    | 'package_selection' 
    | 'addon_selection' 
    | 'availability_check'
    | 'pricing_summary'
    | 'contact_info' 
    | 'payment_info' 
    | 'review_booking' 
    | 'confirmation';
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
  configuration_data?: StepConfiguration;
  created_at: string;
  updated_at: string;
}

export interface BookingFlow {
  id: number;
  name: string;
  description: string;
  event_type_name: string | null;
  allow_guest_booking: boolean;
  require_account_creation: boolean;
  enable_progress_saving: boolean;
  max_advance_booking_days: number;
  min_advance_booking_days: number;
  enabled_steps: BookingFlowStep[];
  total_steps: number;
}

export interface BookingSession {
  id: number;
  session_id: string;
  booking_flow: number;
  booking_flow_details: {
    id: number;
    name: string;
    event_type_name: string | null;
    total_steps: number;
  };
  client: number | null;
  current_step: number | null;
  current_step_details: BookingFlowStep | null;
  booking_data: Record<string, any>;
  validation_errors: Record<string, any>;
  is_completed: boolean;
  is_abandoned: boolean;
  completed_at: string | null;
  expires_at: string;
  progress_percentage: number;
  total_price: string; // Decimal as string
  is_expired: boolean;
  created_at: string;
  updated_at: string;
}

// Step Configuration Types
export interface StepConfiguration {
  id: number;
  step: number;
  created_at: string;
  updated_at: string;
}

export interface IntroductionStepConfig extends StepConfiguration {
  title: string;
  content: string;
  show_event_details: boolean;
  show_pricing_overview: boolean;
  custom_css: string;
  background_image: string | null;
}

export interface EventDetailsStepConfig extends StepConfiguration {
  show_event_type_selection: boolean;
  require_event_name: boolean;
  require_description: boolean;
  require_guest_count: boolean;
  max_guest_count: number | null;
  require_venue_preference: boolean;
  venue_options: string[];
}

export interface DateTimeStepConfig extends StepConfiguration {
  allow_time_selection: boolean;
  allow_multi_day: boolean;
  show_calendar_view: boolean;
  min_duration_hours: number;
  max_duration_hours: number;
  default_duration_hours: number;
  enable_real_time_availability: boolean;
  blocked_dates: string[];
  available_days_of_week: number[];
  available_time_slots: any[];
  buffer_before_hours: number;
  buffer_after_hours: number;
}

export interface ContactInfoStepConfig extends StepConfiguration {
  require_full_name: boolean;
  require_email: boolean;
  require_phone: boolean;
  require_address: boolean;
  require_company: boolean;
  custom_fields: any[];
  offer_account_creation: boolean;
  require_account_creation: boolean;
}

export interface PaymentInfoStepConfig extends StepConfiguration {
  accept_full_payment: boolean;
  accept_deposit: boolean;
  deposit_type: 'PERCENTAGE' | 'FIXED';
  deposit_amount: string; // Decimal as string
  available_payment_methods: string[];
  require_immediate_payment: boolean;
  allow_payment_plans: boolean;
  payment_terms: string;
}

export interface ConfirmationStepConfig extends StepConfiguration {
  title: string;
  message: string;
  show_booking_summary: boolean;
  show_next_steps: boolean;
  next_steps_content: string;
  send_confirmation_email: boolean;
  send_calendar_invite: boolean;
  create_event_immediately: boolean;
}

// Request/Response Types
export interface BookingSessionCreateRequest {
  booking_flow: number;
  ip_address?: string;
  user_agent?: string;
  referrer_url?: string;
}

export interface BookingSessionUpdateRequest {
  session_id: string;
  step_id: number;
  step_data: SessionStepData;
  mark_completed?: boolean;
}

export interface SessionStepData {
  [key: string]: any;
  
  // Event Details Step
  event_name?: string;
  description?: string;
  guest_count?: number;
  venue_preference?: string;
  
  // Date Time Step
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  duration_hours?: number;
  
  // Contact Info Step
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  create_account?: boolean;
  
  // Package/Addon Selection Steps
  selected_packages?: Array<{
    id: number;
    quantity: number;
    price: string;
    options?: Record<string, any>;
  }>;
  selected_addons?: Array<{
    id: number;
    quantity: number;
    price: string;
    options?: Record<string, any>;
  }>;
  
  // Payment Step
  gateway_id?: number;
  payment_method_token?: string;
  payment_method_id?: string;
  billing_address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  
  // Questionnaire Step
  questionnaire_responses?: Record<string, any>;
  
  // Applied discounts
  applied_discount?: {
    code: string;
    amount: string;
    type: string;
  };
}

export interface BookingCompletionResponse {
  detail: string;
  event: any; // Event object from events domain
  session: BookingSession;
}

// UI State Types
export interface BookingWizardState {
  currentFlow: BookingFlow | null;
  currentSession: BookingSession | null;
  currentStepIndex: number;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  validationErrors: Record<string, string[]>;
  availablePaymentGateways: PaymentGateway[];
}

export interface StepFormData {
  [key: string]: any;
}

export interface StepValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

// Navigation Types
export interface StepNavigationInfo {
  canGoBack: boolean;
  canGoForward: boolean;
  currentStepIndex: number;
  totalSteps: number;
  nextStepType: string | null;
  previousStepType: string | null;
}

// Pricing Types
export interface PricingBreakdown {
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  line_items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    tax_rate: number;
  }>;
}

// Availability Types
export interface AvailabilityInfo {
  date: string;
  available: boolean;
  available_times: string[];
  blocked_times: string[];
  reason?: string;
}

// Product Selection Types
export interface ProductSelectionItem {
  product: ProductOption;
  quantity: number;
  selected_options?: Record<string, any>;
  calculated_price?: number;
}

// Event creation types from session
export interface EventCreationData {
  name: string;
  start_date: string;
  end_date?: string;
  guest_count?: number;
  description?: string;
  venue?: string;
  total_price: number;
  selected_products: Array<{
    product_option: number;
    quantity: number;
    final_price: number;
    num_participants?: number;
  }>;
  contact_info: {
    full_name: string;
    email: string;
    phone?: string;
    address?: string;
    company?: string;
  };
  questionnaire_responses?: Record<string, any>;
  payment_info?: {
    gateway_id: number;
    payment_method_token?: string;
    require_immediate_payment: boolean;
  };
}

// Error Types
export interface BookingFlowError {
  code: string;
  message: string;
  field?: string;
  step_type?: string;
}

export interface SessionValidationError {
  step_id: number;
  field: string;
  message: string;
}

// Utility types for form handling
export type StepType = BookingFlowStep['step_type'];

export type StepConfigMap = {
  introduction: IntroductionStepConfig;
  event_details: EventDetailsStepConfig;
  date_time: DateTimeStepConfig;
  contact_info: ContactInfoStepConfig;
  payment_info: PaymentInfoStepConfig;
  confirmation: ConfirmationStepConfig;
};

export type StepFormDataMap = {
  introduction: Record<string, never>; // No form data for intro
  event_details: {
    event_name?: string;
    description?: string;
    guest_count?: number;
    venue_preference?: string;
  };
  date_time: {
    start_date?: string;
    start_time?: string;
    end_date?: string;
    end_time?: string;
    duration_hours?: number;
  };
  questionnaire: {
    questionnaire_responses?: Record<string, any>;
  };
  package_selection: {
    selected_packages?: ProductSelectionItem[];
  };
  addon_selection: {
    selected_addons?: ProductSelectionItem[];
  };
  contact_info: {
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
    create_account?: boolean;
  };
  payment_info: {
    gateway_id?: number;
    payment_method_token?: string;
    payment_method_id?: string;
    billing_address?: Record<string, string>;
  };
  review_booking: Record<string, never>; // Read-only step
  confirmation: Record<string, never>; // Read-only step
};