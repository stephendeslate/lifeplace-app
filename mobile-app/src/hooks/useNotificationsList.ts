/**
 * useNotificationsList Hook
 *
 * Manages notification lists with React Query.
 * Provides paginated notifications, unread counts, and mark-as-read functionality.
 *
 * USAGE:
 * const { notifications, markAsRead, markAllAsRead } = useNotificationsList();
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  getNotifications,
  getUnreadNotifications,
  getNotificationCounts,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/apis/notifications.api';
import { queryKeys } from '@/utils/queryClient';
import { useToast } from '@/contexts/ToastContext';
import { updateBadgeCount } from '@/utils/notificationHandler';
import type { NotificationCategory } from '@/types/notifications.types';

// =============================================================================
// TYPES
// =============================================================================

interface NotificationFilters {
  is_read?: boolean;
  type?: string;
  category?: NotificationCategory;
  priority?: string;
}

// =============================================================================
// NOTIFICATIONS LIST HOOK
// =============================================================================

export function useNotificationsList(filters?: NotificationFilters) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // ===========================================================================
  // QUERY - Paginated notifications list
  // ===========================================================================

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.notifications.list(filters as Record<string, unknown>),
    queryFn: ({ pageParam = 0 }) =>
      getNotifications({ ...filters, limit: 20, offset: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        try {
          const url = new URL(lastPage.next);
          return parseInt(url.searchParams.get('offset') || '0');
        } catch {
          return undefined;
        }
      }
      return undefined;
    },
    initialPageParam: 0,
  });

  // Flatten pages into single array
  const notifications = data?.pages.flatMap((page) => page.results) ?? [];

  // ===========================================================================
  // MUTATION - Mark single notification as read
  // ===========================================================================

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.list(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unread,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount,
      });
    },
  });

  // ===========================================================================
  // MUTATION - Mark all notifications as read
  // ===========================================================================

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async (data) => {
      showToast(`Marked ${data.marked_read} notifications as read`, 'success');

      // Update badge count to 0
      await updateBadgeCount(0);

      // Invalidate all notification queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
    onError: () => {
      showToast('Failed to mark notifications as read', 'error');
    },
  });

  // ===========================================================================
  // MUTATION - Delete notification
  // ===========================================================================

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.list(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount,
      });
    },
  });

  // ===========================================================================
  // RETURN
  // ===========================================================================

  return {
    // Data
    notifications,
    isLoading,
    error,

    // Pagination
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,

    // Actions
    refetch,
    markAsRead: markReadMutation.mutate,
    markAllAsRead: markAllReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,

    // Status
    isMarkingRead: markReadMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,
  };
}

// =============================================================================
// UNREAD NOTIFICATIONS HOOK
// =============================================================================

/**
 * Hook to get unread notifications with polling
 */
export function useUnreadNotifications(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: () => getUnreadNotifications(limit),
    refetchInterval: 60000, // Poll every minute
  });
}

// =============================================================================
// NOTIFICATION COUNTS HOOK
// =============================================================================

/**
 * Hook to get notification counts with polling
 */
export function useNotificationCounts() {
  const query = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: getNotificationCounts,
    refetchInterval: 60000, // Poll every minute
  });

  // Extract unread count from query data
  const unreadCount = query.data?.unread ?? 0;

  // Update badge count when unread count changes (moved to useEffect to avoid side effects during render)
  useEffect(() => {
    if (query.isSuccess && query.data) {
      updateBadgeCount(unreadCount);
    }
  }, [query.isSuccess, query.data, unreadCount]);

  return {
    ...query,
    unreadCount,
    totalCount: query.data?.total ?? 0,
    byCategory: query.data?.by_category ?? {},
    byPriority: query.data?.by_priority ?? {},
  };
}

export default useNotificationsList;
