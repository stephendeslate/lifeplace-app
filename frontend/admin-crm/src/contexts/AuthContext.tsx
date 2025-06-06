// frontend/admin-crm/src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, AuthContextType, LoginCredentials, AuthTokens } from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'lifeplace_admin_tokens';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get stored tokens
  const getStoredTokens = (): AuthTokens | null => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  };

  // Store tokens
  const storeTokens = (tokens: AuthTokens) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  };

  // Clear tokens
  const clearTokens = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  // Get current user info
  const getCurrentUser = async (accessToken: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  };

  // Refresh access token
  const refreshToken = async (): Promise<void> => {
    const tokens = getStoredTokens();
    if (!tokens?.refresh) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: tokens.refresh }),
      });

      if (response.ok) {
        const data = await response.json();
        const newTokens = {
          access: data.access,
          refresh: tokens.refresh, // Keep existing refresh token
        };
        storeTokens(newTokens);
        
        // Get updated user info
        const userData = await getCurrentUser(newTokens.access);
        if (userData) {
          setUser(userData);
        }
      } else {
        // Refresh token is invalid, log out
        logout();
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout();
      throw error;
    }
  };

  // Login function
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check if user is admin
        if (data.user.role !== 'ADMIN') {
          throw new Error('Access denied. Admin privileges required.');
        }

        storeTokens(data.tokens);
        setUser(data.user);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    clearTokens();
    setUser(null);
  };

  // Update user data
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const tokens = getStoredTokens();
      if (tokens?.access) {
        try {
          const userData = await getCurrentUser(tokens.access);
          if (userData && userData.role === 'ADMIN') {
            setUser(userData);
          } else {
            // User is not admin or token is invalid
            clearTokens();
          }
        } catch (error) {
          // Try to refresh token
          try {
            await refreshToken();
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            clearTokens();
          }
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (user) {
      // Refresh token every 25 minutes (tokens expire in 30 minutes)
      const interval = setInterval(() => {
        refreshToken().catch(console.error);
      }, 25 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshToken,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};