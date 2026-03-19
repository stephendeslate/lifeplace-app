// frontend/admin-crm/src/types/bookingflows/core.types.ts
// Core booking flow entities and step types

import type { StepConfiguration } from './configurations.types';

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

// Step types matching backend STEP_TYPES exactly
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

// Step types matching backend STEP_TYPES exactly
export const STEP_TYPES = [
  { value: 'introduction', label: 'Introduction' },
  { value: 'venue_selection', label: 'Venue Selection' },
  { value: 'date_time', label: 'Date & Time Selection' },
  { value: 'questionnaire', label: 'Questionnaire' },
  { value: 'package_selection', label: 'Package Selection' },
  { value: 'addon_selection', label: 'Add-on Selection' },
  { value: 'pricing_summary', label: 'Pricing Summary' },
  { value: 'contact_info', label: 'Contact Information' },
  { value: 'payment_info', label: 'Payment Information' },
  { value: 'confirmation', label: 'Confirmation' },
] as const;
