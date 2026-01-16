/**
 * Error Handler Tests
 *
 * Tests for API error extraction and handling utilities.
 */

import {
  ErrorHandler,
  getErrorMessage,
  getValidationErrors,
  getErrorInfo,
  isNetworkError,
  isAuthError,
  isSessionExpiredError,
  createUserErrorMessage,
  formatValidationErrors,
} from './errorHandler';

// =============================================================================
// MOCK DATA
// =============================================================================

/**
 * Create a mock Axios error
 */
function createAxiosError(options: {
  status?: number;
  data?: unknown;
  code?: string;
  message?: string;
  noResponse?: boolean;
}) {
  const error: any = {
    isAxiosError: true,
    message: options.message || 'Request failed',
    code: options.code,
    response: options.noResponse ? undefined : {
      status: options.status || 500,
      data: options.data || {},
    },
  };
  return error;
}

// =============================================================================
// ErrorHandler.extractMessage
// =============================================================================

describe('ErrorHandler.extractMessage', () => {
  it('extracts message from data.message', () => {
    const error = createAxiosError({
      status: 400,
      data: { message: 'Custom error message' },
    });
    expect(ErrorHandler.extractMessage(error)).toBe('Custom error message');
  });

  it('extracts message from data.detail', () => {
    const error = createAxiosError({
      status: 400,
      data: { detail: 'Detail error message' },
    });
    expect(ErrorHandler.extractMessage(error)).toBe('Detail error message');
  });

  it('extracts message from string data', () => {
    const error = createAxiosError({
      status: 400,
      data: 'String error message',
    });
    expect(ErrorHandler.extractMessage(error)).toBe('String error message');
  });

  it('builds message from errors array', () => {
    const error = createAxiosError({
      status: 400,
      data: {
        errors: [
          { message: 'Error 1' },
          { message: 'Error 2' },
        ],
      },
    });
    expect(ErrorHandler.extractMessage(error)).toBe('Error 1. Error 2');
  });

  it('builds message from validation_errors object', () => {
    const error = createAxiosError({
      status: 400,
      data: {
        validation_errors: {
          email: ['Invalid email format'],
          password: ['Password too short'],
        },
      },
    });
    const message = ErrorHandler.extractMessage(error);
    expect(message).toContain('Invalid email format');
    expect(message).toContain('Password too short');
  });

  it('returns network error message for ERR_NETWORK', () => {
    const error = createAxiosError({
      code: 'ERR_NETWORK',
      noResponse: true,
    });
    expect(ErrorHandler.extractMessage(error)).toBe(
      'Network error. Please check your connection and try again.'
    );
  });

  it('returns timeout message for ECONNABORTED', () => {
    const error = createAxiosError({
      code: 'ECONNABORTED',
      noResponse: true,
    });
    expect(ErrorHandler.extractMessage(error)).toBe(
      'Request timed out. Please try again.'
    );
  });

  it('returns generic connection error for no response', () => {
    const error = createAxiosError({
      noResponse: true,
    });
    expect(ErrorHandler.extractMessage(error)).toBe(
      'Unable to connect to server. Please try again.'
    );
  });

  it('returns 401 message for auth error', () => {
    const error = createAxiosError({ status: 401 });
    expect(ErrorHandler.extractMessage(error)).toBe(
      'Your session has expired. Please log in again.'
    );
  });

  it('returns 403 message for permission error', () => {
    const error = createAxiosError({ status: 403 });
    expect(ErrorHandler.extractMessage(error)).toBe(
      'You do not have permission to perform this action.'
    );
  });

  it('returns 404 message for not found', () => {
    const error = createAxiosError({ status: 404 });
    expect(ErrorHandler.extractMessage(error)).toBe(
      'The requested resource was not found.'
    );
  });

  it('returns 410 message for session expired', () => {
    const error = createAxiosError({ status: 410 });
    expect(ErrorHandler.extractMessage(error)).toBe(
      'This session has expired. Please start a new booking.'
    );
  });

  it('returns 422 message for validation error', () => {
    const error = createAxiosError({ status: 422 });
    expect(ErrorHandler.extractMessage(error)).toBe(
      'Please check your input and try again.'
    );
  });

  it('returns 429 message for rate limit', () => {
    const error = createAxiosError({ status: 429 });
    expect(ErrorHandler.extractMessage(error)).toBe(
      'Too many requests. Please wait a moment and try again.'
    );
  });

  it('returns server error message for 5xx', () => {
    const error = createAxiosError({ status: 500 });
    expect(ErrorHandler.extractMessage(error)).toBe(
      'Server error. Please try again later.'
    );
  });

  it('extracts message from standard Error', () => {
    const error = new Error('Standard error message');
    expect(ErrorHandler.extractMessage(error)).toBe('Standard error message');
  });

  it('returns string error directly', () => {
    expect(ErrorHandler.extractMessage('String error')).toBe('String error');
  });

  it('returns default message for null', () => {
    expect(ErrorHandler.extractMessage(null)).toBe('An unknown error occurred');
  });

  it('returns default message for undefined', () => {
    expect(ErrorHandler.extractMessage(undefined)).toBe('An unknown error occurred');
  });

  it('returns default message for unknown object', () => {
    expect(ErrorHandler.extractMessage({})).toBe('An unexpected error occurred');
  });
});

