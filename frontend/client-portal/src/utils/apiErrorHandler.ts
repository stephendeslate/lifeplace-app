import { getErrorMessage } from './errorMessages';

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  status?: number;
}

// Type for Axios-like errors
interface AxiosLikeError {
  response?: {
    status?: number;
    data?: Record<string, unknown>;
  };
  code?: string;
  message?: string;
}

/**
 * Check if an error looks like an Axios error
 */
const isAxiosLikeError = (error: unknown): error is AxiosLikeError => {
  return typeof error === 'object' && error !== null && ('response' in error || 'code' in error);
};

/**
 * Standardized API error handler
 */
export const handleApiError = (error: unknown): ApiError => {
  if (isAxiosLikeError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    // Handle structured error responses from backend
    if (data && typeof data === 'object') {
      return {
        message: (data.message || data.error || data.detail || getErrorMessage(error)) as string,
        code: (data.code || error.code) as string | undefined,
        field: data.field as string | undefined,
        status,
      };
    }

    return {
      message: getErrorMessage(error),
      code: error.code,
      status,
    };
  }

  return { message: getErrorMessage(error) };
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (isAxiosLikeError(error)) {
    return !error.response && error.code === 'ERR_NETWORK';
  }
  return false;
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: unknown): boolean => {
  if (isAxiosLikeError(error)) {
    return error.response?.status === 401;
  }
  return false;
};
