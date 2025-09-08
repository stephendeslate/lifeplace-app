// frontend/client-portal/src/hooks/useFinancial.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';
import FinancialApi from '../apis/financial.api';
import type {
  PaymentFilters,
  InvoiceFilters,
  PaymentMethodFormData,
  InstallmentPaymentData,
} from '../types/financial.types';

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
  installments: () => [...financialKeys.all, 'installments'] as const,
  installment: (id: number) => [...financialKeys.installments(), id] as const,
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

export const usePaymentPlans = () => {
  return useQuery({
    queryKey: financialKeys.paymentPlans(),
    queryFn: async () => {
      const data = await FinancialApi.getPaymentPlans();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const usePaymentPlan = (planId: number) => {
  return useQuery({
    queryKey: financialKeys.paymentPlan(planId),
    queryFn: () => FinancialApi.getPaymentPlan(planId),
    enabled: !!planId,
  });
};

export const usePayInstallment = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  return useMutation({
    mutationFn: ({ planId, paymentData }: { planId: number; paymentData: InstallmentPaymentData }) =>
      FinancialApi.payInstallment(planId, paymentData),
    onSuccess: (_payment, { planId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: financialKeys.paymentPlan(planId) });
      queryClient.invalidateQueries({ queryKey: financialKeys.payments() });
      queryClient.invalidateQueries({ queryKey: financialKeys.paymentSummary() });
      queryClient.invalidateQueries({ queryKey: financialKeys.installments() });
      
      showToast({ type: 'success', title: 'Payment processed successfully' });
    },
    onError: (error) => {
      const message = FinancialApi.handleError(error);
      showToast({ type: 'error', title: message });
    },
  });
};

// ==================== INSTALLMENTS ====================

export const useInstallments = () => {
  return useQuery({
    queryKey: financialKeys.installments(),
    queryFn: () => FinancialApi.getInstallments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useInstallment = (installmentId: number) => {
  return useQuery({
    queryKey: financialKeys.installment(installmentId),
    queryFn: () => FinancialApi.getInstallment(installmentId),
    enabled: !!installmentId,
  });
};

export const useCreateInstallmentPayment = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  return useMutation({
    mutationFn: ({ installmentId, paymentData }: { 
      installmentId: number; 
      paymentData: Record<string, unknown> 
    }) => FinancialApi.createInstallmentPayment(installmentId, paymentData),
    onSuccess: (_payment, { installmentId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: financialKeys.installment(installmentId) });
      queryClient.invalidateQueries({ queryKey: financialKeys.installments() });
      queryClient.invalidateQueries({ queryKey: financialKeys.payments() });
      queryClient.invalidateQueries({ queryKey: financialKeys.paymentSummary() });
      queryClient.invalidateQueries({ queryKey: financialKeys.paymentPlans() });
      
      showToast({ type: 'success', title: 'Payment processed successfully' });
    },
    onError: (error) => {
      const message = FinancialApi.handleError(error);
      showToast({ type: 'error', title: message });
    },
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
    mutationFn: (methodData: PaymentMethodFormData) =>
      FinancialApi.createPaymentMethod(methodData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialKeys.paymentMethods() });
      showToast({ type: 'success', title: 'Payment method created successfully' });
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
    mutationFn: ({ methodId, methodData }: { 
      methodId: number; 
      methodData: Partial<PaymentMethodFormData> 
    }) => FinancialApi.updatePaymentMethod(methodId, methodData),
    onSuccess: (updatedMethod) => {
      queryClient.invalidateQueries({ queryKey: financialKeys.paymentMethods() });
      queryClient.invalidateQueries({ queryKey: financialKeys.paymentMethod(updatedMethod.id) });
      showToast({ type: 'success', title: 'Payment method updated successfully' });
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
      queryClient.invalidateQueries({ queryKey: financialKeys.paymentMethods() });
      queryClient.removeQueries({ queryKey: financialKeys.paymentMethod(methodId) });
      showToast({ type: 'success', title: 'Payment method deleted successfully' });
    },
    onError: (error) => {
      const message = FinancialApi.handleError(error);
      showToast({ type: 'error', title: message });
    },
  });
};

// ==================== REFUNDS ====================

export const useRefunds = () => {
  return useQuery({
    queryKey: financialKeys.refunds(),
    queryFn: () => FinancialApi.getRefunds(),
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
  const paymentPlansQuery = usePaymentPlans();
  const summaryQuery = usePaymentSummary();
  const refundsQuery = useRefunds();
  
  const isLoading = paymentsQuery.isLoading || 
                   invoicesQuery.isLoading || 
                   paymentPlansQuery.isLoading || 
                   summaryQuery.isLoading ||
                   refundsQuery.isLoading;
  
  const error = paymentsQuery.error || 
                invoicesQuery.error || 
                paymentPlansQuery.error || 
                summaryQuery.error ||
                refundsQuery.error;
  
  // Get upcoming installments - ensure we have valid data
  const upcomingInstallments = (() => {
    try {
      return (paymentPlansQuery.data && Array.isArray(paymentPlansQuery.data))
        ? FinancialApi.getUpcomingInstallments(paymentPlansQuery.data)
        : [];
    } catch (error) {
      console.error('Error calculating upcoming installments:', error);
      return [];
    }
  })();
    
  // Get overdue installments - ensure we have valid data
  const overdueInstallments = (() => {
    try {
      return (paymentPlansQuery.data && Array.isArray(paymentPlansQuery.data))
        ? FinancialApi.getOverdueInstallments(paymentPlansQuery.data)
        : [];
    } catch (error) {
      console.error('Error calculating overdue installments:', error);
      return [];
    }
  })();
  
  // Debug logging to help identify data structure issues
  const payments = Array.isArray(paymentsQuery.data?.results) ? paymentsQuery.data.results : [];
  const invoices = Array.isArray(invoicesQuery.data?.results) ? invoicesQuery.data.results : [];
  const paymentPlans = Array.isArray(paymentPlansQuery.data) ? paymentPlansQuery.data : [];
  const refunds = Array.isArray(refundsQuery.data) ? refundsQuery.data : [];

  // Log non-array data for debugging
  if (paymentsQuery.data?.results && !Array.isArray(paymentsQuery.data.results)) {
    console.warn('Payment data is not an array:', paymentsQuery.data);
  }
  if (invoicesQuery.data?.results && !Array.isArray(invoicesQuery.data.results)) {
    console.warn('Invoice data is not an array:', invoicesQuery.data);
  }
  if (paymentPlansQuery.data && !Array.isArray(paymentPlansQuery.data)) {
    console.warn('Payment plans data is not an array:', paymentPlansQuery.data);
  }
  if (refundsQuery.data && !Array.isArray(refundsQuery.data)) {
    console.warn('Refunds data is not an array:', refundsQuery.data);
  }

  return {
    payments,
    invoices,
    paymentPlans,
    summary: summaryQuery.data,
    refunds,
    upcomingInstallments,
    overdueInstallments,
    isLoading,
    error: error ? FinancialApi.handleError(error) : null,
    refetch: () => {
      paymentsQuery.refetch();
      invoicesQuery.refetch();
      paymentPlansQuery.refetch();
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
  const paymentPlansQuery = usePaymentPlans();
  
  const analytics = {
    // Payment status breakdown
    paymentStatusBreakdown: summaryQuery.data ? [
      { 
        label: 'Paid', 
        value: parseFloat(summaryQuery.data.total_paid), 
        color: '#4caf50' 
      },
      { 
        label: 'Pending', 
        value: parseFloat(summaryQuery.data.total_pending), 
        color: '#ff9800' 
      },
      { 
        label: 'Overdue', 
        value: parseFloat(summaryQuery.data.total_overdue), 
        color: '#f44336' 
      },
    ] : [],
    
    // Payment plan progress
    paymentPlanProgress: paymentPlansQuery.data?.map(plan => ({
      planId: plan.id,
      eventId: plan.event,
      progress: FinancialApi.calculatePaymentPlanProgress(plan),
    })) || [],
  };
  
  return {
    analytics,
    isLoading: paymentsQuery.isLoading || summaryQuery.isLoading || paymentPlansQuery.isLoading,
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
  usePayInstallment,
  useInstallments,
  useInstallment,
  useCreateInstallmentPayment,
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