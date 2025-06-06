// frontend/admin-crm/src/hooks/useSettings.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../apis/settings.api';
import { useToastActions } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import type { AccountSettingsFormData, PasswordChangeFormData } from '../types/settings.types';

/**
 * Hook for account settings operations
 */
export const useAccountSettings = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();
  const { updateUser } = useAuth();

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: AccountSettingsFormData) => settingsApi.updateProfile(data),
    onSuccess: (data) => {
      updateUser(data);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      showSuccess('Profile Updated', 'Your profile has been updated successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update profile';
      showError('Update Failed', message);
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordChangeFormData) => settingsApi.changePassword(data),
    onSuccess: () => {
      showSuccess('Password Changed', 'Your password has been updated successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to change password';
      showError('Password Change Failed', message);
    },
  });

  return {
    // Mutations
    updateProfile: updateProfileMutation.mutate,
    changePassword: changePasswordMutation.mutate,

    // Loading states
    isUpdatingProfile: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,

    // Error states
    profileUpdateError: updateProfileMutation.error,
    passwordChangeError: changePasswordMutation.error,

    // Utility functions
    resetProfileUpdateError: updateProfileMutation.reset,
    resetPasswordChangeError: changePasswordMutation.reset,
  };
};

/**
 * Hook for admin users management
 */
export const useAdminUsers = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Get admin users query
  const adminUsersQuery = useQuery({
    queryKey: ['adminUsers'],
    queryFn: settingsApi.getAdminUsers,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get invitations query
  const invitationsQuery = useQuery({
    queryKey: ['adminInvitations'],
    queryFn: settingsApi.getInvitations,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: settingsApi.createInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminInvitations'] });
      showSuccess('Invitation Sent', 'Admin invitation has been sent successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to send invitation';
      showError('Invitation Failed', message);
    },
  });

  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: settingsApi.deleteInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminInvitations'] });
      showSuccess('Invitation Deleted', 'Admin invitation has been deleted.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete invitation';
      showError('Delete Failed', message);
    },
  });

  // Delete admin user mutation
  const deleteAdminUserMutation = useMutation({
    mutationFn: settingsApi.deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showSuccess('User Deleted', 'Admin user has been deactivated.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete user';
      showError('Delete Failed', message);
    },
  });

  return {
    // Query data
    adminUsers: adminUsersQuery.data || [],
    invitations: invitationsQuery.data || [],

    // Loading states
    isLoadingAdminUsers: adminUsersQuery.isLoading,
    isLoadingInvitations: invitationsQuery.isLoading,
    isCreatingInvitation: createInvitationMutation.isPending,
    isDeletingInvitation: deleteInvitationMutation.isPending,
    isDeletingUser: deleteAdminUserMutation.isPending,

    // Error states
    adminUsersError: adminUsersQuery.error,
    invitationsError: invitationsQuery.error,

    // Mutations
    createInvitation: createInvitationMutation.mutate,
    deleteInvitation: deleteInvitationMutation.mutate,
    deleteAdminUser: deleteAdminUserMutation.mutate,

    // Utility functions
    refetchAdminUsers: adminUsersQuery.refetch,
    refetchInvitations: invitationsQuery.refetch,
  };
};