// frontend/client-portal/src/utils/errorHandler.ts

import {
  type ApiErrorResponse,
  type ValidationError,
  type ErrorInfo,
  ErrorSeverity,
  HttpStatusCode,
  isApiError,
  hasErrorResponse,
} from '../types/api-error.types';

/**
 * Centralized error handling utility
 * Provides type-safe error extraction and formatting for API errors
 */
export class ErrorHandler {
  /**
   * Extract a user-friendly error message from any error type
   * This is the primary method used throughout the application
   */
  static extractMessage(error: unknown): string {
    if (!isApiError(error)) {
      // Handle non-API errors (network errors, etc.)
      if (error instanceof Error) {
        return error.message;
      }
      return 'An unexpected error occurred. Please try again.';
    }

    // Check for response data with error details
    if (hasErrorResponse(error)) {
      const data = error.response.data;

      if (data) {
        // Try detail field first (most common in DRF)
        if (data.detail) {
          return data.detail;
        }

        // Try message field
        if (data.message) {
          return data.message;
        }

        // Try to extract first error from validation errors
        const validationMessage = this.extractFirstValidationMessage(data);
        if (validationMessage) {
          return validationMessage;
        }
      }

      // If no data, use status-based messages
      return this.getStatusMessage(error.response.status);
    }

    // Fallback to error message if available
    if (error.message) {
      return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Extract validation errors from API response
   * Returns an array of field-level validation errors
   */
  static extractValidationErrors(error: unknown): ValidationError[] {
    const validationErrors: ValidationError[] = [];

    if (!hasErrorResponse(error) || !error.response.data) {
      return validationErrors;
    }

    const data = error.response.data;

    // Check all possible error field formats
    const errorSources = [
      data.errors,
      data.validation_errors,
      data.payment_errors,
      data.gateway_errors,
      data.quote_errors,
    ];

    for (const errorSource of errorSources) {
      if (errorSource && typeof errorSource === 'object') {
        for (const [field, messages] of Object.entries(errorSource)) {
          if (Array.isArray(messages)) {
            validationErrors.push({ field, messages });
          }
        }
      }
    }

    return validationErrors;
  }

  /**
   * Extract validation errors as a flat Record for compatibility
   */
  static extractValidationErrorsAsRecord(error: unknown): Record<string, string[]> {
    const validationErrors: Record<string, string[]> = {};

    if (!hasErrorResponse(error) || !error.response.data) {
      return validationErrors;
    }

    const data = error.response.data;

    // Check all possible error field formats
    const errorSources = [
      data.errors,
      data.validation_errors,
      data.payment_errors,
      data.gateway_errors,
      data.quote_errors,
    ];

    for (const errorSource of errorSources) {
      if (errorSource && typeof errorSource === 'object') {
        Object.assign(validationErrors, errorSource);
      }
    }

    return validationErrors;
  }

  /**
   * Get HTTP status code from error
   */
  static getStatusCode(error: unknown): number | undefined {
    if (hasErrorResponse(error)) {
      return error.response.status;
    }
    return undefined;
  }

  /**
   * Check if error is a network error (no response from server)
   */
  static isNetworkError(error: unknown): boolean {
    if (!isApiError(error)) {
      return false;
    }
    // Network errors have a request but no response
    return error.request !== undefined && error.response === undefined;
  }

  /**
   * Check if error is an authentication error (401)
   */
  static isAuthError(error: unknown): boolean {
    const statusCode = this.getStatusCode(error);
    return statusCode === HttpStatusCode.UNAUTHORIZED;
  }

  /**
   * Check if error is a permission error (403)
   */
  static isPermissionError(error: unknown): boolean {
    const statusCode = this.getStatusCode(error);
    return statusCode === HttpStatusCode.FORBIDDEN;
  }

  /**
   * Check if error is a validation error (400 or 422)
   */
  static isValidationError(error: unknown): boolean {
    const statusCode = this.getStatusCode(error);
    return (
      statusCode === HttpStatusCode.BAD_REQUEST ||
      statusCode === HttpStatusCode.UNPROCESSABLE_ENTITY
    );
  }

  /**
   * Check if error is a server error (5xx)
   */
  static isServerError(error: unknown): boolean {
    const statusCode = this.getStatusCode(error);
    return statusCode !== undefined && statusCode >= 500;
  }

  /**
   * Get comprehensive error information
   */
  static getErrorInfo(error: unknown): ErrorInfo {
    const message = this.extractMessage(error);
    const statusCode = this.getStatusCode(error);
    const validationErrors = this.extractValidationErrors(error);

    let severity: (typeof ErrorSeverity)[keyof typeof ErrorSeverity];
    let retryable: boolean;

    if (this.isServerError(error)) {
      severity = ErrorSeverity.CRITICAL;
      retryable = true;
    } else if (this.isNetworkError(error)) {
      severity = ErrorSeverity.ERROR;
      retryable = true;
    } else if (this.isAuthError(error)) {
      severity = ErrorSeverity.WARNING;
      retryable = false;
    } else if (this.isValidationError(error)) {
      severity = ErrorSeverity.WARNING;
      retryable = false;
    } else {
      severity = ErrorSeverity.ERROR;
      retryable = false;
    }

    return {
      message,
      statusCode,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      severity,
      retryable,
    };
  }

  /**
   * Format validation errors as a user-friendly message
   */
  static formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return '';
    }

    if (errors.length === 1) {
      const error = errors[0];
      return `${error.field}: ${error.messages.join(', ')}`;
    }

    return errors.map((error) => `${error.field}: ${error.messages.join(', ')}`).join('\n');
  }

