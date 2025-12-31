/**
 * Core Booking Flow Types
 * Adapted from: frontend/client-portal/src/types/booking/core.types.ts
 */

/**
 * Event Type - represents a category of events (e.g., Weddings, Camps & Retreats)
 */
export interface EventType {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image_url?: string;
  is_active: boolean;
  display_order: number;
  features?: string[];
  starting_price?: string;
  color?: string;
  // Additional properties
  gallery_images?: string[];
  is_featured?: boolean;
}

/**
 * Available step types in a booking flow
 * Note: 'venue_selection' is a newer step type for custom package creation
 */
export type StepType =
  | 'introduction'
  | 'venue_selection'
  | 'date_time'
  | 'questionnaire'
  | 'package_selection'
  | 'addon_selection'
  | 'pricing_summary'
  | 'contact_info'
  | 'payment_info'
  | 'confirmation';

/**
 * Step type display labels for UI
 */
export const STEP_TYPE_LABELS: Record<StepType, string> = {
  introduction: 'Introduction',
  venue_selection: 'Venue Selection',
  date_time: 'Date & Time',
  questionnaire: 'Questionnaire',
  package_selection: 'Package Selection',
  addon_selection: 'Add-ons',
  pricing_summary: 'Pricing Summary',
  contact_info: 'Contact Information',
  payment_info: 'Payment',
  confirmation: 'Confirmation',
};

/**
 * Base interface for step configurations
 * Each step type has its own specific configuration that extends this
 */
export interface StepConfiguration {
  title?: string;
  description?: string;
  custom_css?: string;
}

/**
 * Conditional display logic for steps
 */
export interface StepDisplayCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  value?: unknown;
}

/**
 * Step validation rules - defines constraints for step data
 */
export interface StepValidationRules {
  // Field-level requirements
  required_fields?: string[];
  min_selections?: number;
  max_selections?: number;
  // Numeric constraints
  min_value?: number;
  max_value?: number;
  // Text constraints
  min_length?: number;
  max_length?: number;
  pattern?: string;
  // Date constraints
  min_date?: string;
  max_date?: string;
  // File constraints
  max_file_size_mb?: number;
  allowed_file_types?: string[];
  // Custom validation message
  error_message?: string;
}

/**
 * Individual step in a booking flow
 */
export interface BookingFlowStep {
  id: number;
  step_type: StepType;
  step_type_display: string;
  order: number;
  title: string;
  description?: string;
  is_required: boolean;
  is_skippable: boolean;
  is_enabled: boolean;
  display_conditions?: StepDisplayCondition[];
  /** @deprecated Use configuration_data for step-specific configuration */
  configuration: StepConfiguration;
  /** Step-specific configuration data returned by the API */
  configuration_data?: Record<string, unknown>;
  validation_rules?: StepValidationRules;
}

/**
 * Payment terms configuration for a booking flow
 */
export interface PaymentTermsConfig {
  allow_full_payment: boolean;
  allow_deposit: boolean;
  deposit_percentage: number;
  deposit_amount_fixed?: string;
  balance_due_days: number;
  balance_due_type: 'before_event' | 'after_booking' | 'custom_date';
  allow_quote_request: boolean;
  refund_policy_text?: string;
  refund_percentage: number;
  refund_deadline_hours: number;
  cancellation_policy?: string;
}

/**
 * Complete booking flow definition
 */
export interface BookingFlow {
  id: number;
  name: string;
  slug: string;
  description?: string;
  event_type: EventType;
  enabled_steps: BookingFlowStep[];
  /** @deprecated Use enabled_steps instead. Kept for backward compatibility */
  steps?: BookingFlowStep[];
  is_active: boolean;
  require_authentication: boolean;
  allow_guest_booking: boolean;
  require_account_creation: boolean;
  enable_progress_saving: boolean;
  session_timeout_minutes: number;
  max_advance_booking_days?: number;
  min_advance_booking_days?: number;
  allow_discounts: boolean;
  payment_terms?: PaymentTermsConfig;
  confirmation_email_template?: number;
  reminder_email_template?: number;
  success_message?: string;
  redirect_url?: string;
  is_test_mode: boolean;
}

/**
 * Simplified booking flow for list views
 */
export interface BookingFlowSummary {
  id: number;
  name: string;
  slug: string;
  description?: string;
  event_type: EventType;
  is_active: boolean;
  step_count: number;
}
