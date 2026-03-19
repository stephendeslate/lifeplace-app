// Payments CRUD Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../apis/payments.api';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  CreatePaymentData,
  UpdatePaymentData,
  ProcessPaymentData,
  PaymentFilters,
} from '../../types/payments';
import type { PaginationParams } from '../../types/common.types';
export const usePayments = (filters?: PaymentFilters & PaginationParams) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries with pagination
  const {
    data: paymentsData,
    isLoading: isLoadingPayments,
    error: paymentsError,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ['payments', filters],
    queryFn: () => paymentsApi.getPayments(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const usePayment = (id: number) => {
    return useQuery({
      queryKey: ['payment', id],
      queryFn: () => paymentsApi.getPayment(id),
      enabled: !!id,
      staleTime: 1 * 60 * 1000, // 1 minute
    });
  };

  // Mutations
  const createPaymentMutation = useMutation({
    mutationFn: (data: CreatePaymentData) => paymentsApi.createPayment(data),
    onSuccess: (newPayment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showSuccess(
        'Payment Created',
        `Payment ${newPayment.payment_number} has been created successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create payment'
          : 'Failed to create payment';
      showError('Create Failed', message);
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePaymentData }) =>
      paymentsApi.updatePayment(id, data),
    onSuccess: (updatedPayment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', updatedPayment.id] });
      showSuccess(
        'Payment Updated',
        `Payment ${updatedPayment.payment_number} has been updated successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update payment'
          : 'Failed to update payment';
      showError('Update Failed', message);
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      showSuccess('Payment Deleted', 'Payment has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete payment'
          : 'Failed to delete payment';
      showError('Delete Failed', message);
    },
  });

  const processPaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProcessPaymentData }) =>
      paymentsApi.processPayment(id, data),
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] });
      if (transaction.status === 'COMPLETED') {
        showSuccess('Payment Processed', 'Payment has been processed successfully.');
      } else {
        showError('Payment Failed', 'Payment processing failed. Please try again.');
      }
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to process payment'
          : 'Failed to process payment';
      showError('Processing Failed', message);
    },
  });

  const sendReceiptMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.sendReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-notifications'] });
      showSuccess('Receipt Sent', 'Receipt has been sent to the client successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to send receipt'
          : 'Failed to send receipt';
      showError('Send Failed', message);
    },
  });

  return {
    // Paginated data
    payments: paymentsData?.results || [],
    totalPayments: paymentsData?.count || 0,
    currentPage: paymentsData?.current_page || 1,
    pageCount: paymentsData?.page_count || 1,
    pageSize: paymentsData?.page_size || 25,
    hasNext: !!paymentsData?.next,
    hasPrevious: !!paymentsData?.previous,

    // Loading states
    isLoadingPayments,
    isCreatingPayment: createPaymentMutation.isPending,
    isUpdatingPayment: updatePaymentMutation.isPending,
    isDeletingPayment: deletePaymentMutation.isPending,
    isProcessingPayment: processPaymentMutation.isPending,
    isSendingReceipt: sendReceiptMutation.isPending,

    // Error states
    paymentsError,
    createError: createPaymentMutation.error,
    updateError: updatePaymentMutation.error,
    deleteError: deletePaymentMutation.error,
    processError: processPaymentMutation.error,
    sendReceiptError: sendReceiptMutation.error,

    // Actions
    createPayment: createPaymentMutation.mutate,
    updatePayment: updatePaymentMutation.mutate,
    deletePayment: deletePaymentMutation.mutate,
    processPayment: processPaymentMutation.mutate,
    sendReceipt: sendReceiptMutation.mutate,
    refetchPayments,

    // Hooks for specific queries
    usePayment,
  };
};
