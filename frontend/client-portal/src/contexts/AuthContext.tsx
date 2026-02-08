// frontend/client-portal/src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, AuthContextType, LoginCredentials, RegisterCredentials, AuthTokens } from '../types/auth.types';
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
      if (import.meta.env.DEV) console.error('Error fetching current user:', error);
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
        refresh: data.refresh || tokens.refresh, // Use new refresh token if provided, otherwise keep existing
      };

      storage.setTokens(newTokens);
      
      // Get updated user info
      const userData = await getCurrentUser();
      if (userData) {
        const userWithToken = { ...userData, token: newTokens.access };
        setUser(userWithToken);
        storage.setUser(userWithToken);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error refreshing token:', error);
      logout();
      throw error;
    }
  };

  // Login function using API client
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const data = await authApi.login(credentials);
      
      // For client portal, we accept both CLIENT and ADMIN users
      // but will show a notice if admin users login here
      
      // Store tokens and user data
      storage.setTokens(data.tokens);
      const userWithToken = { ...data.user, token: data.tokens.access };
      storage.setUser(userWithToken);
      setUser(userWithToken);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Login error:', error);
      throw error;
    }
  };

  // Register function using API client
  const register = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      const data = await authApi.register(credentials);

      // Store tokens and user data
      storage.setTokens(data.tokens);
      const userWithToken = { ...data.user, token: data.tokens.access };
      storage.setUser(userWithToken);
      setUser(userWithToken);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Registration error:', error);
      throw error;
    }
  };

  // Google login function using API client
  const googleLogin = async (credential: string): Promise<void> => {
    try {
      const data = await authApi.googleLogin(credential);

      // Store tokens and user data
      storage.setTokens(data.tokens);
      const userWithToken = { ...data.user, token: data.tokens.access };
      storage.setUser(userWithToken);
      setUser(userWithToken);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Google login error:', error);
      throw error;
    }
  };

  // Logout function with proper cleanup - blacklist refresh token on backend
  const logout = () => {
    const tokens = storage.getTokens();
    if (tokens?.refresh) {
      authApi.logout(tokens.refresh).catch(() => {});
    }

    // Clear auth but preserve user preferences and non-sensitive data
    storage.clearAuth();

    // Clear user-specific data but keep preferences
    const cartItems = storage.getCart();
    if (cartItems.length > 0) {
      storage.clearCart();
    }

    setUser(null);
  };

  // Update user data
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      // Preserve token if not provided in userData
      if (!userData.token && user.token) {
        updatedUser.token = user.token;
      }
      setUser(updatedUser);
      storage.setUser(updatedUser);
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Skip auth initialization if on login/register pages to prevent API calls that could cause loops
        const currentPath = window.location.pathname;
        const isOnAuthPage = currentPath === '/login' || currentPath === '/register' || currentPath.startsWith('/accept-invitation');
        
        // Check if storage is available
        if (!storage.isStorageAvailable()) {
          if (import.meta.env.DEV) console.warn('localStorage is not available');
          setIsLoading(false);
          return;
        }

        const tokens = storage.getTokens();
        const storedUser = storage.getUser();
        
        // If on auth page and no tokens, just set loading to false without making API calls
        if (isOnAuthPage && !tokens?.access) {
          setIsLoading(false);
          return;
        }
        
        if (tokens?.access && storedUser) {
          // Try to get fresh user data
          try {
            const userData = await getCurrentUser();
            if (userData) {
              const userWithToken = { ...userData, token: tokens.access };
              setUser(userWithToken);
              storage.setUser(userWithToken);
            } else {
              // Token is invalid
              storage.clearAuth();
            }
          } catch {
            // Token might be expired, try to refresh
            try {
              await refreshToken();
            } catch (refreshError) {
              if (import.meta.env.DEV) console.error('Failed to refresh token:', refreshError);
              storage.clearAuth();
            }
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error initializing auth:', error);
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
          if (import.meta.env.DEV) console.error('Background token refresh failed:', error);
        });
      }, 25 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Handle storage events (for cross-tab logout)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // If tokens were removed in another tab, logout this tab too
      if (event.key === 'lifeplace_client_tokens' && event.newValue === null) {
        setUser(null);
      }
      
      // Handle cart updates from other tabs
      if (event.key === 'lifeplace_client_cart') {
        // Could trigger cart update event here
        window.dispatchEvent(new CustomEvent('cartUpdated'));
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
          if (import.meta.env.DEV) console.error('Visibility refresh failed:', error);
        });
        
        // Clean up expired cart items when page becomes visible
        const cartItems = storage.getCart(); // This automatically filters expired items
        if (cartItems.length !== storage.getCart().length) {
          // Some items were expired and removed
          window.dispatchEvent(new CustomEvent('cartUpdated'));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Handle before unload to warn about unsaved cart items
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const cartItemCount = storage.getCartItemCount();
      if (cartItemCount > 0 && !user) {
        // Warn user about losing cart items if not logged in
        event.preventDefault();
        event.returnValue = 'You have items in your cart. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    googleLogin,
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