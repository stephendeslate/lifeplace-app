/**
 * Step Configuration Types for Booking Flow
 * Defines the configuration for each step type as received from the backend
 * Adapted from: frontend/client-portal/src/types/booking/stepConfigurations.types.ts
 */

import type { QuestionnaireStepItem } from './questionnaire.types';
import type { ProductOption, ProductCategory } from './stepData.types';
import type { RentableVenue } from './venues.types';

/**
 * Custom field definition for dynamic forms
 */
export interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'phone' | 'select' | 'checkbox' | 'date' | 'number';
  placeholder?: string;
  help_text?: string;
  is_required: boolean;
  options?: Array<{ value: string; label: string }>;
  validation_pattern?: string;
  validation_message?: string;
  order: number;
}

/**
 * Introduction step configuration
 */
export interface IntroductionStepConfiguration {
  title?: string;
  content?: string;
  show_event_details: boolean;
  show_pricing_overview: boolean;
  show_terms_acknowledgment: boolean;
  terms_text?: string;
  terms_url?: string;
  background_image?: string;
  custom_css?: string;
}

/**
 * Date/time step configuration
 */
export interface DateTimeStepConfiguration {
  title?: string;
  description?: string;
  allow_multi_day: boolean;
  min_event_days: number;
  max_event_days: number;
  show_calendar_view: boolean;
  enable_real_time_availability: boolean;
  auto_check_conflicts: boolean;
  blocked_dates?: string[];
  available_days_of_week?: number[]; // 0-6, 0 = Sunday
  available_time_slots?: Array<{
    day_of_week?: number;
    start_time: string;
    end_time: string;
  }>;
  buffer_before_hours: number;
  buffer_after_hours: number;
  min_advance_booking_days: number;
  max_advance_booking_days: number;
  check_venue_availability: boolean;
  check_resource_availability: boolean;
  check_staff_availability: boolean;
  allow_overbooking: boolean;
  timezone: string;
}

/**
 * Venue selection step configuration
 */
export interface VenueSelectionStepConfiguration {
  title?: string;
  description?: string;
  available_venues?: RentableVenue[];
  min_venues: number;
  max_venues: number;
  show_pricing: boolean;
  show_included_hours: boolean;
  show_bundle_discount: boolean;
  bundle_discount_percent: number;
  show_package_recommendations: boolean;
  filter_by_event_type: boolean;
  show_capacity: boolean;
  show_amenities: boolean;
  show_gallery: boolean;
}

/**
 * Questionnaire step configuration
 */
export interface QuestionnaireStepConfiguration {
  title?: string;
  description?: string;
  questionnaires: QuestionnaireStepItem[];
  allow_file_uploads: boolean;
  max_file_size_mb: number;
  allowed_file_types?: string[];
  show_progress_bar: boolean;
  group_by_section: boolean;
  validate_on_blur: boolean;
}

/**
 * Package selection step configuration
 */
export interface PackageSelectionStepConfiguration {
  title?: string;
  description?: string;
  available_categories?: ProductCategory[];
  available_packages?: ProductOption[];
  selection_type: 'SINGLE' | 'MULTIPLE';
  min_selection: number;
  max_selection: number;
  show_pricing: boolean;
  show_descriptions: boolean;
  show_images: boolean;
  show_included_hours: boolean;
  show_excess_hour_rates: boolean;
  enable_comparison: boolean;
  enable_dynamic_pricing: boolean;
  allow_custom_bundle: boolean;
  show_venue_hours_selector: boolean;
  group_by_category: boolean;
  highlight_featured: boolean;
  filter_by_event_type: boolean;
}

/**
 * Addon selection step configuration
 */
export interface AddonSelectionStepConfiguration {
  title?: string;
  description?: string;
  available_categories?: ProductCategory[];
  available_addons?: ProductOption[];
  min_selection: number;
  max_selection: number;
  show_pricing: boolean;
  show_descriptions: boolean;
  show_images: boolean;
  group_by_category: boolean;
  show_recommendations: boolean;
  show_quantity_selector: boolean;
  highlight_featured: boolean;
  show_venue_hours_continuation: boolean;
}

/**
 * Effective payment terms - merged from flow and global settings
 */
