import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vipApi } from '../../apis/vip.api';
import { useToastActions } from '../../contexts/ToastContext';
import type { UpdateVIPSettingsData } from '../../types/vip.types';

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
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update settings'
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
