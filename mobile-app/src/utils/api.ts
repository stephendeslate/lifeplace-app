/**
 * Axios API Client
 *
 * Configured Axios instance with JWT authentication.
 *
 * KEY DIFFERENCES FROM WEB (client-portal):
 * - No CSRF tokens needed (mobile apps use JWT only, no cookies)
 * - Token refresh is handled automatically
 * - Tokens are stored in SecureStore (not localStorage)
 *
 * HOW IT WORKS:
 * 1. Request interceptor: Adds 'Authorization: Bearer <token>' header
 * 2. Response interceptor: If 401, try to refresh the token and retry
 * 3. If refresh fails, clear auth state (user will be logged out)
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '@/stores/authStore';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * API base URL from environment variables.
 * EXPO_PUBLIC_ prefix makes it available in client code.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

/**
 * Endpoints that don't require authentication.
 * These match the backend configuration.
 */
const PUBLIC_ENDPOINTS = [
  '/users/login/',
  '/users/register/',
  '/users/password-reset/',
  '/users/token/refresh/',
  '/bookingflow/public/',
  '/events/event-types/',
  '/events/public/availability/',
  '/venues/public/',
  '/payments/public/',
  '/settings/public/',
];

const isPublicEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

// =============================================================================
// AXIOS INSTANCE
// =============================================================================

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// =============================================================================
// REQUEST INTERCEPTOR
// =============================================================================

/**
 * Adds JWT token to requests that require authentication.
 *
 * NOTE: We access the store directly with getState() because interceptors
 * run outside of React component lifecycle.
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    // Only add token for protected endpoints
    if (accessToken && !isPublicEndpoint(config.url)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =============================================================================
// RESPONSE INTERCEPTOR
// =============================================================================

/**
 * Handles 401 errors by attempting to refresh the token.
 *
 * FLOW:
 * 1. Request returns 401 (token expired)
 * 2. Try to refresh using the refresh token
 * 3. If successful, retry the original request with new token
 * 4. If refresh fails, clear auth (logout user)
 */
api.interceptors.response.use(
  // Success handler - just return the response
  (response) => response,

  // Error handler
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only handle 401 errors, and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Mark this request as retried
    originalRequest._retry = true;

    const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();

    if (!refreshToken) {
      // No refresh token available, clear auth
      clearAuth();
      return Promise.reject(error);
    }

    try {
      // Attempt to refresh the token
      // Use axios directly to avoid infinite loop with our interceptor
      const response = await axios.post(`${API_URL}/users/token/refresh/`, {
        refresh: refreshToken,
      });

      const { access, refresh } = response.data;

      // Store new tokens (backend may rotate refresh token)
      setTokens(access, refresh || refreshToken);

      // Retry the original request with new token
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed - token is invalid or expired
      // Clear auth state, which will redirect to login
      clearAuth();
      return Promise.reject(refreshError);
    }
  }
);

// =============================================================================
// TYPED RESPONSE HELPERS
// =============================================================================

/**
 * Type-safe wrapper for API responses.
 * Extracts the data from Axios response.
 */
export type ApiResponse<T> = Promise<T>;

/**
 * Standard error response from the backend.
 */
export interface ApiError {
  detail?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

/**
 * Extract error message from API error response.
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;

    // Check for detail message
    if (data?.detail) {
      return data.detail;
    }

    // Check for field errors
    if (data?.errors) {
      const firstField = Object.keys(data.errors)[0];
      if (firstField && data.errors[firstField]?.[0]) {
        return data.errors[firstField][0];
      }
    }

    // Fallback to status text
    if (error.response?.statusText) {
      return error.response.statusText;
    }

    // Network error
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }

    if (!error.response) {
      return 'Network error. Please check your connection.';
    }
  }

  // Generic error
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
};

export default api;
