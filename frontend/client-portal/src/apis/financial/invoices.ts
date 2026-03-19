import api from '../../utils/api';
import type {
  Invoice,
  InvoiceFilters,
  PaymentPlan,
  PaymentIntentResponse,
  SetupIntentResponse,
  InvoicePaymentRequest,
  InvoicePaymentResponse,
  PaymentPlanRequest,
  PaginatedResponse,
} from '../../types/financial';
import { handleError } from './financial-utils';

/**
 * Invoice-related API calls
 */

/**
 * Get paginated list of client's invoices
 */
export async function getInvoices(
  filters?: InvoiceFilters,
  page?: number,
  pageSize?: number,
): Promise<PaginatedResponse<Invoice>> {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.status) params.append('status', filters.status);
    if (filters.event) params.append('event', filters.event.toString());
    if (filters.search) params.append('search', filters.search);
  }

  if (page) params.append('page', page.toString());
  if (pageSize) params.append('page_size', pageSize.toString());

  const response = await api.get<PaginatedResponse<Invoice>>(
    `/payments/client/invoices/?${params.toString()}`,
  );
  return response.data;
}

/**
 * Get single invoice details
 */
export async function getInvoice(invoiceId: number): Promise<Invoice> {
  const response = await api.get<Invoice>(`/payments/client/invoices/${invoiceId}/`);
  return response.data;
}

/**
 * Download invoice PDF
 */
export async function downloadInvoicePdf(invoiceId: number): Promise<Blob> {
  try {
    const response = await api.get(`/payments/client/invoices/${invoiceId}/download_pdf/`, {
      responseType: 'blob',
    });

    // Check if the response is actually an error (JSON) instead of a PDF
    const dataBlob = response.data as Blob;
    if (dataBlob.type === 'application/json') {
      // Parse the error from blob
      const text = await dataBlob.text();
      const errorData = JSON.parse(text);
      throw new Error(errorData.detail || 'Failed to download invoice');
    }

    return response.data as Blob;
  } catch (error: unknown) {
    // If it's an axios error with a blob response, try to parse it
    if ((error as { response?: { data?: Blob } }).response?.data instanceof Blob) {
      try {
        const text = await (error as { response: { data: Blob } }).response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.detail || 'Failed to download invoice');
      } catch (_parseError) {
        // If we can't parse it, throw the original error
        throw error;
      }
    }
    throw error;
  }
}

/**
 * Process full payment for an invoice
 */
export async function payInvoice(
  invoiceId: number,
  paymentData: InvoicePaymentRequest,
): Promise<InvoicePaymentResponse> {
  try {
    const response = await api.post<InvoicePaymentResponse>(
      `/payments/client/invoices/${invoiceId}/pay/`,
      paymentData,
    );
    return response.data;
  } catch (error: unknown) {
    throw new Error(handleError(error));
  }
}

/**
 * Create a payment intent for Stripe payment processing (supports deposit)
 */
export async function createInvoicePaymentIntent(
  invoiceId: number,
  gatewayCode: string,
  paymentType: 'FULL' | 'DEPOSIT' = 'FULL',
): Promise<PaymentIntentResponse> {
  try {
    const response = await api.post<PaymentIntentResponse>(
      `/payments/client/invoices/${invoiceId}/create_payment_intent/`,
      {
        gateway_code: gatewayCode,
        payment_type: paymentType,
      },
    );
    return response.data;
  } catch (error: unknown) {
    throw new Error(handleError(error));
  }
}

/**
 * Create Stripe setup intent for saving payment methods
 */
export async function createStripeSetupIntent(): Promise<SetupIntentResponse> {
  try {
    const response = await api.post<SetupIntentResponse>(
      `/payments/client/payment-methods/setup_intent/`,
      { gateway_code: 'stripe' },
    );
    return response.data;
  } catch (error: unknown) {
    throw new Error(handleError(error));
  }
}

/**
 * Setup a payment plan for an invoice
 * WIP: Payment Plan feature is being redesigned
 */
export async function setupInvoicePaymentPlan(
  invoiceId: number,
  planData: PaymentPlanRequest,
): Promise<PaymentPlan> {
  if (import.meta.env.DEV) console.warn('WIP: Payment plan setup is currently disabled');
  try {
    const response = await api.post<PaymentPlan>(
      `/payments/client/invoices/${invoiceId}/setup_payment_plan/`,
      planData,
    );
    return response.data;
  } catch (error: unknown) {
    throw new Error(handleError(error));
  }
}
