import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vipApi } from '../../apis/vip.api';
import { useToastActions } from '../../contexts/ToastContext';
import type { CreateVIPBenefitData, UpdateVIPBenefitData } from '../../types/vip.types';

// ============================================
// VIP Benefits Hook
// ============================================

export const useVIPBenefits = (filters?: {
  tier?: number;
  benefit_type?: string;
  application_mode?: string;
  is_active?: boolean;
}) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: benefits = [],
    isLoading: isLoadingBenefits,
    error: benefitsError,
    refetch: refetchBenefits,
  } = useQuery({
    queryKey: ['vip-benefits', filters],
    queryFn: () => vipApi.getBenefits(filters),
    staleTime: 5 * 60 * 1000,
  });

  const { data: benefitTypes = [], isLoading: isLoadingBenefitTypes } = useQuery({
    queryKey: ['vip-benefit-types'],
    queryFn: vipApi.getBenefitTypes,
    staleTime: 30 * 60 * 1000, // 30 minutes - these don't change often
  });

  const createBenefitMutation = useMutation({
    mutationFn: vipApi.createBenefit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-benefits'] });
      queryClient.invalidateQueries({ queryKey: ['vip-tiers'] }); // Update benefits_count
      showSuccess('Benefit Created', 'New benefit has been created.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create benefit'
          : 'Failed to create benefit';
      showError('Create Failed', message);
    },
  });

  const updateBenefitMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVIPBenefitData }) =>
      vipApi.updateBenefit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-benefits'] });
      showSuccess('Benefit Updated', 'Benefit has been updated.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update benefit'
          : 'Failed to update benefit';
      showError('Update Failed', message);
    },
  });

  const deleteBenefitMutation = useMutation({
    mutationFn: vipApi.deleteBenefit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-benefits'] });
      queryClient.invalidateQueries({ queryKey: ['vip-tiers'] }); // Update benefits_count
      showSuccess('Benefit Deleted', 'Benefit has been deleted.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete benefit'
          : 'Failed to delete benefit';
      showError('Delete Failed', message);
    },
  });

  return {
    benefits,
    benefitTypes,
    isLoadingBenefits,
    isLoadingBenefitTypes,
    benefitsError,
    refetchBenefits,
    createBenefit: (data: CreateVIPBenefitData) => createBenefitMutation.mutateAsync(data),
    updateBenefit: (id: number, data: UpdateVIPBenefitData) =>
      updateBenefitMutation.mutateAsync({ id, data }),
    deleteBenefit: (id: number) => deleteBenefitMutation.mutateAsync(id),
    isCreatingBenefit: createBenefitMutation.isPending,
    isUpdatingBenefit: updateBenefitMutation.isPending,
    isDeletingBenefit: deleteBenefitMutation.isPending,
  };
};
