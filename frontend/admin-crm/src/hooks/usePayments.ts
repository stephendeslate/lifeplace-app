// frontend/admin-crm/src/hooks/usePayments.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../apis/payments.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  PaymentGateway,
  CreatePaymentGatewayData,
  UpdatePaymentGatewayData,
  TaxRate,
  CreateTaxRateData,
  UpdateTaxRateData,
  CreatePaymentData,
  UpdatePaymentData,
  CreatePaymentPlanData,
  UpdatePaymentPlanData,
  CreatePaymentInstallmentData,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateRefundData,
  UpdatePaymentSettingsData,
  PaymentFilters,
  PaymentPlanFilters,
  PaymentInstallmentFilters,
  InvoiceFilters,
  PaymentTransactionFilters,
  PaymentNotificationFilters,
  RefundFilters,
  ProcessPaymentData,
} from '../types/payments';
import type { PaginationParams } from '../types/common.types';

// Query Keys
const QUERY_KEYS = {
  paymentGateways: ['payment-gateways'] as const,
  paymentGateway: (id: number) => ['payment-gateway', id] as const,
  taxRates: ['tax-rates'] as const,
  taxRate: (id: number) => ['tax-rate', id] as const,
  paymentSettings: ['payment-settings'] as const,
  paymentMethods: ['payment-methods'] as const,
  paymentMethodsForUser: (userId: number) => ['payment-methods', 'user', userId] as const,
  payments: (filters?: PaymentFilters) => ['payments', filters] as const,
  payment: (id: number) => ['payment', id] as const,
  paymentPlans: (filters?: PaymentPlanFilters) => ['payment-plans', filters] as const,
  paymentPlan: (id: number) => ['payment-plan', id] as const,
  paymentInstallments: (filters?: PaymentInstallmentFilters) =>
    ['payment-installments', filters] as const,
  paymentInstallment: (id: number) => ['payment-installment', id] as const,
  invoices: (filters?: InvoiceFilters) => ['invoices', filters] as const,
  invoice: (id: number) => ['invoice', id] as const,
  paymentTransactions: (filters?: PaymentTransactionFilters) =>
    ['payment-transactions', filters] as const,
  paymentTransaction: (id: number) => ['payment-transaction', id] as const,
  paymentNotifications: (filters?: PaymentNotificationFilters) =>
    ['payment-notifications', filters] as const,
  paymentNotification: (id: number) => ['payment-notification', id] as const,
  refunds: (filters?: RefundFilters) => ['refunds', filters] as const,
  refund: (id: number) => ['refund', id] as const,
};

/**
 * Payment Gateways Hooks
 */
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

/**
 * Tax Rates Hooks
 */
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

/**
 * Payment Settings Hooks
 */
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

/**
 * Payment Methods Hooks
 */
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

/**
 * Payments Hooks
 */
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

/**
 * Payment Plans Hooks
 */
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

/**
 * Payment Installments Hooks
 */
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

/**
 * Invoices Hooks
 */
export const useInvoices = (filters?: InvoiceFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: QUERY_KEYS.invoices(filters),
    queryFn: () => paymentsApi.getInvoices(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useInvoice = (id: number) => {
    return useQuery({
      queryKey: QUERY_KEYS.invoice(id),
      queryFn: () => paymentsApi.getInvoice(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    });
  };

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: (data: CreateInvoiceData) => paymentsApi.createInvoice(data),
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showSuccess(
        'Invoice Created',
        `Invoice ${newInvoice.invoice_id} has been created successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create invoice'
          : 'Failed to create invoice';
      showError('Create Failed', message);
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateInvoiceData }) =>
      paymentsApi.updateInvoice(id, data),
    onSuccess: (updatedInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoice(updatedInvoice.id) });
      showSuccess(
        'Invoice Updated',
        `Invoice ${updatedInvoice.invoice_id} has been updated successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update invoice'
          : 'Failed to update invoice';
      showError('Update Failed', message);
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showSuccess('Invoice Deleted', 'Invoice has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete invoice'
          : 'Failed to delete invoice';
      showError('Delete Failed', message);
    },
  });

  return {
    // Data
    invoices,

    // Loading states
    isLoadingInvoices,
    isCreatingInvoice: createInvoiceMutation.isPending,
    isUpdatingInvoice: updateInvoiceMutation.isPending,
    isDeletingInvoice: deleteInvoiceMutation.isPending,

    // Error states
    invoicesError,
    createInvoiceError: createInvoiceMutation.error,
    updateInvoiceError: updateInvoiceMutation.error,
    deleteInvoiceError: deleteInvoiceMutation.error,

    // Actions
    createInvoice: createInvoiceMutation.mutate,
    updateInvoice: updateInvoiceMutation.mutate,
    deleteInvoice: deleteInvoiceMutation.mutate,
    refetchInvoices,

    // Hooks for specific queries
    useInvoice,
  };
};

export const useSendInvoice = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (invoiceId: number) => paymentsApi.sendInvoice(invoiceId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      showSuccess('Invoice Sent', data.detail);
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to send invoice'
          : 'Failed to send invoice';
      showError('Send Failed', message);
    },
  });
};

export const useDownloadInvoicePdf = () => {
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const blob = await paymentsApi.downloadInvoicePdf(invoiceId);
      return { blob, invoiceId };
    },
    onSuccess: ({ blob, invoiceId }) => {
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Download Started', 'Invoice PDF download has started.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to download invoice PDF'
          : 'Failed to download invoice PDF';
      showError('Download Failed', message);
    },
  });
};

/**
 * Payment Transactions Hooks
 */
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

/**
 * Payment Notifications Hooks
 */
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

/**
 * Refunds Hooks
 */
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
