import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '../../apis/contracts.api';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  CreateContractSignatureData,
  ContractSignatureFilters,
} from '../../types/contracts.types';

// Contract Signatures
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
