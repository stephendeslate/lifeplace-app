// frontend/client-portal/src/apis/auth.api.ts

import api from '../utils/api';
import type { LoginCredentials, RegisterCredentials, User, LoginResponse } from '../types/auth.types';

export const authApi = {
  /**
   * Login user with email and password
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/users/login/', credentials);
    return response.data;
  },

  /**
   * Register new user account
   */
  register: async (userData: RegisterCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/users/register/', userData);
    return response.data;
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (refreshToken: string): Promise<{ access: string }> => {
    const response = await api.post<{ access: string }>('/users/token/refresh/', { 
      refresh: refreshToken 
    });
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
   * Update user profile
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put<User>('/users/me/', data);
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

  /**
   * Upload user avatar
   */
  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post<User>('/users/me/avatar/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
};

export default authApi;