export interface EffectivePaymentTerms {
  allow_full_payment: boolean;
  allow_deposit: boolean;
  deposit_percentage: number;
  deposit_fixed_amount?: string;
  deposit_is_refundable: boolean;
  balance_due_days: number;
  balance_due_type: 'before_event' | 'after_booking' | 'custom_date';
  cancellation_policy?: string;
  refund_percentage: number;
  refund_deadline_hours: number;
  late_fee_enabled: boolean;
  late_fee_percentage?: number;
  late_fee_fixed_amount?: string;
}

/**
 * Contact info step configuration
 */
export interface ContactInfoStepConfiguration {
  title?: string;
  description?: string;
  require_full_name: boolean;
  require_email: boolean;
  require_phone: boolean;
  require_address: boolean;
  require_city: boolean;
  require_postal_code: boolean;
  require_country: boolean;
  require_company: boolean;
  show_job_title: boolean;
  custom_fields?: CustomField[];
  offer_account_creation: boolean;
  require_account_creation: boolean;
  password_requirements?: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_number: boolean;
    require_special: boolean;
  };
  show_welcome_back_for_authenticated: boolean;
  prefill_from_profile: boolean;
}

/**
 * Payment info step configuration
 */
export interface PaymentInfoStepConfiguration {
  title?: string;
  description?: string;
  accept_full_payment: boolean;
  accept_deposit: boolean;
  allow_payment_plans: boolean;
  allow_quote_request: boolean;
  require_immediate_payment: boolean;
  quote_request_button_text?: string;
  quote_request_description?: string;
  effective_payment_terms?: EffectivePaymentTerms;
  show_refund_policy: boolean;
  refund_policy_text?: string;
  show_saved_payment_methods: boolean;
  allow_save_payment_method: boolean;
  show_billing_address: boolean;
  require_billing_address: boolean;
  show_trust_signals: boolean;
  trust_signal_icons?: string[];
}

/**
 * Confirmation step configuration
 */
export interface ConfirmationStepConfiguration {
  title?: string;
  message?: string;
  show_booking_summary: boolean;
  show_payment_summary: boolean;
  show_questionnaire_summary: boolean;
  show_contact_summary: boolean;
  show_next_steps: boolean;
  next_steps_content?: Array<{
    icon?: string;
    title: string;
    description: string;
    action_url?: string;
    action_text?: string;
  }>;
  send_confirmation_email: boolean;
  send_calendar_invite: boolean;
  show_share_buttons: boolean;
  show_add_to_calendar: boolean;
  support_email?: string;
  support_phone?: string;
  custom_success_message?: string;
  redirect_url?: string;
  redirect_delay_seconds?: number;
}

/**
 * Pricing summary step configuration
 */
export interface PricingSummaryStepConfiguration {
  title?: string;
  description?: string;
  show_package_breakdown: boolean;
  show_addon_breakdown: boolean;
  show_venue_excess_hours: boolean;
  show_tax_breakdown: boolean;
  show_discount_field: boolean;
  allow_discount_codes: boolean;
  calculate_tax: boolean;
  tax_rate?: number;
  tax_inclusive: boolean;
  show_terms_checkbox: boolean;
  require_terms_acceptance: boolean;
  terms_text?: string;
  terms_url?: string;
  privacy_url?: string;
  show_marketing_consent: boolean;
  marketing_consent_text?: string;
  show_special_requests: boolean;
  special_requests_placeholder?: string;
  special_requests_max_length?: number;
  show_contact_summary: boolean;
  allow_contact_edit: boolean;
  header_text?: string;
  footer_text?: string;
}

/**
 * Union type of all step configurations
 */
export type StepConfiguration =
  | IntroductionStepConfiguration
  | DateTimeStepConfiguration
  | VenueSelectionStepConfiguration
  | QuestionnaireStepConfiguration
  | PackageSelectionStepConfiguration
  | AddonSelectionStepConfiguration
  | PricingSummaryStepConfiguration
  | ContactInfoStepConfiguration
  | PaymentInfoStepConfiguration
  | ConfirmationStepConfiguration;

/**
 * Helper type to get configuration type for a step type
 */
export interface StepConfigurationMap {
  introduction: IntroductionStepConfiguration;
  venue_selection: VenueSelectionStepConfiguration;
  date_time: DateTimeStepConfiguration;
  questionnaire: QuestionnaireStepConfiguration;
  package_selection: PackageSelectionStepConfiguration;
  addon_selection: AddonSelectionStepConfiguration;
  pricing_summary: PricingSummaryStepConfiguration;
  contact_info: ContactInfoStepConfiguration;
  payment_info: PaymentInfoStepConfiguration;
  confirmation: ConfirmationStepConfiguration;
}
