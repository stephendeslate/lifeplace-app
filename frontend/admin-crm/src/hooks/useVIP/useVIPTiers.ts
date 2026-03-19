import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { vipApi, type VIPTierQueryParams } from '../../apis/vip.api';
import { useToastActions } from '../../contexts/ToastContext';
import type { CreateVIPTierData, UpdateVIPTierData } from '../../types/vip.types';

// ============================================
// VIP Tiers Hook
// ============================================

export const useVIPTiers = (params?: VIPTierQueryParams) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: paginatedData,
    isLoading: isLoadingTiers,
    error: tiersError,
    refetch: refetchTiers,
  } = useQuery({
    queryKey: ['vip-tiers', params],
    queryFn: () => vipApi.getTiers(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const tiers = paginatedData?.results || [];
  const totalCount = paginatedData?.count || 0;
  const pageCount = paginatedData?.page_count || 1;

  const { data: activeTiers = [], isLoading: isLoadingActiveTiers } = useQuery({
    queryKey: ['vip-tiers-active'],
    queryFn: vipApi.getActiveTiers,
    staleTime: 5 * 60 * 1000,
  });

  const createTierMutation = useMutation({
    mutationFn: vipApi.createTier,
    onSuccess: (newTier) => {
      queryClient.invalidateQueries({ queryKey: ['vip-tiers'] });
      showSuccess('Tier Created', `${newTier.name} tier has been created.`);
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create tier'
          : 'Failed to create tier';
      showError('Create Failed', message);
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVIPTierData }) =>
      vipApi.updateTier(id, data),
    onSuccess: (updatedTier) => {
      queryClient.invalidateQueries({ queryKey: ['vip-tiers'] });
      showSuccess('Tier Updated', `${updatedTier.name} tier has been updated.`);
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update tier'
          : 'Failed to update tier';
      showError('Update Failed', message);
    },
  });

  const deleteTierMutation = useMutation({
    mutationFn: vipApi.deleteTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-tiers'] });
      showSuccess('Tier Deleted', 'Tier has been deleted.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete tier'
          : 'Failed to delete tier';
      showError('Delete Failed', message);
    },
  });

  return {
    tiers,
    totalCount,
    pageCount,
    activeTiers,
    isLoadingTiers,
    isLoadingActiveTiers,
    tiersError,
    refetchTiers,
    createTier: (data: CreateVIPTierData) => createTierMutation.mutateAsync(data),
    updateTier: (id: number, data: UpdateVIPTierData) =>
      updateTierMutation.mutateAsync({ id, data }),
    deleteTier: (id: number) => deleteTierMutation.mutateAsync(id),
    isCreatingTier: createTierMutation.isPending,
    isUpdatingTier: updateTierMutation.isPending,
    isDeletingTier: deleteTierMutation.isPending,
  };
};
