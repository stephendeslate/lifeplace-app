// frontend/admin-crm/src/hooks/useNotifications.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../apis/notifications.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  NotificationFilters,
  NotificationBulkActionData,
  CreateNotificationData,
  UpdateNotificationPreferenceData,
} from '../types/notifications.types';

export const useNotifications = (filters?: NotificationFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications
  } = useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationsApi.getNotifications(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const useNotification = (id: number) => {
    return useQuery({
      queryKey: ['notification', id],
      queryFn: () => notificationsApi.getNotification(id),
      enabled: !!id,
    });
  };

  const useUnreadNotifications = (limit?: number) => {
    return useQuery({
      queryKey: ['notifications', 'unread', limit],
      queryFn: () => notificationsApi.getUnread(limit),
      staleTime: 30 * 1000, // 30 seconds
    });
  };

  const useRecentNotifications = (limit?: number) => {
    return useQuery({
      queryKey: ['notifications', 'recent', limit],
      queryFn: () => notificationsApi.getRecent(limit),
      staleTime: 60 * 1000, // 1 minute
    });
  };

  const useNotificationCounts = () => {
    return useQuery({
      queryKey: ['notification-counts'],
      queryFn: notificationsApi.getCounts,
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refetch every minute
    });
  };

  const useNotificationStats = (days?: number) => {
    return useQuery({
      queryKey: ['notification-stats', days],
      queryFn: () => notificationsApi.getStats(days),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to mark notification as read';
      showError('Action Failed', message);
    },
  });

  const markAsUnreadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsUnread(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to mark notification as unread';
      showError('Action Failed', message);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
      showSuccess('All Read', `Marked ${data.marked_read} notifications as read.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to mark all notifications as read';
      showError('Action Failed', message);
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: (data: NotificationBulkActionData) => notificationsApi.bulkAction(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
      showSuccess('Bulk Action Complete', result.message);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to perform bulk action';
      showError('Bulk Action Failed', message);
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
      showSuccess('Notification Deleted', 'Notification has been deleted.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete notification';
      showError('Delete Failed', message);
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: (data: CreateNotificationData) => notificationsApi.createNotification(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
      showSuccess(
        'Notifications Sent',
        `Successfully sent ${result.created_count} of ${result.total_recipients} notifications.`
      );
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create notifications';
      showError('Creation Failed', message);
    },
  });

  return {
    // Data
    notifications,
    
    // Loading states
    isLoadingNotifications,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAsUnread: markAsUnreadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isPerformingBulkAction: bulkActionMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
    isCreating: createNotificationMutation.isPending,
    
    // Error states
    notificationsError,
    markAsReadError: markAsReadMutation.error,
    markAsUnreadError: markAsUnreadMutation.error,
    markAllAsReadError: markAllAsReadMutation.error,
    bulkActionError: bulkActionMutation.error,
    deleteError: deleteNotificationMutation.error,
    createError: createNotificationMutation.error,
    
    // Actions
    markAsRead: markAsReadMutation.mutate,
    markAsUnread: markAsUnreadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    bulkAction: bulkActionMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    createNotification: createNotificationMutation.mutate,
    refetchNotifications,
    
    // Hooks for specific queries
    useNotification,
    useUnreadNotifications,
    useRecentNotifications,
    useNotificationCounts,
    useNotificationStats,
  };
};

export const useNotificationTypes = (filters?: {
  category?: string;
  is_active?: boolean;
  is_system?: boolean;
}) => {

  // Queries
  const {
    data: notificationTypes = [],
    isLoading: isLoadingTypes,
    error: typesError,
    refetch: refetchTypes
  } = useQuery({
    queryKey: ['notification-types', filters],
    queryFn: () => notificationsApi.getNotificationTypes(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const useNotificationType = (id: number) => {
    return useQuery({
      queryKey: ['notification-type', id],
      queryFn: () => notificationsApi.getNotificationType(id),
      enabled: !!id,
      staleTime: 10 * 60 * 1000,
    });
  };

  const useNotificationCategories = () => {
    return useQuery({
      queryKey: ['notification-categories'],
      queryFn: notificationsApi.getNotificationCategories,
      staleTime: 60 * 60 * 1000, // 1 hour
    });
  };

  const useNotificationPriorities = () => {
    return useQuery({
      queryKey: ['notification-priorities'],
      queryFn: notificationsApi.getNotificationPriorities,
      staleTime: 60 * 60 * 1000, // 1 hour
    });
  };

  return {
    // Data
    notificationTypes,
    
    // Loading states
    isLoadingTypes,
    
    // Error states
    typesError,
    
    // Actions
    refetchTypes,
    
    // Hooks for specific queries
    useNotificationType,
    useNotificationCategories,
    useNotificationPriorities,
  };
};

export const useNotificationPreferences = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: preferences,
    isLoading: isLoadingPreferences,
    error: preferencesError,
    refetch: refetchPreferences
  } = useQuery({
    queryKey: ['notification-preferences', 'my'],
    queryFn: notificationsApi.getMyPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const useDigestFrequencies = () => {
    return useQuery({
      queryKey: ['digest-frequencies'],
      queryFn: notificationsApi.getDigestFrequencies,
      staleTime: 60 * 60 * 1000, // 1 hour
    });
  };

  const useAllPreferences = (userId?: number) => {
    return useQuery({
      queryKey: ['notification-preferences', 'all', userId],
      queryFn: () => notificationsApi.getAllPreferences(userId),
      enabled: !!userId, // Only fetch if userId is provided (admin only)
      staleTime: 5 * 60 * 1000,
    });
  };

  // Mutations
  const updatePreferencesMutation = useMutation({
    mutationFn: (data: UpdateNotificationPreferenceData) => notificationsApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      showSuccess('Preferences Updated', 'Your notification preferences have been updated successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update preferences';
      showError('Update Failed', message);
    },
  });

  const resetToDefaultsMutation = useMutation({
    mutationFn: notificationsApi.resetPreferencesToDefaults,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      showSuccess('Preferences Reset', result.message);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to reset preferences';
      showError('Reset Failed', message);
    },
  });

  return {
    // Data
    preferences,
    
    // Loading states
    isLoadingPreferences,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    isResettingPreferences: resetToDefaultsMutation.isPending,
    
    // Error states
    preferencesError,
    updateError: updatePreferencesMutation.error,
    resetError: resetToDefaultsMutation.error,
    
    // Actions
    updatePreferences: updatePreferencesMutation.mutate,
    resetToDefaults: resetToDefaultsMutation.mutate,
    refetchPreferences,
    
    // Hooks for specific queries
    useDigestFrequencies,
    useAllPreferences,
  };
}