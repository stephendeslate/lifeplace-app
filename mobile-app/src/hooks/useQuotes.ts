/**
 * useQuotes Hook
 *
 * React Query hooks for quotes/proposals.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quotesApi, type QuoteFilters } from '@/apis/quotes.api';
import type { Quote } from '@/apis/quotes.api';
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
 * Accept a quote with optimistic updates
 */
export function useAcceptQuote() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ quoteId }: { quoteId: number; eventId: number }) =>
      quotesApi.acceptQuote(quoteId),

    // Optimistic update - runs immediately when mutate is called
    onMutate: async ({ quoteId, eventId }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: quoteKeys.event(eventId) });

      // Snapshot the previous value for rollback
      const previousQuotes = queryClient.getQueryData<Quote[]>(quoteKeys.event(eventId));

      // Optimistically update the cache immediately
      queryClient.setQueryData<Quote[]>(quoteKeys.event(eventId), (oldQuotes) => {
        if (!oldQuotes) return oldQuotes;
        return oldQuotes.map((q) =>
          Number(q.id) === quoteId
            ? { ...q, status: 'ACCEPTED' as const, accepted_at: new Date().toISOString() }
            : q
        );
      });

      // Return context with the snapshot for rollback
      return { previousQuotes, eventId };
    },

    onSuccess: (updatedQuote, _variables, context) => {
      showToast('Quote accepted successfully', 'success');

      const quoteId = Number(updatedQuote.id);
      const eventId = context?.eventId ?? Number(updatedQuote.event);

      // Update with actual server response
      queryClient.setQueryData(quoteKeys.detail(quoteId), updatedQuote);
      queryClient.setQueryData<Quote[]>(quoteKeys.event(eventId), (oldQuotes) => {
        if (!oldQuotes) return oldQuotes;
        return oldQuotes.map((q) =>
          Number(q.id) === quoteId ? { ...q, ...updatedQuote } : q
        );
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: quoteKeys.pending() });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },

    onError: (error, _variables, context) => {
      // Rollback to previous value on error
      if (context?.previousQuotes && context?.eventId) {
        queryClient.setQueryData(quoteKeys.event(context.eventId), context.previousQuotes);
      }

      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to accept quote. Please try again.';
      showToast(message, 'error');
    },

    onSettled: (_data, _error, variables) => {
      // Refetch to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: quoteKeys.event(variables.eventId) });
    },
  });
}

/**
 * Reject a quote with optimistic updates
 */
export function useRejectQuote() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ quoteId, reason }: { quoteId: number; eventId: number; reason: string }) =>
      quotesApi.rejectQuote(quoteId, { reason }),

    // Optimistic update - runs immediately when mutate is called
    onMutate: async ({ quoteId, eventId, reason }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: quoteKeys.event(eventId) });

      // Snapshot the previous value for rollback
      const previousQuotes = queryClient.getQueryData<Quote[]>(quoteKeys.event(eventId));

      // Optimistically update the cache immediately
      queryClient.setQueryData<Quote[]>(quoteKeys.event(eventId), (oldQuotes) => {
        if (!oldQuotes) return oldQuotes;
        return oldQuotes.map((q) =>
          Number(q.id) === quoteId
            ? {
                ...q,
                status: 'REJECTED' as const,
                rejected_at: new Date().toISOString(),
                rejection_reason: reason,
              }
            : q
        );
      });

      // Return context with the snapshot for rollback
      return { previousQuotes, eventId };
    },

    onSuccess: (updatedQuote, _variables, context) => {
      showToast('Quote declined', 'info');

      const quoteId = Number(updatedQuote.id);
      const eventId = context?.eventId ?? Number(updatedQuote.event);

      // Update with actual server response
      queryClient.setQueryData(quoteKeys.detail(quoteId), updatedQuote);
      queryClient.setQueryData<Quote[]>(quoteKeys.event(eventId), (oldQuotes) => {
        if (!oldQuotes) return oldQuotes;
        return oldQuotes.map((q) =>
          Number(q.id) === quoteId ? { ...q, ...updatedQuote } : q
        );
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: quoteKeys.pending() });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },

    onError: (error, _variables, context) => {
      // Rollback to previous value on error
      if (context?.previousQuotes && context?.eventId) {
        queryClient.setQueryData(quoteKeys.event(context.eventId), context.previousQuotes);
      }

      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to decline quote. Please try again.';
      showToast(message, 'error');
    },

    onSettled: (_data, _error, variables) => {
      // Refetch to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: quoteKeys.event(variables.eventId) });
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
