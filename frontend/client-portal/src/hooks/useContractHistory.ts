// frontend/client-portal/src/hooks/useContractHistory.ts

import { useQuery } from '@tanstack/react-query';
import { contractsApi } from '../apis/contracts.api';
import type { ContractAmendment, ContractDocument } from '../types/contracts.types';

/**
 * Hook to fetch amendments for a specific contract
 */
export const useContractAmendments = (contractId: string | undefined) => {
  return useQuery<ContractAmendment[], Error>({
    queryKey: ['contracts', contractId, 'amendments'],
    queryFn: () => {
      if (!contractId) throw new Error('Contract ID is required');
      return contractsApi.getContractAmendments(contractId);
    },
    enabled: !!contractId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Hook to fetch documents for a specific contract
 */
export const useContractDocuments = (contractId: string | undefined) => {
  return useQuery<ContractDocument[], Error>({
    queryKey: ['contracts', contractId, 'documents'],
    queryFn: () => {
      if (!contractId) throw new Error('Contract ID is required');
      return contractsApi.getContractDocuments(contractId);
    },
    enabled: !!contractId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Hook to fetch both amendments and documents for a contract
 * Useful for ContractHistoryDialog
 */
export const useContractHistoryData = (contractId: string | undefined) => {
  const amendments = useContractAmendments(contractId);
  const documents = useContractDocuments(contractId);

  return {
    amendments: amendments.data || [],
    documents: documents.data || [],
    isLoading: amendments.isLoading || documents.isLoading,
    isError: amendments.isError || documents.isError,
    error: amendments.error || documents.error,
    refetch: () => {
      amendments.refetch();
      documents.refetch();
    },
  };
};
