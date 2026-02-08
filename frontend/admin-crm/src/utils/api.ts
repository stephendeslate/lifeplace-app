// frontend/admin-crm/src/utils/api.ts

import axios from "axios";
import { storage } from "./storage";
import type {
  LoginCredentials,
  ChangePasswordData
} from '../types/auth.types';
import type {
  CreateAdminUserData,
  UpdateAdminUserData,
  InviteAdminFormData,
  AcceptInvitationFormData
} from '../types/settings.types';

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

// Add request interceptor to add authorization header and CSRF token
api.interceptors.request.use(
  (config) => {
    // Add Authorization header if token exists
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
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
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
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Convenience methods for common API operations
export const apiMethods = {
  // Auth endpoints
  login: (credentials: LoginCredentials) => api.post('/users/login/', credentials),
  refreshToken: (refreshToken: string) => api.post('/users/token/refresh/', { refresh: refreshToken }),
  getCurrentUser: () => api.get('/users/me/'),
  changePassword: (data: ChangePasswordData) => api.post('/users/me/change-password/', data),

  // User management endpoints
  getUsers: (params?: Record<string, unknown>) => api.get('/users/', { params }),
  getUser: (id: number) => api.get(`/users/${id}/`),
  createUser: (data: CreateAdminUserData) => api.post('/users/', data),
  updateUser: (id: number, data: UpdateAdminUserData) => api.put(`/users/${id}/`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}/`),

  // Admin invitation endpoints
  getInvitations: () => api.get('/users/invitations/'),
  createInvitation: (data: InviteAdminFormData) => api.post('/users/invitations/', data),
  deleteInvitation: (id: string) => api.delete(`/users/invitations/${id}/`),
  acceptInvitation: (id: string, data: AcceptInvitationFormData) => api.post(`/users/invitations/${id}/accept/`, data),
};

export default api;