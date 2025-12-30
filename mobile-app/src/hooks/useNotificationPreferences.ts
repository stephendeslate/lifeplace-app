/**
 * useNotificationPreferences Hook
 *
 * Manages notification preferences with React Query.
 * Provides preference fetching, updates, and reset functionality.
 *
 * USAGE:
 * const { preferences, updatePreference, isUpdating } = useNotificationPreferences();
 * updatePreference('push_enabled', false);
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getNotificationPreferences,
  updateNotificationPreferences,
  resetPreferencesToDefaults,
  getMyDevices,
  sendTestPush,
} from '@/apis/notifications.api';
import { queryKeys } from '@/utils/queryClient';
import { useToast } from '@/contexts/ToastContext';
import type { NotificationPreference } from '@/types/notifications.types';

// =============================================================================
// DEFAULT PREFERENCES
// =============================================================================

const DEFAULT_PREFERENCES: Partial<NotificationPreference> = {
  push_enabled: true,
  event_push: true,
  payment_push: true,
  task_push: true,
  contract_push: true,
  communication_push: true,
  marketing_push: false,
  system_push: true,
  client_push: true,
  workflow_push: true,
};

// =============================================================================
// HOOK
// =============================================================================

export function useNotificationPreferences() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // ===========================================================================
  // QUERY - Fetch preferences
  // ===========================================================================

  const {
    data: preferences,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: getNotificationPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ===========================================================================
  // MUTATION - Update preferences
  // ===========================================================================

  const updateMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.preferences,
      });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData<NotificationPreference>(
        queryKeys.notifications.preferences
      );

      // Optimistically update
      if (previousPreferences) {
        queryClient.setQueryData<NotificationPreference>(
          queryKeys.notifications.preferences,
          { ...previousPreferences, ...newData }
        );
      }

      return { previousPreferences };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notifications.preferences, data);
      showToast('Preferences updated', 'success');
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          queryKeys.notifications.preferences,
          context.previousPreferences
        );
      }
      showToast('Failed to update preferences', 'error');
    },
  });

  // ===========================================================================
  // MUTATION - Reset to defaults
  // ===========================================================================

  const resetMutation = useMutation({
    mutationFn: resetPreferencesToDefaults,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notifications.preferences, data.preferences);
      showToast('Preferences reset to defaults', 'success');
    },
    onError: () => {
      showToast('Failed to reset preferences', 'error');
    },
  });

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Update a single preference
   */
  const updatePreference = (
    key: keyof NotificationPreference,
    value: boolean | string
  ) => {
    updateMutation.mutate({ [key]: value });
  };

  // ===========================================================================
  // RETURN
  // ===========================================================================

  return {
    // Data
    preferences: (preferences ?? DEFAULT_PREFERENCES) as NotificationPreference,
    isLoading,
    error,

    // Actions
    refetch,
    updatePreference,
    updatePreferences: updateMutation.mutate,
    resetToDefaults: resetMutation.mutate,

    // Status
    isUpdating: updateMutation.isPending,
    isResetting: resetMutation.isPending,
  };
}

// =============================================================================
// DEVICES HOOK
// =============================================================================

/**
 * Hook to get user's registered devices
 */
export function useRegisteredDevices() {
  const { showToast } = useToast();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', 'devices'],
    queryFn: getMyDevices,
    staleTime: 5 * 60 * 1000,
  });

  const testPushMutation = useMutation({
    mutationFn: sendTestPush,
    onSuccess: (result) => {
      showToast(
        `Test notification sent to ${result.successful} device(s)`,
        'success'
      );
    },
    onError: () => {
      showToast('Failed to send test notification', 'error');
    },
  });

  return {
    devices: data?.devices ?? [],
    deviceCount: data?.count ?? 0,
    isLoading,
    error,
    refetch,
    sendTestNotification: testPushMutation.mutate,
    isSendingTest: testPushMutation.isPending,
  };
}

export default useNotificationPreferences;
