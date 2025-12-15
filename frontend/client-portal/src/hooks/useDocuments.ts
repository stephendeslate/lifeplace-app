// frontend/client-portal/src/hooks/useDocuments.ts

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEvents } from './useEvents';
import { useContracts } from '../contexts/ContractsContext';
import { eventsApi } from '../apis/events.api';
import { useToastActions } from '../contexts/ToastContext';
import type { EventFile, FileUpload } from '../types/events.types';
import type { Contract } from '../types/contracts.types';
import type {
  DocumentItem,
  DocumentFilters,
  DocumentEventOption,
  DocumentType,
  DocumentCategory,
  DocumentSortOption,
} from '../types/documents.types';
import { CATEGORY_TO_TYPE, getFileExtension } from '../types/documents.types';

// Transform EventFile to DocumentItem
const transformEventFileToDocument = (
  file: EventFile,
  eventId: number,
  eventName: string
): DocumentItem => {
  // Determine category from file_type or default to OTHER
  const category: DocumentCategory =
    (file.file_type?.toUpperCase() as DocumentCategory) || 'OTHER';

  // Map category to document type
  const type: DocumentType = CATEGORY_TO_TYPE[category] || 'OTHER';

  return {
    id: `file-${file.id}`,
    type,
    name: file.name,
    eventId,
    eventName,
    category,
    fileType: getFileExtension(file.name) || file.file_type || 'unknown',
    fileSize: file.size,
    downloadUrl: file.download_url,
    createdAt: file.created_at,
  };
};

// Transform Contract to DocumentItem
const transformContractToDocument = (contract: Contract): DocumentItem => {
  return {
    id: `contract-${contract.id}`,
    type: 'CONTRACT',
    name: contract.template?.name || 'Contract',
    description: `${contract.event?.title || 'Event'} - ${contract.status}`,
    eventId: parseInt(contract.event?.id || '0', 10),
    eventName: contract.event?.title || 'Unknown Event',
    category: 'CONTRACT',
    fileType: 'pdf',
    fileSize: 0, // Contracts don't have file size
    downloadUrl: '', // Will use contractsApi.downloadContract instead
    createdAt: contract.created_at,
    contractId: contract.id,
    contractStatus: contract.status,
    signedAt: contract.fully_signed_at,
    templateName: contract.template?.name,
  };
};

interface UseDocumentsOptions {
  filters?: DocumentFilters;
  sortBy?: DocumentSortOption;
}

export const useDocuments = (options: UseDocumentsOptions = {}) => {
  const { filters, sortBy = 'date' } = options;
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Get all events
  const { useEventsList } = useEvents();
  const { data: events = [], isLoading: eventsLoading } = useEventsList();

  // Get signed contracts
  const { signedContracts, isLoading: contractsLoading } = useContracts();

  // Fetch documents for all events
  const { data: allEventDocuments = {}, isLoading: documentsLoading } = useQuery({
    queryKey: ['all-event-documents', events.map(e => e.id)],
    queryFn: async () => {
      if (events.length === 0) return {};

      const results: Record<number, EventFile[]> = {};

      // Fetch documents for each event in parallel
      await Promise.all(
        events.map(async (event) => {
          try {
            const docs = await eventsApi.getEventDocuments(event.id);
            results[event.id] = docs;
          } catch (error) {
            console.error(`Failed to fetch documents for event ${event.id}:`, error);
            results[event.id] = [];
          }
        })
      );

      return results;
    },
    enabled: events.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform and aggregate all documents
  const allDocuments = useMemo(() => {
    const documents: DocumentItem[] = [];

    // Add event files
    Object.entries(allEventDocuments).forEach(([eventIdStr, files]) => {
      const eventId = parseInt(eventIdStr, 10);
      const event = events.find(e => e.id === eventId);
      if (!event || !files) return;

      files.forEach((file) => {
        documents.push(transformEventFileToDocument(file, eventId, event.name));
      });
    });

    // Add signed contracts (only SIGNED status)
    signedContracts.forEach((contract) => {
      documents.push(transformContractToDocument(contract));
    });

    return documents;
  }, [allEventDocuments, events, signedContracts]);

  // Apply filters
  const filteredDocuments = useMemo(() => {
    let result = [...allDocuments];

    // Filter by event
    if (filters?.eventId) {
      result = result.filter(doc => doc.eventId === filters.eventId);
    }

    // Filter by types
    if (filters?.types && filters.types.length > 0) {
      result = result.filter(doc => filters.types!.includes(doc.type));
    }

    // Filter by categories
    if (filters?.categories && filters.categories.length > 0) {
      result = result.filter(doc => filters.categories!.includes(doc.category));
    }

    // Filter by search
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(doc =>
        doc.name.toLowerCase().includes(searchLower) ||
        doc.eventName.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [allDocuments, filters]);

  // Apply sorting
  const sortedDocuments = useMemo(() => {
    const sorted = [...filteredDocuments];

    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'type':
        sorted.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case 'size':
        sorted.sort((a, b) => b.fileSize - a.fileSize);
        break;
    }

    return sorted;
  }, [filteredDocuments, sortBy]);

  // Get event options for filter dropdown
  const eventOptions = useMemo((): DocumentEventOption[] => {
    const eventCounts = new Map<number, number>();

    allDocuments.forEach(doc => {
      const count = eventCounts.get(doc.eventId) || 0;
      eventCounts.set(doc.eventId, count + 1);
    });

    return events
      .filter(event => eventCounts.has(event.id))
      .map(event => ({
        id: event.id,
        name: event.name,
        documentCount: eventCounts.get(event.id) || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allDocuments, events]);

  // Get counts by type
  const countsByType = useMemo(() => {
    const counts: Record<DocumentType, number> = {
      CONTRACT: 0,
      UPLOAD: 0,
      RECEIPT: 0,
      PHOTO: 0,
      OTHER: 0,
    };

    allDocuments.forEach(doc => {
      counts[doc.type]++;
    });

    return counts;
  }, [allDocuments]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ eventId, data }: { eventId: number; data: FileUpload }) => {
      return eventsApi.uploadEventFile(eventId, data);
    },
    onSuccess: (_, variables) => {
      showSuccess('Upload Complete', 'Your document has been uploaded successfully.');
      queryClient.invalidateQueries({ queryKey: ['all-event-documents'] });
      queryClient.invalidateQueries({ queryKey: ['event-documents', variables.eventId] });
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      showError('Upload Failed', 'There was an error uploading your document. Please try again.');
    },
  });

  // Refetch function
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['all-event-documents'] });
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
  };

  const isLoading = eventsLoading || contractsLoading || documentsLoading;

  return {
    documents: sortedDocuments,
    allDocuments,
    eventOptions,
    countsByType,
    totalCount: allDocuments.length,
    filteredCount: sortedDocuments.length,
    isLoading,
    error: null,
    refetch,
    uploadDocument: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
  };
};

export default useDocuments;
