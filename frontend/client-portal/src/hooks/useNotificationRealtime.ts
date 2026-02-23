// frontend/client-portal/src/hooks/useNotificationRealtime.ts

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import type { NotificationCounts } from '../types/notifications.types';

interface UseNotificationRealtimeOptions {
  enabled?: boolean;
  showToasts?: boolean;
}

/**
 * Hook for handling real-time notification updates.
 * Subscribes to query cache updates and shows toast notifications
 * when new notifications arrive.
 */
export const useNotificationRealtime = (options: UseNotificationRealtimeOptions = {}) => {
  const { enabled = true, showToasts = true } = options;
  const queryClient = useQueryClient();
  const { showInfo, showWarning } = useToastActions();
  const previousCountsRef = useRef<NotificationCounts | null>(null);
  const isInitializedRef = useRef(false);

  // Handle notification count changes
  const handleCountsUpdate = useCallback(
    (currentCounts: NotificationCounts) => {
      // Skip if we don't have previous counts (first load)
      if (!previousCountsRef.current) {
        previousCountsRef.current = currentCounts;
        isInitializedRef.current = true;
        return;
      }

      // Skip if not initialized (avoid initial load toasts)
      if (!isInitializedRef.current) {
        previousCountsRef.current = currentCounts;
        isInitializedRef.current = true;
        return;
      }

      const previousCounts = previousCountsRef.current;

      // Check for new notifications
      if (currentCounts.unread > previousCounts.unread && showToasts) {
        const newCount = currentCounts.unread - previousCounts.unread;

        // Check for urgent notifications
        const currentUrgent = currentCounts.by_priority?.URGENT || 0;
        const previousUrgent = previousCounts.by_priority?.URGENT || 0;
        const newUrgentCount = currentUrgent - previousUrgent;

        if (newUrgentCount > 0) {
          // Show urgent notification toast
          showWarning(
            'Urgent Notification',
            `You have ${newUrgentCount} new urgent notification${newUrgentCount > 1 ? 's' : ''}`,
            { duration: 8000 },
          );
        } else {
          // Show regular notification toast
          showInfo(
            'New Notification',
            newCount === 1
              ? 'You have a new notification'
              : `You have ${newCount} new notifications`,
            { duration: 5000 },
          );
        }
      }

      // Update reference
      previousCountsRef.current = currentCounts;
    },
    [showToasts, showInfo, showWarning],
  );

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to query cache updates
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only handle successful updates to notification counts
      if (
        event.type === 'updated' &&
        event.query.queryKey[0] === 'notification-counts' &&
        event.query.state.status === 'success'
      ) {
        const counts = event.query.state.data as NotificationCounts;
        if (counts) {
          handleCountsUpdate(counts);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, queryClient, handleCountsUpdate]);

  // Reset the initialization state (useful when user logs out/in)
  const reset = useCallback(() => {
    previousCountsRef.current = null;
    isInitializedRef.current = false;
  }, []);

  // Get current unread count from cache
  const getUnreadCount = useCallback((): number => {
    const counts = queryClient.getQueryData<NotificationCounts>(['notification-counts']);
    return counts?.unread ?? 0;
  }, [queryClient]);

  // Check if there are urgent notifications
  const hasUrgentNotifications = useCallback((): boolean => {
    const counts = queryClient.getQueryData<NotificationCounts>(['notification-counts']);
    return (counts?.by_priority?.URGENT ?? 0) > 0;
  }, [queryClient]);

  return {
    reset,
    getUnreadCount,
    hasUrgentNotifications,
  };
};

export default useNotificationRealtime;
