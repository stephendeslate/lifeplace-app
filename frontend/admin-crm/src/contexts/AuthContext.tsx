// frontend/admin-crm/src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, AuthContextType, LoginCredentials, AuthTokens } from '../types/auth.types';
import { storage } from '../utils/storage';
import { authApi } from '../apis/auth.api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get current user info using API client
  const getCurrentUser = async (): Promise<User | null> => {
    try {
      const userData = await authApi.getCurrentUser();
      return userData;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  };

  // Refresh access token using API client
  const refreshToken = async (): Promise<void> => {
    const tokens = storage.getTokens();
    if (!tokens?.refresh) {
      throw new Error('No refresh token available');
    }

    try {
      const data = await authApi.refreshToken(tokens.refresh);
      const newTokens: AuthTokens = {
        access: data.access,
        refresh: tokens.refresh, // Keep existing refresh token
      };
      
      storage.setTokens(newTokens);
      
      // Get updated user info
      const userData = await getCurrentUser();
      if (userData) {
        setUser(userData);
        storage.setUser(userData);
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout();
      throw error;
    }
  };

  // Login function using API client
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const data = await authApi.login(credentials);
      
      // Check if user is admin
      if (data.user.role !== 'ADMIN') {
        throw new Error('Access denied. Admin privileges required.');
      }

      // Store tokens and user data
      storage.setTokens(data.tokens);
      storage.setUser(data.user);
      setUser(data.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    storage.clearAuth();
    setUser(null);
  };

  // Update user data
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      storage.setUser(updatedUser);
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if storage is available
        if (!storage.isStorageAvailable()) {
          console.warn('localStorage is not available');
          setIsLoading(false);
          return;
        }

        const tokens = storage.getTokens();
        const storedUser = storage.getUser();
        
        if (tokens?.access && storedUser) {
          // Try to get fresh user data
          try {
            const userData = await getCurrentUser();
            if (userData && userData.role === 'ADMIN') {
              setUser(userData);
              storage.setUser(userData);
            } else {
              // User is not admin or token is invalid
              storage.clearAuth();
            }
          } catch {
            // Token might be expired, try to refresh
            try {
              await refreshToken();
            } catch (refreshError) {
              console.error('Failed to refresh token:', refreshError);
              storage.clearAuth();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        storage.clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (user) {
      // Refresh token every 25 minutes (tokens expire in 30 minutes)
      const interval = setInterval(() => {
        refreshToken().catch((error) => {
          console.error('Background token refresh failed:', error);
        });
      }, 25 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Handle storage events (for cross-tab logout)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // If tokens were removed in another tab, logout this tab too
      if (event.key === 'lifeplace_admin_tokens' && event.newValue === null) {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handle page visibility change to refresh token when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Refresh token when page becomes visible after being hidden
        refreshToken().catch((error) => {
          console.error('Visibility refresh failed:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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