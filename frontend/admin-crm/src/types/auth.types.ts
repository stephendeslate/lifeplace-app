// frontend/admin-crm/src/types/auth.types.ts

import type { AdminPermissions } from './permissions.types';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'CLIENT' | 'ADMIN';
  is_active: boolean;
  date_joined: string;
  profile: UserProfile;
  token?: string; // Authentication token for WebSocket connections
  admin_permissions?: AdminPermissions; // Granular admin permissions
  is_full_admin?: boolean; // Whether user has all admin permissions
}

export interface UserProfile {
  phone?: string;
  company?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  tokens: {
    access: string;
    refresh: string;
  };
  user: User;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}