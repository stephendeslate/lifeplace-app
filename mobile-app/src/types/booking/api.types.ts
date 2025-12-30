/**
 * API Types for Booking Flow
 * Adapted from: frontend/client-portal/src/types/booking/api.types.ts
 */

import type { BookingFlowStep } from './core.types';
import type { BookingData, BookingSession } from './bookingData.types';

/**
 * Request payload to create a new booking session
 */
export interface BookingSessionCreate {
  booking_flow: number;
  initial_data?: Partial<BookingData>;
  referrer_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/**
 * Request payload to update session step data
 */
export interface BookingSessionUpdate {
  step_id: number;
  booking_data: Record<string, unknown>;
  mark_completed?: boolean;
}

/**
 * Response when starting a new booking session
 */
export interface BookingSessionStartResponse {
  session_id: string;
  current_step: BookingFlowStep;
  expires_at: string;
  progress_percentage: number;
}

/**
 * Full session response from GET /session/{uuid}/
 */
export interface BookingSessionGetResponse extends BookingSession {
  booking_flow_details?: {
    id: number;
    name: string;
    event_type_name: string;
  };
}

/**
 * Response when updating session data
 */
export interface BookingSessionUpdateResponse {
  session_id: string;
  total_price: string;
  updated_at: string;
  current_step?: BookingFlowStep;
  progress_percentage: number;
  validation_errors?: Record<string, string[]>;
  completed_steps?: number[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Result of step validation
 */
export interface StepValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

/**
 * Result of booking completion
 */
export interface BookingCompletionResult {
  success: boolean;
  event_id?: number;
  booking_reference: string;
  quote_reference?: string;
  status: 'confirmed' | 'pending' | 'pending_payment' | 'quote_requested' | 'failed';
  message: string;
  event_details?: {
    id: number;
    name: string;
    start_date: string;
    end_date?: string;
    venue_name?: string;
    total_amount: string;
  };
  payment_details?: {
    amount_paid: string;
    payment_method: string;
    transaction_id?: string;
  };
  next_steps?: string[];
  errors?: string[];
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Error response from API
 */
export interface ApiErrorResponse {
  message?: string;
  detail?: string;
  errors?: ValidationError[];
  validation_errors?: Record<string, string[]>;
  code?: string;
  status?: number;
}

/**
 * Session recovery info
 */
export interface RecoverableSessionInfo {
  session_id: string;
  booking_flow_name: string;
  event_type_name: string;
  current_step_name: string;
  progress_percentage: number;
  last_updated: string;
  expires_at: string;
}
