// frontend/client-portal/src/types/booking/bookingData.types.ts

import type {
  DateTimeStepData,
  SelectedPackage,
  SelectedAddon,
  ContactInfoStepData,
  PaymentStepData,
  PricingCalculation,
} from './stepData.types';

/**
 * Complete booking data structure stored in the session
 * This represents the flattened structure used throughout the booking flow
 */
export interface BookingData {
  // Event details
  event_type_id?: number;
  event_name?: string;
  
  // Date and time selection
  date_time?: DateTimeStepData;
  
  // Selected products (flattened structure)
  selected_packages?: SelectedPackage[];
  selected_addons?: SelectedAddon[];
  
  // Contact information
  contact_info?: ContactInfoStepData;
  
  // Payment information
  payment_info?: PaymentStepData;
  
  // Questionnaire responses (array of responses)
  questionnaire_responses?: Array<{
    questionnaire_id: number;
    responses: Record<string, unknown>;
  }>;
  
  // Pricing information (calculated by backend)
  pricing?: PricingCalculation;
  applied_discount_code?: string;
  
  // Additional information
  special_requests?: string;
  internal_notes?: string;
  
  // Terms and conditions
  terms_accepted?: boolean;
  marketing_consent?: boolean;
  
  // Step completion tracking
  completed_steps?: number[];
  current_step_id?: number;
  
  // Metadata
  source?: string;
  referrer?: string;
  utm_params?: Record<string, string>;
}

/**
 * Session update payload - what gets sent to the backend
 */
export interface SessionUpdatePayload {
  current_step_id?: number;
  booking_data: Partial<BookingData>;
  completed_steps?: number[];
}

/**
 * Booking session from backend
 */
export interface BookingSession {
  session_id: string;
  booking_flow: number;
  booking_flow_name?: string;
  current_step_id?: number;
  current_step?: Record<string, unknown>; // BookingFlowStep
  progress_percentage: number;
  expires_at: string;
  is_completed: boolean;
  is_abandoned: boolean;
  completed_at?: string;
  booking_data: BookingData;
  created_event?: number;
  total_price?: string;
  created_at: string;
  updated_at: string;
}