// =============================================================================
// ErrorHandler.extractValidationErrors
// =============================================================================

describe('ErrorHandler.extractValidationErrors', () => {
  it('extracts validation_errors object', () => {
    const error = createAxiosError({
      status: 400,
      data: {
        validation_errors: {
          email: ['Invalid email'],
          password: ['Too short', 'No uppercase'],
        },
      },
    });

    const errors = ErrorHandler.extractValidationErrors(error);
    expect(errors.email).toEqual(['Invalid email']);
    expect(errors.password).toEqual(['Too short', 'No uppercase']);
  });

  it('extracts from errors array', () => {
    const error = createAxiosError({
      status: 400,
      data: {
        errors: [
          { field: 'email', message: 'Invalid email' },
          { field: 'email', message: 'Already exists' },
          { field: 'password', message: 'Too short' },
        ],
      },
    });

    const errors = ErrorHandler.extractValidationErrors(error);
    expect(errors.email).toEqual(['Invalid email', 'Already exists']);
    expect(errors.password).toEqual(['Too short']);
  });

  it('returns empty object for non-Axios error', () => {
    const error = new Error('Standard error');
    expect(ErrorHandler.extractValidationErrors(error)).toEqual({});
  });

  it('returns empty object when no validation errors', () => {
    const error = createAxiosError({
      status: 500,
      data: { message: 'Server error' },
    });
    expect(ErrorHandler.extractValidationErrors(error)).toEqual({});
  });
});

// =============================================================================
// ErrorHandler Status Code Methods
// =============================================================================

describe('ErrorHandler.getStatusCode', () => {
  it('returns status code from Axios error', () => {
    const error = createAxiosError({ status: 404 });
    expect(ErrorHandler.getStatusCode(error)).toBe(404);
  });

  it('returns null for no response', () => {
    const error = createAxiosError({ noResponse: true });
    expect(ErrorHandler.getStatusCode(error)).toBeNull();
  });

  it('returns null for non-Axios error', () => {
    expect(ErrorHandler.getStatusCode(new Error('test'))).toBeNull();
  });
});

describe('ErrorHandler.isNetworkError', () => {
  it('returns true for ERR_NETWORK', () => {
    const error = createAxiosError({ code: 'ERR_NETWORK', noResponse: true });
    expect(ErrorHandler.isNetworkError(error)).toBe(true);
  });

  it('returns true for ECONNABORTED', () => {
    const error = createAxiosError({ code: 'ECONNABORTED', noResponse: true });
    expect(ErrorHandler.isNetworkError(error)).toBe(true);
  });

  it('returns false for response errors', () => {
    const error = createAxiosError({ status: 500 });
    expect(ErrorHandler.isNetworkError(error)).toBe(false);
  });

  it('returns false for non-Axios error', () => {
    expect(ErrorHandler.isNetworkError(new Error('test'))).toBe(false);
  });
});

describe('ErrorHandler.isAuthError', () => {
  it('returns true for 401', () => {
    const error = createAxiosError({ status: 401 });
    expect(ErrorHandler.isAuthError(error)).toBe(true);
  });

  it('returns false for other status codes', () => {
    const error = createAxiosError({ status: 403 });
    expect(ErrorHandler.isAuthError(error)).toBe(false);
  });
});

