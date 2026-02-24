// frontend/admin-crm/src/hooks/useContracts.ts

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { contractsApi, type ContractTemplateQueryParams } from '../apis/contracts.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  CreateContractTemplateData,
  UpdateContractTemplateData,
  CreateEventContractData,
  UpdateEventContractData,
  CreateContractSignatureData,
  CreateContractAmendmentData,
  CreateContractDocumentData,
  CreateContractNoteData,
  EventContractFilters,
  ContractSignatureFilters,
  ContractAmendmentFilters,
} from '../types/contracts.types';

// Contract Templates
export const useContractTemplates = (params?: ContractTemplateQueryParams) => {
  const {
    data: paginatedData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contractTemplates', params],
    queryFn: () => contractsApi.getContractTemplates(params),
    placeholderData: keepPreviousData,
  });

  const items = paginatedData?.results || [];
  const totalCount = paginatedData?.count || 0;
  const pageCount = paginatedData?.page_count || 1;

  return { data: items, isLoading, error, refetch, totalCount, pageCount };
};

export const useContractTemplate = (id: number) => {
  return useQuery({
    queryKey: ['contractTemplate', id],
    queryFn: () => contractsApi.getContractTemplate(id),
    enabled: !!id,
  });
};

export const useCreateContractTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateContractTemplateData) => contractsApi.createContractTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      showSuccess('Template Created', 'Contract template has been created successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create contract template'
          : 'Failed to create contract template';
      showError('Creation Failed', message);
    },
  });
};

export const useUpdateContractTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateContractTemplateData }) =>
      contractsApi.updateContractTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['contractTemplate', id] });
      showSuccess('Template Updated', 'Contract template has been updated successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update contract template'
          : 'Failed to update contract template';
      showError('Update Failed', message);
    },
  });
};

export const useDeleteContractTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => contractsApi.deleteContractTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      showSuccess('Template Deleted', 'Contract template has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete contract template'
          : 'Failed to delete contract template';
      showError('Deletion Failed', message);
    },
  });
};

// Event Contracts
export const useEventContracts = (
  filters?: EventContractFilters,
  options?: { refetchInterval?: number },
) => {
  return useQuery({
    queryKey: ['eventContracts', filters],
    queryFn: () => contractsApi.getEventContracts(filters),
    refetchInterval: options?.refetchInterval,
  });
};

export const useEventContract = (id: number) => {
  return useQuery({
    queryKey: ['eventContract', id],
    queryFn: () => contractsApi.getEventContract(id),
    enabled: !!id,
  });
};

export const useContractsForEvent = (eventId: number) => {
  return useQuery({
    queryKey: ['eventContracts', 'forEvent', eventId],
    queryFn: () => contractsApi.getContractsForEvent(eventId),
    enabled: !!eventId,
  });
};

export const useCreateEventContract = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateEventContractData) => contractsApi.createEventContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventContracts'] });
      showSuccess('Contract Created', 'Event contract has been created successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create event contract'
          : 'Failed to create event contract';
      showError('Creation Failed', message);
    },
  });
};

export const useUpdateEventContract = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEventContractData }) =>
      contractsApi.updateEventContract(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventContracts'] });
      queryClient.invalidateQueries({ queryKey: ['eventContract', id] });
      showSuccess('Contract Updated', 'Event contract has been updated successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update event contract'
          : 'Failed to update event contract';
      showError('Update Failed', message);
    },
  });
};

export const useContractsForClient = (clientId: number) => {
  return useQuery({
    queryKey: ['eventContracts', 'forClient', clientId],
    queryFn: () => contractsApi.getContractsForClient(clientId),
    enabled: !!clientId,
    select: (data) => (Array.isArray(data) ? data : []),
  });
};

export const useDeleteEventContract = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => contractsApi.deleteEventContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventContracts'] });
      showSuccess('Contract Deleted', 'Event contract has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete event contract'
          : 'Failed to delete event contract';
      showError('Deletion Failed', message);
    },
  });
};

