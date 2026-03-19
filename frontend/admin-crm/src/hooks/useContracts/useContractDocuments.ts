import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '../../apis/contracts.api';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  CreateContractDocumentData,
  CreateContractNoteData,
} from '../../types/contracts.types';

// Contract Documents
export const useContractDocuments = (contractId: number) => {
  return useQuery({
    queryKey: ['contractDocuments', contractId],
    queryFn: () => contractsApi.getContractDocuments(contractId),
    enabled: !!contractId,
  });
};

export const useAddContractDocument = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateContractDocumentData }) =>
      contractsApi.addContractDocument(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contractDocuments', id] });
      showSuccess('Document Added', 'Document has been added to the contract.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to add document'
          : 'Failed to add document';
      showError('Upload Failed', message);
    },
  });
};

// Contract Notes
export const useContractNotes = (contractId: number) => {
  return useQuery({
    queryKey: ['contractNotes', contractId],
    queryFn: () => contractsApi.getContractNotes(contractId),
    enabled: !!contractId,
  });
};

export const useAddContractNote = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateContractNoteData }) =>
      contractsApi.addContractNote(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contractNotes', id] });
      showSuccess('Note Added', 'Note has been added to the contract.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to add note'
          : 'Failed to add note';
      showError('Note Failed', message);
    },
  });
};
