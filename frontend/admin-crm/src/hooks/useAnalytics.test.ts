import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDateRange, useDashboardKPIs, useBookingsSummary } from './useAnalytics';
import { createTestWrapper } from '../test/utils/render';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('useDateRange', () => {
  it('initializes with default 30-day range', () => {
    const { result } = renderHook(() => useDateRange());

    expect(result.current.dateRange).toBeDefined();
    expect(result.current.dateRange.startDate).toBeDefined();
    expect(result.current.dateRange.endDate).toBeDefined();

    // endDate should be today, startDate should be 30 days before
    const start = new Date(result.current.dateRange.startDate);
    const end = new Date(result.current.dateRange.endDate);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it('initializes with custom default days', () => {
    const { result } = renderHook(() => useDateRange(7));

    const start = new Date(result.current.dateRange.startDate);
    const end = new Date(result.current.dateRange.endDate);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it('preset: last7Days sets 7-day range', () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.presets.last7Days();
    });

    const start = new Date(result.current.dateRange.startDate);
    const end = new Date(result.current.dateRange.endDate);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it('preset: last90Days sets 90-day range', () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.presets.last90Days();
    });

    const start = new Date(result.current.dateRange.startDate);
    const end = new Date(result.current.dateRange.endDate);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);
  });

  it('preset: thisYear sets range from Jan 1', () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.presets.thisYear();
    });

    // The hook uses new Date(year, 0, 1).toISOString().split('T')[0]
    // Replicate the same computation to get the expected string
    const expected = new Date(new Date().getFullYear(), 0, 1);
    const expectedStr = expected.toISOString().split('T')[0];
    expect(result.current.dateRange.startDate).toBe(expectedStr);
  });

  it('preset: lastYear sets 1-year range', () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.presets.lastYear();
    });

    const start = new Date(result.current.dateRange.startDate);
    const end = new Date(result.current.dateRange.endDate);
    expect(end.getFullYear() - start.getFullYear()).toBe(1);
  });

  it('setDateRange sets custom range', () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.setDateRange({
        startDate: '2024-01-01',
        endDate: '2024-06-30',
      });
    });

    expect(result.current.dateRange.startDate).toBe('2024-01-01');
    expect(result.current.dateRange.endDate).toBe('2024-06-30');
  });
});

describe('useDashboardKPIs', () => {
  it('fetches KPIs for a date range', async () => {
    const dateRange = { startDate: '2024-06-01', endDate: '2024-06-30' };

    const { result } = renderHook(() => useDashboardKPIs(dateRange), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.total_bookings).toBeDefined();
    expect(result.current.data?.total_revenue).toBeDefined();
    expect(result.current.data?.conversion_rate).toBeDefined();
  });

  it('handles API error', async () => {
    server.use(
      http.get('http://localhost:8000/api/analytics/dashboard/', () => {
        return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
      }),
    );

    const dateRange = { startDate: '2024-06-01', endDate: '2024-06-30' };

    const { result } = renderHook(() => useDashboardKPIs(dateRange), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe('useBookingsSummary', () => {
  it('fetches bookings summary', async () => {
    const dateRange = { startDate: '2024-06-01', endDate: '2024-06-30' };

    const { result } = renderHook(() => useBookingsSummary(dateRange, 'daily'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
    if (result.current.data && result.current.data.length > 0) {
      expect(result.current.data[0]).toHaveProperty('total_bookings');
      expect(result.current.data[0]).toHaveProperty('total_revenue');
    }
  });
});
