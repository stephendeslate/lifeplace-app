// frontend/client-portal/src/apis/auth.api.ts

import api from '../utils/api';
import type {
  LoginCredentials,
  RegisterCredentials,
  User,
  LoginResponse,
  GoogleLoginResponse,
} from '../types/auth.types';

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
   * Get Google OAuth client ID
   */
  getGoogleClientId: async (): Promise<{ client_id: string }> => {
    const response = await api.get<{ client_id: string }>('/users/google/client-id/');
    return response.data;
  },

  /**
   * Login/register with Google OAuth
   * @param credential - Google ID token from Sign In With Google
   */
  googleLogin: async (credential: string): Promise<GoogleLoginResponse> => {
    const response = await api.post<GoogleLoginResponse>('/users/google/login/', { credential });
    return response.data;
  },

  /**
   * Logout - blacklist refresh token on the backend
   */
  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/users/logout/', { refresh: refreshToken });
  },

  /**
   * Refresh access token using refresh token
   * Backend may return a new refresh token when rotation is enabled
   */
  refreshToken: async (refreshToken: string): Promise<{ access: string; refresh?: string }> => {
    const response = await api.post<{ access: string; refresh?: string }>('/users/token/refresh/', {
      refresh: refreshToken,
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
   * Request password reset - sends email with reset token
   */
  requestPasswordReset: async (email: string): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>('/users/password-reset/request/', {
      email,
    });
    return response.data;
  },

  /**
   * Validate password reset token
   */
  validateResetToken: async (
    tokenId: string,
  ): Promise<{
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
  confirmPasswordReset: async (
    tokenId: string,
    data: {
      password: string;
      confirm_password: string;
    },
  ): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>(
      `/users/password-reset/confirm/${tokenId}/`,
      data,
    );
    return response.data;
  },

  /**
   * Upload user avatar
   */
  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post<User>('/users/me/avatar/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default authApi;
