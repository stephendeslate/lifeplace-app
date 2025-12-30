/**
 * DateTime Step API
 *
 * API functions for date/time selection step.
 */

import api from '@/utils/api';
import { formatPhilippinesTime } from '@/utils/timezone';
import type { DateTimeStepData, StepValidationResult } from '@/types/booking';

// =============================================================================
// DATETIME API
// =============================================================================

export const DateTimeAPI = {
  /**
   * Validate date/time step data.
   *
   * POST /bookingflow/public/flows/session/:sessionId/validate/
   */
  validateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: DateTimeStepData
  ): Promise<StepValidationResult> => {
    const response = await api.post<StepValidationResult>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      {
        step_id: stepId,
        step_data: stepData,
      }
    );
    return response.data;
  },

  /**
   * Update date/time step data.
   *
   * PATCH /bookingflow/public/flows/session/:sessionId/update/
   */
  updateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: DateTimeStepData,
    markCompleted: boolean = false
  ): Promise<Record<string, unknown>> => {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted,
      }
    );
    return response.data as Record<string, unknown>;
  },

  /**
   * Check availability for a date.
   */
  checkAvailability: async (
    sessionId: string,
    stepId: number,
    stepData: DateTimeStepData
  ): Promise<{ available: boolean; message: string }> => {
    try {
      const validation = await DateTimeAPI.validateStepData(sessionId, stepId, stepData);
      return {
        available: validation.isValid,
        message: validation.isValid ? 'Available' : 'Please check your date selection',
      };
    } catch {
      return {
        available: false,
        message: 'Unable to check availability at this time',
      };
    }
  },

  /**
   * Format step data for submission.
   */
  formatStepData: (data: DateTimeStepData): DateTimeStepData => {
    return {
      start_date: data.start_date || '',
      end_date: data.end_date,
      start_time: data.start_time,
      end_time: data.end_time,
      venue_id: data.venue_id,
      is_flexible: data.is_flexible,
      resource_requirements: Array.isArray(data.resource_requirements)
        ? data.resource_requirements
        : [],
      staff_requirements: Array.isArray(data.staff_requirements) ? data.staff_requirements : [],
    };
  },

  /**
   * Validate data client-side.
   */
  validateData: (
    data: DateTimeStepData
  ): { isValid: boolean; errors: Record<string, string[]> } => {
    const errors: Record<string, string[]> = {};

    if (!data.start_date) {
      errors.start_date = ['Event date is required'];
    } else {
      const selectedDate = new Date(data.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        errors.start_date = ['Event date must be in the future'];
      }
    }

    // Validate end date if provided
    if (data.end_date && data.start_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);

      if (endDate < startDate) {
        errors.end_date = ['End date must be after start date'];
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Get default data.
   */
  getDefaultData: (): DateTimeStepData => {
    return {
      start_date: '',
      resource_requirements: [],
      staff_requirements: [],
    };
  },

  /**
   * Format date for display - Philippines timezone.
   */
  formatDate: (dateString: string): string => {
    if (!dateString) return '';

    try {
      return formatPhilippinesTime(dateString, 'EEEE, MMMM d, yyyy');
    } catch {
      return dateString;
    }
  },

  /**
   * Format time for display.
   */
  formatTime: (timeString: string): string => {
    if (!timeString) return '';

    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  },

  /**
   * Format duration for display.
   */
  formatDuration: (hours: number): string => {
    if (hours === 1) return '1 hour';
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    return `${hours} hours`;
  },
};

export default DateTimeAPI;
