// frontend/client-portal/src/types/booking/stepConfigurations.types.ts

import type { StepConfiguration } from "./core.types";
import type { QuestionnaireStepItem } from "./questionnaire.types";

export interface CustomField {
  id: string;
  name: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "multiselect"
    | "checkbox"
    | "radio"
    | "date"
    | "number"
    | "email"
    | "phone"
    | "file";
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: Record<string, string | number | boolean>;
}

// Step configuration types from backend models
export interface IntroductionStepConfiguration extends StepConfiguration {
  title: string;
  content: string;
  show_event_details: boolean;
  show_pricing_overview: boolean;
  custom_css: string;
  background_image: string | null;
}

export interface DateTimeStepConfiguration extends StepConfiguration {
  allow_multi_day: boolean;
  min_event_days: number;
  max_event_days: number;
  show_calendar_view: boolean;
  enable_real_time_availability: boolean;
  show_availability_status: boolean;
  auto_check_conflicts: boolean;
  blocked_dates: string[];
  available_days_of_week: number[];
  buffer_before_hours: number;
  buffer_after_hours: number;
  check_resource_availability: boolean;
  check_staff_availability: boolean;
  availability_display_mode: "FULL" | "LIMITED" | "SIMPLE";
  allow_overbooking: boolean;
  overbooking_threshold: number;
  sync_with_calendar: boolean;
  calendar_source: "GOOGLE" | "OUTLOOK" | "EXTERNAL" | "";
}

export interface QuestionnaireStepConfiguration extends StepConfiguration {
  allow_file_uploads: boolean;
  max_file_size_mb: number;
  allowed_file_types: string[];
  questionnaire_items: QuestionnaireStepItem[];
}

export interface PackageSelectionStepConfiguration extends StepConfiguration {
  available_categories: number[];
  available_categories_details: ProductCategory[];
  available_packages: number[];
  available_packages_details: ProductOption[];
  selection_type: "SINGLE" | "MULTIPLE";
  min_selection: number;
  max_selection: number;
  show_pricing: boolean;
  show_descriptions: boolean;
  show_images: boolean;
  enable_comparison: boolean;
  enable_dynamic_pricing: boolean;
  pricing_factors: Record<string, string | number | boolean>;
  /** When true, filter packages by the booking flow's event type. Default: true */
  filter_by_event_type?: boolean;
}

export interface AddonSelectionStepConfiguration extends StepConfiguration {
  available_categories: number[];
  available_categories_details: ProductCategory[];
  available_addons: number[];
  available_addons_details: ProductOption[];
  min_selection: number;
  max_selection: number;
  /** When true, show all active add-ons for the booking flow's event type. Default: true */
  filter_by_event_type?: boolean;
  group_by_category: boolean;
  show_recommendations: boolean;
  recommendation_logic: Record<string, string | number | boolean>;
}

export interface ContactInfoStepConfiguration extends StepConfiguration {
  require_full_name: boolean;
  require_email: boolean;
  require_phone: boolean;
  require_address: boolean;
  require_company: boolean;
  custom_fields: CustomField[];
  offer_account_creation: boolean;
  require_account_creation: boolean;
}

// Effective payment terms - merged flow-specific overrides with global defaults
// Returned by backend PaymentTermsResolver.get_terms_for_step()
export interface EffectivePaymentTerms {
  // Deposit settings
  deposit_type: "PERCENTAGE" | "FIXED";
  deposit_percentage: number;
  deposit_fixed_amount: number | null;
  deposit_is_refundable: boolean;
  deposit_is_deductible: boolean;
  deposit_waived_on_full_payment: boolean;
  // Late fee settings
  late_fee_enabled: boolean;
  late_fee_type: "FIXED" | "PERCENTAGE";
  late_fee_amount: number;
  late_fee_percentage: number;
  // Security deposit settings
  security_deposit_enabled: boolean;
  security_deposit_amount: number;
  security_deposit_is_refundable: boolean;
  security_deposit_description: string;
  // Cancellation/refund settings
  cancellation_admin_fee_percentage: number;
  allow_refunds: boolean;
  refund_percentage: number;
  refund_deadline_hours: number;
  // Payment schedule settings
  downpayment_percentage: number;
  downpayment_due_days: number;
  balance_due_days: number;
  balance_due_type: "DAYS_BEFORE" | "DAY_BEFORE";
  // Other settings
  currency: string;
  grace_period_days?: number;
}

