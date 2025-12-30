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
   * Get financial overview for the current client.
   * Computed from invoice data since backend doesn't have a dedicated overview endpoint.
   */
  getFinancialOverview: async (): Promise<FinancialOverview> => {
    // Fetch all invoices to compute the overview
    const invoicesResponse = await api.get<InvoicesListResponse>('/payments/client/invoices/');
    const invoices = invoicesResponse.data.results;

    const now = new Date();
    let totalOutstanding = 0;
    let totalPaid = 0;
    let totalOverdue = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let currency = 'PHP'; // Default currency
    let nextPaymentDue: FinancialOverview['next_payment_due'] = null;

    for (const invoice of invoices) {
      const amountDue = parseFloat(invoice.amount_due) || 0;
      const amountPaid = parseFloat(invoice.amount_paid) || 0;
      currency = invoice.currency || currency;

      totalPaid += amountPaid;

      if (invoice.status === 'OVERDUE') {
        totalOverdue += amountDue;
        totalOutstanding += amountDue;
        overdueCount++;
      } else if (['ISSUED', 'PARTIALLY_PAID'].includes(invoice.status)) {
        totalOutstanding += amountDue;
        pendingCount++;

        // Track next payment due (earliest due date with amount due)
        if (amountDue > 0 && invoice.due_date) {
          const dueDate = new Date(invoice.due_date);
          if (dueDate >= now) {
            if (!nextPaymentDue || dueDate < new Date(nextPaymentDue.due_date)) {
              nextPaymentDue = {
                amount: invoice.amount_due,
                due_date: invoice.due_date,
                invoice_id: invoice.id,
              };
            }
          }
        }
      }
    }

    return {
      total_outstanding: totalOutstanding.toFixed(2),
      total_paid: totalPaid.toFixed(2),
      total_overdue: totalOverdue.toFixed(2),
      currency,
      pending_invoices_count: pendingCount,
      overdue_invoices_count: overdueCount,
      next_payment_due: nextPaymentDue,
    };
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
    const url = queryString ? `/payments/client/payments/?${queryString}` : '/payments/client/payments/';
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
    const url = queryString ? `/payments/client/invoices/?${queryString}` : '/payments/client/invoices/';
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
    const response = await api.get<Invoice>(`/payments/client/invoices/${id}/`);
    return response.data;
  },

  /**
   * Get a single payment by ID
   */
  getPayment: async (id: number): Promise<Payment> => {
    const response = await api.get<Payment>(`/payments/client/payments/${id}/`);
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
    }>(`/payments/client/invoices/${invoiceId}/create_payment_intent/`);
    return response.data;
  },

  /**
   * Download invoice as PDF
   */
  downloadInvoice: async (id: number): Promise<Blob> => {
    const response = await api.get<Blob>(`/payments/client/invoices/${id}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default paymentsApi;
