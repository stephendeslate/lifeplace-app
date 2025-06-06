// frontend/admin-crm/src/apis/auth.api.ts

import api from '../utils/api';
import type { LoginCredentials, LoginResponse, User } from '../types/auth.types';

export const authApi = {
  /**
   * Login user with email and password
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/users/login/', credentials);
    return response.data;
  },

  /**
   * Get current user information
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/users/me/');
    return response.data;
  },

  /**
   * Refresh JWT token
   */
  refreshToken: async (refreshToken: string): Promise<{ access: string }> => {
    const response = await api.post<{ access: string }>('/users/token/refresh/', { 
      refresh: refreshToken 
    });
    return response.data;
  },

  /**
   * Change user password
   */
  changePassword: async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>('/users/me/change-password/', data);
    return response.data;
  },
};