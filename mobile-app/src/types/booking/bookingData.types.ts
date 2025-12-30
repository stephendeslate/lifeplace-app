/**
 * Booking Data Types
 * Defines the complete booking data structure stored in the session
 * Adapted from: frontend/client-portal/src/types/booking/bookingData.types.ts
 */

import type { BookingFlowStep } from './core.types';
import type {
  SelectedPackage,
  SelectedAddon,
  PricingCalculation,
  ContactInfoStepData,
  PaymentStepData,
  DateTimeStepData,
  VenueSelectionStepData,
} from './stepData.types';
import type { QuestionnaireFieldValues } from './questionnaire.types';

/**
 * Questionnaire response for storage
 */
export interface QuestionnaireResponse {
  questionnaire_id: number;
  questionnaire_name?: string;
  responses: QuestionnaireFieldValues;
  uploaded_file_urls?: string[];
}

/**
 * Complete booking data - flattened structure for session storage
 */
export interface BookingData {
  // Event Information
  event_type_id?: number;
  event_type_name?: string;
  event_name?: string;

  // Venue Selection
  venue_selection?: VenueSelectionStepData;

  // Date/Time
  date_time?: DateTimeStepData;

  // Products
  selected_packages?: SelectedPackage[];
  selected_addons?: SelectedAddon[];
  venue_additional_hours?: Record<string, number>;

  // Contact Information
  contact_info?: ContactInfoStepData;

  // Payment Information
  payment_info?: PaymentStepData;

  // Questionnaires
  questionnaire_responses?: QuestionnaireResponse[];

  // Pricing
  pricing?: PricingCalculation;
  applied_discount_code?: string;
  discount_amount?: string;

  // Preferences
  special_requests?: string;
  internal_notes?: string;

  // Consent
  terms_accepted?: boolean;
  marketing_consent?: boolean;
  privacy_consent?: boolean;

  // Progress Tracking
  completed_steps?: number[];
  current_step_id?: number;
  last_completed_step?: string;

  // Metadata
  referrer_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  user_agent?: string;
  ip_address?: string;
}

/**
 * Payload for updating session data
 */
export interface SessionUpdatePayload {
  step_id: number;
  booking_data: Partial<BookingData>;
  mark_completed?: boolean;
}

/**
 * Complete booking session from backend
 */
export interface BookingSession {
  session_id: string;
  booking_flow: number;
  booking_flow_id?: number; // Alias for booking_flow
  booking_flow_name?: string;
  event_type_name?: string;
  current_step?: BookingFlowStep;
  current_step_id?: number;
  completed_steps: number[];
  progress_percentage?: number;
  expires_at: string;
  is_completed?: boolean;
  is_abandoned?: boolean;
  total_price?: string;
  booking_data: BookingData;
  created_at?: string;
  updated_at?: string;
  client_id?: number;
  created_event_id?: number;
  validation_errors?: Record<string, string[]>;
}

/**
 * Minimal session info for recovery
 */
export interface SessionRecoveryInfo {
  session_id: string;
  booking_flow_id: number;
  booking_flow_name: string;
  event_type_name: string;
  current_step_name: string;
  progress_percentage: number;
  last_updated: string;
  expires_at: string;
  total_price?: string;
}

/**
 * Session storage format for local persistence
 */
export interface StoredSession {
  session_id: string;
  booking_flow_id: number;
  booking_data: BookingData;
  current_step_id?: number;
  completed_steps: number[];
  total_price?: string;
  expires_at: string;
  last_synced_at: string;
  pending_sync: boolean;
}

/**
 * Session sync status
 */
export interface SessionSyncStatus {
  is_synced: boolean;
  last_synced_at?: string;
  pending_changes: boolean;
  sync_error?: string;
}
