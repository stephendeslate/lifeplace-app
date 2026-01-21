/**
 * useContracts Hook
 *
 * React Query hooks for contract management.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  contractsApi,
  type Contract,
  type ContractFilters,
  type ContractSignInput,
} from '@/apis/contracts.api';
import { useToast } from '@/contexts/ToastContext';
import type { PendingContract } from '@/types/dashboard.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const contractKeys = {
  all: ['contracts'] as const,
  lists: () => [...contractKeys.all, 'list'] as const,
  list: (filters?: ContractFilters) => [...contractKeys.lists(), filters] as const,
  pending: () => [...contractKeys.all, 'pending'] as const,
  details: () => [...contractKeys.all, 'detail'] as const,
  detail: (id: number) => [...contractKeys.details(), id] as const,
  event: (eventId: number) => [...contractKeys.all, 'event', eventId] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch contracts needing client signature
 */
export function usePendingContracts() {
  return useQuery({
    queryKey: contractKeys.pending(),
    queryFn: async (): Promise<PendingContract[]> => {
      const contracts = await contractsApi.getPendingSignatureContracts();
      return contracts.map((contract) => ({
        id: contract.id.toString(),
        event_id: contract.event.id,
        event_name: contract.event.title,
        template_name: contract.template.name,
        status: contract.status,
        expires_at: contract.expires_at,
        days_until_expiry: calculateDaysUntilExpiry(contract.expires_at),
        signature_progress: contract.signature_progress,
      }));
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch all contracts for the current client
 */
export function useAllContracts() {
  return useQuery({
    queryKey: contractKeys.lists(),
    queryFn: async () => {
      const response = await contractsApi.getContracts();
      return response.results;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch contracts for a specific event
 * Follows client-portal pattern: fetches all contracts and filters client-side
 */
export function useEventContracts(eventId: number) {
  const { data: allContracts, isLoading, refetch, isRefetching } = useAllContracts();

  // Filter contracts client-side for this specific event
  // This matches the client-portal pattern for consistent behavior
  const contracts = allContracts?.filter(
    (contract) => contract.event.id === eventId
  ) || [];

  return {
    data: contracts,
    isLoading,
    refetch,
    isRefetching,
  };
}

/**
 * Fetch single contract detail
 */
export function useContract(id: number) {
  return useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: () => contractsApi.getContract(id),
    enabled: id > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch contracts with optional filters
 */
export function useContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: contractKeys.list(filters),
    queryFn: () => contractsApi.getContracts(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Sign a contract
 */
export function useSignContract() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ contractId, data }: { contractId: number; data: ContractSignInput }) =>
      contractsApi.signContract(contractId, data),
    onSuccess: (updatedContract) => {
      showToast('Contract signed successfully', 'success');

      // Update contract in cache
      queryClient.setQueryData(contractKeys.detail(updatedContract.id), updatedContract);

      // Invalidate pending contracts
      queryClient.invalidateQueries({ queryKey: contractKeys.pending() });

      // Invalidate event contracts
      queryClient.invalidateQueries({
        queryKey: contractKeys.event(updatedContract.event.id),
      });

      // Invalidate dashboard data
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Invalidate event detail to update contract status
      queryClient.invalidateQueries({
        queryKey: ['events', 'detail', updatedContract.event.id],
      });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to sign contract. Please try again.';
      showToast(message, 'error');
    },
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateDaysUntilExpiry(dateString: string | null): number | null {
  if (!dateString) return null;
  const now = new Date();
  const expiryDate = new Date(dateString);
  return Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get contract urgency level
 */
export function getContractUrgency(
  contract: PendingContract
): 'critical' | 'high' | 'medium' | 'low' {
  if (contract.days_until_expiry === null) return 'low';
  if (contract.days_until_expiry <= 0) return 'critical';
  if (contract.days_until_expiry <= 2) return 'critical';
  if (contract.days_until_expiry <= 5) return 'high';
  if (contract.days_until_expiry <= 10) return 'medium';
  return 'low';
}

/**
 * Check if contract can be signed by client
 */
export function canSignContract(contract: Contract): boolean {
  return (
    contract.can_client_sign &&
    (contract.status === 'SENT' || contract.status === 'PARTIALLY_SIGNED') &&
    contract.signature_progress.signed_count < contract.signature_progress.total_required
  );
}
