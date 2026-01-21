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
  ip_address?: string;
  user_agent?: string;
}

/**
 * Request payload to update session step data
 */
export interface BookingSessionUpdate {
  step_id: number;
  booking_data: Partial<BookingData>;
  mark_completed?: boolean;
}

/**
 * Response when starting a new booking session
 */
export interface BookingSessionStartResponse {
  session_id: string;
  current_step: BookingFlowStep;
  current_step_id?: number;
  expires_at: string;
  progress_percentage: number;
  booking_flow_id?: number;
  completed_steps?: number[];
  booking_data?: Partial<BookingData>;
  total_price?: string;
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
  current_step_id?: number;
  progress_percentage: number;
  validation_errors?: Record<string, string[]>;
  completed_steps?: number[];
  booking_data?: Partial<BookingData>;
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
  errors: ValidationError[] | Record<string, string[]>;
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
  status: 'confirmed' | 'pending' | 'pending_payment' | 'quote_requested' | 'completed' | 'failed';
  message: string;
  payment_status?: 'pending' | 'partial' | 'paid' | 'failed' | 'refunded';
  payment_type?: 'payment' | 'quote';
  balance_due?: string;
  contract_required?: boolean;
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
