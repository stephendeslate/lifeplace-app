/**
 * useDocuments Hook
 *
 * React Query hooks for document management with filtering,
 * sorting, and aggregation across all events.
 */

import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/apis/documents.api';
import type {
  DocumentItem,
  DocumentFilters,
  DocumentSortOption,
  DocumentEventOption,
  DocumentUploadData,
} from '@/types/documents.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters?: DocumentFilters) => [...documentKeys.lists(), filters] as const,
  events: () => [...documentKeys.all, 'events'] as const,
  event: (eventId: number) => [...documentKeys.all, 'event', eventId] as const,
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch all documents across all events
 */
export function useAllDocuments() {
  return useQuery({
    queryKey: documentKeys.lists(),
    queryFn: () => documentsApi.getAllDocuments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch documents for a specific event
 */
export function useEventDocumentsQuery(eventId: number) {
  return useQuery({
    queryKey: documentKeys.event(eventId),
    queryFn: () => documentsApi.getEventDocuments(eventId),
    enabled: !!eventId,
  });
}

/**
 * Fetch events with document counts
 */
export function useDocumentEvents() {
  return useQuery({
    queryKey: documentKeys.events(),
    queryFn: () => documentsApi.getDocumentEvents(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Upload a document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DocumentUploadData) => documentsApi.uploadDocument(data),
    onSuccess: (_, variables) => {
      // Invalidate all document queries
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      // Also invalidate the specific event's documents
      queryClient.invalidateQueries({
        queryKey: documentKeys.event(variables.eventId),
      });
    },
  });
}

/**
 * Main documents hook with filtering, sorting, and search
 */
export function useDocuments(initialFilters?: DocumentFilters) {
  // State for filters and sorting
  const [filters, setFilters] = useState<DocumentFilters>(initialFilters || {});
  const [sortBy, setSortBy] = useState<DocumentSortOption>('date');
  const [sortAscending, setSortAscending] = useState(false);

  // Fetch all documents
  const {
    data: allDocuments,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useAllDocuments();

  // Fetch events for filter dropdown
  const { data: eventOptions } = useDocumentEvents();

  // Filtered and sorted documents
  const documents = useMemo(() => {
    if (!allDocuments) return [];

    let filtered = [...allDocuments];

    // Apply event filter
    if (filters.eventId) {
      filtered = filtered.filter((doc) => doc.eventId === filters.eventId);
    }

    // Apply type filter
    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter((doc) => filters.types!.includes(doc.type));
    }

    // Apply category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter((doc) =>
        filters.categories!.includes(doc.category)
      );
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(searchLower) ||
          doc.eventName.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort documents
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'size':
          comparison = (a.fileSize || 0) - (b.fileSize || 0);
          break;
        case 'date':
        default:
          comparison =
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
      }

      return sortAscending ? comparison : -comparison;
    });

    return filtered;
  }, [allDocuments, filters, sortBy, sortAscending]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<DocumentFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Toggle sort direction
  const toggleSortDirection = useCallback(() => {
    setSortAscending((prev) => !prev);
  }, []);

  // Refresh documents
  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Statistics
  const stats = useMemo(() => {
    if (!allDocuments) {
      return {
        total: 0,
        byType: {} as Record<string, number>,
        byEvent: {} as Record<number, number>,
      };
    }

    const byType: Record<string, number> = {};
    const byEvent: Record<number, number> = {};

    allDocuments.forEach((doc) => {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
      byEvent[doc.eventId] = (byEvent[doc.eventId] || 0) + 1;
    });

    return {
      total: allDocuments.length,
      byType,
      byEvent,
    };
  }, [allDocuments]);

  return {
    // Data
    documents,
    allDocuments,
    eventOptions,
    stats,

    // State
    filters,
    sortBy,
    sortAscending,

    // Status
    isLoading,
    isError,
    error,
    isRefetching,

    // Actions
    setFilters,
    updateFilters,
    clearFilters,
    setSortBy,
    toggleSortDirection,
    setSortAscending,
    refresh,
  };
}

export default useDocuments;
