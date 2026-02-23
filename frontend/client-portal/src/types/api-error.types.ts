// frontend/client-portal/src/types/api-error.types.ts

/**
 * Centralized API error types for type-safe error handling
 * Eliminates the need for 'any' types when handling Axios errors
 */

/**
 * Standard API error response structure from Django REST Framework
 * Supports multiple error formats returned by the backend
 */
export interface ApiErrorResponse {
  // Standard error message field
  detail?: string;
  message?: string;

  // Field-level validation errors
  errors?: Record<string, string[]>;
  validation_errors?: Record<string, string[]>;

  // Domain-specific error fields (payments, quotes, etc.)
  payment_errors?: Record<string, string[]>;
  gateway_errors?: Record<string, string[]>;
  quote_errors?: Record<string, string[]>;

  // Allow additional fields for domain-specific errors
  [key: string]: unknown;
}

/**
 * Axios error structure
 * This matches the actual shape of errors thrown by Axios
 */
export interface ApiError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  };
  request?: unknown;
  message?: string;
  code?: string;
  config?: unknown;
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && ('response' in error || 'message' in error);
}

/**
 * Type guard to check if error has a response
 */
export function hasErrorResponse(
  error: unknown,
): error is ApiError & { response: NonNullable<ApiError['response']> } {
  return isApiError(error) && error.response !== undefined;
}

/**
 * Structured validation error format
 */
export interface ValidationError {
  field: string;
  messages: string[];
}

/**
 * Common HTTP status codes for error handling
 */
export const HttpStatusCode = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Error severity levels for UI feedback
 */
export const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

/**
 * Structured error information for consistent error handling
 */
export interface ErrorInfo {
  message: string;
  statusCode?: number;
  validationErrors?: ValidationError[];
  severity: (typeof ErrorSeverity)[keyof typeof ErrorSeverity];
  retryable: boolean;
}
