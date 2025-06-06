// frontend/admin-crm/src/utils/api.ts

import axios from "axios";
import { storage } from "./storage";

// Get base URL based on environment
const getBaseUrl = () => {
  if (import.meta.env.PROD) {
    // In production, use relative URL
    // This works since both API and frontend are on the same domain
    return "/api";
  }
  
  // In development, use the environment variable or default to localhost
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
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

// Add request interceptor to add authorization header and CSRF token
api.interceptors.request.use(
  (config: any) => {
    // Add Authorization header if token exists
    const tokens = storage.getTokens();
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }

    // Add CSRF token for unsafe methods
    const unsafeMethods = ["post", "put", "patch", "delete"];
    if (config.method && unsafeMethods.includes(config.method.toLowerCase())) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and not a retry, attempt to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokens = storage.getTokens();

        if (!tokens?.refresh) {
          // No refresh token, clear tokens and redirect to login
          storage.clearAuth();
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // Get the appropriate API URL for token refresh
        const apiUrl = getBaseUrl();

        // Attempt to refresh the token
        const response = await axios.post(`${apiUrl}/users/token/refresh/`, {
          refresh: tokens.refresh,
        });

        const data = response.data as { access?: string };
        if (data.access) {
          // Save new tokens
          storage.setTokens({
            access: data.access,
            refresh: tokens.refresh,
          });

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        storage.clearAuth();
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Convenience methods for common API operations
export const apiMethods = {
  // Auth endpoints
  login: (credentials: any) => api.post('/users/login/', credentials),
  refreshToken: (refreshToken: string) => api.post('/users/token/refresh/', { refresh: refreshToken }),
  getCurrentUser: () => api.get('/users/me/'),
  changePassword: (data: any) => api.post('/users/me/change-password/', data),

  // User management endpoints
  getUsers: (params?: any) => api.get('/users/', { params }),
  getUser: (id: number) => api.get(`/users/${id}/`),
  createUser: (data: any) => api.post('/users/', data),
  updateUser: (id: number, data: any) => api.put(`/users/${id}/`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}/`),

  // Admin invitation endpoints
  getInvitations: () => api.get('/users/invitations/'),
  createInvitation: (data: any) => api.post('/users/invitations/', data),
  deleteInvitation: (id: string) => api.delete(`/users/invitations/${id}/`),
  acceptInvitation: (id: string, data: any) => api.post(`/users/invitations/${id}/accept/`, data),
};

export default api;