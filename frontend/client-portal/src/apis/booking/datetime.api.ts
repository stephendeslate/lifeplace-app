// frontend/client-portal/src/apis/booking/datetime.api.ts

import api from '../../utils/api';
import { formatInTimeZone } from 'date-fns-tz';
import type {
  DateTimeStepData,
  StepValidationResult,
} from '../../types/booking';

/**
 * Date & Time step API functions
 */
export class DateTimeApi {
  
  /**
   * Validate date/time step data
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
   * Update date/time step data
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
   * Check availability for a date/time (placeholder for real availability API)
   */
  static async checkAvailability(
    sessionId: string,
    stepData: DateTimeStepData
  ): Promise<{ available: boolean; message: string }> {
    // This would integrate with actual availability checking system
    // For MVP, we'll do basic validation
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
   * Format date/time step data for submission
   */
  static formatStepData(data: DateTimeStepData): DateTimeStepData {
    return {
      start_date: data.start_date || '',
      start_time: data.start_time || '',
      end_date: data.end_date || '',
      end_time: data.end_time || '',
      duration: Number(data.duration) || 0,
      resource_requirements: Array.isArray(data.resource_requirements) 
        ? data.resource_requirements 
        : [],
      staff_requirements: Array.isArray(data.staff_requirements) 
        ? data.staff_requirements 
        : [],
    };
  }

  /**
   * Validate date/time data client-side
   */
  static validateData(data: DateTimeStepData): { isValid: boolean; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};

    // Required start date
    if (!data.start_date) {
      errors.start_date = ['Event date is required'];
    } else {
      // Check if date is in the future
      const selectedDate = new Date(data.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.start_date = ['Event date must be in the future'];
      }
    }

    // Validate time format if provided
    if (data.start_time && !this.isValidTimeFormat(data.start_time)) {
      errors.start_time = ['Please enter a valid time format'];
    }

    if (data.end_time && !this.isValidTimeFormat(data.end_time)) {
      errors.end_time = ['Please enter a valid time format'];
    }

    // Validate duration
    if (data.duration && (data.duration < 1 || data.duration > 24)) {
      errors.duration = ['Duration must be between 1 and 24 hours'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate time format (HH:mm)
   */
  static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  }

  /**
   * Get default date/time data
   */
  static getDefaultData(): DateTimeStepData {
    return {
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      duration: 4,
      resource_requirements: [],
      staff_requirements: [],
    };
  }

  /**
   * Calculate end date/time based on start and duration
   */
  static calculateEndDateTime(startDate: string, startTime: string, duration: number): {
    end_date: string;
    end_time: string;
  } {
    if (!startDate || !duration) {
      return { end_date: '', end_time: '' };
    }

    try {
      const start = new Date(startDate);
      
      if (startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        start.setHours(hours, minutes, 0, 0);
      }

      const end = new Date(start.getTime() + (duration * 60 * 60 * 1000));

      return {
        end_date: end.toISOString().split('T')[0],
        end_time: end.toTimeString().split(' ')[0].slice(0, 5),
      };
    } catch {
      return { end_date: '', end_time: '' };
    }
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

  /**
   * Format time for display - always Philippines timezone with PHT indicator
   */
  static formatTime(timeString: string): string {
    if (!timeString) return '';

    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const formatted = formatInTimeZone(date, 'Asia/Manila', 'h:mm a');
      return `${formatted} PHT`;
    } catch {
      return timeString;
    }
  }
}

export default DateTimeApi;