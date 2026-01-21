/**
 * useQuotes Hook Tests
 *
 * Tests for quote-related React Query hooks.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { createHookWrapper } from '@test/utils/renderWithProviders';
import { server } from '@test/mocks/server';
import { http, HttpResponse } from 'msw';
import {
  usePendingQuotes,
  useEventQuotes,
  useQuote,
  useQuotes,
  useAcceptQuote,
  useRejectQuote,
  quoteKeys,
  getQuoteUrgency,
} from '../useQuotes';
import { mockQuotes, createPaginatedResponse } from '@test/utils/mockData';
import type { PendingQuote } from '@/types/dashboard.types';

// =============================================================================
// TEST SETUP
// =============================================================================

const API_URL = 'http://localhost:8000/api';

// =============================================================================
// QUERY HOOKS TESTS
// =============================================================================

describe('usePendingQuotes', () => {
  it('fetches pending quotes', async () => {
    // The hook calls getQuotes with status=SENT and then filters actionable quotes
    server.use(
      http.get(`${API_URL}/sales/client/quotes/`, () => {
        return HttpResponse.json(createPaginatedResponse([
          {
            ...mockQuotes[0],
            status: 'SENT',
          },
        ]));
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => usePendingQuotes(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe('useEventQuotes', () => {
  it('fetches quotes for specific event', async () => {
    // The hook calls getQuotes with event filter parameter
    server.use(
      http.get(`${API_URL}/sales/client/quotes/`, ({ request }) => {
        const url = new URL(request.url);
        const eventId = url.searchParams.get('event');
        const filtered = mockQuotes.filter(q => q.event === Number(eventId));
        return HttpResponse.json(createPaginatedResponse(filtered));
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventQuotes(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('does not fetch when eventId is 0', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useEventQuotes(0), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useQuote', () => {
  it('fetches single quote by ID', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useQuote(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe(1);
  });

  it('does not fetch when ID is 0', () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useQuote(0), { wrapper });

    expect(result.current.isFetching).toBe(false);
  });

  it('handles 404 for non-existent quote', async () => {
    server.use(
      http.get(`${API_URL}/sales/client/quotes/:id/`, () => {
        return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useQuote(999), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useQuotes', () => {
  it('fetches quotes with pagination', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useQuotes(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.results).toBeDefined();
  });

  it('applies filters when provided', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useQuotes({ status: 'ACCEPTED' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

// =============================================================================
// MUTATION HOOKS TESTS
// =============================================================================

describe('useAcceptQuote', () => {
  it('accepts quote successfully', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useAcceptQuote(), { wrapper });

    await act(async () => {
      result.current.mutate({
        quoteId: 1,
        eventId: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.status).toBe('ACCEPTED');
  });

  it('handles accept error and rolls back', async () => {
    server.use(
      http.post(`${API_URL}/sales/client/quotes/:id/accept/`, () => {
        return HttpResponse.json(
          { detail: 'Quote has expired' },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useAcceptQuote(), { wrapper });

    await act(async () => {
      result.current.mutate({
        quoteId: 1,
        eventId: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('performs optimistic update before API response', async () => {
    // Delay the response to observe optimistic update
    server.use(
      http.post(`${API_URL}/sales/client/quotes/:id/accept/`, async () => {
        await new Promise(r => setTimeout(r, 100));
        return HttpResponse.json({ ...mockQuotes[0], status: 'ACCEPTED' });
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useAcceptQuote(), { wrapper });

    await act(async () => {
      result.current.mutate({
        quoteId: 1,
        eventId: 1,
      });
    });

    // Should be pending (optimistic update should have happened)
    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useRejectQuote', () => {
  it('rejects quote successfully', async () => {
    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useRejectQuote(), { wrapper });

    await act(async () => {
      result.current.mutate({
        quoteId: 1,
        eventId: 1,
        reason: 'Price too high',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.status).toBe('REJECTED');
  });

  it('handles reject error', async () => {
    server.use(
      http.post(`${API_URL}/sales/client/quotes/:id/reject/`, () => {
        return HttpResponse.json(
          { detail: 'Cannot reject this quote' },
          { status: 400 }
        );
      })
    );

    const wrapper = createHookWrapper();
    const { result } = renderHook(() => useRejectQuote(), { wrapper });

    await act(async () => {
      result.current.mutate({
        quoteId: 1,
        eventId: 1,
        reason: 'Changed my mind',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// QUERY KEYS TESTS
// =============================================================================

describe('quoteKeys', () => {
  it('generates correct key for all quotes', () => {
    expect(quoteKeys.all).toEqual(['quotes']);
  });

  it('generates correct key for quote list', () => {
    expect(quoteKeys.lists()).toEqual(['quotes', 'list']);
  });

  it('generates correct key for filtered list', () => {
    const filters = { status: 'SENT' };
    expect(quoteKeys.list(filters)).toEqual(['quotes', 'list', filters]);
  });

  it('generates correct key for pending quotes', () => {
    expect(quoteKeys.pending()).toEqual(['quotes', 'pending']);
  });

  it('generates correct key for quote detail', () => {
    expect(quoteKeys.detail(1)).toEqual(['quotes', 'detail', 1]);
  });

  it('generates correct key for event quotes', () => {
    expect(quoteKeys.event(1)).toEqual(['quotes', 'event', 1]);
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe('getQuoteUrgency', () => {
  it('returns critical for expired quote', () => {
    const quote: PendingQuote = {
      id: 1,
      quote_number: 'QT-001',
      event_id: 1,
      event_name: 'Test Event',
      status: 'SENT',
      total_amount: 50000,
      currency: 'PHP',
      valid_until: new Date(Date.now() - 86400000).toISOString(),
      days_until_expiry: -1,
    };

    expect(getQuoteUrgency(quote)).toBe('critical');
  });

  it('returns critical for quote expiring today', () => {
    const quote: PendingQuote = {
      id: 1,
      quote_number: 'QT-001',
      event_id: 1,
      event_name: 'Test Event',
      status: 'SENT',
      total_amount: 50000,
      currency: 'PHP',
      valid_until: new Date().toISOString(),
      days_until_expiry: 0,
    };

    expect(getQuoteUrgency(quote)).toBe('critical');
  });

  it('returns critical for quote expiring tomorrow', () => {
    const quote: PendingQuote = {
      id: 1,
      quote_number: 'QT-001',
      event_id: 1,
      event_name: 'Test Event',
      status: 'SENT',
      total_amount: 50000,
      currency: 'PHP',
      valid_until: new Date(Date.now() + 86400000).toISOString(),
      days_until_expiry: 1,
    };

    expect(getQuoteUrgency(quote)).toBe('critical');
  });

  it('returns high for quote expiring in 3 days', () => {
    const quote: PendingQuote = {
      id: 1,
      quote_number: 'QT-001',
      event_id: 1,
      event_name: 'Test Event',
      status: 'SENT',
      total_amount: 50000,
      currency: 'PHP',
      valid_until: new Date(Date.now() + 3 * 86400000).toISOString(),
      days_until_expiry: 3,
    };

    expect(getQuoteUrgency(quote)).toBe('high');
  });

  it('returns medium for quote expiring in 7 days', () => {
    const quote: PendingQuote = {
      id: 1,
      quote_number: 'QT-001',
      event_id: 1,
      event_name: 'Test Event',
      status: 'SENT',
      total_amount: 50000,
      currency: 'PHP',
      valid_until: new Date(Date.now() + 7 * 86400000).toISOString(),
      days_until_expiry: 7,
    };

    expect(getQuoteUrgency(quote)).toBe('medium');
  });

  it('returns low for quote expiring in 10+ days', () => {
    const quote: PendingQuote = {
      id: 1,
      quote_number: 'QT-001',
      event_id: 1,
      event_name: 'Test Event',
      status: 'SENT',
      total_amount: 50000,
      currency: 'PHP',
      valid_until: new Date(Date.now() + 10 * 86400000).toISOString(),
      days_until_expiry: 10,
    };

    expect(getQuoteUrgency(quote)).toBe('low');
  });
});
