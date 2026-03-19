import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '../../apis/contracts.api';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  CreateContractAmendmentData,
  ContractAmendmentFilters,
} from '../../types/contracts.types';

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
