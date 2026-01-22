/**
 * Authentication Context
 *
 * Provides auth state and methods throughout the app.
 *
 * KEY CONCEPTS:
 * - Context provides values to all child components without prop drilling
 * - This context wraps the Zustand auth store with additional methods
 * - Handles hydration (loading stored tokens on app start)
 * - Provides login/logout/register methods with API integration
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useRouter } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';
import { AuthAPI } from '@/apis/auth.api';
import { queryClient, clearAllQueries } from '@/utils/queryClient';
import { getErrorMessage } from '@/utils/errorHandler';
import { NotificationService } from '@/services/notifications';
import { unregisterPushToken } from '@/apis/notifications.api';
import { clearBadge } from '@/utils/notificationHandler';
import { getPendingDeepLink, navigateToDeepLink } from '@/utils/deepLinking';
import { logger } from '@/utils/logger';
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
} from '@/types/auth.types';

const authLogger = logger.create('AuthContext');

// =============================================================================
// TYPES
// =============================================================================

interface AuthContextValue {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;

  // Methods
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterCredentials) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  // Get store state and actions
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const setTokens = useAuthStore((state) => state.setTokens);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setLoading = useAuthStore((state) => state.setLoading);

  // ==========================================================================
  // HYDRATION CHECK
  // ==========================================================================

  /**
   * After hydration, verify the stored tokens are still valid by
   * fetching the current user. If it fails, clear the auth state.
   */
  useEffect(() => {
    const verifyAuth = async () => {
      if (!isHydrated) return;

      const { accessToken } = useAuthStore.getState();

      if (accessToken) {
        try {
          // Verify token by fetching current user
          const currentUser = await AuthAPI.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          // Token is invalid, clear auth
          authLogger.debug('Token verification failed, clearing auth');
          clearAuth();
        }
      }

      setLoading(false);
    };

    verifyAuth();
  }, [isHydrated, setUser, clearAuth, setLoading]);

  // ==========================================================================
  // LOGIN
  // ==========================================================================

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setLoading(true);

      try {
        const response = await AuthAPI.login(credentials);

        // Store tokens and user
        setTokens(response.tokens.access, response.tokens.refresh);
        setUser(response.user);

        // Check for pending deep link (from pre-auth navigation attempt)
        const pendingDeepLink = getPendingDeepLink();
        if (pendingDeepLink) {
          // Navigate to the pending deep link destination
          navigateToDeepLink(pendingDeepLink);
        } else {
          // Navigate to main app (Explore tab)
          router.replace('/(tabs)');
        }
      } catch (error) {
        throw new Error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [router, setTokens, setUser, setLoading]
  );

  // ==========================================================================
  // REGISTER
  // ==========================================================================

  const register = useCallback(
    async (data: RegisterCredentials) => {
      setLoading(true);

      try {
        const response = await AuthAPI.register(data);

        // Store tokens and user (auto-login after registration)
        setTokens(response.tokens.access, response.tokens.refresh);
        setUser(response.user);

        // Check for pending deep link (from pre-auth navigation attempt)
        const pendingDeepLink = getPendingDeepLink();
        if (pendingDeepLink) {
          // Navigate to the pending deep link destination
          navigateToDeepLink(pendingDeepLink);
        } else {
          // Navigate to main app (Explore tab)
          router.replace('/(tabs)');
        }
      } catch (error) {
        throw new Error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [router, setTokens, setUser, setLoading]
  );

  // ==========================================================================
  // GOOGLE LOGIN
  // ==========================================================================

  const googleLogin = useCallback(
    async (credential: string) => {
      setLoading(true);

      try {
        const response = await AuthAPI.googleLogin(credential);

        // Store tokens and user
        setTokens(response.tokens.access, response.tokens.refresh);
        setUser(response.user);

        // Check for pending deep link (from pre-auth navigation attempt)
        const pendingDeepLink = getPendingDeepLink();
        if (pendingDeepLink) {
          // Navigate to the pending deep link destination
          navigateToDeepLink(pendingDeepLink);
        } else {
          // Navigate to main app (Explore tab)
          router.replace('/(tabs)');
        }
      } catch (error) {
        throw new Error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [router, setTokens, setUser, setLoading]
  );

  // ==========================================================================
  // LOGOUT
  // ==========================================================================

  const logout = useCallback(async () => {
    setLoading(true);

    try {
      // Get stored push token before clearing auth
      const pushToken = await NotificationService.getStoredPushToken();

      // Unregister push token from backend
      if (pushToken) {
        try {
          await unregisterPushToken({ token: pushToken });
        } catch {
          // Continue with logout even if unregistration fails
          authLogger.warn('Failed to unregister push token');
        }
      }

      // Call backend to blacklist the refresh token
      await AuthAPI.logout();
    } catch (error) {
      // Even if logout API fails, we still clear local auth
      authLogger.warn('Logout API failed:', getErrorMessage(error));
    } finally {
      // Clear stored push token
      await NotificationService.clearStoredPushToken();

      // Clear badge
      await clearBadge();

      // Clear local auth state
      clearAuth();

      // Clear all cached data (don't show old user's data)
      clearAllQueries(queryClient);

      // Navigate to login
      router.replace('/login');

      setLoading(false);
    }
  }, [router, clearAuth, setLoading]);

  // ==========================================================================
  // REFRESH USER
  // ==========================================================================

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await AuthAPI.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      authLogger.error('Failed to refresh user:', getErrorMessage(error));
    }
  }, [setUser]);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      isHydrated,
      login,
      register,
      googleLogin,
      logout,
      refreshUser,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      isHydrated,
      login,
      register,
      googleLogin,
      logout,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Use this hook to access auth state and methods in components.
 *
 * USAGE:
 * const { user, isAuthenticated, login, logout } = useAuthContext();
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}
