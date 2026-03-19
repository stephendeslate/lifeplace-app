// Payment Gateways Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../apis/payments.api';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  PaymentGateway,
  CreatePaymentGatewayData,
  UpdatePaymentGatewayData,
} from '../../types/payments';
import { QUERY_KEYS } from './query-keys';

export const usePaymentGateways = () => {
  return useQuery({
    queryKey: QUERY_KEYS.paymentGateways,
    queryFn: paymentsApi.getPaymentGateways,
  });
};

export const useGatewayHealth = () => {
  return useQuery({
    queryKey: [...QUERY_KEYS.paymentGateways, 'health'],
    queryFn: paymentsApi.getGatewayHealth,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
  });
};

export const usePaymentGateway = (id: number) => {
  return useQuery({
    queryKey: QUERY_KEYS.paymentGateway(id),
    queryFn: () => paymentsApi.getPaymentGateway(id),
    enabled: !!id,
  });
};

export const useCreatePaymentGateway = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreatePaymentGatewayData) => paymentsApi.createPaymentGateway(data),
    onSuccess: (newGateway: PaymentGateway) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentGateways });
      showSuccess(
        'Gateway Created',
        `Payment gateway "${newGateway.name}" has been created successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create payment gateway'
          : 'Failed to create payment gateway';
      showError('Creation Failed', message);
    },
  });
};

export const useInvoicesForClient = (clientId: number) => {
  return useQuery({
    queryKey: ['invoices', 'forClient', clientId],
    queryFn: () => paymentsApi.getInvoicesForClient(clientId),
    enabled: !!clientId,
  });
};

export const useUpdatePaymentGateway = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePaymentGatewayData }) =>
      paymentsApi.updatePaymentGateway(id, data),
    onSuccess: (updatedGateway: PaymentGateway) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentGateways });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentGateway(updatedGateway.id) });
      showSuccess(
        'Gateway Updated',
        `Payment gateway "${updatedGateway.name}" has been updated successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update payment gateway'
          : 'Failed to update payment gateway';
      showError('Update Failed', message);
    },
  });
};

export const useDeletePaymentGateway = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => paymentsApi.deletePaymentGateway(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.paymentGateways });
      showSuccess('Gateway Deleted', 'Payment gateway has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete payment gateway'
          : 'Failed to delete payment gateway';
      showError('Delete Failed', message);
    },
  });
};
