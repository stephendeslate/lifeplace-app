// frontend/client-portal/src/types/booking/stepConfigurations.types.ts

import type { StepConfiguration } from './core.types';
import type { QuestionnaireStepItem } from './questionnaire.types';

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
  check_resource_availability: boolean;
  check_staff_availability: boolean;
  availability_display_mode: 'FULL' | 'LIMITED' | 'SIMPLE';
  allow_overbooking: boolean;
  overbooking_threshold: number;
  sync_with_calendar: boolean;
  calendar_source: 'GOOGLE' | 'OUTLOOK' | 'EXTERNAL' | '';
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
  selection_type: 'SINGLE' | 'MULTIPLE';
  min_selection: number;
  max_selection: number;
  show_pricing: boolean;
  show_descriptions: boolean;
  show_images: boolean;
  enable_comparison: boolean;
  enable_dynamic_pricing: boolean;
  pricing_factors: Record<string, any>;
}

export interface AddonSelectionStepConfiguration extends StepConfiguration {
  available_categories: number[];
  available_categories_details: ProductCategory[];
  available_addons: number[];
  available_addons_details: ProductOption[];
  min_selection: number;
  max_selection: number;
  group_by_category: boolean;
  show_recommendations: boolean;
  recommendation_logic: Record<string, any>;
}

export interface ContactInfoStepConfiguration extends StepConfiguration {
  require_full_name: boolean;
  require_email: boolean;
  require_phone: boolean;
  require_address: boolean;
  require_company: boolean;
  custom_fields: any[];
  offer_account_creation: boolean;
  require_account_creation: boolean;
}

export interface PaymentInfoStepConfiguration extends StepConfiguration {
  accept_full_payment: boolean;
  accept_deposit: boolean;
  deposit_type: 'PERCENTAGE' | 'FIXED';
  deposit_amount: string;
  balance_due_days: number;
  allow_refunds: boolean;
  refund_deadline_days: number;
  refund_percentage: number;
  refund_policy_text: string;
  available_payment_methods: string[];
  require_immediate_payment: boolean;
  allowed_gateways: number[];
  default_gateway: number | null;
  allow_payment_plans: boolean;
  payment_terms: string;
  allow_quote_request: boolean;
  quote_request_button_text: string;
  quote_request_description: string;
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
  pricing_model: 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM';
  pricing_model_display: string;
  base_price: string;
  currency: string;
  tax_rate: string;
  type: 'PRODUCT' | 'PACKAGE';
  type_display: string;
  is_active: boolean;
  is_featured: boolean;
  allow_multiple: boolean;
  requires_approval: boolean;
  has_excess_hours: boolean;
  included_hours: number | null;
  excess_hour_price: string | null;
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
}