import api from '../../utils/api';
import type {
  Payment,
  PaymentFilters,
  PaymentSettings,
  PaymentPlanSettings,
  PaymentSummary,
  PaginatedResponse,
} from '../../types/financial';

/**
 * Payment-related API calls
 */

/**
 * Get paginated list of client's payments
 */
export async function getPayments(
  filters?: PaymentFilters,
  page?: number,
  pageSize?: number,
): Promise<PaginatedResponse<Payment>> {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.status) params.append('status', filters.status);
    if (filters.event) params.append('event', filters.event.toString());
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.search) params.append('search', filters.search);
  }

  if (page) params.append('page', page.toString());
  if (pageSize) params.append('page_size', pageSize.toString());

  const response = await api.get<PaginatedResponse<Payment>>(
    `/payments/client/payments/?${params.toString()}`,
  );
  return response.data;
}

/**
 * Get single payment details
 */
export async function getPayment(paymentId: number): Promise<Payment> {
  const response = await api.get<Payment>(`/payments/client/payments/${paymentId}/`);
  return response.data;
}

/**
 * Get payment summary statistics
 */
export async function getPaymentSummary(): Promise<PaymentSummary> {
  const response = await api.get<PaymentSummary>('/payments/client/payments/summary/');
  return response.data;
}

/**
 * Get payment settings including default currency
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  const response = await api.get<PaymentSettings>('/payments/settings/');
  return response.data;
}

/**
 * Get payment plan settings (deposit percentage, balance due days, etc.)
 * CONSOLIDATED: Single source of truth for payment plan configuration
 * Uses public endpoint (no authentication required) for booking flows
 */
export async function getPaymentPlanSettings(): Promise<PaymentPlanSettings> {
  const response = await api.get<PaymentPlanSettings>('/payments/public/settings/1/');
  // Public endpoint returns single object (singleton settings)
  return response.data;
}

/**
 * Download payment receipt PDF
 */
export async function downloadPaymentReceipt(paymentId: number): Promise<Blob> {
  try {
    const response = await api.get(`/payments/client/payments/${paymentId}/download_receipt/`, {
      responseType: 'blob',
    });

    // Check if the response is actually an error (JSON) instead of a PDF
    const dataBlob = response.data as Blob;
    if (dataBlob.type === 'application/json') {
      // Parse the error from blob
      const text = await dataBlob.text();
      const errorData = JSON.parse(text);
      throw new Error(errorData.detail || 'Failed to download receipt');
    }

    return response.data as Blob;
  } catch (error: unknown) {
    // If it's an axios error with a blob response, try to parse it
    if ((error as { response?: { data?: Blob } }).response?.data instanceof Blob) {
      try {
        const text = await (error as { response: { data: Blob } }).response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.detail || 'Failed to download receipt');
      } catch (_parseError) {
        // If we can't parse it, throw the original error
        throw error;
      }
    }
    throw error;
  }
}
