// frontend/client-portal/src/types/booking/core.types.ts

// Core domain types from backend models

export interface EventType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface BookingFlow {
  id: number;
  name: string;
  description: string;
  event_type?: number;
  event_type_name: string | null;
  allow_guest_booking: boolean;
  require_account_creation: boolean;
  enable_progress_saving: boolean;
  max_advance_booking_days: number;
  min_advance_booking_days: number;
  enabled_steps: BookingFlowStep[];
  total_steps: number;
}

export interface BookingFlowStep {
  id: number;
  booking_flow: number;
  step_type: StepType;
  step_type_display: string;
  description: string;
  order: number;
  is_enabled: boolean;
  is_required: boolean;
  is_skippable: boolean;
  display_conditions: Record<string, unknown>;
  configuration: Record<string, unknown>;
  validation_rules: Record<string, unknown>;
  configuration_data: StepConfiguration | null;
  created_at: string;
  updated_at: string;
}

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

export interface StepConfiguration {
  id: number;
  step: number;
  created_at: string;
  updated_at: string;
}