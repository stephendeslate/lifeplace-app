// frontend/admin-crm/src/hooks/useLegalDocuments.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../apis/settings.api';
import { useToastActions } from '../contexts/ToastContext';
import type { LegalDocumentUpdateData } from '../types/settings.types';

interface ApiError {
  response?: {
    data?: {
      detail?: string;
      [key: string]: unknown;
    };
  };
}

/**
 * Hook for legal documents management
 */
export const useLegalDocuments = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Get all legal documents query
  const legalDocumentsQuery = useQuery({
    queryKey: ['legalDocuments'],
    queryFn: settingsApi.getLegalDocuments,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update legal document mutation
  const updateLegalDocumentMutation = useMutation({
    mutationFn: ({ documentType, data }: { documentType: string; data: LegalDocumentUpdateData }) =>
      settingsApi.updateLegalDocument(documentType, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['legalDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['legalDocument', data.document_type] });
      showSuccess('Document Updated', `${data.document_type_display} has been updated successfully.`);
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to update document';
      showError('Update Failed', message);
    },
  });

  return {
    // Query data
    legalDocuments: legalDocumentsQuery.data || [],

    // Loading states
    isLoadingDocuments: legalDocumentsQuery.isLoading,
    isUpdatingDocument: updateLegalDocumentMutation.isPending,

    // Error states
    documentsError: legalDocumentsQuery.error,
    updateError: updateLegalDocumentMutation.error,

    // Mutations
    updateLegalDocument: updateLegalDocumentMutation.mutate,

    // Utility functions
    refetchDocuments: legalDocumentsQuery.refetch,
  };
};

/**
 * Hook for single legal document
 */
export const useLegalDocument = (documentType: string | null) => {
  const legalDocumentQuery = useQuery({
    queryKey: ['legalDocument', documentType],
    queryFn: () => settingsApi.getLegalDocument(documentType!),
    enabled: !!documentType,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    legalDocument: legalDocumentQuery.data,
    isLoadingDocument: legalDocumentQuery.isLoading,
    documentError: legalDocumentQuery.error,
    refetchDocument: legalDocumentQuery.refetch,
  };
};
