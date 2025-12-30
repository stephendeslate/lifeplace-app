/**
 * Error Handler Utilities
 * API error extraction, validation error handling
 */

import type { AxiosError } from 'axios';
import type { ApiErrorResponse, ValidationError } from '@/types/booking';

/**
 * Error info structure returned by getErrorInfo
 */
export interface ErrorInfo {
  message: string;
  validationErrors: Record<string, string[]>;
  statusCode: number | null;
  isNetworkError: boolean;
  isAuthError: boolean;
  isPermissionError: boolean;
  isValidationError: boolean;
  isServerError: boolean;
  isSessionExpired: boolean;
  isNotFound: boolean;
  code?: string;
}

/**
 * Error Handler class with static methods
 */
export class ErrorHandler {
  /**
   * Check if error is an Axios error
   */
  private static isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
    return (error as AxiosError)?.isAxiosError === true;
  }

  /**
   * Extract user-friendly error message
   */
  static extractMessage(error: unknown): string {
    if (!error) return 'An unknown error occurred';

    // Axios error
    if (this.isAxiosError(error)) {
      const data = error.response?.data;

      // Try various message fields
      if (data?.message) return data.message;
      if (data?.detail) return data.detail;
      if (typeof data === 'string') return data;

      // Build message from validation errors
      if (data?.errors && Array.isArray(data.errors)) {
        return data.errors.map(e => e.message).join('. ');
      }

      if (data?.validation_errors) {
        const messages: string[] = [];
        Object.values(data.validation_errors).forEach(fieldErrors => {
          if (Array.isArray(fieldErrors)) {
            messages.push(...fieldErrors);
          }
        });
        if (messages.length > 0) return messages.join('. ');
      }

      // Network error
      if (!error.response) {
        if (error.code === 'ERR_NETWORK') {
          return 'Network error. Please check your connection and try again.';
        }
        if (error.code === 'ECONNABORTED') {
          return 'Request timed out. Please try again.';
        }
        return 'Unable to connect to server. Please try again.';
      }

      // HTTP status based messages
      const status = error.response.status;
      if (status === 401) return 'Your session has expired. Please log in again.';
      if (status === 403) return 'You do not have permission to perform this action.';
      if (status === 404) return 'The requested resource was not found.';
      if (status === 410) return 'This session has expired. Please start a new booking.';
      if (status === 422) return 'Please check your input and try again.';
      if (status === 429) return 'Too many requests. Please wait a moment and try again.';
      if (status >= 500) return 'Server error. Please try again later.';

      // Fall back to Axios message
      if (error.message) return error.message;
    }

    // Standard Error
    if (error instanceof Error) {
      return error.message;
    }

    // String
    if (typeof error === 'string') {
      return error;
    }

    return 'An unexpected error occurred';
  }

  /**
   * Extract validation errors as field -> messages map
   */
  static extractValidationErrors(error: unknown): Record<string, string[]> {
    if (!this.isAxiosError(error)) return {};

    const data = error.response?.data;
    if (!data) return {};

    // Direct validation_errors object
    if (data.validation_errors && typeof data.validation_errors === 'object') {
      return data.validation_errors;
    }

    // Array of errors
    if (data.errors && Array.isArray(data.errors)) {
      const result: Record<string, string[]> = {};
      for (const err of data.errors as ValidationError[]) {
        if (!result[err.field]) result[err.field] = [];
        result[err.field].push(err.message);
      }
      return result;
    }

    return {};
  }

  /**
   * Get HTTP status code from error
   */
  static getStatusCode(error: unknown): number | null {
    if (this.isAxiosError(error)) {
      return error.response?.status ?? null;
    }
    return null;
  }

  /**
   * Check if error is a network error (offline, timeout, etc.)
   */
  static isNetworkError(error: unknown): boolean {
    if (this.isAxiosError(error)) {
      return !error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED');
    }
    return false;
  }

  /**
   * Check if error is an authentication error (401)
   */
  static isAuthError(error: unknown): boolean {
    return this.getStatusCode(error) === 401;
  }

  /**
   * Check if error is a permission error (403)
   */
  static isPermissionError(error: unknown): boolean {
    return this.getStatusCode(error) === 403;
  }

  /**
   * Check if error is a validation error (400, 422)
   */
  static isValidationError(error: unknown): boolean {
    const status = this.getStatusCode(error);
    return status === 400 || status === 422;
  }

  /**
   * Check if error is a server error (5xx)
   */
  static isServerError(error: unknown): boolean {
    const status = this.getStatusCode(error);
    return status !== null && status >= 500;
  }

  /**
   * Check if error is a session expired error (410)
   */
  static isSessionExpiredError(error: unknown): boolean {
    return this.getStatusCode(error) === 410;
  }

  /**
   * Check if error is a not found error (404)
   */
  static isNotFoundError(error: unknown): boolean {
    return this.getStatusCode(error) === 404;
  }

  /**
   * Get complete error information
   */
  static getErrorInfo(error: unknown): ErrorInfo {
    return {
      message: this.extractMessage(error),
      validationErrors: this.extractValidationErrors(error),
      statusCode: this.getStatusCode(error),
      isNetworkError: this.isNetworkError(error),
      isAuthError: this.isAuthError(error),
      isPermissionError: this.isPermissionError(error),
      isValidationError: this.isValidationError(error),
      isServerError: this.isServerError(error),
      isSessionExpired: this.isSessionExpiredError(error),
      isNotFound: this.isNotFoundError(error),
      code: this.isAxiosError(error) ? error.response?.data?.code : undefined,
    };
  }

  /**
   * Log error with context (for debugging)
   */
  static logError(error: unknown, context?: string): void {
    const info = this.getErrorInfo(error);
    console.error(`[Error${context ? ` - ${context}` : ''}]`, {
      message: info.message,
      statusCode: info.statusCode,
      validationErrors: info.validationErrors,
      isNetworkError: info.isNetworkError,
    });
  }

  /**
   * Handle error with optional notification and logging
   */
  static handle(
    error: unknown,
    options?: {
      context?: string;
      showNotification?: boolean;
      logError?: boolean;
    }
  ): ErrorInfo {
    const info = this.getErrorInfo(error);
    const { context, showNotification = false, logError = true } = options || {};

    if (logError) {
      this.logError(error, context);
    }

    if (showNotification) {
      // In a real app, this would show a toast/notification
      console.warn(`[Notification] ${info.message}`);
    }

    return info;
  }
}

