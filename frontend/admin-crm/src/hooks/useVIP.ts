// frontend/admin-crm/src/hooks/useVIP.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vipApi } from '../apis/vip.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  UpdateVIPSettingsData,
  CreateVIPTierData,
  UpdateVIPTierData,
  CreateVIPBenefitData,
  UpdateVIPBenefitData,
  AssignTierPayload,
  AwardPointsPayload,
  AdjustPointsPayload,
} from '../types/vip.types';

// ============================================
// VIP Settings Hook
// ============================================

export const useVIPSettings = () => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading: isLoadingSettings,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ['vip-settings'],
    queryFn: vipApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: vipApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-settings'] });
      showSuccess('Settings Updated', 'VIP program settings have been updated.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update settings'
        : 'Failed to update settings';
      showError('Update Failed', message);
    },
  });

  return {
    settings,
    isLoadingSettings,
    settingsError,
    refetchSettings,
    updateSettings: (data: UpdateVIPSettingsData) => updateSettingsMutation.mutateAsync(data),
    isUpdatingSettings: updateSettingsMutation.isPending,
  };
};

// ============================================
// VIP Tiers Hook
// ============================================

export const useVIPTiers = (filters?: { is_active?: boolean }) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: tiers = [],
    isLoading: isLoadingTiers,
    error: tiersError,
    refetch: refetchTiers,
  } = useQuery({
    queryKey: ['vip-tiers', filters],
    queryFn: () => vipApi.getTiers(filters),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: activeTiers = [],
    isLoading: isLoadingActiveTiers,
  } = useQuery({
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
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to create tier'
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
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update tier'
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
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to delete tier'
        : 'Failed to delete tier';
      showError('Delete Failed', message);
    },
  });

  return {
    tiers,
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

  const {
    data: benefitTypes = [],
    isLoading: isLoadingBenefitTypes,
  } = useQuery({
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
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to create benefit'
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
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update benefit'
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
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to delete benefit'
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
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to assign tier'
        : 'Failed to assign tier';
      showError('Assignment Failed', message);
    },
  });

  const awardPointsMutation = useMutation({
    mutationFn: ({ clientStatusId, data }: { clientStatusId: number; data: AwardPointsPayload }) =>
      vipApi.awardPoints(clientStatusId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['vip-client-statuses'] });
      showSuccess('Points Awarded', `${response.transaction.points} points awarded. New balance: ${response.new_balance}`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to award points'
        : 'Failed to award points';
      showError('Award Failed', message);
    },
  });

  const adjustPointsMutation = useMutation({
    mutationFn: ({ clientStatusId, data }: { clientStatusId: number; data: AdjustPointsPayload }) =>
      vipApi.adjustPoints(clientStatusId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['vip-client-statuses'] });
      showSuccess('Points Adjusted', `Points adjusted by ${response.transaction.points}. New balance: ${response.new_balance}`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to adjust points'
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

  const {
    data: tierHistory = [],
    isLoading: isLoadingTierHistory,
  } = useQuery({
    queryKey: ['vip-client-tier-history', clientStatusId],
    queryFn: () => vipApi.getClientTierHistory(clientStatusId),
    enabled: !!clientStatusId,
  });

  const {
    data: pointTransactions = [],
    isLoading: isLoadingPointTransactions,
  } = useQuery({
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
