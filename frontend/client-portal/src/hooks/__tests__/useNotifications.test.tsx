// frontend/client-portal/src/hooks/__tests__/useNotifications.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotifications } from '../useNotifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import type { Notification } from '../../types/notifications.types';

// Mock toast context
const mockToastActions = {
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
};

vi.mock('../../contexts/ToastContext', () => ({
  useToastActions: vi.fn(() => mockToastActions),
}));

// Mock notifications API
vi.mock('../../apis/notifications.api', () => ({
  notificationsApi: {
    getNotifications: vi.fn(),
    getNotification: vi.fn(),
    getUnread: vi.fn(),
    getRecent: vi.fn(),
    getCounts: vi.fn(),
    markAsRead: vi.fn(),
    markAsUnread: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  },
}));

import { notificationsApi } from '../../apis/notifications.api';

// Create wrapper with query client
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock notification data
const mockNotification: Notification = {
  id: 1,
  title: 'Test Notification',
  message: 'This is a test notification',
  type: 'info',
  priority: 'normal',
  is_read: false,
  created_at: '2024-01-01T00:00:00Z',
  category: 'general',
};

const mockNotificationsList: Notification[] = [
  mockNotification,
  { ...mockNotification, id: 2, title: 'Second Notification' },
];

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useNotificationsList', () => {
    it('fetches notifications list', async () => {
      vi.mocked(notificationsApi.getNotifications).mockResolvedValue(mockNotificationsList);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: listResult } = renderHook(
        () => result.current.useNotificationsList(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(listResult.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.getNotifications).toHaveBeenCalled();
      expect(listResult.current.data).toEqual(mockNotificationsList);
    });

    it('applies filters when provided', async () => {
      vi.mocked(notificationsApi.getNotifications).mockResolvedValue([mockNotification]);

      const filters = { is_read: false };

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      renderHook(() => result.current.useNotificationsList(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(notificationsApi.getNotifications).toHaveBeenCalledWith(filters);
      });
    });
  });

  describe('useNotification', () => {
    it('fetches single notification by ID', async () => {
      vi.mocked(notificationsApi.getNotification).mockResolvedValue(mockNotification);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: notificationResult } = renderHook(
        () => result.current.useNotification(1),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(notificationResult.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.getNotification).toHaveBeenCalledWith(1);
      expect(notificationResult.current.data).toEqual(mockNotification);
    });

    it('does not fetch when ID is 0', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: notificationResult } = renderHook(
        () => result.current.useNotification(0),
        { wrapper: createWrapper() }
      );

      expect(notificationResult.current.isFetching).toBe(false);
      expect(notificationsApi.getNotification).not.toHaveBeenCalled();
    });
  });

  describe('useUnreadNotifications', () => {
    it('fetches unread notifications with default limit', async () => {
      vi.mocked(notificationsApi.getUnread).mockResolvedValue(mockNotificationsList);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: unreadResult } = renderHook(
        () => result.current.useUnreadNotifications(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(unreadResult.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.getUnread).toHaveBeenCalledWith(20);
    });

    it('fetches unread notifications with custom limit', async () => {
      vi.mocked(notificationsApi.getUnread).mockResolvedValue([mockNotification]);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      renderHook(() => result.current.useUnreadNotifications(5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(notificationsApi.getUnread).toHaveBeenCalledWith(5);
      });
    });
  });

  describe('useRecentNotifications', () => {
    it('fetches recent notifications with default limit', async () => {
      vi.mocked(notificationsApi.getRecent).mockResolvedValue(mockNotificationsList);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: recentResult } = renderHook(
        () => result.current.useRecentNotifications(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(recentResult.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.getRecent).toHaveBeenCalledWith(5);
    });
  });

  describe('useNotificationCounts', () => {
    it('fetches notification counts', async () => {
      const mockCounts = {
        total: 10,
        unread: 3,
        by_category: { general: 5, booking: 5 },
        by_priority: { high: 2, normal: 8 },
      };
      vi.mocked(notificationsApi.getCounts).mockResolvedValue(mockCounts);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: countsResult } = renderHook(
        () => result.current.useNotificationCounts(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(countsResult.current.isSuccess).toBe(true);
      });

      expect(notificationsApi.getCounts).toHaveBeenCalled();
      expect(countsResult.current.data).toEqual(mockCounts);
    });
  });

  describe('useMarkAsRead', () => {
    it('marks notification as read', async () => {
      const readNotification = { ...mockNotification, is_read: true };
      vi.mocked(notificationsApi.markAsRead).mockResolvedValue(readNotification);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: markAsReadResult } = renderHook(
        () => result.current.useMarkAsRead(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await markAsReadResult.current.mutateAsync(1);
      });

      expect(notificationsApi.markAsRead).toHaveBeenCalledWith(1);
    });

    it('shows error toast on failure', async () => {
      const error = { response: { data: { detail: 'Failed to mark as read' } } };
      vi.mocked(notificationsApi.markAsRead).mockRejectedValue(error);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: markAsReadResult } = renderHook(
        () => result.current.useMarkAsRead(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await markAsReadResult.current.mutateAsync(1);
        } catch {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(mockToastActions.showError).toHaveBeenCalledWith(
          'Action Failed',
          'Failed to mark as read'
        );
      });
    });
  });

  describe('useMarkAsUnread', () => {
    it('marks notification as unread', async () => {
      const unreadNotification = { ...mockNotification, is_read: false };
      vi.mocked(notificationsApi.markAsUnread).mockResolvedValue(unreadNotification);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: markAsUnreadResult } = renderHook(
        () => result.current.useMarkAsUnread(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await markAsUnreadResult.current.mutateAsync(1);
      });

      expect(notificationsApi.markAsUnread).toHaveBeenCalledWith(1);
    });
  });

  describe('useMarkAllAsRead', () => {
    it('marks all notifications as read', async () => {
      vi.mocked(notificationsApi.markAllAsRead).mockResolvedValue({ marked_read: 5 });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: markAllResult } = renderHook(
        () => result.current.useMarkAllAsRead(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await markAllResult.current.mutateAsync();
      });

      expect(notificationsApi.markAllAsRead).toHaveBeenCalled();
    });

    it('shows success toast with count', async () => {
      vi.mocked(notificationsApi.markAllAsRead).mockResolvedValue({ marked_read: 5 });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: markAllResult } = renderHook(
        () => result.current.useMarkAllAsRead(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await markAllResult.current.mutateAsync();
      });

      expect(mockToastActions.showSuccess).toHaveBeenCalledWith(
        'All Read',
        'Marked 5 notifications as read.'
      );
    });

    it('uses singular form for single notification', async () => {
      vi.mocked(notificationsApi.markAllAsRead).mockResolvedValue({ marked_read: 1 });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: markAllResult } = renderHook(
        () => result.current.useMarkAllAsRead(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await markAllResult.current.mutateAsync();
      });

      expect(mockToastActions.showSuccess).toHaveBeenCalledWith(
        'All Read',
        'Marked 1 notification as read.'
      );
    });

    it('does not show toast when no notifications marked', async () => {
      vi.mocked(notificationsApi.markAllAsRead).mockResolvedValue({ marked_read: 0 });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: markAllResult } = renderHook(
        () => result.current.useMarkAllAsRead(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await markAllResult.current.mutateAsync();
      });

      expect(mockToastActions.showSuccess).not.toHaveBeenCalled();
    });
  });

  describe('useDeleteNotification', () => {
    it('deletes notification', async () => {
      vi.mocked(notificationsApi.deleteNotification).mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: deleteResult } = renderHook(
        () => result.current.useDeleteNotification(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await deleteResult.current.mutateAsync(1);
      });

      expect(notificationsApi.deleteNotification).toHaveBeenCalledWith(1);
    });

    it('shows error toast on failure', async () => {
      const error = { response: { data: { detail: 'Cannot delete notification' } } };
      vi.mocked(notificationsApi.deleteNotification).mockRejectedValue(error);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      const { result: deleteResult } = renderHook(
        () => result.current.useDeleteNotification(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await deleteResult.current.mutateAsync(1);
        } catch {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(mockToastActions.showError).toHaveBeenCalledWith(
          'Action Failed',
          'Cannot delete notification'
        );
      });
    });
  });

  describe('Utility functions', () => {
    it('provides invalidateAllNotificationQueries function', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.invalidateAllNotificationQueries).toBe('function');
    });

    it('provides getCachedCounts function', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.getCachedCounts).toBe('function');
      // Initially returns undefined
      expect(result.current.getCachedCounts()).toBeUndefined();
    });

    it('provides getCachedNotifications function', () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.getCachedNotifications).toBe('function');
      // Initially returns undefined
      expect(result.current.getCachedNotifications()).toBeUndefined();
    });

    it('provides prefetchNotifications function', async () => {
      vi.mocked(notificationsApi.getNotifications).mockResolvedValue(mockNotificationsList);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.prefetchNotifications).toBe('function');

      await act(async () => {
        await result.current.prefetchNotifications();
      });

      expect(notificationsApi.getNotifications).toHaveBeenCalled();
    });
  });
});
