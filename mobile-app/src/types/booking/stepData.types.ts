/**
 * Step Data Types for Booking Flow
 * Defines the data structure for each step's user input
 * Adapted from: frontend/client-portal/src/types/booking/stepData.types.ts
 */

import type { UploadedFile } from './questionnaire.types';

/**
 * Introduction step data
 */
export interface IntroductionStepData {
  acknowledged: boolean;
}

/**
 * Date/time step data
 */
export interface DateTimeStepData {
  start_date: string; // ISO 8601 date
  end_date?: string; // For multi-day events
  start_time?: string; // HH:mm
  end_time?: string;
  venue_id?: number;
  is_flexible?: boolean;
  resource_requirements?: Array<{
    resource_type: string;
    quantity: number;
  }>;
  staff_requirements?: Array<{
    role: string;
    quantity: number;
  }>;
}

/**
 * Venue selection step data
 */
export interface VenueSelectionStepData {
  selected_venue_ids: number[];
}

/**
 * Selected package with pricing details
 */
export interface SelectedPackage {
  product_id: number;
  name: string;
  description?: string;
  price: string;
  quantity: number;
  tax_rate?: number;
  price_with_tax?: string;
  included_hours?: number;
  excess_hours?: number;
  excess_hour_rate?: string;
  excess_hour_cost?: string;
  is_custom_bundle?: boolean;
  bundle_discount?: string;
  venues?: Array<{
    id: number;
    name: string;
    included_hours: number;
  }>;
  category_id?: number;
  category_name?: string;
  featured_image_url?: string;
}

/**
 * Package selection step data
 */
export interface PackageSelectionStepData {
  selected_packages: SelectedPackage[];
  venue_additional_hours?: Record<string, number>; // venue_id -> additional hours
  use_custom_bundle?: boolean;
}

/**
 * Selected addon with pricing details
 */
export interface SelectedAddon {
  product_id: number;
  name: string;
  description?: string;
  price: string;
  quantity: number;
  tax_rate?: number;
  price_with_tax?: string;
  category_id?: number;
  category_name?: string;
  featured_image_url?: string;
  min_quantity?: number;
  max_quantity?: number;
}

/**
 * Addon selection step data
 */
export interface AddonSelectionStepData {
  selected_addons: SelectedAddon[];
  venue_additional_hours?: Record<string, number>; // Continuation from package step
}

/**
 * Questionnaire step data - responses and uploads
 */
export interface QuestionnaireStepData {
  responses: Record<string, unknown>; // field_${fieldId}: value
  uploaded_files?: UploadedFile[];
  questionnaire_ids?: number[]; // Which questionnaires were answered
}

/**
 * Pricing summary step data
 */
export interface PricingSummaryStepData {
  applied_discount_code?: string;
  discount_amount?: string;
  discount_percentage?: number;
  special_requests?: string;
  terms_accepted: boolean;
  marketing_consent?: boolean;
  privacy_consent?: boolean;
}

/**
 * Contact information step data
 */
export interface ContactInfoStepData {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  company?: string;
  job_title?: string;
  create_account?: boolean;
  password?: string;
  custom_fields?: Record<string, unknown>;
}

/**
 * Payment step data
 */
export interface PaymentStepData {
  payment_method: string;
  payment_type: 'FULL' | 'DEPOSIT';
  payment_gateway_id?: number;
  payment_gateway_code?: string;
  payment_method_id?: string; // For saved payment methods
  payment_method_token?: string; // For new payment methods
  billing_address?: string;
  billing_city?: string;
  billing_postal_code?: string;
  billing_country?: string;
  save_payment_method?: boolean;
  completion_type?: 'payment' | 'quote';
  quote_message?: string;
  deposit_amount?: number;
  balance_due_days?: number;
}

/**
 * Confirmation step data
 */
export interface ConfirmationStepData {
  booking_reference?: string;
  quote_reference?: string;
  completion_status: 'pending' | 'processing' | 'completed' | 'failed';
  completed_at?: string;
  confirmation_email_sent?: boolean;
  error_message?: string;
}

/**
 * Union type of all step data
 */
export type StepData =
  | IntroductionStepData
  | DateTimeStepData
  | VenueSelectionStepData
  | PackageSelectionStepData
  | AddonSelectionStepData
  | QuestionnaireStepData
  | PricingSummaryStepData
  | ContactInfoStepData
  | PaymentStepData
  | ConfirmationStepData;

/**
 * Individual pricing line item
 */
export interface PricingLineItem {
  item_name: string;
  item_description?: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  type: 'PACKAGE' | 'ADDON' | 'TAX' | 'DISCOUNT' | 'FEE' | 'EXCESS_HOURS' | 'DEPOSIT' | 'BALANCE';
  venue_id?: number;
  venue_name?: string;
  product_id?: number;
  is_custom_bundle?: boolean;
}

/**
 * Per-venue excess hours breakdown
 */
export interface VenueExcessHours {
  venue_id: number;
  venue_name: string;
  included_hours: number;
  additional_hours: number;
  total_hours: number;
  hourly_rate: string;
  excess_cost: string;
}

/**
 * Complete pricing calculation from server
 */
export interface PricingCalculation {
  subtotal: string;
  tax: string;
  tax_rate: number;
  discount: string;
  discount_code?: string;
  discount_percentage?: number;
  total: string;
  deposit_amount?: string;
  balance_due?: string;
  balance_due_date?: string;
  formattedSubtotal: string;
  formattedTax: string;
  formattedDiscount: string;
  formattedTotal: string;
  formattedDeposit?: string;
  formattedBalance?: string;
  lineItems: PricingLineItem[];
  venueExcessHours?: VenueExcessHours[];
}

/**
 * Product option from backend
 */
export interface ProductOption {
  id: number;
  name: string;
  description?: string;
  short_description?: string;
  price: string;
  price_with_tax?: string;
  tax_rate?: number;
  category_id?: number;
  category_name?: string;
  product_type: 'package' | 'addon' | 'service';
  is_active: boolean;
  is_featured?: boolean;
  featured_image_url?: string;
  gallery_images?: string[];
  included_hours?: number;
  excess_hour_rate?: string;
  min_quantity?: number;
  max_quantity?: number;
  stock?: number;
  attributes?: Record<string, unknown>;
  venues?: Array<{
    id: number;
    name: string;
    included_hours: number;
  }>;
}

/**
 * Product category
 */
export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  slug: string;
  parent_id?: number;
  display_order: number;
  is_active: boolean;
  product_count?: number;
}

/**
 * Discount/promotion
 */
export interface Discount {
  id: number;
  code: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  min_order_amount?: string;
  max_discount_amount?: string;
  valid_from?: string;
  valid_until?: string;
  usage_limit?: number;
  usage_count?: number;
  is_active: boolean;
  applicable_products?: number[];
  applicable_categories?: number[];
}

/**
 * Booking review summary for confirmation
 */
export interface BookingReviewSummary {
  event_type: string;
  event_name?: string;
  venue_names: string[];
  date_range: string;
  packages: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  addons: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  contact: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  pricing: PricingCalculation;
  special_requests?: string;
  questionnaire_responses?: Array<{
    questionnaire_name: string;
    responses: Array<{
      label: string;
      value: string;
    }>;
  }>;
}
