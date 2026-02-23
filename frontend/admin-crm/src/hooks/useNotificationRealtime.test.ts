import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createTestWrapper } from '../test/utils/render';
import { createTestQueryClient } from '../test/utils/test-query-client';
import { useNotificationRealtime } from './useNotificationRealtime';

describe('useNotificationRealtime', () => {
  it('renders without error with default options', () => {
    const wrapper = createTestWrapper({ withAuth: false, withRouter: false });
    const { result } = renderHook(() => useNotificationRealtime(), { wrapper });

    expect(result.current).toBeDefined();
  });

  it('returns an empty object', () => {
    const wrapper = createTestWrapper({ withAuth: false, withRouter: false });
    const { result } = renderHook(() => useNotificationRealtime(), { wrapper });

    expect(result.current).toEqual({});
  });

  it('can be disabled with enabled: false', () => {
    const wrapper = createTestWrapper({ withAuth: false, withRouter: false });
    const { result } = renderHook(() => useNotificationRealtime({ enabled: false }), { wrapper });

    expect(result.current).toEqual({});
  });

  it('subscribes to query cache when enabled', () => {
    const queryClient = createTestQueryClient();
    const wrapper = createTestWrapper({
      withAuth: false,
      withRouter: false,
      queryClient,
    });

    // Set initial notification counts in cache
    queryClient.setQueryData(['notification-counts'], {
      total: 3,
      unread: 2,
      by_category: { SYSTEM: 1, EVENT: 2 },
      by_priority: { NORMAL: 2, URGENT: 1 },
    });

    const { result } = renderHook(() => useNotificationRealtime(), { wrapper });

    // Hook renders without crashing after setting query data
    expect(result.current).toEqual({});

    // Update the notification counts to trigger cache subscription
    queryClient.setQueryData(['notification-counts'], {
      total: 5,
      unread: 4,
      by_category: { SYSTEM: 2, EVENT: 3 },
      by_priority: { NORMAL: 3, URGENT: 2 },
    });

    // Hook should still be stable after cache update
    expect(result.current).toEqual({});
  });
});
