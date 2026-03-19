import api from '../../utils/api';
import type { Refund, PaginatedResponse } from '../../types/financial';

/**
 * Refund API calls
 */

/**
 * Get client's refunds with pagination support
 */
export async function getRefunds(
  page?: number,
  pageSize?: number,
): Promise<PaginatedResponse<Refund>> {
  const params = new URLSearchParams();

  if (page) params.append('page', page.toString());
  if (pageSize) params.append('page_size', pageSize.toString());

  const response = await api.get<PaginatedResponse<Refund>>(
    `/payments/client/refunds/?${params.toString()}`,
  );
  return response.data;
}

/**
 * Get single refund details
 */
export async function getRefund(refundId: number): Promise<Refund> {
  const response = await api.get<Refund>(`/payments/client/refunds/${refundId}/`);
  return response.data;
}
