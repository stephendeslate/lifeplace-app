// frontend/client-portal/src/hooks/useFinancial.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';
import FinancialApi from '../apis/financial.api';
import type {
  PaymentFilters,
  InvoiceFilters,
  PaymentMethodFormData,
} from '../types/financial';

// Query keys for consistent caching
export const financialKeys = {
  all: ['financial'] as const,
  payments: () => [...financialKeys.all, 'payments'] as const,
  payment: (id: number) => [...financialKeys.payments(), id] as const,
  paymentSummary: () => [...financialKeys.payments(), 'summary'] as const,
  invoices: () => [...financialKeys.all, 'invoices'] as const,
  invoice: (id: number) => [...financialKeys.invoices(), id] as const,
  paymentPlans: () => [...financialKeys.all, 'payment-plans'] as const,
  paymentPlan: (id: number) => [...financialKeys.paymentPlans(), id] as const,
  paymentMethods: () => [...financialKeys.all, 'payment-methods'] as const,
  paymentMethod: (id: number) => [...financialKeys.paymentMethods(), id] as const,
  refunds: () => [...financialKeys.all, 'refunds'] as const,
  refund: (id: number) => [...financialKeys.refunds(), id] as const,
};

// ==================== PAYMENTS ====================

export const usePayments = (filters?: PaymentFilters, page?: number, pageSize?: number) => {
  return useQuery({
    queryKey: [...financialKeys.payments(), filters, page, pageSize],
    queryFn: () => FinancialApi.getPayments(filters, page, pageSize),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePayment = (paymentId: number) => {
  return useQuery({
    queryKey: financialKeys.payment(paymentId),
    queryFn: () => FinancialApi.getPayment(paymentId),
    enabled: !!paymentId,
  });
};

export const usePaymentSummary = () => {
  return useQuery({
    queryKey: financialKeys.paymentSummary(),
    queryFn: () => FinancialApi.getPaymentSummary(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useDownloadPaymentReceipt = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (paymentId: number) => {
      const blob = await FinancialApi.downloadPaymentReceipt(paymentId);
      return { blob, paymentId };
    },
    onSuccess: ({ blob, paymentId }) => {
      FinancialApi.downloadFile(blob, `receipt-payment-${paymentId}.pdf`);
      showToast({ type: 'success', title: 'Receipt downloaded successfully' });
    },
    onError: (error) => {
      const message = FinancialApi.handleError(error);
      showToast({ type: 'error', title: message });
    },
  });
};

// ==================== INVOICES ====================

export const useInvoices = (filters?: InvoiceFilters, page?: number, pageSize?: number) => {
  return useQuery({
    queryKey: [...financialKeys.invoices(), filters, page, pageSize],
    queryFn: () => FinancialApi.getInvoices(filters, page, pageSize),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useInvoice = (invoiceId: number) => {
  return useQuery({
    queryKey: financialKeys.invoice(invoiceId),
    queryFn: () => FinancialApi.getInvoice(invoiceId),
    enabled: !!invoiceId,
  });
};

export const useDownloadInvoicePdf = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const blob = await FinancialApi.downloadInvoicePdf(invoiceId);
      return { blob, invoiceId };
    },
    onSuccess: ({ blob, invoiceId }) => {
      FinancialApi.downloadFile(blob, `invoice-${invoiceId}.pdf`);
      showToast({ type: 'success', title: 'Invoice downloaded successfully' });
    },
    onError: (error) => {
      const message = FinancialApi.handleError(error);
      showToast({ type: 'error', title: message });
    },
  });
};

// ==================== PAYMENT PLANS ====================
// ⚠️ WORK IN PROGRESS - Payment Plan feature is being redesigned

export const usePaymentPlans = () => {
  return useQuery({
    queryKey: financialKeys.paymentPlans(),
    queryFn: async () => {
      if (import.meta.env.DEV) console.warn('⚠️ WIP: Payment plans hook is currently disabled');
      const data = await FinancialApi.getPaymentPlans();
      return data.results || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: false, // Disabled - WIP
  });
};

export const usePaymentPlan = (planId: number) => {
  return useQuery({
    queryKey: financialKeys.paymentPlan(planId),
    queryFn: () => {
      if (import.meta.env.DEV)
        console.warn('⚠️ WIP: Payment plan details hook is currently disabled');
      return FinancialApi.getPaymentPlan(planId);
    },
    enabled: false, // Disabled - WIP
  });
};

// ==================== PAYMENT METHODS ====================

export const usePaymentMethods = () => {
  return useQuery({
    queryKey: financialKeys.paymentMethods(),
    queryFn: () => FinancialApi.getPaymentMethods(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const usePaymentMethod = (methodId: number) => {
  return useQuery({
    queryKey: financialKeys.paymentMethod(methodId),
    queryFn: () => FinancialApi.getPaymentMethod(methodId),
    enabled: !!methodId,
  });
};

export const useCreatePaymentMethod = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (methodData: PaymentMethodFormData) => FinancialApi.createPaymentMethod(methodData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: financialKeys.paymentMethods(),
      });
      showToast({
        type: 'success',
        title: 'Payment method created successfully',
      });
    },
    onError: (error) => {
      const message = FinancialApi.handleError(error);
      showToast({ type: 'error', title: message });
    },
  });
};

export const useUpdatePaymentMethod = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      methodId,
      methodData,
    }: {
      methodId: number;
      methodData: Partial<PaymentMethodFormData>;
    }) => FinancialApi.updatePaymentMethod(methodId, methodData),
    onSuccess: (updatedMethod) => {
      queryClient.invalidateQueries({
        queryKey: financialKeys.paymentMethods(),
      });
      queryClient.invalidateQueries({
        queryKey: financialKeys.paymentMethod(updatedMethod.id),
      });
      showToast({
        type: 'success',
        title: 'Payment method updated successfully',
      });
    },
    onError: (error) => {
      const message = FinancialApi.handleError(error);
      showToast({ type: 'error', title: message });
    },
  });
};

