// frontend/client-portal/src/utils/__tests__/errorHandler.test.ts
import { describe, it, expect } from 'vitest';
import { ErrorHandler, getErrorMessage, getValidationErrors } from '../errorHandler';
import { ErrorSeverity, HttpStatusCode } from '../../types/api-error.types';

describe('ErrorHandler', () => {
  describe('extractMessage', () => {
    it('returns message from detail field', () => {
      const error = {
        response: {
          data: { detail: 'Access denied' },
          status: 403,
        },
      };

      expect(ErrorHandler.extractMessage(error)).toBe('Access denied');
    });

    it('returns message from message field', () => {
      const error = {
        response: {
          data: { message: 'Operation failed' },
          status: 400,
        },
      };

      expect(ErrorHandler.extractMessage(error)).toBe('Operation failed');
    });

    it('returns first validation error message', () => {
      const error = {
        response: {
          data: {
            errors: {
              email: ['Email is required', 'Invalid format'],
            },
          },
          status: 400,
        },
      };

      expect(ErrorHandler.extractMessage(error)).toBe('Email is required');
    });

    it('extracts from validation_errors field', () => {
      const error = {
        response: {
          data: {
            validation_errors: {
              name: ['Name is too short'],
            },
          },
          status: 422,
        },
      };

      expect(ErrorHandler.extractMessage(error)).toBe('Name is too short');
    });

    it('extracts from payment_errors field', () => {
      const error = {
        response: {
          data: {
            payment_errors: {
              card: ['Card declined'],
            },
          },
          status: 400,
        },
      };

      expect(ErrorHandler.extractMessage(error)).toBe('Card declined');
    });

    it('returns status-based message when no data', () => {
      const error = {
        response: {
          status: 404,
        },
      };

      expect(ErrorHandler.extractMessage(error)).toBe('The requested resource was not found.');
    });

    it('returns generic message for unknown error', () => {
      expect(ErrorHandler.extractMessage({})).toBe(
        'An unexpected error occurred. Please try again.',
      );
    });

    it('returns Error message for standard Error', () => {
      const error = new Error('Network failed');
      expect(ErrorHandler.extractMessage(error)).toBe('Network failed');
    });

    it('returns generic message for null', () => {
      expect(ErrorHandler.extractMessage(null)).toBe(
        'An unexpected error occurred. Please try again.',
      );
    });

    it('returns generic message for undefined', () => {
      expect(ErrorHandler.extractMessage(undefined)).toBe(
        'An unexpected error occurred. Please try again.',
      );
    });
  });

  describe('extractValidationErrors', () => {
    it('extracts errors from errors field', () => {
      const error = {
        response: {
          data: {
            errors: {
              email: ['Email is required'],
              password: ['Password too short'],
            },
          },
          status: 400,
        },
      };

      const result = ErrorHandler.extractValidationErrors(error);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ field: 'email', messages: ['Email is required'] });
      expect(result).toContainEqual({ field: 'password', messages: ['Password too short'] });
    });

    it('extracts from validation_errors field', () => {
      const error = {
        response: {
          data: {
            validation_errors: {
              name: ['Name is required'],
            },
          },
          status: 422,
        },
      };

      const result = ErrorHandler.extractValidationErrors(error);
      expect(result).toContainEqual({ field: 'name', messages: ['Name is required'] });
    });

    it('extracts from payment_errors field', () => {
      const error = {
        response: {
          data: {
            payment_errors: {
              card_number: ['Invalid card'],
            },
          },
          status: 400,
        },
      };

      const result = ErrorHandler.extractValidationErrors(error);
      expect(result).toContainEqual({ field: 'card_number', messages: ['Invalid card'] });
    });

    it('extracts from gateway_errors field', () => {
      const error = {
        response: {
          data: {
            gateway_errors: {
              stripe: ['Connection failed'],
            },
          },
          status: 500,
        },
      };

      const result = ErrorHandler.extractValidationErrors(error);
      expect(result).toContainEqual({ field: 'stripe', messages: ['Connection failed'] });
    });

    it('extracts from quote_errors field', () => {
      const error = {
        response: {
          data: {
            quote_errors: {
              amount: ['Amount too low'],
            },
          },
          status: 400,
        },
      };

      const result = ErrorHandler.extractValidationErrors(error);
      expect(result).toContainEqual({ field: 'amount', messages: ['Amount too low'] });
    });

    it('combines errors from multiple sources', () => {
      const error = {
        response: {
          data: {
            errors: { email: ['Invalid email'] },
            validation_errors: { name: ['Required'] },
          },
          status: 400,
        },
      };

      const result = ErrorHandler.extractValidationErrors(error);
      expect(result).toHaveLength(2);
    });

    it('returns empty array for non-API error', () => {
      expect(ErrorHandler.extractValidationErrors(new Error('test'))).toEqual([]);
    });

    it('returns empty array when no validation errors', () => {
      const error = {
        response: {
          data: { detail: 'Not found' },
          status: 404,
        },
      };

      expect(ErrorHandler.extractValidationErrors(error)).toEqual([]);
    });
  });

  describe('extractValidationErrorsAsRecord', () => {
    it('returns errors as a flat record', () => {
      const error = {
        response: {
          data: {
            errors: {
              email: ['Email is required'],
              password: ['Password too short', 'Must contain number'],
            },
          },
          status: 400,
        },
      };

      const result = ErrorHandler.extractValidationErrorsAsRecord(error);

      expect(result).toEqual({
        email: ['Email is required'],
        password: ['Password too short', 'Must contain number'],
      });
    });

    it('returns empty object for non-API error', () => {
      expect(ErrorHandler.extractValidationErrorsAsRecord('string error')).toEqual({});
    });
  });

  describe('getStatusCode', () => {
    it('returns status code from response', () => {
      const error = {
        response: { status: 404 },
      };

      expect(ErrorHandler.getStatusCode(error)).toBe(404);
    });

    it('returns undefined when no response', () => {
      expect(ErrorHandler.getStatusCode({})).toBeUndefined();
    });

    it('returns undefined for non-API error', () => {
      expect(ErrorHandler.getStatusCode('error')).toBeUndefined();
    });
  });

  describe('isNetworkError', () => {
    it('returns true for network error (request but no response)', () => {
      const error = {
        request: {},
        message: 'Network Error',
      };

      expect(ErrorHandler.isNetworkError(error)).toBe(true);
    });

    it('returns false when response exists', () => {
      const error = {
        request: {},
        response: { status: 500 },
      };

      expect(ErrorHandler.isNetworkError(error)).toBe(false);
    });

    it('returns false for non-API error', () => {
      expect(ErrorHandler.isNetworkError('error')).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('returns true for 401 status', () => {
      const error = {
        response: { status: HttpStatusCode.UNAUTHORIZED },
      };

      expect(ErrorHandler.isAuthError(error)).toBe(true);
    });

    it('returns false for other status codes', () => {
      const error = {
        response: { status: 403 },
      };

      expect(ErrorHandler.isAuthError(error)).toBe(false);
    });
  });

  describe('isPermissionError', () => {
    it('returns true for 403 status', () => {
      const error = {
        response: { status: HttpStatusCode.FORBIDDEN },
      };

      expect(ErrorHandler.isPermissionError(error)).toBe(true);
    });

    it('returns false for other status codes', () => {
      const error = {
        response: { status: 401 },
      };

      expect(ErrorHandler.isPermissionError(error)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('returns true for 400 status', () => {
      const error = {
        response: { status: HttpStatusCode.BAD_REQUEST },
      };

      expect(ErrorHandler.isValidationError(error)).toBe(true);
    });

    it('returns true for 422 status', () => {
      const error = {
        response: { status: HttpStatusCode.UNPROCESSABLE_ENTITY },
      };

      expect(ErrorHandler.isValidationError(error)).toBe(true);
    });

    it('returns false for other status codes', () => {
      const error = {
        response: { status: 500 },
      };

      expect(ErrorHandler.isValidationError(error)).toBe(false);
    });
  });

  describe('isServerError', () => {
    it('returns true for 500 status', () => {
      const error = {
        response: { status: HttpStatusCode.INTERNAL_SERVER_ERROR },
      };

      expect(ErrorHandler.isServerError(error)).toBe(true);
    });

    it('returns true for 502 status', () => {
      const error = {
        response: { status: HttpStatusCode.BAD_GATEWAY },
      };

      expect(ErrorHandler.isServerError(error)).toBe(true);
    });

    it('returns true for 503 status', () => {
      const error = {
        response: { status: HttpStatusCode.SERVICE_UNAVAILABLE },
      };

      expect(ErrorHandler.isServerError(error)).toBe(true);
    });

    it('returns false for 4xx status codes', () => {
      const error = {
        response: { status: 400 },
      };

      expect(ErrorHandler.isServerError(error)).toBe(false);
    });
  });

  describe('getErrorInfo', () => {
    it('returns complete error info for server error', () => {
      const error = {
        response: {
          data: { detail: 'Server error' },
          status: 500,
        },
      };

      const info = ErrorHandler.getErrorInfo(error);

      expect(info.message).toBe('Server error');
      expect(info.statusCode).toBe(500);
      expect(info.severity).toBe(ErrorSeverity.CRITICAL);
      expect(info.retryable).toBe(true);
    });

    it('returns complete error info for validation error', () => {
      const error = {
        response: {
          data: {
            errors: { email: ['Required'] },
          },
          status: 400,
        },
      };

      const info = ErrorHandler.getErrorInfo(error);

      expect(info.message).toBe('Required');
      expect(info.statusCode).toBe(400);
      expect(info.severity).toBe(ErrorSeverity.WARNING);
      expect(info.retryable).toBe(false);
      expect(info.validationErrors).toHaveLength(1);
    });

    it('returns error info for network error', () => {
      const error = {
        request: {},
        message: 'Network Error',
      };

      const info = ErrorHandler.getErrorInfo(error);

      expect(info.severity).toBe(ErrorSeverity.ERROR);
      expect(info.retryable).toBe(true);
    });

    it('returns error info for auth error', () => {
      const error = {
        response: {
          data: { detail: 'Invalid token' },
          status: 401,
        },
      };

      const info = ErrorHandler.getErrorInfo(error);

      expect(info.severity).toBe(ErrorSeverity.WARNING);
      expect(info.retryable).toBe(false);
    });
  });

  describe('formatValidationErrors', () => {
    it('formats single error', () => {
      const errors = [{ field: 'email', messages: ['Required'] }];

      expect(ErrorHandler.formatValidationErrors(errors)).toBe('email: Required');
    });

    it('formats multiple messages for one field', () => {
      const errors = [{ field: 'password', messages: ['Too short', 'Needs number'] }];

      expect(ErrorHandler.formatValidationErrors(errors)).toBe('password: Too short, Needs number');
    });

    it('formats multiple fields', () => {
      const errors = [
        { field: 'email', messages: ['Required'] },
        { field: 'name', messages: ['Too short'] },
      ];

      const result = ErrorHandler.formatValidationErrors(errors);
      expect(result).toContain('email: Required');
      expect(result).toContain('name: Too short');
    });

    it('returns empty string for empty array', () => {
      expect(ErrorHandler.formatValidationErrors([])).toBe('');
    });
  });

  describe('Status Messages', () => {
    const testCases = [
      { status: 400, contains: 'Invalid request' },
      { status: 401, contains: 'Authentication required' },
      { status: 403, contains: 'permission' },
      { status: 404, contains: 'not found' },
      { status: 405, contains: 'not allowed' },
      { status: 409, contains: 'conflict' },
      { status: 422, contains: 'Unable to process' },
      { status: 500, contains: 'server error' },
      { status: 502, contains: 'temporarily unavailable' },
      { status: 503, contains: 'temporarily unavailable' },
      { status: 504, contains: 'timed out' },
    ];

    testCases.forEach(({ status, contains }) => {
      it(`returns appropriate message for ${status}`, () => {
        const error = { response: { status } };
        const message = ErrorHandler.extractMessage(error);
        expect(message.toLowerCase()).toContain(contains.toLowerCase());
      });
    });
  });
});

describe('Convenience Functions', () => {
  describe('getErrorMessage', () => {
    it('extracts message from error', () => {
      const error = {
        response: {
          data: { detail: 'Test error' },
          status: 400,
        },
      };

      expect(getErrorMessage(error)).toBe('Test error');
    });
  });

  describe('getValidationErrors', () => {
    it('extracts validation errors from error', () => {
      const error = {
        response: {
          data: {
            errors: { field: ['Error message'] },
          },
          status: 400,
        },
      };

      const result = getValidationErrors(error);
      expect(result).toHaveLength(1);
      expect(result[0].field).toBe('field');
    });
  });
});
