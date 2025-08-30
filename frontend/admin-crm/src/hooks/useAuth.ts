// frontend/admin-crm/src/hooks/useAuth.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../apis/auth.api';
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import { useToastActions } from '../contexts/ToastContext';
import type { LoginCredentials } from '../types/auth.types';

interface AuthApiError {
  response?: {
    data?: {
      detail?: string;
      [key: string]: unknown;
    };
  };
  message?: string;
}

/**
 * Hook for authentication operations using React Query
 */
export const useAuthOperations = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();
  const { logout: contextLogout } = useAuthContext();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      showSuccess('Welcome!', `Successfully logged in as ${data.user.first_name || data.user.email}`);
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error: AuthApiError) => {
      const message = error.response?.data?.detail || error.message || 'Login failed';
      showError('Login Failed', message);
    },
  });

  // Current user query
  const currentUserQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getCurrentUser,
    enabled: false, // We'll enable this manually when needed
    retry: false,
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      showSuccess('Password Changed', 'Your password has been updated successfully.');
    },
    onError: (error: AuthApiError) => {
      const message = error.response?.data?.detail || 'Failed to change password';
      showError('Password Change Failed', message);
    },
  });

  // Logout function
  const logout = () => {
    contextLogout();
    queryClient.clear(); // Clear all cached data
    showSuccess('Logged Out', 'You have been successfully logged out.');
  };

  return {
    // Mutations
    login: loginMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    logout,

    // Query states
    currentUser: currentUserQuery.data,
    isCurrentUserLoading: currentUserQuery.isLoading,

    // Mutation states
    isLoginLoading: loginMutation.isPending,
    isChangePasswordLoading: changePasswordMutation.isPending,

    // Error states
    loginError: loginMutation.error,
    changePasswordError: changePasswordMutation.error,
    currentUserError: currentUserQuery.error,

    // Utility functions
    refetchCurrentUser: currentUserQuery.refetch,
    resetLoginError: loginMutation.reset,
    resetChangePasswordError: changePasswordMutation.reset,
  };
};

/**
 * Re-export the context hook for convenience
 */
export { useAuth } from '../contexts/AuthContext';