export const useDeletePaymentMethod = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (methodId: number) => FinancialApi.deletePaymentMethod(methodId),
    onSuccess: (_, methodId) => {
      queryClient.invalidateQueries({
        queryKey: financialKeys.paymentMethods(),
      });
      queryClient.removeQueries({
        queryKey: financialKeys.paymentMethod(methodId),
      });
      showToast({
        type: 'success',
        title: 'Payment method deleted successfully',
      });
    },
    onError: (error) => {
      const message = FinancialApi.handleError(error);
      showToast({ type: 'error', title: message });
    },
  });
};

// ==================== REFUNDS ====================

export const useRefunds = (page?: number, pageSize?: number) => {
  return useQuery({
    queryKey: [...financialKeys.refunds(), page, pageSize],
    queryFn: () => FinancialApi.getRefunds(page, pageSize),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useRefund = (refundId: number) => {
  return useQuery({
    queryKey: financialKeys.refund(refundId),
    queryFn: () => FinancialApi.getRefund(refundId),
    enabled: !!refundId,
  });
};

// ==================== COMBINED HOOKS ====================

/**
 * Get all financial overview data in one hook
 */
export const useFinancialOverview = () => {
  const paymentsQuery = usePayments(undefined, 1, 5); // Recent payments
  const invoicesQuery = useInvoices(undefined, 1, 5); // Recent invoices
  const summaryQuery = usePaymentSummary();
  const refundsQuery = useRefunds();

  const isLoading =
    paymentsQuery.isLoading ||
    invoicesQuery.isLoading ||
    summaryQuery.isLoading ||
    refundsQuery.isLoading;

  const error =
    paymentsQuery.error || invoicesQuery.error || summaryQuery.error || refundsQuery.error;

  // Debug logging to help identify data structure issues
  const payments = Array.isArray(paymentsQuery.data?.results) ? paymentsQuery.data.results : [];
  const invoices = Array.isArray(invoicesQuery.data?.results) ? invoicesQuery.data.results : [];
  const refunds = Array.isArray(refundsQuery.data?.results) ? refundsQuery.data.results : [];

  // Log non-array data for debugging
  if (import.meta.env.DEV) {
    if (paymentsQuery.data?.results && !Array.isArray(paymentsQuery.data.results)) {
      console.warn('Payment data is not an array:', paymentsQuery.data);
    }
    if (invoicesQuery.data?.results && !Array.isArray(invoicesQuery.data.results)) {
      console.warn('Invoice data is not an array:', invoicesQuery.data);
    }
    if (refundsQuery.data?.results && !Array.isArray(refundsQuery.data.results)) {
      console.warn('Refunds data is not an array:', refundsQuery.data);
    }
  }

  return {
    payments,
    invoices,
    summary: summaryQuery.data,
    refunds,
    isLoading,
    error: error ? FinancialApi.handleError(error) : null,
    refetch: () => {
      paymentsQuery.refetch();
      invoicesQuery.refetch();
      summaryQuery.refetch();
      refundsQuery.refetch();
    },
  };
};

/**
 * Get financial statistics and analytics
 */
export const useFinancialAnalytics = () => {
  const paymentsQuery = usePayments();
  const summaryQuery = usePaymentSummary();

  const analytics = {
    // Payment status breakdown
    paymentStatusBreakdown: summaryQuery.data
      ? [
          {
            label: 'Paid',
            value: parseFloat(summaryQuery.data.total_paid),
            color: '#4caf50',
          },
          {
            label: 'Pending',
            value: parseFloat(summaryQuery.data.total_pending),
            color: '#ff9800',
          },
          {
            label: 'Overdue',
            value: parseFloat(summaryQuery.data.total_overdue),
            color: '#f44336',
          },
        ]
      : [],
  };

  return {
    analytics,
    isLoading: paymentsQuery.isLoading || summaryQuery.isLoading,
  };
};

export default {
  usePayments,
  usePayment,
  usePaymentSummary,
  useDownloadPaymentReceipt,
  useInvoices,
  useInvoice,
  useDownloadInvoicePdf,
  usePaymentPlans,
  usePaymentPlan,
  usePaymentMethods,
  usePaymentMethod,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
  useRefunds,
  useRefund,
  useFinancialOverview,
  useFinancialAnalytics,
};