export const useAddContractSignature = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateContractSignatureData }) =>
      contractsApi.addSignature(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventContract', id] });
      queryClient.invalidateQueries({ queryKey: ['contractSignatures'] });
      showSuccess('Signature Added', 'Signature has been added to the contract.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to add signature'
          : 'Failed to add signature';
      showError('Signature Failed', message);
    },
  });
};

export const useVoidContract = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      contractsApi.voidContract(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventContracts'] });
      queryClient.invalidateQueries({ queryKey: ['eventContract', id] });
      showSuccess('Contract Voided', 'Contract has been voided successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to void contract'
          : 'Failed to void contract';
      showError('Void Failed', message);
    },
  });
};

// Contract Signatures
export const useContractSignatures = (filters?: ContractSignatureFilters) => {
  return useQuery({
    queryKey: ['contractSignatures', filters],
    queryFn: () => contractsApi.getContractSignatures(filters),
  });
};

export const useContractSignature = (id: number) => {
  return useQuery({
    queryKey: ['contractSignature', id],
    queryFn: () => contractsApi.getContractSignature(id),
    enabled: !!id,
  });
};

export const useVerifySignature = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, verificationMethod }: { id: number; verificationMethod?: string }) =>
      contractsApi.verifySignature(id, verificationMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractSignatures'] });
      showSuccess('Signature Verified', 'Signature has been verified successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to verify signature'
          : 'Failed to verify signature';
      showError('Verification Failed', message);
    },
  });
};

// Contract Amendments
export const useContractAmendments = (filters?: ContractAmendmentFilters) => {
  return useQuery({
    queryKey: ['contractAmendments', filters],
    queryFn: () => contractsApi.getAllContractAmendments(filters),
  });
};

export const useContractAmendmentsForContract = (contractId: number) => {
  return useQuery({
    queryKey: ['contractAmendments', 'forContract', contractId],
    queryFn: () => contractsApi.getContractAmendments(contractId),
    enabled: !!contractId,
  });
};

export const useRequestAmendment = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateContractAmendmentData }) =>
      contractsApi.requestAmendment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractAmendments'] });
      showSuccess('Amendment Requested', 'Contract amendment has been requested successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to request amendment'
          : 'Failed to request amendment';
      showError('Request Failed', message);
    },
  });
};

export const useApproveAmendment = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: number; reviewNotes?: string }) =>
      contractsApi.approveAmendment(id, reviewNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractAmendments'] });
      showSuccess('Amendment Approved', 'Contract amendment has been approved successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to approve amendment'
          : 'Failed to approve amendment';
      showError('Approval Failed', message);
    },
  });
};

export const useRejectAmendment = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: number; reviewNotes?: string }) =>
      contractsApi.rejectAmendment(id, reviewNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractAmendments'] });
      showSuccess('Amendment Rejected', 'Contract amendment has been rejected.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to reject amendment'
          : 'Failed to reject amendment';
      showError('Rejection Failed', message);
    },
  });
};

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

export const useSendContract = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (contractId: number) => contractsApi.sendContract(contractId),
    onSuccess: (updatedContract) => {
      queryClient.invalidateQueries({ queryKey: ['eventContracts'] });
      queryClient.invalidateQueries({
        queryKey: ['eventContract', updatedContract.id],
      });
      queryClient.setQueryData(['eventContract', updatedContract.id], updatedContract);
      showSuccess('Contract Sent', 'Contract has been sent to the client for signature.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to send contract'
          : 'Failed to send contract';
      showError('Send Failed', message);
    },
  });
};

export const useDownloadContractPdf = () => {
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: async (contractId: number) => {
      const blob = await contractsApi.downloadContractPdf(contractId);
      return { blob, contractId };
    },
    onSuccess: ({ blob, contractId }) => {
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contract-${contractId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Download Started', 'Contract PDF download has started.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to download contract PDF'
          : 'Failed to download contract PDF';
      showError('Download Failed', message);
    },
  });
};
