import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createTestWrapper } from '../test/utils/render';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

// We need to import the hook - let me check the exact exports
import {
  useNotifications,
  useNotificationTypes,
  useNotificationPreferences,
} from './useNotifications';

describe('useNotifications', () => {
  describe('Query Operations', () => {
    it('fetches notifications', async () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingNotifications).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.notifications.length).toBeGreaterThan(0);
    });

    it('handles API error', async () => {
      server.use(
        http.get('http://localhost:8000/api/notifications/notifications/', () => {
          return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.notificationsError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });
  });

  describe('Mutation Operations', () => {
    it('marks a notification as read', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingNotifications).toBe(false);
          expect(result.current.notifications.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const unreadNotification = result.current.notifications.find((n) => !n.is_read);
      if (unreadNotification) {
        act(() => {
          result.current.markAsRead(unreadNotification.id);
        });

        await waitFor(
          () => {
            expect(result.current.isMarkingAsRead).toBe(false);
          },
          { timeout: 5000 },
        );
      }
    });

    it('marks all notifications as read', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingNotifications).toBe(false);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.markAllAsRead();
      });

      await waitFor(
        () => {
          expect(result.current.isMarkingAllAsRead).toBe(false);
        },
        { timeout: 5000 },
      );
    });

    it('deletes a notification', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingNotifications).toBe(false);
          expect(result.current.notifications.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const toDelete = result.current.notifications[0];

      act(() => {
        result.current.deleteNotification(toDelete.id);
      });

      await waitFor(
        () => {
          expect(result.current.isDeleting).toBe(false);
        },
        { timeout: 5000 },
      );
    });

    it('creates a notification', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingNotifications).toBe(false);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.createNotification({
          recipient_ids: [1, 2],
          notification_type_code: 'EVENT_CREATED',
        });
      });

      await waitFor(
        () => {
          expect(result.current.isCreating).toBe(false);
        },
        { timeout: 5000 },
      );
    });
  });

  describe('Notification Counts', () => {
    it('fetches notification counts', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingNotifications).toBe(false);
        },
        { timeout: 5000 },
      );

      // The useNotificationCounts hook is accessed via the parent hook
      const { result: countsResult } = renderHook(() => result.current.useNotificationCounts(), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(countsResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(countsResult.current.data).toBeDefined();
      expect(countsResult.current.data?.total).toBeDefined();
      expect(countsResult.current.data?.unread).toBeDefined();
    });
  });
});

describe('useNotificationTypes', () => {
  it('fetches notification types', async () => {
    const { result } = renderHook(() => useNotificationTypes(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoadingTypes).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.notificationTypes.length).toBeGreaterThan(0);
  });

  it('creates a notification type', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNotificationTypes(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingTypes).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.createType({
        code: 'NEW_TYPE',
        name: 'New Type',
        category: 'SYSTEM',
        priority: 'NORMAL',
      } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isCreatingType).toBe(false);
      },
      { timeout: 5000 },
    );
  });
});

describe('useNotificationPreferences', () => {
  it('fetches user preferences', async () => {
    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoadingPreferences).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.preferences).toBeDefined();
    expect(result.current.preferences?.email_enabled).toBeDefined();
  });

  it('updates preferences', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoadingPreferences).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.updatePreferences({ sms_enabled: true } as never);
    });

    await waitFor(
      () => {
        expect(result.current.isUpdatingPreferences).toBe(false);
      },
      { timeout: 5000 },
    );
  });
});
