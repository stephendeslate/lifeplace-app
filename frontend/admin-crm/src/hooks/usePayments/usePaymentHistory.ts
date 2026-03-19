// Payment Transactions, Notifications & Refunds Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../apis/payments.api';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  CreateRefundData,
  PaymentTransactionFilters,
  PaymentNotificationFilters,
  RefundFilters,
} from '../../types/payments';
import { QUERY_KEYS } from './query-keys';

export const usePaymentTransactions = (filters?: PaymentTransactionFilters) => {
  // Queries
  const {
    data: transactions = [],
    isLoading: isLoadingTransactions,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: QUERY_KEYS.paymentTransactions(filters),
    queryFn: () => paymentsApi.getPaymentTransactions(filters),
    staleTime: 1 * 60 * 1000,
  });

  const usePaymentTransaction = (id: number) => {
    return useQuery({
      queryKey: QUERY_KEYS.paymentTransaction(id),
      queryFn: () => paymentsApi.getPaymentTransaction(id),
      enabled: !!id,
    });
  };

  return {
    // Data
    transactions,

    // Loading states
    isLoadingTransactions,

    // Error states
    transactionsError,

    // Actions
    refetchTransactions,

    // Hooks for specific queries
    usePaymentTransaction,
  };
};

export const usePaymentNotifications = (filters?: PaymentNotificationFilters) => {
  // Queries
  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: QUERY_KEYS.paymentNotifications(filters),
    queryFn: () => paymentsApi.getPaymentNotifications(filters),
    staleTime: 2 * 60 * 1000,
  });

  const usePaymentNotification = (id: number) => {
    return useQuery({
      queryKey: QUERY_KEYS.paymentNotification(id),
      queryFn: () => paymentsApi.getPaymentNotification(id),
      enabled: !!id,
    });
  };

  return {
    // Data
    notifications,

    // Loading states
    isLoadingNotifications,

    // Error states
    notificationsError,

    // Actions
    refetchNotifications,

    // Hooks for specific queries
    usePaymentNotification,
  };
};

export const useRefunds = (filters?: RefundFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: refunds = [],
    isLoading: isLoadingRefunds,
    error: refundsError,
    refetch: refetchRefunds,
  } = useQuery({
    queryKey: QUERY_KEYS.refunds(filters),
    queryFn: () => paymentsApi.getRefunds(filters),
    staleTime: 2 * 60 * 1000,
  });

  const useRefund = (id: number) => {
    return useQuery({
      queryKey: QUERY_KEYS.refund(id),
      queryFn: () => paymentsApi.getRefund(id),
      enabled: !!id,
    });
  };

  // Mutations
  const createRefundMutation = useMutation({
    mutationFn: (data: CreateRefundData) => paymentsApi.createRefund(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
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
    // Data
    refunds,

    // Loading states
    isLoadingRefunds,
    isCreatingRefund: createRefundMutation.isPending,

    // Error states
    refundsError,
    createRefundError: createRefundMutation.error,

    // Actions
    createRefund: createRefundMutation.mutate,
    refetchRefunds,

    // Hooks for specific queries
    useRefund,
  };
};
