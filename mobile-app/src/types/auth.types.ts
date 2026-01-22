/**
 * Authentication Types
 *
 * TypeScript interfaces for authentication-related data structures.
 * These match the Django backend user and auth serializers.
 */

// =============================================================================
// USER TYPES
// =============================================================================

/** User role in the system - determines access levels and UI */
export type UserRole = 'CLIENT' | 'ADMIN';

/** Extended user profile information */
export interface UserProfile {
  /** User's phone number */
  phone?: string;
  /** Company or organization name */
  company?: string;
  /** IANA timezone string for display preferences */
  display_timezone: string;
  /** How to display timezone information in the UI */
  timezone_display_mode: 'business_only' | 'business_with_local' | 'dual_display';
}

/**
 * Authenticated user data from the backend.
 * Core user information used throughout the app.
 */
export interface User {
  /** Unique user identifier */
  id: number;
  /** User's email address (used for login) */
  email: string;
  /** User's first name */
  first_name: string;
  /** User's last name */
  last_name: string;
  /** User's role determining access permissions */
  role: UserRole;
  /** Whether the user account is active */
  is_active: boolean;
  /** ISO timestamp of when user registered */
  date_joined: string;
  /** Extended profile information */
  profile?: UserProfile;
  /** Phone number (may be denormalized from profile) */
  phone?: string;
  /** Street address */
  address?: string;
  /** City */
  city?: string;
  /** Postal/ZIP code */
  postal_code?: string;
  /** Country */
  country?: string;
  /** Company name (may be denormalized from profile) */
  company?: string;
  /** Job title */
  job_title?: string;
}

// =============================================================================
// AUTH REQUEST/RESPONSE TYPES
// =============================================================================

/** Credentials for user login */
export interface LoginCredentials {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
}

/** Data required for new user registration */
export interface RegisterCredentials {
  /** Email address (must be unique) */
  email: string;
  /** Password (must meet strength requirements) */
  password: string;
  /** Password confirmation (must match password) */
  confirm_password: string;
  /** User's first name */
  first_name: string;
  /** User's last name */
  last_name: string;
  /** Optional phone number */
  phone?: string;
  /** Optional company name */
  company?: string;
}

/** JWT token pair for authentication */
export interface AuthTokens {
  /** Short-lived access token for API requests */
  access: string;
  /** Long-lived refresh token for obtaining new access tokens */
  refresh: string;
}

/** Response from successful login */
export interface LoginResponse {
  /** Authenticated user data */
  user: User;
  /** JWT token pair */
  tokens: AuthTokens;
}

/** Response from successful Google OAuth login */
export interface GoogleLoginResponse extends LoginResponse {
  /** Whether this was a new user registration */
  created: boolean;
}

/** Request to initiate password reset flow */
export interface PasswordResetRequest {
  /** Email address to send reset link to */
  email: string;
}

/** Data to confirm password reset with new password */
export interface PasswordResetConfirm {
  /** New password */
  password: string;
  /** New password confirmation */
  confirm_password: string;
}

/** Request to change password while logged in */
export interface ChangePasswordRequest {
  /** Current password for verification */
  current_password: string;
  /** New password */
  new_password: string;
  /** New password confirmation */
  confirm_password: string;
}

/** Request to accept invitation and set password */
export interface AcceptInvitationRequest {
  /** Password for new account */
  password: string;
  /** Password confirmation */
  confirm_password: string;
}

// =============================================================================
// AUTH STATE TYPES
// =============================================================================

/** Authentication state managed by authStore */
export interface AuthState {
  /** Currently authenticated user, or null if not logged in */
  user: User | null;
  /** Current JWT access token */
  accessToken: string | null;
  /** Current JWT refresh token */
  refreshToken: string | null;
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is being loaded (hydration) */
  isLoading: boolean;
}
