/**
 * Error handling utilities for API operations
 *
 * Provides consistent error detection and user-friendly message generation
 * across the application.
 */

export interface ApiError {
  response?: {
    status: number;
    data?: {
      error?: string;
      message?: string;
      detail?: string;
    };
  };
  message?: string;
}

/**
 * Check if an error indicates that a thread is already archived
 */
export const isAlreadyArchivedError = (error: ApiError): boolean => {
  const errorMessage = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || '';
  return (
    error.response?.status === 400 &&
    errorMessage.toLowerCase().includes('already archived')
  );
};

/**
 * Check if an error indicates that a thread is not archived
 */
export const isNotArchivedError = (error: ApiError): boolean => {
  const errorMessage = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || '';
  return (
    error.response?.status === 400 &&
    errorMessage.toLowerCase().includes('not archived')
  );
};

/**
 * Generate user-friendly error messages based on error type and operation
 */
export const getErrorMessage = (error: ApiError, operation: 'archive' | 'unarchive'): string => {
  if (operation === 'archive' && isAlreadyArchivedError(error)) {
    return 'This thread has already been archived.';
  }

  if (operation === 'unarchive' && isNotArchivedError(error)) {
    return 'This thread is not currently archived.';
  }

  // Network errors
  if (!error.response) {
    return `Unable to ${operation} thread. Please check your connection and try again.`;
  }

  // Authentication errors
  if (error.response.status === 401) {
    return 'You are not authorized to perform this action. Please refresh the page and try again.';
  }

  // Permission errors
  if (error.response.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  // Not found errors
  if (error.response.status === 404) {
    return 'Thread not found. It may have been deleted.';
  }

  // Server errors
  if (error.response.status >= 500) {
    return `Server error occurred while trying to ${operation} thread. Please try again later.`;
  }

  // Generic error with backend message if available
  const backendMessage = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail;
  if (backendMessage) {
    return `Failed to ${operation} thread: ${backendMessage}`;
  }

  return `Failed to ${operation} thread. Please try again.`;
};

/**
 * Generate success messages for archive operations
 */
export const getSuccessMessage = (operation: 'archive' | 'unarchive', wasAlreadyInState: boolean): string => {
  if (operation === 'archive') {
    return wasAlreadyInState
      ? 'Thread was already archived successfully.'
      : 'Thread archived successfully.';
  } else {
    return wasAlreadyInState
      ? 'Thread was already unarchived successfully.'
      : 'Thread unarchived successfully.';
  }
};

/**
 * Enhanced error class with additional metadata for better error handling
 */
export class ArchiveError extends Error {
  public readonly isAlreadyArchived: boolean;
  public readonly isNotArchived: boolean;
  public readonly originalError: ApiError;

  constructor(error: ApiError, operation: 'archive' | 'unarchive') {
    const message = getErrorMessage(error, operation);
    super(message);

    this.name = 'ArchiveError';
    this.isAlreadyArchived = isAlreadyArchivedError(error);
    this.isNotArchived = isNotArchivedError(error);
    this.originalError = error;
  }
}