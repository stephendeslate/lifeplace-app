/**
 * useAuth Hooks
 *
 * Authentication hooks using React Query for data fetching and mutations.
 * These hooks provide optimistic updates, caching, and error handling.
 *
 * USAGE:
 * // Get auth state
 * const { user, isAuthenticated } = useAuth();
 *
 * // Login mutation
 * const { mutate: login, isPending } = useLogin();
 * login({ email, password }, { onSuccess: () => router.push('/') });
 *
 * // Register mutation
 * const { mutate: register, isPending } = useRegister();
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AuthAPI } from '@/apis/auth.api';
import { useAuthStore } from '@/stores/authStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { queryKeys } from '@/utils/queryClient';
import type {
  LoginCredentials,
  RegisterCredentials,
  User,
} from '@/types/auth.types';

// =============================================================================
// AUTH STATE HOOK
// =============================================================================

/**
 * Main auth hook - provides auth state and methods from context.
 */
export function useAuth() {
  return useAuthContext();
}

// =============================================================================
// AUTH MUTATIONS
// =============================================================================

/**
 * Login mutation hook.
 *
 * Handles login API call and updates auth state on success.
 */
export function useLogin() {
  const { setTokens, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => AuthAPI.login(credentials),
    onSuccess: (data) => {
      setTokens(data.tokens.access, data.tokens.refresh);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}

/**
 * Register mutation hook.
 *
 * Handles registration API call and updates auth state on success.
 */
export function useRegister() {
  const { setTokens, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterCredentials) => AuthAPI.register(data),
    onSuccess: (data) => {
      setTokens(data.tokens.access, data.tokens.refresh);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}

/**
 * Logout mutation hook.
 *
 * Handles logout API call and clears auth state.
 */
export function useLogout() {
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => AuthAPI.logout(),
    onSettled: () => {
      // Always clear auth state, even if API call fails
      clearAuth();
      queryClient.clear();
    },
  });
}

/**
 * Get current user query hook.
 *
 * Fetches the current user from the API and updates the store.
 */
export function useCurrentUser() {
  const { accessToken, setUser } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      const user = await AuthAPI.getCurrentUser();
      setUser(user);
      return user;
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Update profile mutation hook.
 *
 * Updates the user's profile and syncs with the store.
 */
export function useUpdateProfile() {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<User>) => AuthAPI.updateProfile(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(queryKeys.auth.user, updatedUser);
    },
  });
}

/**
 * Change password mutation hook.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: {
      current_password: string;
      new_password: string;
      confirm_password: string;
    }) => AuthAPI.changePassword(data),
  });
}

/**
 * Request password reset mutation hook.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (data: { email: string }) => AuthAPI.requestPasswordReset(data),
  });
}

/**
 * Confirm password reset mutation hook.
 */
export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: ({
      tokenId,
      password,
      confirm_password,
    }: {
      tokenId: string;
      password: string;
      confirm_password: string;
    }) => AuthAPI.confirmPasswordReset(tokenId, { password, confirm_password }),
  });
}

/**
 * Accept invitation mutation hook.
 *
 * Used when a user accepts an invitation from admin.
 */
export function useAcceptInvitation() {
  const { setTokens, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invitationId,
      password,
      confirm_password,
    }: {
      invitationId: string;
      password: string;
      confirm_password: string;
    }) => AuthAPI.acceptInvitation(invitationId, { password, confirm_password }),
    onSuccess: (data) => {
      setTokens(data.tokens.access, data.tokens.refresh);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}

// Re-export types for convenience
export type { User } from '@/types/auth.types';
