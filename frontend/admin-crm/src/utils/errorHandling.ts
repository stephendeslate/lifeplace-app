// frontend/admin-crm/src/utils/errorHandling.ts

/**
 * Extracts a user-friendly error message from various error types
 * @param error - The error object (can be Axios error, Error, or unknown)
 * @param defaultMessage - Default message to use if no specific message is found
 * @returns A user-friendly error message string
 */
export const extractErrorMessage = (
  error: unknown,
  defaultMessage = 'An error occurred',
): string => {
  // Handle Axios errors with response data
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        data?: {
          detail?: string;
          message?: string;
          error?: string;
          // Handle validation errors (object with field names as keys)
          [key: string]: unknown;
        };
      };
    };

    const errorData = axiosError.response?.data;

    if (errorData) {
      // Try common error message fields
      if (errorData.detail) return errorData.detail;
      if (errorData.message) return errorData.message;
      if (errorData.error) return errorData.error;

      // Handle validation errors (e.g., { "name": ["This field is required"] })
      const keys = Object.keys(errorData);
      if (keys.length > 0) {
        const firstKey = keys[0];
        const firstError = errorData[firstKey];

        if (Array.isArray(firstError) && firstError.length > 0) {
          return `${firstKey}: ${firstError[0]}`;
        }

        if (typeof firstError === 'string') {
          return firstError;
        }
      }
    }
  }

  // Handle standard Error objects
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // Return default message
  return defaultMessage;
};
