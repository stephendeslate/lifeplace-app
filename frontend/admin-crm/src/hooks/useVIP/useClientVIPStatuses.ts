import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vipApi } from '../../apis/vip.api';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  AssignTierPayload,
  AwardPointsPayload,
  AdjustPointsPayload,
} from '../../types/vip.types';

// ============================================
// Client VIP Status Hook
// ============================================

export const useClientVIPStatuses = (filters?: {
  tier?: number;
  status?: string;
  search?: string;
}) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: clientStatuses = [],
    isLoading: isLoadingClientStatuses,
    error: clientStatusesError,
    refetch: refetchClientStatuses,
  } = useQuery({
    queryKey: ['vip-client-statuses', filters],
    queryFn: () => vipApi.getClientStatuses(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes - more dynamic data
  });

  const assignTierMutation = useMutation({
    mutationFn: ({ clientStatusId, data }: { clientStatusId: number; data: AssignTierPayload }) =>
      vipApi.assignTier(clientStatusId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-client-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['vip-tiers'] }); // Update members_count
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
    clientStatuses,
    isLoadingClientStatuses,
    clientStatusesError,
    refetchClientStatuses,
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
