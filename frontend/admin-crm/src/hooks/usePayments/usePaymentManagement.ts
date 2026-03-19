// Combined Payment Management Hook

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../apis/payments.api';
import { useToastActions } from '../../contexts/ToastContext';
import type { UpdatePaymentData, ProcessPaymentData, CreateRefundData } from '../../types/payments';
import { QUERY_KEYS } from './query-keys';

/**
 * Combined Payment Management Hook
 *
 * This hook provides a comprehensive interface for managing all payment-related
 * operations from a single payment profile view.
 */
export const usePaymentManagement = (paymentId: number) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Main payment data
  const paymentQuery = useQuery({
    queryKey: QUERY_KEYS.payment(paymentId),
    queryFn: () => paymentsApi.getPayment(paymentId),
    enabled: !!paymentId,
    staleTime: 1 * 60 * 1000,
  });

  // Related data queries
  const transactionsQuery = useQuery({
    queryKey: QUERY_KEYS.paymentTransactions({ payment: paymentId }),
    queryFn: () => paymentsApi.getPaymentTransactions({ payment: paymentId }),
    enabled: !!paymentId,
    staleTime: 1 * 60 * 1000,
  });

  const notificationsQuery = useQuery({
    queryKey: QUERY_KEYS.paymentNotifications({ payment: paymentId }),
    queryFn: () => paymentsApi.getPaymentNotifications({ payment: paymentId }),
    enabled: !!paymentId,
    staleTime: 2 * 60 * 1000,
  });

  const refundsQuery = useQuery({
    queryKey: QUERY_KEYS.refunds({ payment: paymentId }),
    queryFn: () => paymentsApi.getRefunds({ payment: paymentId }),
    enabled: !!paymentId,
    staleTime: 2 * 60 * 1000,
  });

  // Payment plan data (if applicable)
  const paymentPlanQuery = useQuery({
    queryKey: QUERY_KEYS.paymentPlan(paymentQuery.data?.installment_details?.id || 0),
    queryFn: () => paymentsApi.getPaymentPlan(paymentQuery.data?.installment_details?.id || 0),
    enabled: !!paymentQuery.data?.installment_details?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Invoice data (if applicable)
  const invoiceQuery = useQuery({
    queryKey: QUERY_KEYS.invoice(paymentQuery.data?.invoice || 0),
    queryFn: () => paymentsApi.getInvoice(paymentQuery.data?.invoice || 0),
    enabled: !!paymentQuery.data?.invoice,
    staleTime: 2 * 60 * 1000,
  });

  // Mutations
  const updatePaymentMutation = useMutation({
    mutationFn: (data: UpdatePaymentData) => paymentsApi.updatePayment(paymentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payment(paymentId) });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      showSuccess('Payment Updated', 'Payment has been updated successfully.');
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

  const processPaymentMutation = useMutation({
    mutationFn: (data: ProcessPaymentData) => paymentsApi.processPayment(paymentId, data),
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payment(paymentId) });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.paymentTransactions({ payment: paymentId }),
      });
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
    mutationFn: () => paymentsApi.sendReceipt(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payment(paymentId) });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.paymentNotifications({ payment: paymentId }),
      });
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

  const sendReminderMutation = useMutation({
    mutationFn: () => paymentsApi.sendReminder(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payment(paymentId) });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.paymentNotifications({ payment: paymentId }),
      });
      showSuccess('Reminder Sent', 'Payment reminder has been sent to the client successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to send reminder'
          : 'Failed to send reminder';
      showError('Send Failed', message);
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: () => paymentsApi.deletePayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payment(paymentId) });
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

  const createRefundMutation = useMutation({
    mutationFn: (data: CreateRefundData) => paymentsApi.createRefund(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.refunds({ payment: paymentId }) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payment(paymentId) });
      showSuccess('Refund Created', 'Refund has been processed successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create refund'
          : 'Failed to create refund';
      showError('Refund Failed', message);
    },
  });

  return {
    // Main data
    payment: paymentQuery.data,
    isLoadingPayment: paymentQuery.isLoading,
    paymentError: paymentQuery.error,

    // Related data
    transactions: transactionsQuery.data || [],
    isLoadingTransactions: transactionsQuery.isLoading,
    notifications: notificationsQuery.data || [],
    isLoadingNotifications: notificationsQuery.isLoading,
    refunds: refundsQuery.data || [],
    isLoadingRefunds: refundsQuery.isLoading,

    // Optional related data
    paymentPlan: paymentPlanQuery.data,
    isLoadingPaymentPlan: paymentPlanQuery.isLoading,
    invoice: invoiceQuery.data,
    isLoadingInvoice: invoiceQuery.isLoading,

    // Loading states for mutations
    isUpdatingPayment: updatePaymentMutation.isPending,
    isProcessingPayment: processPaymentMutation.isPending,
    isSendingReceipt: sendReceiptMutation.isPending,
    isSendingReminder: sendReminderMutation.isPending,
    isDeletingPayment: deletePaymentMutation.isPending,
    isCreatingRefund: createRefundMutation.isPending,

    // Actions
    updatePayment: updatePaymentMutation.mutate,
    processPayment: processPaymentMutation.mutate,
    sendReceipt: sendReceiptMutation.mutate,
    sendReminder: sendReminderMutation.mutate,
    deletePayment: deletePaymentMutation.mutate,
    createRefund: createRefundMutation.mutate,

    // Refetch functions
    refetchPayment: paymentQuery.refetch,
    refetchTransactions: transactionsQuery.refetch,
    refetchNotifications: notificationsQuery.refetch,
    refetchRefunds: refundsQuery.refetch,
  };
};
