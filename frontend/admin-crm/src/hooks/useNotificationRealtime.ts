// frontend/admin-crm/src/hooks/useNotificationRealtime.ts

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import type { NotificationCounts } from '../types/notifications.types';

interface UseNotificationRealtimeOptions {
  enabled?: boolean;
}

export const useNotificationRealtime = (options: UseNotificationRealtimeOptions = {}) => {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const { showInfo } = useToastActions();
  const previousCountsRef = useRef<NotificationCounts | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleNotificationCountsUpdate = () => {
      const currentCounts = queryClient.getQueryData<NotificationCounts>(['notification-counts']);

      if (!currentCounts || !previousCountsRef.current) {
        previousCountsRef.current = currentCounts || null;
        return;
      }

      const previousCounts = previousCountsRef.current;

      // Check for new notifications
      if (currentCounts.total > previousCounts.total) {
        const newNotificationCount = currentCounts.total - previousCounts.total;

        // Show toast notification for new items
        showInfo(
          `${newNotificationCount} new notification${newNotificationCount > 1 ? 's' : ''}`,
          undefined,
          {
            duration: 4000,
            position: 'top-right',
          },
        );
      }

      // Check for urgent notifications increase
      const currentUrgent = currentCounts.by_priority?.URGENT || 0;
      const previousUrgent = previousCounts.by_priority?.URGENT || 0;

      if (currentUrgent > previousUrgent) {
        const newUrgentCount = currentUrgent - previousUrgent;
        showInfo(
          `${newUrgentCount} urgent notification${newUrgentCount > 1 ? 's' : ''} received`,
          undefined,
          {
            duration: 6000,
            position: 'top-right',
            severity: 'warning',
          },
        );
      }

      previousCountsRef.current = currentCounts;
    };

    // Subscribe to query cache updates
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === 'notification-counts' && event.type === 'updated') {
        handleNotificationCountsUpdate();
      }
    });

    return unsubscribe;
  }, [enabled, queryClient, showInfo]);

  return {
    // Could expose additional real-time functionality here
  };
};
