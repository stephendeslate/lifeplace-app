// frontend/client-portal/src/apis/booking/datetime.api.ts

import api from '../../utils/api';
import { formatInTimeZone } from 'date-fns-tz';
import type {
  DateTimeStepData,
  StepValidationResult,
} from '../../types/booking';

/**
 * Date step API functions (date-only selection)
 */
export class DateTimeApi {

  /**
   * Validate date step data
   */
  static async validateStepData(
    sessionId: string,
    stepId: number,
    stepData: DateTimeStepData
  ): Promise<StepValidationResult> {
    const response = await api.post<StepValidationResult>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      {
        step_id: stepId,
        step_data: stepData
      }
    );
    return response.data;
  }

  /**
   * Update date step data
   */
  static async updateStepData(
    sessionId: string,
    stepId: number,
    stepData: DateTimeStepData,
    markCompleted: boolean = false
  ): Promise<Record<string, unknown>> {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted
      }
    );
    return response.data as Record<string, unknown>;
  }

  /**
   * Check availability for a date
   */
  static async checkAvailability(
    sessionId: string,
    stepData: DateTimeStepData
  ): Promise<{ available: boolean; message: string }> {
    try {
      const validation = await this.validateStepData(sessionId, 0, stepData);
      return {
        available: validation.isValid,
        message: validation.isValid ? 'Available' : 'Please check your date selection'
      };
    } catch {
      return {
        available: false,
        message: 'Unable to check availability at this time'
      };
    }
  }

  /**
   * Format date step data for submission
   */
  static formatStepData(data: DateTimeStepData): DateTimeStepData {
    return {
      start_date: data.start_date || '',
      venue_id: data.venue_id,
      resource_requirements: Array.isArray(data.resource_requirements)
        ? data.resource_requirements
        : [],
      staff_requirements: Array.isArray(data.staff_requirements)
        ? data.staff_requirements
        : [],
    };
  }

  /**
   * Validate date data client-side
   */
  static validateData(data: DateTimeStepData): { isValid: boolean; errors: Record<string, string[]> } {
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

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Get default date data
   */
  static getDefaultData(): DateTimeStepData {
    return {
      start_date: '',
      resource_requirements: [],
      staff_requirements: [],
    };
  }

  /**
   * Format date for display - always Philippines timezone
   */
  static formatDate(dateString: string): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return formatInTimeZone(date, 'Asia/Manila', 'EEEE, MMMM d, yyyy');
    } catch {
      return dateString;
    }
  }
}

export default DateTimeApi;