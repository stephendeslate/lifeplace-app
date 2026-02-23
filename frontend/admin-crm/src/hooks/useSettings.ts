// frontend/admin-crm/src/hooks/useSettings.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../apis/settings.api';
import { permissionsApi } from '../apis/permissions.api';
import { useToastActions } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import type {
  AccountSettingsFormData,
  PasswordChangeFormData,
  CompanySettingsUpdateData,
} from '../types/settings.types';
import type { AdminPermissions } from '../types/permissions.types';

interface ApiError {
  response?: {
    data?: {
      detail?: string;
      [key: string]: unknown;
    };
  };
}

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
    onError: (error: ApiError) => {
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
    onError: (error: ApiError) => {
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
    onError: (error: ApiError) => {
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
    onError: (error: ApiError) => {
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
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to delete user';
      showError('Delete Failed', message);
    },
  });

  return {
    // Query data
    adminUsers: Array.isArray(adminUsersQuery.data) ? adminUsersQuery.data : [],
    invitations: Array.isArray(invitationsQuery.data) ? invitationsQuery.data : [],

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

/**
 * Hook for company settings management
 */
export const useCompanySettings = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Get company settings query
  const companySettingsQuery = useQuery({
    queryKey: ['companySettings'],
    queryFn: settingsApi.getCompanySettings,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update company settings mutation
  const updateCompanySettingsMutation = useMutation({
    mutationFn: (data: CompanySettingsUpdateData) => settingsApi.updateCompanySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companySettings'] });
      showSuccess('Settings Updated', 'Company settings have been updated successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to update company settings';
      showError('Update Failed', message);
    },
  });

  return {
    // Query data
    companySettings: companySettingsQuery.data,

    // Loading states
    isLoading: companySettingsQuery.isLoading,
    isUpdating: updateCompanySettingsMutation.isPending,

    // Error states
    error: companySettingsQuery.error,
    updateError: updateCompanySettingsMutation.error,

    // Mutations
    updateCompanySettings: updateCompanySettingsMutation.mutate,
    updateCompanySettingsAsync: updateCompanySettingsMutation.mutateAsync,

    // Utility functions
    refetch: companySettingsQuery.refetch,
    resetUpdateError: updateCompanySettingsMutation.reset,
  };
};

/**
 * Hook for admin permissions management
 */
export const useAdminPermissions = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Get permission presets query
  const presetsQuery = useQuery({
    queryKey: ['permissionPresets'],
    queryFn: permissionsApi.getPresets,
    staleTime: 30 * 60 * 1000, // 30 minutes - presets rarely change
  });

  // Update user permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: ({ userId, permissions }: { userId: number; permissions: AdminPermissions }) =>
      permissionsApi.updateUserPermissions(userId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showSuccess('Permissions Updated', 'Admin permissions have been updated successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to update permissions';
      showError('Update Failed', message);
    },
  });

  // Get user permissions query factory
  const getUserPermissionsQuery = (userId: number) => ({
    queryKey: ['userPermissions', userId],
    queryFn: () => permissionsApi.getUserPermissions(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });

  return {
    // Query data
    presets: presetsQuery.data,

    // Loading states
    isLoadingPresets: presetsQuery.isLoading,
    isUpdatingPermissions: updatePermissionsMutation.isPending,

    // Error states
    presetsError: presetsQuery.error,
    updateError: updatePermissionsMutation.error,

    // Mutations
    updatePermissions: updatePermissionsMutation.mutate,
    updatePermissionsAsync: updatePermissionsMutation.mutateAsync,

    // Utility functions
    refetchPresets: presetsQuery.refetch,
    resetUpdateError: updatePermissionsMutation.reset,

    // Query factory for getting specific user permissions
    getUserPermissionsQuery,
  };
};
