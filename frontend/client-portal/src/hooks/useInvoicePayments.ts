// frontend/client-portal/src/hooks/useInvoicePayments.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';
import FinancialApi from '../apis/financial.api';
import { financialKeys } from './useFinancial';
import type { Invoice, InvoicePaymentRequest, PaymentPlanRequest } from '../types/financial.types';

/**
 * Hook for managing invoice payment operations
 * Provides mutations for paying invoices and setting up payment plans
 */
export const useInvoicePayments = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Invoice payment mutation
  const payInvoiceMutation = useMutation({
    mutationFn: ({
      invoiceId,
      paymentData,
    }: {
      invoiceId: number;
      paymentData: InvoicePaymentRequest;
    }) => FinancialApi.payInvoice(invoiceId, paymentData),
    onSuccess: (_, { invoiceId }) => {
      // Invalidate all related queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: financialKeys.invoices() });
      queryClient.invalidateQueries({
        queryKey: financialKeys.invoice(invoiceId),
      });
      queryClient.invalidateQueries({ queryKey: financialKeys.payments() });
      queryClient.invalidateQueries({
        queryKey: financialKeys.paymentSummary(),
      });
      queryClient.invalidateQueries({ queryKey: financialKeys.paymentPlans() });

      // Payment triggers backend workflow automation (PAYMENT_RECEIVED)
      // that may progress workflow stages, create tasks, update event status
      // Invalidate events and contracts to reflect any workflow-triggered changes
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });

      showToast({
        type: 'success',
        title: 'Payment Successful',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: FinancialApi.handleError(error),
      });
    },
  });

  // Payment intent creation for Stripe
  const createPaymentIntentMutation = useMutation({
    mutationFn: (invoiceId: number) => FinancialApi.createInvoicePaymentIntent(invoiceId, 'stripe'),
    onError: (error) => {
      showToast({
        type: 'error',
        title: FinancialApi.handleError(error),
      });
    },
  });

  // Payment plan setup mutation
  // ⚠️ WORK IN PROGRESS - Payment Plan feature is being redesigned
  const setupPaymentPlanMutation = useMutation({
    mutationFn: ({ invoiceId, planData }: { invoiceId: number; planData: PaymentPlanRequest }) => {
      if (import.meta.env.DEV)
        console.warn('⚠️ WIP: Payment plan setup mutation is currently disabled');
      return FinancialApi.setupInvoicePaymentPlan(invoiceId, planData);
    },
    onSuccess: (_, { invoiceId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: financialKeys.invoices() });
      queryClient.invalidateQueries({
        queryKey: financialKeys.invoice(invoiceId),
      });
      queryClient.invalidateQueries({ queryKey: financialKeys.paymentPlans() });

      showToast({
        type: 'success',
        title: 'Payment Plan Created',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: FinancialApi.handleError(error),
      });
    },
  });

  /**
   * Pay an invoice with the provided payment data
   */
  const payInvoice = (invoiceId: number, paymentData: InvoicePaymentRequest) => {
    return payInvoiceMutation.mutate({ invoiceId, paymentData });
  };

  /**
   * Create a payment intent for Stripe payment processing
   */
  const createPaymentIntent = (invoiceId: number) => {
    return createPaymentIntentMutation.mutateAsync(invoiceId);
  };

  /**
   * Set up a payment plan for an invoice
   * ⚠️ WORK IN PROGRESS - Payment Plan feature is being redesigned
   */
  const setupPaymentPlan = (invoiceId: number, planData: PaymentPlanRequest) => {
    if (import.meta.env.DEV) console.warn('⚠️ WIP: Payment plan setup is currently disabled');
    return setupPaymentPlanMutation.mutate({ invoiceId, planData });
  };

  /**
   * Check if an invoice can be paid
   */
  const canPayInvoice = (invoice: Invoice): boolean => {
    const paymentStatus = FinancialApi.calculateInvoicePaymentStatus(invoice);
    return paymentStatus.amountRemaining > 0;
  };

  /**
   * Check if an invoice supports payment plans
   * ⚠️ WORK IN PROGRESS - Payment Plan feature is being redesigned
   * @returns Always returns false as payment plans are currently disabled
   */
  const canSetupPaymentPlan = (_invoice: Invoice): boolean => {
    // Disabled - WIP: Payment plan feature is being redesigned
    return false;
  };

  /**
   * Get payment status information for an invoice
   */
  const getInvoicePaymentStatus = (invoice: Invoice) => {
    return FinancialApi.calculateInvoicePaymentStatus(invoice);
  };

  /**
   * Get display status for an invoice (paid, unpaid, overdue, etc.)
   */
  const getInvoiceDisplayStatus = (invoice: Invoice) => {
    return FinancialApi.getInvoiceDisplayStatus(invoice);
  };

  /**
   * Check if an invoice is overdue
   */
  const isInvoiceOverdue = (invoice: Invoice): boolean => {
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    const paymentStatus = FinancialApi.calculateInvoicePaymentStatus(invoice);

    return dueDate < today && paymentStatus.amountRemaining > 0;
  };

  /**
   * Get days until due or overdue count
   */
  const getDaysUntilDue = (invoice: Invoice): number => {
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  return {
    // Mutations
    payInvoice,
    createPaymentIntent,
    setupPaymentPlan,

    // Loading states
    isPayingInvoice: payInvoiceMutation.isPending,
    isCreatingPaymentIntent: createPaymentIntentMutation.isPending,
    isSettingUpPaymentPlan: setupPaymentPlanMutation.isPending,

    // Error states
    paymentError: payInvoiceMutation.error,
    paymentIntentError: createPaymentIntentMutation.error,
    paymentPlanError: setupPaymentPlanMutation.error,

    // Utility functions
    canPayInvoice,
    canSetupPaymentPlan,
    getInvoicePaymentStatus,
    getInvoiceDisplayStatus,
    isInvoiceOverdue,
    getDaysUntilDue,

    // Reset functions
    resetPaymentError: () => payInvoiceMutation.reset(),
    resetPaymentIntentError: () => createPaymentIntentMutation.reset(),
    resetPaymentPlanError: () => setupPaymentPlanMutation.reset(),
  };
};

export default useInvoicePayments;
