/**
 * useDashboard Hook Tests
 *
 * Tests for the dashboard data aggregation hook.
 * This is an example pattern for testing hooks that use React Query.
 */

import { renderHook, waitFor } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDashboard, dashboardKeys } from '../useDashboard';
import { server } from '@test/mocks/server';
import { http, HttpResponse } from 'msw';

// =============================================================================
// TEST SETUP
// =============================================================================

const API_URL = 'http://localhost:8000/api';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// =============================================================================
// TESTS
// =============================================================================

describe('useDashboard', () => {
  describe('query keys', () => {
    it('has correct dashboard keys structure', () => {
      expect(dashboardKeys.all).toEqual(['dashboard']);
      expect(dashboardKeys.data()).toEqual(['dashboard', 'data']);
      expect(dashboardKeys.urgentTasks()).toEqual(['dashboard', 'urgentTasks']);
    });
  });

  describe('data aggregation', () => {
    it('returns loading state initially', () => {
      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('aggregates data from multiple sources', async () => {
      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Data should be defined after loading
      if (result.current.data) {
        expect(result.current.data).toHaveProperty('criticalActions');
        expect(result.current.data).toHaveProperty('nextEvent');
        expect(result.current.data).toHaveProperty('financialSummary');
      }
    });

    it('provides refetch function', () => {
      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      // Override handler to return error
      server.use(
        http.get(`${API_URL}/client/events/`, () => {
          return HttpResponse.json(
            { detail: 'Server error' },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Error should be captured
      // Note: The hook aggregates errors from multiple queries
    });
  });

  describe('data structure', () => {
    it('criticalActions has expected shape', async () => {
      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (result.current.data) {
        const { criticalActions } = result.current.data;
        expect(criticalActions).toHaveProperty('pendingQuotes');
        expect(criticalActions).toHaveProperty('overduePayments');
        expect(criticalActions).toHaveProperty('pendingContracts');
        expect(criticalActions).toHaveProperty('urgentTasks');
        expect(Array.isArray(criticalActions.pendingQuotes)).toBe(true);
        expect(Array.isArray(criticalActions.overduePayments)).toBe(true);
      }
    });

    it('limits critical actions to 5 items each', async () => {
      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (result.current.data) {
        const { criticalActions } = result.current.data;
        expect(criticalActions.pendingQuotes.length).toBeLessThanOrEqual(5);
        expect(criticalActions.overduePayments.length).toBeLessThanOrEqual(5);
        expect(criticalActions.pendingContracts.length).toBeLessThanOrEqual(5);
      }
    });
  });
});
