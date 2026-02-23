// frontend/admin-crm/src/utils/validation.utils.ts

import { validatePhoneNumber } from '@shared/utils/phoneValidation';

/**
 * Enterprise-level validation utilities
 * Provides comprehensive validation functions with detailed error messages
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class ValidationUtils {
  /**
   * Validates date availability request parameters
   */
  static validateAvailabilityRequest(data: {
    date?: string;
    startDate?: string;
    endDate?: string;
    eventType?: string;
    duration?: number;
    bufferTime?: number;
  }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate date format
    if (data.date && !this.isValidDateString(data.date)) {
      errors.push({
        field: 'date',
        message: 'Invalid date format. Expected ISO 8601 format (YYYY-MM-DD)',
        code: 'INVALID_DATE_FORMAT',
        severity: 'error',
      });
    }

    // Validate date range
    if (data.startDate && data.endDate) {
      if (!this.isValidDateString(data.startDate)) {
        errors.push({
          field: 'startDate',
          message: 'Invalid start date format. Expected ISO 8601 format (YYYY-MM-DD)',
          code: 'INVALID_START_DATE_FORMAT',
          severity: 'error',
        });
      }

      if (!this.isValidDateString(data.endDate)) {
        errors.push({
          field: 'endDate',
          message: 'Invalid end date format. Expected ISO 8601 format (YYYY-MM-DD)',
          code: 'INVALID_END_DATE_FORMAT',
          severity: 'error',
        });
      }

      if (
        data.startDate &&
        data.endDate &&
        this.isValidDateString(data.startDate) &&
        this.isValidDateString(data.endDate)
      ) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        if (startDate >= endDate) {
          errors.push({
            field: 'dateRange',
            message: 'End date must be after start date',
            code: 'INVALID_DATE_RANGE',
            severity: 'error',
          });
        }

        const daysDifference = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysDifference > 365) {
          warnings.push({
            field: 'dateRange',
            message: 'Date range exceeds 1 year. Performance may be impacted.',
            code: 'LARGE_DATE_RANGE',
            severity: 'warning',
          });
        }
      }
    }

    // Validate duration
    if (data.duration !== undefined) {
      if (!Number.isInteger(data.duration) || data.duration <= 0) {
        errors.push({
          field: 'duration',
          message: 'Duration must be a positive integer in minutes',
          code: 'INVALID_DURATION',
          severity: 'error',
        });
      } else if (data.duration > 1440) {
        warnings.push({
          field: 'duration',
          message: 'Duration exceeds 24 hours. Consider breaking into multiple events.',
          code: 'LONG_DURATION',
          severity: 'warning',
        });
      }
    }

    // Validate buffer time
    if (data.bufferTime !== undefined) {
      if (!Number.isInteger(data.bufferTime) || data.bufferTime < 0) {
        errors.push({
          field: 'bufferTime',
          message: 'Buffer time must be a non-negative integer in minutes',
          code: 'INVALID_BUFFER_TIME',
          severity: 'error',
        });
      } else if (data.bufferTime > 480) {
        warnings.push({
          field: 'bufferTime',
          message: 'Buffer time exceeds 8 hours. This may limit availability significantly.',
          code: 'LARGE_BUFFER_TIME',
          severity: 'warning',
        });
      }
    }

    // Validate event type
    if (data.eventType && typeof data.eventType !== 'string') {
      errors.push({
        field: 'eventType',
        message: 'Event type must be a valid string',
        code: 'INVALID_EVENT_TYPE',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates booking request data
   */
  static validateBookingRequest(data: {
    date?: string;
    time?: string;
    eventType?: string;
    clientType?: 'CLIENT' | 'LEAD';
    duration?: number;
    clientId?: number;
    contactInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate required fields
    if (!data.date) {
      errors.push({
        field: 'date',
        message: 'Date is required',
        code: 'MISSING_DATE',
        severity: 'error',
      });
    } else if (!this.isValidDateString(data.date)) {
      errors.push({
        field: 'date',
        message: 'Invalid date format. Expected ISO 8601 format (YYYY-MM-DD)',
        code: 'INVALID_DATE_FORMAT',
        severity: 'error',
      });
    } else {
      const bookingDate = new Date(data.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (bookingDate < today) {
        errors.push({
          field: 'date',
          message: 'Cannot book events in the past',
          code: 'PAST_DATE_BOOKING',
          severity: 'error',
        });
      }

      const maxBookingDate = new Date();
      maxBookingDate.setFullYear(maxBookingDate.getFullYear() + 2);

      if (bookingDate > maxBookingDate) {
        warnings.push({
          field: 'date',
          message: 'Booking date is more than 2 years in the future',
          code: 'FAR_FUTURE_BOOKING',
          severity: 'warning',
        });
      }
    }

    // Validate time format
    if (!data.time) {
      errors.push({
        field: 'time',
        message: 'Time is required',
        code: 'MISSING_TIME',
        severity: 'error',
      });
    } else if (!this.isValidTimeString(data.time)) {
      errors.push({
        field: 'time',
        message: 'Invalid time format. Expected HH:MM format',
        code: 'INVALID_TIME_FORMAT',
        severity: 'error',
      });
    }

    // Validate client type
    if (!data.clientType) {
      errors.push({
        field: 'clientType',
        message: 'Client type is required',
        code: 'MISSING_CLIENT_TYPE',
        severity: 'error',
      });
    } else if (!['CLIENT', 'LEAD'].includes(data.clientType)) {
      errors.push({
        field: 'clientType',
        message: 'Client type must be either CLIENT or LEAD',
        code: 'INVALID_CLIENT_TYPE',
        severity: 'error',
      });
    }

    // Validate contact info for leads
    if (data.clientType === 'LEAD' && !data.clientId) {
      if (!data.contactInfo?.name) {
        errors.push({
          field: 'contactInfo.name',
          message: 'Contact name is required for leads',
          code: 'MISSING_LEAD_NAME',
          severity: 'error',
        });
      }

      if (!data.contactInfo?.email) {
        errors.push({
          field: 'contactInfo.email',
          message: 'Contact email is required for leads',
          code: 'MISSING_LEAD_EMAIL',
          severity: 'error',
        });
      } else if (!this.isValidEmail(data.contactInfo.email)) {
        errors.push({
          field: 'contactInfo.email',
          message: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT',
          severity: 'error',
        });
      }

      if (data.contactInfo?.phone && !this.isValidPhoneNumber(data.contactInfo.phone)) {
        warnings.push({
          field: 'contactInfo.phone',
          message: 'Phone number format may not be valid',
          code: 'INVALID_PHONE_FORMAT',
          severity: 'warning',
        });
      }
    }

    // Validate client ID for existing clients
    if (data.clientType === 'CLIENT' && !data.clientId) {
      errors.push({
        field: 'clientId',
        message: 'Client ID is required for existing clients',
        code: 'MISSING_CLIENT_ID',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates date string format (YYYY-MM-DD)
   */
  private static isValidDateString(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;

    const date = new Date(dateString + 'T00:00:00.000Z');
    return date.toISOString().substring(0, 10) === dateString;
  }

  /**
   * Validates time string format (HH:MM)
   */
  private static isValidTimeString(timeString: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  }

  /**
   * Validates email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates phone number format using libphonenumber (PH default, international supported)
   */
  private static isValidPhoneNumber(phone: string): boolean {
    return validatePhoneNumber(phone);
  }

  /**
   * Formats validation errors for display
   */
  static formatValidationErrors(result: ValidationResult): string {
    if (result.isValid) return '';

    const errorMessages = result.errors.map((error) => `• ${error.message}`);
    const warningMessages = result.warnings.map((warning) => `• ${warning.message}`);

    let message = '';
    if (errorMessages.length > 0) {
      message += `Errors:\n${errorMessages.join('\n')}`;
    }
    if (warningMessages.length > 0) {
      if (message) message += '\n\n';
      message += `Warnings:\n${warningMessages.join('\n')}`;
    }

    return message;
  }

  /**
   * Sanitizes and validates API error responses
   */
  static handleApiError(error: unknown): {
    message: string;
    code?: string;
    details?: unknown;
  } {
    // Type guard for error with response property
    if (!error || typeof error !== 'object' || !('response' in error)) {
      return {
        message: 'Network error. Please check your connection and try again.',
        code: 'NETWORK_ERROR',
      };
    }

    const errorResponse = error.response as { status: number; data?: unknown };
    const status = errorResponse.status;
    const data = errorResponse.data as Record<string, unknown> | undefined;

    // Handle different HTTP status codes
    switch (status) {
      case 400:
        return {
          message:
            (typeof data?.message === 'string' ? data.message : '') ||
            'Invalid request. Please check your input and try again.',
          code: 'BAD_REQUEST',
          details: data?.errors || data?.details,
        };

      case 401:
        return {
          message: 'Authentication required. Please log in and try again.',
          code: 'UNAUTHORIZED',
        };

      case 403:
        return {
          message: 'Access denied. You do not have permission to perform this action.',
          code: 'FORBIDDEN',
        };

      case 404:
        return {
          message: 'Resource not found. The requested item may have been deleted or moved.',
          code: 'NOT_FOUND',
        };

      case 409:
        return {
          message:
            (typeof data?.message === 'string' ? data.message : '') ||
            'Conflict detected. The requested action could not be completed.',
          code: 'CONFLICT',
          details: data?.conflicts || data?.details,
        };

      case 422:
        return {
          message: 'Validation failed. Please correct the highlighted fields and try again.',
          code: 'VALIDATION_ERROR',
          details: data?.errors || data?.details,
        };

      case 429:
        return {
          message: 'Too many requests. Please wait a moment and try again.',
          code: 'RATE_LIMITED',
        };

      case 500:
        return {
          message: 'Internal server error. Please try again later or contact support.',
          code: 'SERVER_ERROR',
        };

      case 502:
      case 503:
      case 504:
        return {
          message: 'Service temporarily unavailable. Please try again in a few moments.',
          code: 'SERVICE_UNAVAILABLE',
        };

      default:
        return {
          message:
            (typeof data?.message === 'string' ? data.message : '') ||
            `An unexpected error occurred (${status}). Please try again.`,
          code: 'UNKNOWN_ERROR',
          details: data,
        };
    }
  }
}