describe('ErrorHandler.isPermissionError', () => {
  it('returns true for 403', () => {
    const error = createAxiosError({ status: 403 });
    expect(ErrorHandler.isPermissionError(error)).toBe(true);
  });

  it('returns false for other status codes', () => {
    const error = createAxiosError({ status: 401 });
    expect(ErrorHandler.isPermissionError(error)).toBe(false);
  });
});

describe('ErrorHandler.isValidationError', () => {
  it('returns true for 400', () => {
    const error = createAxiosError({ status: 400 });
    expect(ErrorHandler.isValidationError(error)).toBe(true);
  });

  it('returns true for 422', () => {
    const error = createAxiosError({ status: 422 });
    expect(ErrorHandler.isValidationError(error)).toBe(true);
  });

  it('returns false for other status codes', () => {
    const error = createAxiosError({ status: 500 });
    expect(ErrorHandler.isValidationError(error)).toBe(false);
  });
});

describe('ErrorHandler.isServerError', () => {
  it('returns true for 500', () => {
    const error = createAxiosError({ status: 500 });
    expect(ErrorHandler.isServerError(error)).toBe(true);
  });

  it('returns true for 503', () => {
    const error = createAxiosError({ status: 503 });
    expect(ErrorHandler.isServerError(error)).toBe(true);
  });

  it('returns false for 400 errors', () => {
    const error = createAxiosError({ status: 400 });
    expect(ErrorHandler.isServerError(error)).toBe(false);
  });
});

describe('ErrorHandler.isSessionExpiredError', () => {
  it('returns true for 410', () => {
    const error = createAxiosError({ status: 410 });
    expect(ErrorHandler.isSessionExpiredError(error)).toBe(true);
  });

  it('returns false for other status codes', () => {
    const error = createAxiosError({ status: 401 });
    expect(ErrorHandler.isSessionExpiredError(error)).toBe(false);
  });
});

describe('ErrorHandler.isNotFoundError', () => {
  it('returns true for 404', () => {
    const error = createAxiosError({ status: 404 });
    expect(ErrorHandler.isNotFoundError(error)).toBe(true);
  });

  it('returns false for other status codes', () => {
    const error = createAxiosError({ status: 500 });
    expect(ErrorHandler.isNotFoundError(error)).toBe(false);
  });
});

// =============================================================================
// ErrorHandler.getErrorInfo
// =============================================================================

describe('ErrorHandler.getErrorInfo', () => {
  it('returns complete error info object', () => {
    // Use empty data to test HTTP status-based message extraction
    const error = createAxiosError({
      status: 401,
      data: {}, // Empty data so it falls through to status-based message
    });

    const info = ErrorHandler.getErrorInfo(error);

    expect(info.message).toBe('Your session has expired. Please log in again.');
    expect(info.statusCode).toBe(401);
    expect(info.isAuthError).toBe(true);
    expect(info.isNetworkError).toBe(false);
    expect(info.isPermissionError).toBe(false);
    expect(info.isValidationError).toBe(false);
    expect(info.isServerError).toBe(false);
    expect(info.isSessionExpired).toBe(false);
    expect(info.isNotFound).toBe(false);
  });

  it('includes validation errors when present', () => {
    const error = createAxiosError({
      status: 400,
      data: {
        validation_errors: {
          email: ['Invalid email'],
        },
      },
    });

    const info = ErrorHandler.getErrorInfo(error);
    expect(info.validationErrors).toEqual({ email: ['Invalid email'] });
    expect(info.isValidationError).toBe(true);
  });

  it('includes error code when present', () => {
    const error = createAxiosError({
      status: 400,
      data: { code: 'INVALID_CREDENTIALS' },
    });

    const info = ErrorHandler.getErrorInfo(error);
    expect(info.code).toBe('INVALID_CREDENTIALS');
  });
});

// =============================================================================
// ErrorHandler.handle
// =============================================================================

