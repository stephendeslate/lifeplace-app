/**
 * Authentication API
 *
 * All authentication-related API calls.
 * These functions call the Django backend's user endpoints.
 */

import api from '@/utils/api';
import type {
  LoginCredentials,
  LoginResponse,
  GoogleLoginResponse,
  RegisterCredentials,
  User,
  ChangePasswordRequest,
  AcceptInvitationRequest,
} from '@/types/auth.types';

// =============================================================================
// AUTH API
// =============================================================================

export const AuthAPI = {
  /**
   * Login with email and password.
   *
   * Returns user data and JWT tokens.
   * POST /users/login/
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/users/login/', credentials);
    return response.data;
  },

  /**
   * Register a new client account.
   *
   * Returns user data and JWT tokens (auto-login after registration).
   * POST /users/register/
   */
  register: async (data: RegisterCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/users/register/', data);
    return response.data;
  },

  /**
   * Get Google OAuth client ID from backend.
   *
   * The backend returns the configured client ID for Google Sign-In.
   * GET /users/google/client-id/
   */
  getGoogleClientId: async (): Promise<{ client_id: string }> => {
    const response = await api.get<{ client_id: string }>('/users/google/client-id/');
    return response.data;
  },

  /**
   * Login or register with Google OAuth.
   *
   * Sends the Google ID token to backend for verification.
   * Creates a new account if user doesn't exist.
   * POST /users/google/login/
   */
  googleLogin: async (credential: string): Promise<GoogleLoginResponse> => {
    const response = await api.post<GoogleLoginResponse>('/users/google/login/', {
      credential,
    });
    return response.data;
  },

  /**
   * Get the current authenticated user's profile.
   *
   * GET /users/me/
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/users/me/');
    return response.data;
  },

  /**
   * Update the current user's profile.
   *
   * PUT /users/me/ (full update)
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put<User>('/users/me/', data);
    return response.data;
  },

  /**
   * Partially update the current user's profile.
   *
   * PATCH /users/me/ (partial update)
   */
  patchProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.patch<User>('/users/me/', data);
    return response.data;
  },

  /**
   * Change the current user's password.
   *
   * IMPORTANT: This is a PATCH request, not POST.
   * PATCH /users/me/change-password/
   */
  changePassword: async (
    data: ChangePasswordRequest
  ): Promise<{ detail: string }> => {
    const response = await api.patch<{ detail: string }>(
      '/users/me/change-password/',
      data
    );
    return response.data;
  },

  /**
   * Request a password reset email.
   *
   * POST /users/password-reset/request/
   */
  requestPasswordReset: async (data: { email: string }): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>(
      '/users/password-reset/request/',
      data
    );
    return response.data;
  },

  /**
   * Validate a password reset token before showing the reset form.
   *
   * GET /users/password-reset/validate/{tokenId}/
   */
  validateResetToken: async (
    tokenId: string
  ): Promise<{
    valid: boolean;
    email?: string;
    reason?: 'already_used' | 'expired' | 'not_found';
  }> => {
    const response = await api.get(`/users/password-reset/validate/${tokenId}/`);
    return response.data;
  },

  /**
   * Confirm password reset with new password.
   *
   * POST /users/password-reset/confirm/{tokenId}/
   */
  confirmPasswordReset: async (
    tokenId: string,
    data: { password: string; confirm_password: string }
  ): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>(
      `/users/password-reset/confirm/${tokenId}/`,
      data
    );
    return response.data;
  },

  /**
   * Refresh the access token using the refresh token.
   *
   * NOTE: Backend may rotate refresh tokens. Always store both tokens.
   * POST /users/token/refresh/
   */
  refreshToken: async (
    refreshToken: string
  ): Promise<{ access: string; refresh?: string }> => {
    const response = await api.post('/users/token/refresh/', {
      refresh: refreshToken,
    });
    return response.data;
  },

  /**
   * Logout the current session.
   *
   * Blacklists the current refresh token on the backend.
   * POST /users/logout/
   */
  logout: async (): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>('/users/logout/');
    return response.data;
  },

  /**
   * Logout from all devices.
   *
   * Blacklists all refresh tokens for this user.
   * POST /users/logout-all/
   */
  logoutAll: async (): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>('/users/logout-all/');
    return response.data;
  },

  /**
   * Get all active sessions for the current user.
   *
   * GET /users/sessions/
   */
  getSessions: async (): Promise<
    Array<{
      id: string;
      device: string;
      ip_address: string;
      last_active: string;
      is_current: boolean;
    }>
  > => {
    const response = await api.get('/users/sessions/');
    return response.data;
  },

  /**
   * Validate a client invitation token.
   *
   * Used to check if an invitation is valid before showing the accept form.
   * GET /clients/invitations/{invitationId}/validate/
   */
  validateInvitation: async (
    invitationId: string
  ): Promise<{
    valid: boolean;
    email: string;
    first_name: string;
    last_name: string;
  }> => {
    const response = await api.get(
      `/clients/invitations/${invitationId}/validate/`
    );
    return response.data;
  },

  /**
   * Accept a client invitation.
   *
   * Used when an admin invites a client by email.
   * POST /clients/invitations/{invitationId}/accept/
   */
  acceptInvitation: async (
    invitationId: string,
    data: AcceptInvitationRequest
  ): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>(
      `/clients/invitations/${invitationId}/accept/`,
      data
    );
    return response.data;
  },
};

export default AuthAPI;
