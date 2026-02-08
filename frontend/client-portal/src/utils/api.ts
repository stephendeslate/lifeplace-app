// frontend/client-portal/src/utils/api.ts

import axios from "axios";
import { storage } from "./storage";

// Get base URL based on environment
const getBaseUrl = () => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL + "/api";
  }

  // In development, use the environment variable or default to localhost
  return import.meta.env.VITE_API_URL || "http://localhost:8000/api";
};

// Function to get CSRF token from cookies
const getCsrfToken = () => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1];
};

// Create axios instance
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for CSRF cookies to be included
});

// Check if a URL is for a public endpoint that doesn't require authentication
const isPublicEndpoint = (url: string): boolean => {
  const publicPaths = [
    '/bookingflow/public/',
    '/events/event-types/',
    '/auth/', // Add auth endpoints
    '/users/register/',
    '/users/login/',
    '/users/logout/',
    '/users/password-reset/',
    '/payments/public/', // Add payments public endpoints
    // Add other public paths as needed
    '/bookingflow/public/flows/questionnaires/',
  ];

  // Contracts endpoints should NOT be public - they require authentication
  if (url.includes('/contracts/')) {
    return false;
  }

  return publicPaths.some(path => url.includes(path));
};

// Check if we're currently on a booking page
const isBookingPage = (): boolean => {
  return window.location.pathname.startsWith('/booking');
};


// Add request interceptor to add authorization header and CSRF token
api.interceptors.request.use(
  (config) => {
    // Add Authorization header if token exists (but not required for public endpoints)
    const tokens = storage.getTokens();
    if (tokens?.access && config.headers) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }

    // Add CSRF token for unsafe methods
    const unsafeMethods = ["post", "put", "patch", "delete"];
    if (config.method && unsafeMethods.includes(config.method.toLowerCase()) && config.headers) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Token refresh mutex to prevent concurrent refresh requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (token) promise.resolve(token);
    else promise.reject(error);
  });
  failedQueue = [];
};

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if this is a public endpoint - if so, don't try to refresh or redirect
      if (isPublicEndpoint(originalRequest.url)) {
        if (import.meta.env.DEV) console.warn('Public endpoint returned 401, this might indicate a backend configuration issue');
        return Promise.reject(error);
      }

      // If we're on a booking page, don't redirect to login immediately
      if (isBookingPage()) {
        if (import.meta.env.DEV) console.warn('401 error on booking page, continuing without authentication');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Another refresh is in-flight — queue this request
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokens = storage.getTokens();

        if (!tokens?.refresh) {
          storage.clearAuth();
          processQueue(error, null);
          return Promise.reject(error);
        }

        const apiUrl = getBaseUrl();
        const response = await axios.post(`${apiUrl}/users/token/refresh/`, {
          refresh: tokens.refresh,
        });

        const data = response.data as { access?: string };
        if (data.access) {
          storage.setTokens({
            access: data.access,
            refresh: tokens.refresh,
          });

          processQueue(null, data.access);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        storage.clearAuth();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;