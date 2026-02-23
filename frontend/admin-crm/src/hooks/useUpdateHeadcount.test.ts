import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { createTestWrapper } from '../test/utils/render';
import { useUpdateHeadcount } from './useUpdateHeadcount';

const BASE_URL = 'http://localhost:8000/api';

describe('useUpdateHeadcount', () => {
  it('initially has isPending as false', () => {
    const wrapper = createTestWrapper({ withAuth: false, withRouter: false });
    const { result } = renderHook(() => useUpdateHeadcount(), { wrapper });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('successfully updates headcount', async () => {
    server.use(
      http.post(`${BASE_URL}/events/events/:id/update_headcount/`, async () => {
        return HttpResponse.json({
          success: true,
          old_count: 100,
          new_count: 150,
          price_difference: '500.00',
          new_quote_revision: null,
          supplementary_invoice: null,
          refund_needed: false,
          refund_amount: '0.00',
        });
      }),
    );

    const wrapper = createTestWrapper({ withAuth: false, withRouter: false });
    const { result } = renderHook(() => useUpdateHeadcount(), { wrapper });

    act(() => {
      result.current.mutate({
        eventId: 1,
        data: { num_participants: 150 },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(
      expect.objectContaining({
        success: true,
        old_count: 100,
        new_count: 150,
      }),
    );
  });

  it('handles error responses', async () => {
    server.use(
      http.post(`${BASE_URL}/events/events/:id/update_headcount/`, async () => {
        return HttpResponse.json({ detail: 'Headcount exceeds venue capacity' }, { status: 400 });
      }),
    );

    const wrapper = createTestWrapper({ withAuth: false, withRouter: false });
    const { result } = renderHook(() => useUpdateHeadcount(), { wrapper });

    act(() => {
      result.current.mutate({
        eventId: 1,
        data: { num_participants: 10000 },
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.isSuccess).toBe(false);
  });

  it('transitions through pending state during mutation', async () => {
    server.use(
      http.post(`${BASE_URL}/events/events/:id/update_headcount/`, async () => {
        return HttpResponse.json({
          success: true,
          old_count: 50,
          new_count: 75,
          price_difference: '250.00',
          new_quote_revision: null,
          supplementary_invoice: null,
          refund_needed: false,
          refund_amount: '0.00',
        });
      }),
    );

    const wrapper = createTestWrapper({ withAuth: false, withRouter: false });
    const { result } = renderHook(() => useUpdateHeadcount(), { wrapper });

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.mutate({
        eventId: 2,
        data: { num_participants: 75, notes: 'Updated for larger group' },
      });
    });

    // After mutation completes, isPending should return to false
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