// FULLY CONSOLIDATED: ALL payment business logic now in PaymentPlanSettings (payments domain)
// This configuration contains ONLY UI/UX flags and custom text
//
// REMOVED and moved to PaymentPlanSettings (Phase 2 - Full DRY Compliance):
// - deposit_type, deposit_amount, balance_due_days (payment plan calculation)
// - allow_refunds, refund_deadline_hours, refund_percentage, refund_policy_text (refund policy)
// - allowed_gateways, default_gateway, available_payment_methods (payment gateway defaults)
//
// ADDED: effective_payment_terms - merged flow-specific overrides with global defaults
export interface PaymentInfoStepConfiguration extends StepConfiguration {
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

  // Effective payment terms (merged flow + global settings)
  // Optional for backwards compatibility - falls back to global PaymentPlanSettings if missing
  effective_payment_terms?: EffectivePaymentTerms;
}

export interface ConfirmationStepConfiguration extends StepConfiguration {
  title: string;
  message: string;
  show_booking_summary: boolean;
  show_next_steps: boolean;
  next_steps_content: string;
  send_confirmation_email: boolean;
  send_calendar_invite: boolean;
  create_event_immediately: boolean;
}

export interface PricingSummaryStepConfiguration extends StepConfiguration {
  // Pricing display options
  show_package_breakdown: boolean;
  show_addon_breakdown: boolean;
  show_tax_breakdown: boolean;
  show_discount_field: boolean;
  show_subtotal: boolean;
  allow_discount_codes: boolean;
  calculate_tax: boolean;
  header_text: string;
  footer_text: string;
  discount_help_text: string;

  // Review/booking summary options (consolidated from review step)
  show_booking_review?: boolean;
  show_event_details?: boolean;
  show_contact_details?: boolean;
  show_terms_checkbox?: boolean;
  show_marketing_consent?: boolean;
  show_special_requests?: boolean;
  require_terms_acceptance?: boolean;
  terms_text?: string;
  terms_url?: string;
  privacy_url?: string;
  effective_terms_url?: string;
  effective_privacy_url?: string;
}

// Product types from products domain (needed for package/addon steps)
export interface ProductCategory {
  id: number;
  name: string;
  description: string;
  slug: string;
  parent: number | null;
  is_active: boolean;
  sort_order: number;
  typical_duration_hours: number | null;
  full_path: string;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface ProductOption {
  id: number;
  name: string;
  description: string;
  category: number;
  category_name: string;
  category_path: string;
  pricing_model: "FIXED" | "HOURLY" | "TIERED" | "CUSTOM";
  pricing_model_display: string;
  pricing_unit?: "PER_EVENT" | "PER_PERSON" | "PER_HOUR";
  pricing_unit_display?: string;
  minimum_guests?: number;
  maximum_guests?: number;
  recommended_guests?: number;
  base_price: string;
  currency: string;
  is_tax_inclusive: boolean;
  type: "PRODUCT" | "PACKAGE";
  type_display: string;
  is_active: boolean;
  is_featured: boolean;
  allow_multiple: boolean;
  maximum_quantity: number | null;
  requires_approval: boolean;
  minimum_hours: number | null;
  maximum_hours: number | null;
  advance_booking_days: number;
  maximum_booking_days: number | null;
  sku: string | null;
  sort_order: number;
  event_type: number | null;
  formatted_price: string;
  price_with_tax: string;
  created_at: string;
  updated_at: string;
  // Event duration for multi-day packages (from backend)
  event_days?: number | null;
  // Custom bundle properties (used for virtual packages created from venue selection)
  included_hours?: number | string | null;
  excess_hour_price?: string;
  has_excess_hours?: boolean;
}