  // Private helper methods

  /**
   * Extract the first validation error message from error response
   */
  private static extractFirstValidationMessage(data: ApiErrorResponse): string | null {
    const errorSources = [
      data.errors,
      data.validation_errors,
      data.payment_errors,
      data.gateway_errors,
      data.quote_errors,
    ];

    for (const errorSource of errorSources) {
      if (errorSource && typeof errorSource === 'object') {
        const firstKey = Object.keys(errorSource)[0];
        if (firstKey) {
          const messages = errorSource[firstKey];
          if (Array.isArray(messages) && messages.length > 0) {
            return messages[0];
          }
        }
      }
    }

    return null;
  }

  /**
   * Get a user-friendly message based on HTTP status code
   */
  private static getStatusMessage(status?: number): string {
    if (!status) {
      return 'An unexpected error occurred. Please try again.';
    }

    switch (status) {
      case HttpStatusCode.BAD_REQUEST:
        return 'Invalid request. Please check your input and try again.';
      case HttpStatusCode.UNAUTHORIZED:
        return 'Authentication required. Please log in to continue.';
      case HttpStatusCode.FORBIDDEN:
        return 'You do not have permission to perform this action.';
      case HttpStatusCode.NOT_FOUND:
        return 'The requested resource was not found.';
      case HttpStatusCode.METHOD_NOT_ALLOWED:
        return 'This operation is not allowed.';
      case HttpStatusCode.CONFLICT:
        return 'A conflict occurred. The resource may already exist.';
      case HttpStatusCode.UNPROCESSABLE_ENTITY:
        return 'Unable to process the request. Please check your input.';
      case HttpStatusCode.INTERNAL_SERVER_ERROR:
        return 'A server error occurred. Please try again later.';
      case HttpStatusCode.BAD_GATEWAY:
        return 'The server is temporarily unavailable. Please try again later.';
      case HttpStatusCode.SERVICE_UNAVAILABLE:
        return 'The service is temporarily unavailable. Please try again later.';
      case HttpStatusCode.GATEWAY_TIMEOUT:
        return 'The request timed out. Please try again.';
      default:
        if (status >= 500) {
          return 'A server error occurred. Please try again later.';
        }
        if (status >= 400) {
          return 'An error occurred while processing your request.';
        }
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Convenience function for extracting error messages
 * Can be used as a standalone function for shorter syntax
 */
export const getErrorMessage = (error: unknown): string => {
  return ErrorHandler.extractMessage(error);
};

/**
 * Convenience function for extracting validation errors
 */
export const getValidationErrors = (error: unknown): ValidationError[] => {
  return ErrorHandler.extractValidationErrors(error);
};
