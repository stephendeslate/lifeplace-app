// frontend/admin-crm/src/types/auth.types.ts

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