// Convenience function exports
export const getErrorMessage = ErrorHandler.extractMessage.bind(ErrorHandler);
export const getValidationErrors = ErrorHandler.extractValidationErrors.bind(ErrorHandler);
export const getErrorInfo = ErrorHandler.getErrorInfo.bind(ErrorHandler);
export const isNetworkError = ErrorHandler.isNetworkError.bind(ErrorHandler);
export const isAuthError = ErrorHandler.isAuthError.bind(ErrorHandler);
export const isSessionExpiredError = ErrorHandler.isSessionExpiredError.bind(ErrorHandler);

/**
 * Create a user-friendly error message for display
 */
export function createUserErrorMessage(
  error: unknown,
  defaultMessage: string = 'Something went wrong. Please try again.'
): string {
  const info = ErrorHandler.getErrorInfo(error);

  if (info.isNetworkError) {
    return 'Please check your internet connection and try again.';
  }

  if (info.isSessionExpired) {
    return 'Your booking session has expired. Please start a new booking.';
  }

  if (info.isAuthError) {
    return 'Please log in to continue.';
  }

  if (info.message && info.message !== 'An unexpected error occurred') {
    return info.message;
  }

  return defaultMessage;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  errors: Record<string, string[]>
): Array<{ field: string; messages: string[] }> {
  return Object.entries(errors).map(([field, messages]) => ({
    field: field.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
    messages,
  }));
}
