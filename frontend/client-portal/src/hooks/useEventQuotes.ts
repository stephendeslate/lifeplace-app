// frontend/client-portal/src/hooks/useEventQuotes.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import QuotesApi from '../apis/quotes.api';
import type {
  EventQuote,
  QuoteFilters,
  QuoteAcceptanceData,
  QuoteRejectionData,
  PaginatedQuoteResponse,
} from '../types/quotes.types';

// ==================== QUERY HOOKS ====================

/**
 * Get quotes for a specific event
 */
export const useEventQuotes = (eventId: number) => {
  return useQuery({
    queryKey: ['quotes', 'event', eventId],
    queryFn: () => QuotesApi.getQuotes({ event: eventId }),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Get single quote details
 */
export const useQuote = (quoteId: number) => {
  return useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => QuotesApi.getQuote(quoteId),
    enabled: !!quoteId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Get all quotes with optional filters
 */
export const useQuotes = (filters?: QuoteFilters, page?: number, pageSize?: number) => {
  return useQuery({
    queryKey: ['quotes', filters, page, pageSize],
    queryFn: () => QuotesApi.getQuotes(filters, page, pageSize),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Get quotes by status
 */
export const useQuotesByStatus = (status: EventQuote['status']) => {
  return useQuery({
    queryKey: ['quotes', { status }],
    queryFn: () => QuotesApi.getQuotes({ status }),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Get pending quotes (actionable by client)
 */
export const usePendingQuotes = () => {
  const { data: quotes, ...rest } = useQuotesByStatus('SENT');

  return {
    data: quotes
      ? {
          ...quotes,
          results: quotes.results.filter((quote) => QuotesApi.isQuoteActionable(quote)),
        }
      : quotes,
    ...rest,
  };
};

/**
 * Get accepted quotes
 */
export const useAcceptedQuotes = () => {
  return useQuery({
    queryKey: ['quotes', { status: 'ACCEPTED' }],
    queryFn: () => QuotesApi.getQuotes({ status: 'ACCEPTED' }),
    staleTime: 5 * 60 * 1000, // 5 minutes (accepted quotes change less frequently)
  });
};

// ==================== MUTATION HOOKS ====================

/**
 * Accept quote mutation
 */
export const useAcceptQuote = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: number; data?: QuoteAcceptanceData }) =>
      QuotesApi.acceptQuote(quoteId, data),
    onSuccess: (acceptedQuote, variables) => {
      showSuccess(
        'Quote Accepted',
        'Your quote has been accepted successfully! We will be in touch soon to proceed with your event.',
      );

      // Update the specific quote in cache
      queryClient.setQueryData(['quote', variables.quoteId], acceptedQuote);

      // Update the quote in any lists that contain it
      queryClient.setQueryData(
        ['quotes', 'event', acceptedQuote.event_details.id],
        (oldData: PaginatedQuoteResponse | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            results: oldData.results.map((quote) =>
              quote.id === variables.quoteId ? acceptedQuote : quote,
            ),
          };
        },
      );

      // Invalidate related queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', { status: 'SENT' }] });
      queryClient.invalidateQueries({ queryKey: ['quotes', { status: 'ACCEPTED' }] });

      // Quote acceptance triggers backend workflow automation that creates:
      // 1. Invoice (from quote total)
      // 2. Contract (from quote template's contract template)
      // Invalidate these queries directly to ensure immediate UI update
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => {
      showError('Accept Failed', QuotesApi.handleError(error));
    },
  });
};

/**
 * Reject quote mutation
 */
export const useRejectQuote = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: number; data: QuoteRejectionData }) =>
      QuotesApi.rejectQuote(quoteId, data),
    onSuccess: (rejectedQuote, variables) => {
      showSuccess(
        'Quote Rejected',
        'Your feedback has been submitted. We will review your concerns and get back to you.',
      );

      // Update the specific quote in cache
      queryClient.setQueryData(['quote', variables.quoteId], rejectedQuote);

      // Update the quote in any lists that contain it
      queryClient.setQueryData(
        ['quotes', 'event', rejectedQuote.event_details.id],
        (oldData: PaginatedQuoteResponse | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            results: oldData.results.map((quote) =>
              quote.id === variables.quoteId ? rejectedQuote : quote,
            ),
          };
        },
      );

      // Invalidate related queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', { status: 'SENT' }] });
      queryClient.invalidateQueries({ queryKey: ['quotes', { status: 'REJECTED' }] });
    },
    onError: (error) => {
      showError('Rejection Failed', QuotesApi.handleError(error));
    },
  });
};

/**
 * Download quote PDF mutation
 */
export const useDownloadQuotePdf = () => {
  const { showError } = useToastActions();

  return useMutation({
    mutationFn: (quoteId: number) => QuotesApi.downloadQuotePdf(quoteId),
    onSuccess: (blob, quoteId) => {
      const filename = `quote-${quoteId}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      showError('Download Failed', QuotesApi.handleError(error));
    },
  });
};

/**
 * Combined quote actions hook for convenience
 */
export const useQuoteActions = () => {
  const acceptQuote = useAcceptQuote();
  const rejectQuote = useRejectQuote();
  const downloadPdf = useDownloadQuotePdf();

  return {
    acceptQuote: acceptQuote.mutate,
    rejectQuote: rejectQuote.mutate,
    downloadPdf: downloadPdf.mutate,
    isAccepting: acceptQuote.isPending,
    isRejecting: rejectQuote.isPending,
    isDownloading: downloadPdf.isPending,
  };
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Prefetch a specific quote
 */
export const usePrefetchQuote = () => {
  const queryClient = useQueryClient();

  return (quoteId: number) => {
    queryClient.prefetchQuery({
      queryKey: ['quote', quoteId],
      queryFn: () => QuotesApi.getQuote(quoteId),
      staleTime: 2 * 60 * 1000,
    });
  };
};

/**
 * Prefetch event quotes
 */
export const usePrefetchEventQuotes = () => {
  const queryClient = useQueryClient();

  return (eventId: number) => {
    queryClient.prefetchQuery({
      queryKey: ['quotes', 'event', eventId],
      queryFn: () => QuotesApi.getQuotes({ event: eventId }),
      staleTime: 2 * 60 * 1000,
    });
  };
};

/**
 * Get cached quote data
 */
export const useCachedQuote = (quoteId: number) => {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<EventQuote>(['quote', quoteId]);
};

/**
 * Invalidate all quote queries
 */
export const useInvalidateQuoteQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
    invalidateQuote: (quoteId: number) =>
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] }),
    invalidateEventQuotes: (eventId: number) =>
      queryClient.invalidateQueries({ queryKey: ['quotes', 'event', eventId] }),
  };
};
