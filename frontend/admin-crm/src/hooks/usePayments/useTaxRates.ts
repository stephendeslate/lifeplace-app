// Tax Rates Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../apis/payments.api';
import { useToastActions } from '../../contexts/ToastContext';
import type { TaxRate, CreateTaxRateData, UpdateTaxRateData } from '../../types/payments';
import { QUERY_KEYS } from './query-keys';

export const useTaxRates = () => {
  return useQuery({
    queryKey: QUERY_KEYS.taxRates,
    queryFn: paymentsApi.getTaxRates,
  });
};

export const useTaxRate = (id: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.taxRate(id),
    queryFn: () => paymentsApi.getTaxRate(id),
    enabled: !!id,
  });
};

export const useCreateTaxRate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateTaxRateData) => paymentsApi.createTaxRate(data),
    onSuccess: (newTaxRate: TaxRate) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taxRates });
      showSuccess(
        'Tax Rate Created',
        `Tax rate "${newTaxRate.name}" has been created successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create tax rate'
          : 'Failed to create tax rate';
      showError('Creation Failed', message);
    },
  });
};

export const useUpdateTaxRate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaxRateData }) =>
      paymentsApi.updateTaxRate(id, data),
    onSuccess: (updatedTaxRate: TaxRate) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taxRates });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taxRate(updatedTaxRate.id) });
      showSuccess(
        'Tax Rate Updated',
        `Tax rate "${updatedTaxRate.name}" has been updated successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update tax rate'
          : 'Failed to update tax rate';
      showError('Update Failed', message);
    },
  });
};

export const useDeleteTaxRate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => paymentsApi.deleteTaxRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taxRates });
      showSuccess('Tax Rate Deleted', 'Tax rate has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete tax rate'
          : 'Failed to delete tax rate';
      showError('Delete Failed', message);
    },
  });
};
