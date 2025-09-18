/**
 * Test suite for archive operation error handling
 *
 * This test validates that our error detection and handling logic
 * correctly identifies different error scenarios and provides
 * appropriate user feedback.
 */

import { describe, it, expect } from 'vitest';
import {
  isAlreadyArchivedError,
  isNotArchivedError,
  getErrorMessage,
  getSuccessMessage,
  ArchiveError,
  type ApiError
} from '@shared/utils/errorHandling';

describe('Archive Error Handling', () => {
  describe('isAlreadyArchivedError', () => {
    it('should detect already archived error from backend', () => {
      const error: ApiError = {
        response: {
          status: 400,
          data: {
            error: 'Thread is already archived'
          }
        }
      };

      expect(isAlreadyArchivedError(error)).toBe(true);
    });

    it('should detect already archived error with different casing', () => {
      const error: ApiError = {
        response: {
          status: 400,
          data: {
            message: 'THREAD IS ALREADY ARCHIVED'
          }
        }
      };

      expect(isAlreadyArchivedError(error)).toBe(true);
    });

    it('should not detect unrelated 400 errors', () => {
      const error: ApiError = {
        response: {
          status: 400,
          data: {
            error: 'Invalid request format'
          }
        }
      };

      expect(isAlreadyArchivedError(error)).toBe(false);
    });

    it('should not detect already archived error with wrong status code', () => {
      const error: ApiError = {
        response: {
          status: 500,
          data: {
            error: 'Thread is already archived'
          }
        }
      };

      expect(isAlreadyArchivedError(error)).toBe(false);
    });
  });

  describe('isNotArchivedError', () => {
    it('should detect not archived error from backend', () => {
      const error: ApiError = {
        response: {
          status: 400,
          data: {
            error: 'Thread is not archived'
          }
        }
      };

      expect(isNotArchivedError(error)).toBe(true);
    });

    it('should not detect unrelated errors', () => {
      const error: ApiError = {
        response: {
          status: 400,
          data: {
            error: 'Permission denied'
          }
        }
      };

      expect(isNotArchivedError(error)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return friendly message for already archived error', () => {
      const error: ApiError = {
        response: {
          status: 400,
          data: {
            error: 'Thread is already archived'
          }
        }
      };

      const message = getErrorMessage(error, 'archive');
      expect(message).toBe('This thread has already been archived.');
    });

    it('should return friendly message for not archived error', () => {
      const error: ApiError = {
        response: {
          status: 400,
          data: {
            error: 'Thread is not archived'
          }
        }
      };

      const message = getErrorMessage(error, 'unarchive');
      expect(message).toBe('This thread is not currently archived.');
    });

    it('should return network error message for missing response', () => {
      const error: ApiError = {
        message: 'Network Error'
      };

      const message = getErrorMessage(error, 'archive');
      expect(message).toBe('Unable to archive thread. Please check your connection and try again.');
    });

    it('should return auth error message for 401 status', () => {
      const error: ApiError = {
        response: {
          status: 401,
          data: {
            error: 'Unauthorized'
          }
        }
      };

      const message = getErrorMessage(error, 'archive');
      expect(message).toBe('You are not authorized to perform this action. Please refresh the page and try again.');
    });

    it('should return permission error message for 403 status', () => {
      const error: ApiError = {
        response: {
          status: 403,
          data: {
            error: 'Forbidden'
          }
        }
      };

      const message = getErrorMessage(error, 'archive');
      expect(message).toBe('You do not have permission to perform this action.');
    });

    it('should return not found message for 404 status', () => {
      const error: ApiError = {
        response: {
          status: 404,
          data: {
            error: 'Not Found'
          }
        }
      };

      const message = getErrorMessage(error, 'archive');
      expect(message).toBe('Thread not found. It may have been deleted.');
    });

    it('should return server error message for 5xx status', () => {
      const error: ApiError = {
        response: {
          status: 500,
          data: {
            error: 'Internal Server Error'
          }
        }
      };

      const message = getErrorMessage(error, 'archive');
      expect(message).toBe('Server error occurred while trying to archive thread. Please try again later.');
    });

    it('should include backend message when available', () => {
      const error: ApiError = {
        response: {
          status: 400,
          data: {
            error: 'Custom validation error'
          }
        }
      };

      const message = getErrorMessage(error, 'archive');
      expect(message).toBe('Failed to archive thread: Custom validation error');
    });

    it('should return generic message for unknown errors', () => {
      const error: ApiError = {
        response: {
          status: 418,
          data: {}
        }
      };

      const message = getErrorMessage(error, 'archive');
      expect(message).toBe('Failed to archive thread. Please try again.');
    });
  });

  describe('Success message handling', () => {
    it('should show appropriate message for normal archive operation', () => {
      expect(getSuccessMessage('archive', false)).toBe('Thread archived successfully.');
      expect(getSuccessMessage('archive', true)).toBe('Thread was already archived successfully.');
      expect(getSuccessMessage('unarchive', false)).toBe('Thread unarchived successfully.');
      expect(getSuccessMessage('unarchive', true)).toBe('Thread was already unarchived successfully.');
    });
  });

  describe('ArchiveError class', () => {
    it('should create enhanced error with metadata for already archived case', () => {
      const apiError: ApiError = {
        response: {
          status: 400,
          data: {
            error: 'Thread is already archived'
          }
        }
      };

      const archiveError = new ArchiveError(apiError, 'archive');

      expect(archiveError.message).toBe('This thread has already been archived.');
      expect(archiveError.isAlreadyArchived).toBe(true);
      expect(archiveError.isNotArchived).toBe(false);
      expect(archiveError.originalError).toBe(apiError);
    });

    it('should create enhanced error with metadata for not archived case', () => {
      const apiError: ApiError = {
        response: {
          status: 400,
          data: {
            error: 'Thread is not archived'
          }
        }
      };

      const archiveError = new ArchiveError(apiError, 'unarchive');

      expect(archiveError.message).toBe('This thread is not currently archived.');
      expect(archiveError.isAlreadyArchived).toBe(false);
      expect(archiveError.isNotArchived).toBe(true);
      expect(archiveError.originalError).toBe(apiError);
    });
  });
});