describe('ErrorHandler.handle', () => {
  // Mock console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  it('logs error by default', () => {
    const error = createAxiosError({ status: 500 });
    ErrorHandler.handle(error);
    expect(console.error).toHaveBeenCalled();
  });

  it('includes context in log', () => {
    const error = createAxiosError({ status: 500 });
    ErrorHandler.handle(error, { context: 'LoginScreen' });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('LoginScreen'),
      expect.any(Object)
    );
  });

  it('does not log when logError is false', () => {
    const error = createAxiosError({ status: 500 });
    ErrorHandler.handle(error, { logError: false });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('shows notification when showNotification is true', () => {
    const error = createAxiosError({ status: 500 });
    ErrorHandler.handle(error, { showNotification: true });
    // console.warn is called with a single string that contains [Notification]
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Notification]')
    );
  });

  it('returns ErrorInfo object', () => {
    const error = createAxiosError({ status: 404 });
    const info = ErrorHandler.handle(error);
    expect(info.isNotFound).toBe(true);
  });
});

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

describe('Convenience Functions', () => {
  describe('getErrorMessage', () => {
    it('works as bound function', () => {
      const error = createAxiosError({ status: 404 });
      expect(getErrorMessage(error)).toBe('The requested resource was not found.');
    });
  });

  describe('getValidationErrors', () => {
    it('works as bound function', () => {
      const error = createAxiosError({
        status: 400,
        data: { validation_errors: { field: ['error'] } },
      });
      expect(getValidationErrors(error)).toEqual({ field: ['error'] });
    });
  });

  describe('getErrorInfo', () => {
    it('works as bound function', () => {
      const error = createAxiosError({ status: 500 });
      const info = getErrorInfo(error);
      expect(info.isServerError).toBe(true);
    });
  });

  describe('isNetworkError', () => {
    it('works as bound function', () => {
      const error = createAxiosError({ code: 'ERR_NETWORK', noResponse: true });
      expect(isNetworkError(error)).toBe(true);
    });
  });

  describe('isAuthError', () => {
    it('works as bound function', () => {
      const error = createAxiosError({ status: 401 });
      expect(isAuthError(error)).toBe(true);
    });
  });

  describe('isSessionExpiredError', () => {
    it('works as bound function', () => {
      const error = createAxiosError({ status: 410 });
      expect(isSessionExpiredError(error)).toBe(true);
    });
  });
});

// =============================================================================
// USER ERROR MESSAGE
// =============================================================================

describe('createUserErrorMessage', () => {
  it('returns network error message', () => {
    const error = createAxiosError({ code: 'ERR_NETWORK', noResponse: true });
    expect(createUserErrorMessage(error)).toBe(
      'Please check your internet connection and try again.'
    );
  });

  it('returns session expired message', () => {
    const error = createAxiosError({ status: 410 });
    expect(createUserErrorMessage(error)).toBe(
      'Your booking session has expired. Please start a new booking.'
    );
  });

  it('returns auth error message', () => {
    const error = createAxiosError({ status: 401 });
    expect(createUserErrorMessage(error)).toBe('Please log in to continue.');
  });

  it('returns extracted message for other errors', () => {
    const error = createAxiosError({
      status: 400,
      data: { message: 'Custom validation message' },
    });
    expect(createUserErrorMessage(error)).toBe('Custom validation message');
  });

  it('returns default message when no specific message', () => {
    const error = {};
    expect(createUserErrorMessage(error, 'Custom default')).toBe('Custom default');
  });
});

// =============================================================================
// FORMAT VALIDATION ERRORS
// =============================================================================

describe('formatValidationErrors', () => {
  it('formats validation errors for display', () => {
    const errors = {
      email_address: ['Invalid email', 'Already exists'],
      phone_number: ['Invalid format'],
    };

    const formatted = formatValidationErrors(errors);

    expect(formatted).toHaveLength(2);
    expect(formatted[0].field).toBe('Email address');
    expect(formatted[0].messages).toEqual(['Invalid email', 'Already exists']);
    expect(formatted[1].field).toBe('Phone number');
    expect(formatted[1].messages).toEqual(['Invalid format']);
  });

  it('capitalizes first letter', () => {
    const errors = { name: ['Required'] };
    const formatted = formatValidationErrors(errors);
    expect(formatted[0].field).toBe('Name');
  });

  it('handles empty errors object', () => {
    expect(formatValidationErrors({})).toEqual([]);
  });
});
