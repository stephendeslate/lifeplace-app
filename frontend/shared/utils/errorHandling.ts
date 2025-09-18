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
  try {
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || error.message || '';
    const lowerMessage = errorMessage.toLowerCase();

    console.log('[isAlreadyArchivedError] Checking error:', {
      status: error.response?.status,
      message: errorMessage,
      fullError: error
    });

    return (
      error.response?.status === 400 &&
      (lowerMessage.includes('already archived') ||
       lowerMessage.includes('is archived') ||
       lowerMessage.includes('thread archived'))
    );
  } catch (e) {
    console.error('[isAlreadyArchivedError] Error checking archive status:', e);
    return false;
  }
};

/**
 * Check if an error indicates that a thread is not archived
 */
export const isNotArchivedError = (error: ApiError): boolean => {
  try {
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || error.message || '';
    const lowerMessage = errorMessage.toLowerCase();

    console.log('[isNotArchivedError] Checking error:', {
      status: error.response?.status,
      message: errorMessage,
      fullError: error
    });

    return (
      error.response?.status === 400 &&
      (lowerMessage.includes('not archived') ||
       lowerMessage.includes('is not archived') ||
       lowerMessage.includes('not currently archived'))
    );
  } catch (e) {
    console.error('[isNotArchivedError] Error checking archive status:', e);
    return false;
  }
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

  // Check for common error patterns
  if (error.message) {
    if (error.message.toLowerCase().includes('network')) {
      return `Network error while trying to ${operation} thread. Please check your connection.`;
    }
    if (error.message.toLowerCase().includes('timeout')) {
      return `Request timed out while trying to ${operation} thread. Please try again.`;
    }
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
  public readonly operation: 'archive' | 'unarchive';
  public readonly errorType: 'network' | 'permission' | 'validation' | 'server' | 'unknown';

  constructor(error: ApiError, operation: 'archive' | 'unarchive') {
    const message = getErrorMessage(error, operation);
    super(message);

    this.name = 'ArchiveError';
    this.operation = operation;
    this.isAlreadyArchived = isAlreadyArchivedError(error);
    this.isNotArchived = isNotArchivedError(error);
    this.originalError = error;

    // Classify error type for better handling
    this.errorType = this.classifyError(error);

    console.log('[ArchiveError] Created error instance:', {
      operation,
      message,
      errorType: this.errorType,
      isAlreadyArchived: this.isAlreadyArchived,
      isNotArchived: this.isNotArchived,
      originalStatus: error.response?.status
    });
  }

  private classifyError(error: ApiError): 'network' | 'permission' | 'validation' | 'server' | 'unknown' {
    if (!error.response) return 'network';

    const status = error.response.status;
    if (status === 401 || status === 403) return 'permission';
    if (status === 400) return 'validation';
    if (status >= 500) return 'server';

    return 'unknown';
  }

  /**
   * Check if this error should be treated as a success (already in desired state)
   */
  public isBenignError(): boolean {
    return (this.operation === 'archive' && this.isAlreadyArchived) ||
           (this.operation === 'unarchive' && this.isNotArchived);
  }
}