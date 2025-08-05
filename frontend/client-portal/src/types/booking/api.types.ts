// frontend/client-portal/src/types/booking/api.types.ts

import type { BookingFlowStep } from './core.types';

// Session management API types
export interface BookingSessionCreate {
  booking_flow: number;
  ip_address?: string;
  user_agent?: string;
  referrer_url?: string;
}

export interface BookingSessionUpdate {
  step_id: number;
  step_data: Record<string, any>;
  mark_completed?: boolean;
}

export interface BookingSessionStartResponse {
  session_id: string;
  current_step: BookingFlowStep | null;
  expires_at: string;
  progress_percentage: number;
}

export interface BookingSessionGetResponse {
  session_id: string;
  booking_flow: number;
  current_step: BookingFlowStep | null;
  progress_percentage: number;
  expires_at: string;
  is_completed: boolean;
  is_abandoned: boolean;
  total_price: string;
}

export interface BookingSessionUpdateResponse {
  session_id: string;
  current_step: BookingFlowStep | null;
  progress_percentage: number;
  validation_errors: Record<string, any>;
  total_price: string;
  updated_at: string;
}

export interface BookingCompletionResult {
  detail: string;
  event: any; // Event from events domain
  session_id: string;
  user_created?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface StepValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}