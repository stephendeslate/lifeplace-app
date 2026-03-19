import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '../../apis/contracts.api';
import { useToastActions } from '../../contexts/ToastContext';

// Contract Actions
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
