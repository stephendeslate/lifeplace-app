// frontend/client-portal/src/hooks/useNotifications.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import { notificationsApi } from '../apis/notifications.api';
import type {
  Notification,
  NotificationCounts,
  NotificationFilters,
} from '../types/notifications.types';

// Polling interval for notifications (15 seconds)
const NOTIFICATION_POLL_INTERVAL = 15 * 1000;

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Get notifications list with optional filters
  const useNotificationsList = (filters?: NotificationFilters) => {
    return useQuery({
      queryKey: ['notifications', filters],
      queryFn: () => notificationsApi.getNotifications(filters),
      staleTime: NOTIFICATION_POLL_INTERVAL,
      refetchInterval: NOTIFICATION_POLL_INTERVAL,
      refetchIntervalInBackground: true,
    });
  };

  // Get single notification by ID
  const useNotification = (id: number) => {
    return useQuery({
      queryKey: ['notification', id],
      queryFn: () => notificationsApi.getNotification(id),
      enabled: !!id,
      staleTime: NOTIFICATION_POLL_INTERVAL,
    });
  };

  // Get unread notifications with polling
  const useUnreadNotifications = (limit: number = 20) => {
    return useQuery({
      queryKey: ['notifications', 'unread', limit],
      queryFn: () => notificationsApi.getUnread(limit),
      staleTime: NOTIFICATION_POLL_INTERVAL,
      refetchInterval: NOTIFICATION_POLL_INTERVAL,
      refetchIntervalInBackground: true,
    });
  };

  // Get recent notifications
  const useRecentNotifications = (limit: number = 5) => {
    return useQuery({
      queryKey: ['notifications', 'recent', limit],
      queryFn: () => notificationsApi.getRecent(limit),
      staleTime: NOTIFICATION_POLL_INTERVAL,
      refetchInterval: NOTIFICATION_POLL_INTERVAL,
      refetchIntervalInBackground: true,
    });
  };

  // Get notification counts (total, unread, by category, by priority)
  const useNotificationCounts = () => {
    return useQuery({
      queryKey: ['notification-counts'],
      queryFn: notificationsApi.getCounts,
      staleTime: NOTIFICATION_POLL_INTERVAL,
      refetchInterval: NOTIFICATION_POLL_INTERVAL,
      refetchIntervalInBackground: true,
    });
  };

  // Mark notification as read mutation
  const useMarkAsRead = () => {
    return useMutation({
      mutationFn: (id: number) => notificationsApi.markAsRead(id),
      onSuccess: (updatedNotification) => {
        // Update the specific notification in cache
        queryClient.setQueryData(['notification', updatedNotification.id], updatedNotification);

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        const message = err.response?.data?.detail || 'Failed to mark notification as read.';
        showError('Action Failed', message);
      },
    });
  };

  // Mark notification as unread mutation
  const useMarkAsUnread = () => {
    return useMutation({
      mutationFn: (id: number) => notificationsApi.markAsUnread(id),
      onSuccess: (updatedNotification) => {
        // Update the specific notification in cache
        queryClient.setQueryData(['notification', updatedNotification.id], updatedNotification);

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        const message = err.response?.data?.detail || 'Failed to mark notification as unread.';
        showError('Action Failed', message);
      },
    });
  };

  // Mark all notifications as read mutation
  const useMarkAllAsRead = () => {
    return useMutation({
      mutationFn: () => notificationsApi.markAllAsRead(),
      onSuccess: (result) => {
        if (result.marked_read > 0) {
          showSuccess(
            'All Read',
            `Marked ${result.marked_read} notification${result.marked_read > 1 ? 's' : ''} as read.`,
          );
        }

        // Invalidate all notification queries
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        const message = err.response?.data?.detail || 'Failed to mark all notifications as read.';
        showError('Action Failed', message);
      },
    });
  };

  // Delete notification mutation
  const useDeleteNotification = () => {
    return useMutation({
      mutationFn: (id: number) => notificationsApi.deleteNotification(id),
      onSuccess: (_, deletedId) => {
        // Remove from cache
        queryClient.removeQueries({ queryKey: ['notification', deletedId] });

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        const message = err.response?.data?.detail || 'Failed to delete notification.';
        showError('Action Failed', message);
      },
    });
  };

  // Invalidate all notification queries
  const invalidateAllNotificationQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notification-counts'] });
  };

  // Get cached notification counts
  const getCachedCounts = (): NotificationCounts | undefined => {
    return queryClient.getQueryData(['notification-counts']);
  };

  // Get cached notifications
  const getCachedNotifications = (filters?: NotificationFilters): Notification[] | undefined => {
    return queryClient.getQueryData(['notifications', filters]);
  };

  // Prefetch notifications
  const prefetchNotifications = async (filters?: NotificationFilters) => {
    await queryClient.prefetchQuery({
      queryKey: ['notifications', filters],
      queryFn: () => notificationsApi.getNotifications(filters),
      staleTime: NOTIFICATION_POLL_INTERVAL,
    });
  };

  return {
    // Query hooks
    useNotificationsList,
    useNotification,
    useUnreadNotifications,
    useRecentNotifications,
    useNotificationCounts,

    // Mutation hooks
    useMarkAsRead,
    useMarkAsUnread,
    useMarkAllAsRead,
    useDeleteNotification,

    // Utility functions
    invalidateAllNotificationQueries,
    getCachedCounts,
    getCachedNotifications,
    prefetchNotifications,
  };
};

export default useNotifications;
