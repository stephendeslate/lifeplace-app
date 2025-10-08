// frontend/client-portal/src/hooks/useAuth.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import { authApi } from '../apis/auth.api';
import { useToastActions } from '../contexts/ToastContext';
import { ErrorHandler } from '../utils/errorHandler';
import type { LoginCredentials, RegisterCredentials, User } from '../types/auth.types';

export const useAuth = () => {
  const authContext = useAuthContext();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      showSuccess('Welcome back!', `Successfully logged in as ${data.user.first_name || data.user.email}`);
      
      // Invalidate queries that depend on authentication
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error: unknown) => {
      console.error('Login error:', error);
      const message = ErrorHandler.extractMessage(error);
      showError('Login Failed', message);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: RegisterCredentials) => authApi.register(userData),
    onSuccess: () => {
      showSuccess(
        'Welcome to LifePlace!',
        'Your account has been created successfully.'
      );
      
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: unknown) => {
      console.error('Registration error:', error);
      const message = ErrorHandler.extractMessage(error);
      showError('Registration Failed', message);
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { 
      current_password: string; 
      new_password: string; 
      confirm_password: string;
    }) => authApi.changePassword(data),
    onSuccess: () => {
      showSuccess('Password Changed', 'Your password has been updated successfully.');
    },
    onError: (error: unknown) => {
      console.error('Change password error:', error);
      const message = ErrorHandler.extractMessage(error);
      showError('Password Change Failed', message);
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<User>) => authApi.updateProfile(data),
    onSuccess: (data) => {
      showSuccess('Profile Updated', 'Your profile has been updated successfully.');
      
      // Update the user in context
      if (authContext.user) {
        authContext.updateUser(data);
      }
      
      // Invalidate user query
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: unknown) => {
      console.error('Update profile error:', error);
      const message = ErrorHandler.extractMessage(error);
      showError('Update Failed', message);
    },
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => authApi.uploadAvatar(file),
    onSuccess: (data) => {
      showSuccess('Avatar Updated', 'Your profile picture has been updated.');
      
      // Update user context with new avatar
      if (authContext.user) {
        authContext.updateUser(data);
      }
      
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: unknown) => {
      console.error('Upload avatar error:', error);
      const message = ErrorHandler.extractMessage(error);
      showError('Upload Failed', message);
    },
  });

  // Current user query (mainly for keeping data fresh)
  const userQuery = useQuery({
    queryKey: ['user', 'current'],
    queryFn: () => authApi.getCurrentUser(),
    enabled: !!authContext.isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: unknown) => {
      // Don't retry on auth errors
      if (ErrorHandler.isAuthError(error) || ErrorHandler.isPermissionError(error)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  return {
    // Auth state from context
    user: authContext.user,
    isAuthenticated: authContext.isAuthenticated,
    isLoading: authContext.isLoading,

    // Auth actions from context (these handle token storage)
    login: authContext.login,
    register: authContext.register,
    logout: authContext.logout,
    refreshToken: authContext.refreshToken,
    updateUser: authContext.updateUser,

    // Additional operations
    changePassword: changePasswordMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    uploadAvatar: uploadAvatarMutation.mutateAsync,

    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isUploadingAvatar: uploadAvatarMutation.isPending,

    // Query state
    isRefreshing: userQuery.isFetching,
    
    // Error states
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    profileError: updateProfileMutation.error,
    
    // Reset functions
    resetLoginError: loginMutation.reset,
    resetRegisterError: registerMutation.reset,
    resetProfileError: updateProfileMutation.reset,
  };
};

export default useAuth;