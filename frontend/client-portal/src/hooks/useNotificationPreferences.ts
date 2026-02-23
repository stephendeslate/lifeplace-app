// frontend/client-portal/src/hooks/useNotificationPreferences.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import { notificationsApi } from '../apis/notifications.api';
import type {
  NotificationPreference,
  UpdateNotificationPreferenceData,
} from '../types/notifications.types';

export const useNotificationPreferences = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Get current user's notification preferences
  const useMyPreferences = () => {
    return useQuery({
      queryKey: ['notification-preferences', 'my'],
      queryFn: notificationsApi.getMyPreferences,
      staleTime: 5 * 60 * 1000, // 5 minutes - preferences don't change often
    });
  };

  // Get digest frequency options
  const useDigestFrequencies = () => {
    return useQuery({
      queryKey: ['notification-preferences', 'digest-frequencies'],
      queryFn: notificationsApi.getDigestFrequencies,
      staleTime: 60 * 60 * 1000, // 1 hour - these are static options
    });
  };

  // Update preferences mutation
  const useUpdatePreferences = () => {
    return useMutation({
      mutationFn: (data: UpdateNotificationPreferenceData) =>
        notificationsApi.updatePreferences(data),
      onSuccess: (updatedPreferences) => {
        showSuccess('Preferences Updated', 'Your notification preferences have been saved.');

        // Update preferences in cache
        queryClient.setQueryData(['notification-preferences', 'my'], updatedPreferences);
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        const message = err.response?.data?.detail || 'Failed to update preferences.';
        showError('Update Failed', message);
      },
    });
  };

  // Reset preferences to defaults mutation
  const useResetPreferences = () => {
    return useMutation({
      mutationFn: () => notificationsApi.resetPreferences(),
      onSuccess: (defaultPreferences) => {
        showSuccess(
          'Preferences Reset',
          'Your notification preferences have been reset to defaults.',
        );

        // Update preferences in cache
        queryClient.setQueryData(['notification-preferences', 'my'], defaultPreferences);
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        const message = err.response?.data?.detail || 'Failed to reset preferences.';
        showError('Reset Failed', message);
      },
    });
  };

  // Invalidate preferences cache
  const invalidatePreferences = () => {
    queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
  };

  // Get cached preferences
  const getCachedPreferences = (): NotificationPreference | undefined => {
    return queryClient.getQueryData(['notification-preferences', 'my']);
  };

  return {
    // Query hooks
    useMyPreferences,
    useDigestFrequencies,

    // Mutation hooks
    useUpdatePreferences,
    useResetPreferences,

    // Utility functions
    invalidatePreferences,
    getCachedPreferences,
  };
};

export default useNotificationPreferences;
