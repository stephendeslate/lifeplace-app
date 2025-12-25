/**
 * useFinancial Hook
 *
 * React Query hooks for payments and invoices.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  paymentsApi,
  type Invoice,
  type Payment,
  type InvoiceFilters,
  type PaymentFilters,
} from '@/apis/payments.api';
import { useToast } from '@/contexts/ToastContext';
import type { FinancialSummary, OverduePayment } from '@/types/dashboard.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const financialKeys = {
  all: ['payments'] as const,
  overview: () => [...financialKeys.all, 'overview'] as const,
  summary: () => [...financialKeys.all, 'summary'] as const,
  overdue: () => [...financialKeys.all, 'overdue'] as const,
  invoices: () => [...financialKeys.all, 'invoices'] as const,
  invoiceList: (filters?: InvoiceFilters) => [...financialKeys.invoices(), filters] as const,
  invoice: (id: number) => [...financialKeys.invoices(), id] as const,
  eventInvoices: (eventId: number) => [...financialKeys.invoices(), 'event', eventId] as const,
  payments: () => [...financialKeys.all, 'payments-list'] as const,
  paymentList: (filters?: PaymentFilters) => [...financialKeys.payments(), filters] as const,
  payment: (id: number) => [...financialKeys.payments(), id] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch financial overview
 */
export function useFinancialOverview() {
  return useQuery({
    queryKey: financialKeys.overview(),
    queryFn: () => paymentsApi.getFinancialOverview(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch financial summary for dashboard
 */
export function useFinancialSummary() {
  return useQuery({
    queryKey: financialKeys.summary(),
    queryFn: () => paymentsApi.getFinancialSummary(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch overdue payments
 */
export function useOverduePayments() {
  return useQuery({
    queryKey: financialKeys.overdue(),
    queryFn: () => paymentsApi.getOverduePayments(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch invoices with optional filters
 */
export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: financialKeys.invoiceList(filters),
    queryFn: () => paymentsApi.getInvoices(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch invoices for a specific event
 */
export function useEventInvoices(eventId: number) {
  return useQuery({
    queryKey: financialKeys.eventInvoices(eventId),
    queryFn: () => paymentsApi.getEventInvoices(eventId),
    enabled: eventId > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch single invoice detail
 */
export function useInvoice(id: number) {
  return useQuery({
    queryKey: financialKeys.invoice(id),
    queryFn: () => paymentsApi.getInvoice(id),
    enabled: id > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch payments with optional filters
 */
export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: financialKeys.paymentList(filters),
    queryFn: () => paymentsApi.getPayments(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch single payment detail
 */
export function usePayment(id: number) {
  return useQuery({
    queryKey: financialKeys.payment(id),
    queryFn: () => paymentsApi.getPayment(id),
    enabled: id > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Create payment intent for Stripe
 */
export function useCreatePaymentIntent() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (invoiceId: number) => paymentsApi.createPaymentIntent(invoiceId),
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to initialize payment. Please try again.';
      showToast(message, 'error');
    },
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get invoice urgency level based on due date
 */
export function getInvoiceUrgency(
  invoice: Invoice
): 'critical' | 'high' | 'medium' | 'low' {
  if (invoice.status === 'OVERDUE') return 'critical';
  if (invoice.status === 'PAID') return 'low';

  const now = new Date();
  const dueDate = new Date(invoice.due_date);
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilDue <= 0) return 'critical';
  if (daysUntilDue <= 3) return 'high';
  if (daysUntilDue <= 7) return 'medium';
  return 'low';
}

/**
 * Get payment urgency level
 */
export function getPaymentUrgency(
  payment: OverduePayment
): 'critical' | 'high' | 'medium' | 'low' {
  if (payment.days_past_due >= 30) return 'critical';
  if (payment.days_past_due >= 14) return 'high';
  if (payment.days_past_due >= 7) return 'medium';
  return 'low';
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number | string, currency = 'USD'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(numericAmount);
}

/**
 * Calculate amount due from invoice
 */
export function calculateAmountDue(invoice: Invoice): number {
  const total = parseFloat(invoice.total_amount);
  const paid = parseFloat(invoice.amount_paid);
  return total - paid;
}
