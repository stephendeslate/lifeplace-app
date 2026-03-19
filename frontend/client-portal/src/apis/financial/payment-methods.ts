import api from '../../utils/api';
import type {
  PaymentMethod,
  PaymentMethodFormData,
  PaginatedResponse,
} from '../../types/financial';

/**
 * Payment method API calls
 */

/**
 * Get client's payment methods
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const response = await api.get<PaginatedResponse<PaymentMethod>>(
    '/payments/client/payment-methods/',
  );
  return response.data.results || [];
}

/**
 * Get single payment method
 */
export async function getPaymentMethod(methodId: number): Promise<PaymentMethod> {
  const response = await api.get<PaymentMethod>(`/payments/client/payment-methods/${methodId}/`);
  return response.data;
}

/**
 * Create new payment method
 */
export async function createPaymentMethod(
  methodData: PaymentMethodFormData,
): Promise<PaymentMethod> {
  const response = await api.post<PaymentMethod>('/payments/client/payment-methods/', methodData);
  return response.data;
}

/**
 * Update payment method
 */
export async function updatePaymentMethod(
  methodId: number,
  methodData: Partial<PaymentMethodFormData>,
): Promise<PaymentMethod> {
  const response = await api.patch<PaymentMethod>(
    `/payments/client/payment-methods/${methodId}/`,
    methodData,
  );
  return response.data;
}

/**
 * Delete payment method
 */
export async function deletePaymentMethod(methodId: number): Promise<void> {
  await api.delete(`/payments/client/payment-methods/${methodId}/`);
}
