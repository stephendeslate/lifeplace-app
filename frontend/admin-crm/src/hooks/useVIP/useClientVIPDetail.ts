import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vipApi } from '../../apis/vip.api';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  AssignTierPayload,
  AwardPointsPayload,
  AdjustPointsPayload,
} from '../../types/vip.types';

// ============================================
// Client VIP Detail Hook
// ============================================

export const useClientVIPDetail = (clientStatusId: number) => {
  const {
    data: clientStatus,
    isLoading: isLoadingClientStatus,
    error: clientStatusError,
  } = useQuery({
    queryKey: ['vip-client-status', clientStatusId],
    queryFn: () => vipApi.getClientStatus(clientStatusId),
    enabled: !!clientStatusId,
  });

  const { data: tierHistory = [], isLoading: isLoadingTierHistory } = useQuery({
    queryKey: ['vip-client-tier-history', clientStatusId],
    queryFn: () => vipApi.getClientTierHistory(clientStatusId),
    enabled: !!clientStatusId,
  });

  const { data: pointTransactions = [], isLoading: isLoadingPointTransactions } = useQuery({
    queryKey: ['vip-client-point-transactions', clientStatusId],
    queryFn: () => vipApi.getClientPointTransactions(clientStatusId),
    enabled: !!clientStatusId,
  });

  return {
    clientStatus,
    tierHistory,
    pointTransactions,
    isLoadingClientStatus,
    isLoadingTierHistory,
    isLoadingPointTransactions,
    clientStatusError,
  };
};

// ============================================
// Client VIP Status by Client ID Hook
// ============================================

/**
 * Get VIP status for a specific client by their user ID.
 * Used in EventProfile to show and manage client's VIP info.
 */
export const useClientVIPStatusByClient = (clientId: number | undefined) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: clientStatuses = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['vip-client-status-by-client', clientId],
    queryFn: () => vipApi.getClientStatuses({ client: clientId }),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });

  // Client can only have one VIP status record
  const clientStatus = clientStatuses[0] || null;

  const assignTierMutation = useMutation({
    mutationFn: ({ clientStatusId, data }: { clientStatusId: number; data: AssignTierPayload }) =>
      vipApi.assignTier(clientStatusId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['vip-client-status-by-client', clientId],
      });
      queryClient.invalidateQueries({ queryKey: ['vip-client-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['vip-tiers'] });
      showSuccess('Tier Assigned', 'Client tier has been updated.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to assign tier'
          : 'Failed to assign tier';
      showError('Assignment Failed', message);
    },
  });

  const awardPointsMutation = useMutation({
    mutationFn: ({ clientStatusId, data }: { clientStatusId: number; data: AwardPointsPayload }) =>
      vipApi.awardPoints(clientStatusId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ['vip-client-status-by-client', clientId],
      });
      queryClient.invalidateQueries({ queryKey: ['vip-client-statuses'] });
      showSuccess(
        'Points Awarded',
        `${response.transaction.points} points awarded. New balance: ${response.new_balance}`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to award points'
          : 'Failed to award points';
      showError('Award Failed', message);
    },
  });

  const adjustPointsMutation = useMutation({
    mutationFn: ({ clientStatusId, data }: { clientStatusId: number; data: AdjustPointsPayload }) =>
      vipApi.adjustPoints(clientStatusId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ['vip-client-status-by-client', clientId],
      });
      queryClient.invalidateQueries({ queryKey: ['vip-client-statuses'] });
      showSuccess(
        'Points Adjusted',
        `Points adjusted by ${response.transaction.points}. New balance: ${response.new_balance}`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to adjust points'
          : 'Failed to adjust points';
      showError('Adjustment Failed', message);
    },
  });

  return {
    clientStatus,
    isLoading,
    error,
    refetch,
    assignTier: (clientStatusId: number, data: AssignTierPayload) =>
      assignTierMutation.mutateAsync({ clientStatusId, data }),
    awardPoints: (clientStatusId: number, data: AwardPointsPayload) =>
      awardPointsMutation.mutateAsync({ clientStatusId, data }),
    adjustPoints: (clientStatusId: number, data: AdjustPointsPayload) =>
      adjustPointsMutation.mutateAsync({ clientStatusId, data }),
    isAssigningTier: assignTierMutation.isPending,
    isAwardingPoints: awardPointsMutation.isPending,
    isAdjustingPoints: adjustPointsMutation.isPending,
  };
};
