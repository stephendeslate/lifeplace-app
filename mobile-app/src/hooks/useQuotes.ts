/**
 * useQuotes Hook
 *
 * React Query hooks for quotes/proposals.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quotesApi, type Quote, type QuoteFilters } from '@/apis/quotes.api';
import { useToast } from '@/contexts/ToastContext';
import type { PendingQuote } from '@/types/dashboard.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const quoteKeys = {
  all: ['quotes'] as const,
  lists: () => [...quoteKeys.all, 'list'] as const,
  list: (filters?: QuoteFilters) => [...quoteKeys.lists(), filters] as const,
  pending: () => [...quoteKeys.all, 'pending'] as const,
  details: () => [...quoteKeys.all, 'detail'] as const,
  detail: (id: number) => [...quoteKeys.details(), id] as const,
  event: (eventId: number) => [...quoteKeys.all, 'event', eventId] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch pending quotes (status = SENT)
 */
export function usePendingQuotes() {
  return useQuery({
    queryKey: quoteKeys.pending(),
    queryFn: () => quotesApi.getPendingQuotes(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch quotes for a specific event
 */
export function useEventQuotes(eventId: number) {
  return useQuery({
    queryKey: quoteKeys.event(eventId),
    queryFn: () => quotesApi.getEventQuotes(eventId),
    enabled: eventId > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch single quote detail
 */
export function useQuote(id: number) {
  return useQuery({
    queryKey: quoteKeys.detail(id),
    queryFn: () => quotesApi.getQuote(id),
    enabled: id > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch quotes with optional filters
 */
export function useQuotes(filters?: QuoteFilters) {
  return useQuery({
    queryKey: quoteKeys.list(filters),
    queryFn: () => quotesApi.getQuotes(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Accept a quote
 */
export function useAcceptQuote() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (quoteId: number) => quotesApi.acceptQuote(quoteId),
    onSuccess: (updatedQuote) => {
      showToast('Quote accepted successfully', 'success');

      // Update quote in cache
      queryClient.setQueryData(quoteKeys.detail(updatedQuote.id), updatedQuote);

      // Invalidate pending quotes
      queryClient.invalidateQueries({ queryKey: quoteKeys.pending() });

      // Invalidate event quotes
      queryClient.invalidateQueries({
        queryKey: quoteKeys.event(updatedQuote.event),
      });

      // Invalidate dashboard data
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to accept quote. Please try again.';
      showToast(message, 'error');
    },
  });
}

/**
 * Reject a quote
 */
export function useRejectQuote() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ quoteId, reason }: { quoteId: number; reason: string }) =>
      quotesApi.rejectQuote(quoteId, { reason }),
    onSuccess: (updatedQuote) => {
      showToast('Quote declined', 'info');

      // Update quote in cache
      queryClient.setQueryData(quoteKeys.detail(updatedQuote.id), updatedQuote);

      // Invalidate pending quotes
      queryClient.invalidateQueries({ queryKey: quoteKeys.pending() });

      // Invalidate event quotes
      queryClient.invalidateQueries({
        queryKey: quoteKeys.event(updatedQuote.event),
      });

      // Invalidate dashboard data
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to decline quote. Please try again.';
      showToast(message, 'error');
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Get quote urgency level
 */
export function getQuoteUrgency(
  quote: PendingQuote
): 'critical' | 'high' | 'medium' | 'low' {
  if (quote.days_until_expiry <= 0) return 'critical';
  if (quote.days_until_expiry <= 1) return 'critical';
  if (quote.days_until_expiry <= 3) return 'high';
  if (quote.days_until_expiry <= 7) return 'medium';
  return 'low';
}
