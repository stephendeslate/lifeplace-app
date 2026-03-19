// frontend/admin-crm/src/types/bookingflows/configurations.types.ts
// Step configuration types for each booking flow step

import type { ChildPricingTier } from '../payments';

// Re-export ChildPricingTier for consumers that imported it from bookingflows
export type { ChildPricingTier };

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

export interface VenueSelectionStepConfiguration {
  id: number;
  step: number;
  min_venues: number;
  max_venues: number;
  show_pricing: boolean;
  show_included_hours: boolean;
  show_bundle_discount: boolean;
  bundle_discount_percent: string;
  title: string;
  description: string;
  // Package recommendation settings
  show_package_recommendations: boolean;
  show_view_packages_option: boolean;
  view_packages_button_text: string;
  available_venues_details?: Array<{
    id: number;
    name: string;
    code: string;
    description: string;
    standalone_base_price: string;
    standalone_included_hours: string;
    standalone_excess_hour_price: string;
  }>;
  created_at: string;
  updated_at: string;
}

// DateTimeStepConfiguration - date-only selection
export interface DateTimeStepConfiguration {
  id: number;
  step: number;
  allow_multi_day: boolean;
  min_event_days: number;
  max_event_days: number;
  show_calendar_view: boolean;
  enable_real_time_availability: boolean;
  show_availability_status: boolean;
  auto_check_conflicts: boolean;
  blocked_dates: string[];
  available_days_of_week: number[];
  available_time_slots: unknown[];
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

  // Event type filtering
  filter_by_event_type: boolean;

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

  // Event type filtering
  /** When true, show all active add-ons for the booking flow's event type. Default: true */
  filter_by_event_type: boolean;

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

  // Terms and Legal
  show_terms_checkbox: boolean;
  show_marketing_consent: boolean;
  require_terms_acceptance: boolean;
  terms_text: string;
  terms_url: string;
  privacy_url: string;
  effective_terms_url?: string;
  effective_privacy_url?: string;

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

/**
 * PaymentTermsConfiguration - Flow-specific payment terms that override global PaymentSettings.
 * All fields are nullable - null means "use global default".
 */
export interface PaymentTermsConfiguration {
  id: number;
  step: number;

  // Deposit configuration overrides (null = use global)
  deposit_type: 'PERCENTAGE' | 'FIXED' | null;
  deposit_percentage: number | null; // Decimal as number
  deposit_fixed_amount: number | null; // Decimal as number
  deposit_is_refundable: boolean | null;
  deposit_is_deductible: boolean | null;
  deposit_waived_on_full_payment: boolean | null;

  // Late fee configuration overrides (null = use global)
  late_fee_type: 'FIXED' | 'PERCENTAGE' | null;
  late_fee_amount: number | null; // Decimal as number
  late_fee_percentage: number | null; // Decimal as number

  // Security deposit configuration overrides (null = use global)
  security_deposit_enabled: boolean | null;
  security_deposit_amount: number | null; // Decimal as number
  security_deposit_is_refundable: boolean | null;
  security_deposit_description: string; // Empty string = use global

  // Cancellation configuration overrides (null = use global)
  cancellation_admin_fee_percentage: number | null; // Decimal as number

  // Payment schedule configuration overrides (null = use global)
  downpayment_percentage: number | null; // Decimal as number
  downpayment_due_days: number | null;
  balance_due_days: number | null;
  balance_due_type: 'DAYS_BEFORE' | 'DAY_BEFORE' | null;

  // Date blocking policy overrides (null = use global)
  date_blocking_policy: 'IMMEDIATE' | 'ON_DOWNPAYMENT' | null;
  downpayment_due_reference: 'DAYS_AFTER_BOOKING' | 'DAYS_BEFORE_EVENT' | null;
  downpayment_deadline_days: number | null;

  // Child/youth pricing overrides (null = use global)
  child_pricing_enabled: boolean | null;
  child_pricing_tiers: ChildPricingTier[] | null;

  // Computed field - merged settings (flow-specific + global defaults)
  effective_settings?: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

export type StepConfiguration =
  | IntroductionStepConfiguration
  | VenueSelectionStepConfiguration
  | DateTimeStepConfiguration
  | QuestionnaireStepConfiguration
  | PackageSelectionStepConfiguration
  | AddonSelectionStepConfiguration
  | PricingSummaryStepConfiguration
  | ContactInfoStepConfiguration
  | PaymentInfoStepConfiguration
  | ConfirmationStepConfiguration;
