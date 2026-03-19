// Payment Plans & Installments Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../apis/payments.api';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  CreatePaymentPlanData,
  UpdatePaymentPlanData,
  CreatePaymentInstallmentData,
  PaymentPlanFilters,
  PaymentInstallmentFilters,
} from '../../types/payments';
import { QUERY_KEYS } from './query-keys';

export const usePaymentPlans = (filters?: PaymentPlanFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: paymentPlans = [],
    isLoading: isLoadingPlans,
    error: plansError,
    refetch: refetchPlans,
  } = useQuery({
    queryKey: QUERY_KEYS.paymentPlans(filters),
    queryFn: () => paymentsApi.getPaymentPlans(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const usePaymentPlan = (id: number) => {
    return useQuery({
      queryKey: QUERY_KEYS.paymentPlan(id),
      queryFn: () => paymentsApi.getPaymentPlan(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    });
  };

  // Mutations
  const createPlanMutation = useMutation({
    mutationFn: (data: CreatePaymentPlanData) => paymentsApi.createPaymentPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      queryClient.invalidateQueries({ queryKey: ['payment-installments'] });
      showSuccess('Payment Plan Created', 'Payment plan has been created successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create payment plan'
          : 'Failed to create payment plan';
      showError('Create Failed', message);
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePaymentPlanData }) =>
      paymentsApi.updatePaymentPlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      showSuccess('Payment Plan Updated', 'Payment plan has been updated successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update payment plan'
          : 'Failed to update payment plan';
      showError('Update Failed', message);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.deletePaymentPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      queryClient.invalidateQueries({ queryKey: ['payment-installments'] });
      showSuccess('Payment Plan Deleted', 'Payment plan has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete payment plan'
          : 'Failed to delete payment plan';
      showError('Delete Failed', message);
    },
  });

  return {
    // Data
    paymentPlans,

    // Loading states
    isLoadingPlans,
    isCreatingPlan: createPlanMutation.isPending,
    isUpdatingPlan: updatePlanMutation.isPending,
    isDeletingPlan: deletePlanMutation.isPending,

    // Error states
    plansError,
    createPlanError: createPlanMutation.error,
    updatePlanError: updatePlanMutation.error,
    deletePlanError: deletePlanMutation.error,

    // Actions
    createPlan: createPlanMutation.mutate,
    updatePlan: updatePlanMutation.mutate,
    deletePlan: deletePlanMutation.mutate,
    refetchPlans,

    // Hooks for specific queries
    usePaymentPlan,
  };
};

export const usePaymentInstallments = (filters?: PaymentInstallmentFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: installments = [],
    isLoading: isLoadingInstallments,
    error: installmentsError,
    refetch: refetchInstallments,
  } = useQuery({
    queryKey: QUERY_KEYS.paymentInstallments(filters),
    queryFn: () => paymentsApi.getPaymentInstallments(filters),
    staleTime: 2 * 60 * 1000,
  });

  const usePaymentInstallment = (id: number) => {
    return useQuery({
      queryKey: QUERY_KEYS.paymentInstallment(id),
      queryFn: () => paymentsApi.getPaymentInstallment(id),
      enabled: !!id,
    });
  };

  // Mutations
  const createPaymentFromInstallmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreatePaymentInstallmentData }) =>
      paymentsApi.createPaymentFromInstallment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-installments'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      showSuccess('Payment Created', 'Payment has been created from installment.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create payment from installment'
          : 'Failed to create payment from installment';
      showError('Create Failed', message);
    },
  });

  return {
    // Data
    installments,

    // Loading states
    isLoadingInstallments,
    isCreatingPaymentFromInstallment: createPaymentFromInstallmentMutation.isPending,

    // Error states
    installmentsError,
    createPaymentFromInstallmentError: createPaymentFromInstallmentMutation.error,

    // Actions
    createPaymentFromInstallment: createPaymentFromInstallmentMutation.mutate,
    refetchInstallments,

    // Hooks for specific queries
    usePaymentInstallment,
  };
};
