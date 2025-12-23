/**
 * Authentication Types
 *
 * TypeScript interfaces for authentication-related data structures.
 * These match the Django backend user and auth serializers.
 */

// =============================================================================
// USER TYPES
// =============================================================================

export type UserRole = 'CLIENT' | 'ADMIN';

export interface UserProfile {
  phone?: string;
  company?: string;
  display_timezone: string;
  timezone_display_mode: 'business_only' | 'business_with_local' | 'dual_display';
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
  profile?: UserProfile;
}

// =============================================================================
// AUTH REQUEST/RESPONSE TYPES
// =============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  password: string;
  confirm_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AcceptInvitationRequest {
  password: string;
  confirm_password: string;
}

// =============================================================================
// AUTH STATE TYPES
// =============================================================================

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
