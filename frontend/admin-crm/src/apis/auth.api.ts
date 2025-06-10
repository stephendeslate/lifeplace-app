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

  /**
   * Get invitation details (public endpoint)
   */
  getInvitation: async (invitationId: string): Promise<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    invited_by: string;
    expires_at: string;
    is_accepted: boolean;
  }> => {
    const response = await api.get<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      invited_by: string;
      expires_at: string;
      is_accepted: boolean;
    }>(`/users/invitations/${invitationId}/`);
    return response.data;
  },

  /**
   * Accept invitation (public endpoint)
   */
  acceptInvitation: async (invitationId: string, data: {
    password: string;
    confirm_password: string;
  }): Promise<{
    user: User;
    tokens: {
      access: string;
      refresh: string;
    };
    detail: string;
  }> => {
    const response = await api.post<{
      user: User;
      tokens: {
        access: string;
        refresh: string;
      };
      detail: string;
    }>(`/users/invitations/${invitationId}/accept/`, data);
    return response.data;
  },
};