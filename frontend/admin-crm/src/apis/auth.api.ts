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
   * Backend may return a new refresh token when rotation is enabled
   */
  refreshToken: async (refreshToken: string): Promise<{ access: string; refresh?: string }> => {
    const response = await api.post<{ access: string; refresh?: string }>('/users/token/refresh/', {
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

  /**
   * Request password reset - sends email with reset token
   */
  requestPasswordReset: async (email: string): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>('/users/password-reset/request/', { email });
    return response.data;
  },

  /**
   * Validate password reset token
   */
  validateResetToken: async (tokenId: string): Promise<{
    valid: boolean;
    email?: string;
    reason?: 'already_used' | 'expired' | 'not_found';
  }> => {
    const response = await api.get<{
      valid: boolean;
      email?: string;
      reason?: 'already_used' | 'expired' | 'not_found';
    }>(`/users/password-reset/validate/${tokenId}/`);
    return response.data;
  },

  /**
   * Confirm password reset with new password
   */
  confirmPasswordReset: async (tokenId: string, data: {
    password: string;
    confirm_password: string;
  }): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>(
      `/users/password-reset/confirm/${tokenId}/`,
      data
    );
    return response.data;
  },
};