// Payment Settings & Payment Methods Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../apis/payments.api';
import { useToastActions } from '../../contexts/ToastContext';
import type { UpdatePaymentSettingsData } from '../../types/payments';
import { QUERY_KEYS } from './query-keys';

export const usePaymentSettings = () => {
  return useQuery({
    queryKey: QUERY_KEYS.paymentSettings,
    queryFn: paymentsApi.getPaymentSettings,
    staleTime: 10 * 60 * 1000, // 10 minutes - settings don't change frequently
  });
};

export const useUpdatePaymentSettings = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePaymentSettingsData }) =>
      paymentsApi.updatePaymentSettings(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentSettings });
      showSuccess('Settings Updated', 'Payment settings have been updated successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update payment settings'
          : 'Failed to update payment settings';
      showError('Update Failed', message);
    },
  });
};

export const usePartialUpdatePaymentSettings = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePaymentSettingsData }) =>
      paymentsApi.partialUpdatePaymentSettings(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentSettings });
      showSuccess('Settings Updated', 'Payment settings have been updated successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update payment settings'
          : 'Failed to update payment settings';
      showError('Update Failed', message);
    },
  });
};

export const usePaymentMethods = () => {
  return useQuery({
    queryKey: QUERY_KEYS.paymentMethods,
    queryFn: paymentsApi.getPaymentMethods,
  });
};

export const usePaymentMethodsForUser = (userId: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.paymentMethodsForUser(userId),
    queryFn: () => paymentsApi.getPaymentMethodsForUser(userId),
    enabled: !!userId,
  });
};
