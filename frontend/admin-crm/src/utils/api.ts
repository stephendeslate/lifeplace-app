// frontend/admin-crm/src/utils/api.ts

import axios from "axios";
import { storage } from "./storage";

// Get base URL based on environment
const getBaseUrl = () => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_BASE_URL + "/api";
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

// List of public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/users/login/',
  '/users/token/refresh/',
  '/users/invitations/', // GET invitation details
];

// Helper function to check if an endpoint is public
const isPublicEndpoint = (url: string): boolean => {
  return PUBLIC_ENDPOINTS.some(endpoint => {
    // Check for exact match or invitation-related endpoints
    if (url === endpoint) return true;
    
    // Allow invitation endpoints (GET and POST accept)
    if (url.includes('/users/invitations/') && 
        (url.endsWith('/') || url.endsWith('/accept/'))) {
      return true;
    }
    
    return false;
  });
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
    // Add Authorization header if token exists (except for public endpoints)
    const tokens = storage.getTokens();
    if (tokens?.access && !isPublicEndpoint(config.url)) {
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

    // Only handle 401 errors for authenticated endpoints
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !isPublicEndpoint(originalRequest.url)) {
      
      originalRequest._retry = true;

      try {
        const tokens = storage.getTokens();

        if (!tokens?.refresh) {
          // No refresh token, clear tokens and redirect to login
          storage.clearAuth();
          
          // Only redirect if we're not already on a public page
          if (!window.location.pathname.includes('/accept-invitation/') && 
              !window.location.pathname.includes('/login')) {
            window.location.href = "/login";
          }
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
        
        // Only redirect if we're not already on a public page
        if (!window.location.pathname.includes('/accept-invitation/') && 
            !window.location.pathname.includes('/login')) {
          window.location.href = "/login";
        }
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
  
  // Public invitation endpoints
  getInvitation: (id: string) => api.get(`/users/invitations/${id}/`),
};

export default api;