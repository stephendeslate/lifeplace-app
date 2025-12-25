/**
 * Payments API
 *
 * API calls for payments and invoices.
 */

import api from '@/utils/api';
import type { FinancialSummary, OverduePayment } from '@/types/dashboard.types';

// =============================================================================
// TYPES
// =============================================================================

export type PaymentMethod = 'STRIPE' | 'BANK_TRANSFER' | 'CASH' | 'CHECK' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED' | 'VOID';

export interface Payment {
  id: number;
  payment_number: string;
  event: number;
  event_name: string;
  invoice?: number;
  amount: string;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  due_date: string;
  paid_on: string | null;
  created_at: string;
  updated_at: string;
  notes?: string;
  receipt_url?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  event: number;
  event_name: string;
  status: InvoiceStatus;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  amount_paid: string;
  amount_due: string;
  currency: string;
  due_date: string;
  issued_date: string;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
  line_items: InvoiceLineItem[];
  payments: Payment[];
  can_pay_online: boolean;
  payment_url?: string;
}

export interface InvoiceLineItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface FinancialOverview {
  total_outstanding: string;
  total_paid: string;
  total_overdue: string;
  currency: string;
  pending_invoices_count: number;
  overdue_invoices_count: number;
  next_payment_due: {
    amount: string;
    due_date: string;
    invoice_id: number;
  } | null;
}

export interface PaymentsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Payment[];
}

export interface InvoicesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Invoice[];
}

export interface PaymentFilters {
  event?: number;
  status?: PaymentStatus;
  page?: number;
  page_size?: number;
}

export interface InvoiceFilters {
  event?: number;
  status?: InvoiceStatus;
  page?: number;
  page_size?: number;
}

// =============================================================================
// API
// =============================================================================

export const paymentsApi = {
  /**
   * Get financial overview for the current client
   */
  getFinancialOverview: async (): Promise<FinancialOverview> => {
    const response = await api.get<FinancialOverview>('/payments/overview/');
    return response.data;
  },

  /**
   * Get financial summary formatted for dashboard
   */
  getFinancialSummary: async (): Promise<FinancialSummary> => {
    const overview = await paymentsApi.getFinancialOverview();
    const overdueInvoices = await paymentsApi.getInvoices({ status: 'OVERDUE' });
    const pendingInvoices = await paymentsApi.getInvoices({ status: 'ISSUED' });

    let urgencyLevel: FinancialSummary['urgency_level'] = 'low';
    const overdueCount = overdueInvoices.results.length;
    const pendingCount = pendingInvoices.results.length;

    if (overdueCount >= 3) urgencyLevel = 'critical';
    else if (overdueCount >= 2) urgencyLevel = 'high';
    else if (overdueCount >= 1) urgencyLevel = 'medium';

    return {
      total_outstanding: parseFloat(overview.total_outstanding),
      currency: overview.currency,
      next_payment_date: overview.next_payment_due?.due_date || null,
      next_payment_amount: overview.next_payment_due
        ? parseFloat(overview.next_payment_due.amount)
        : null,
      urgency_level: urgencyLevel,
      overdue_count: overdueCount,
      pending_count: pendingCount,
    };
  },

  /**
   * Get overdue payments for dashboard
   */
  getOverduePayments: async (): Promise<OverduePayment[]> => {
    const response = await paymentsApi.getInvoices({ status: 'OVERDUE' });
    const now = new Date();

    return response.results.map((invoice) => {
      const dueDate = new Date(invoice.due_date);
      const daysPastDue = Math.ceil(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: invoice.id,
        payment_number: invoice.invoice_number,
        event_id: invoice.event,
        event_name: invoice.event_name,
        amount: parseFloat(invoice.amount_due),
        currency: invoice.currency,
        due_date: invoice.due_date,
        status: 'OVERDUE' as const,
        days_past_due: daysPastDue,
      };
    });
  },

  /**
   * Get payments with optional filters
   */
  getPayments: async (filters?: PaymentFilters): Promise<PaymentsListResponse> => {
    const params = new URLSearchParams();
    if (filters?.event) params.append('event', filters.event.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const url = queryString ? `/payments/?${queryString}` : '/payments/';
    const response = await api.get<PaymentsListResponse>(url);
    return response.data;
  },

  /**
   * Get invoices with optional filters
   */
  getInvoices: async (filters?: InvoiceFilters): Promise<InvoicesListResponse> => {
    const params = new URLSearchParams();
    if (filters?.event) params.append('event', filters.event.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const url = queryString ? `/payments/invoices/?${queryString}` : '/payments/invoices/';
    const response = await api.get<InvoicesListResponse>(url);
    return response.data;
  },

  /**
   * Get invoices for a specific event
   */
  getEventInvoices: async (eventId: number): Promise<Invoice[]> => {
    const response = await paymentsApi.getInvoices({ event: eventId });
    return response.results;
  },

  /**
   * Get a single invoice by ID
   */
  getInvoice: async (id: number): Promise<Invoice> => {
    const response = await api.get<Invoice>(`/payments/invoices/${id}/`);
    return response.data;
  },

  /**
   * Get a single payment by ID
   */
  getPayment: async (id: number): Promise<Payment> => {
    const response = await api.get<Payment>(`/payments/${id}/`);
    return response.data;
  },

  /**
   * Get payment intent for Stripe
   */
  createPaymentIntent: async (
    invoiceId: number
  ): Promise<{ client_secret: string; payment_intent_id: string }> => {
    const response = await api.post<{
      client_secret: string;
      payment_intent_id: string;
    }>(`/payments/invoices/${invoiceId}/create_payment_intent/`);
    return response.data;
  },

  /**
   * Download invoice as PDF
   */
  downloadInvoice: async (id: number): Promise<Blob> => {
    const response = await api.get<Blob>(`/payments/invoices/${id}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default paymentsApi;
