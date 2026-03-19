import api from '../../utils/api';
import type { PaymentGateway, PaginatedResponse } from '../../types/financial';
import { handleError } from './financial-utils';

/**
 * Payment gateway API calls
 */

/**
 * Get active payment gateways with multiple fallback strategies
 * Priority: 1) Booking flow endpoint (if flowId), 2) Public endpoint, 3) Client endpoint
 */
export async function getActivePaymentGateways(flowId?: number): Promise<PaymentGateway[]> {
  try {
    if (flowId) {
      // Priority 1: Use public booking flow endpoint for client access
      const response = await api.get<{
        available_gateways: PaymentGateway[];
        default_gateway: number | null;
        require_immediate_payment: boolean;
      }>(`/bookingflow/public/flows/${flowId}/payment_gateways/`);
      return response.data.available_gateways || [];
    } else {
      // Priority 2: Use new public payment gateways endpoint when no flowId provided
      try {
        const response = await api.get<PaymentGateway[]>('/payments/public/gateways/');
        return response.data || [];
      } catch (_publicError) {
        // Priority 3: Fall back to client endpoint if public endpoint fails
        try {
          const response = await api.get<PaymentGateway[]>('/payments/client/gateways/');
          return response.data || [];
        } catch (_clientError) {
          // Priority 4: Final fallback to admin endpoint (might require auth)
          const response = await api.get<PaginatedResponse<PaymentGateway>>(
            '/payments/gateways/?is_active=true',
          );
          return response.data.results || [];
        }
      }
    }
  } catch (error) {
    // If all endpoints fail, try the remaining fallback endpoints
    try {
      // Try public endpoint as final fallback
      const response = await api.get<PaymentGateway[]>('/payments/public/gateways/');
      return response.data || [];
    } catch (_publicFallbackError) {
      try {
        // Try client endpoint as final fallback
        const response = await api.get<PaymentGateway[]>('/payments/client/gateways/');
        return response.data || [];
      } catch (_clientFallbackError) {
        if (import.meta.env.DEV)
          console.error('Failed to fetch payment gateways from all endpoints:', error);
        throw error; // Throw original error
      }
    }
  }
}

/**
 * Get payment gateways from client-accessible endpoint (fallback)
 * This attempts to use a client-specific gateway endpoint if it exists
 */
export async function getClientPaymentGateways(): Promise<PaymentGateway[]> {
  try {
    const response = await api.get<PaymentGateway[]>('/payments/client/gateways/');
    return response.data || [];
  } catch (error) {
    if (import.meta.env.DEV)
      console.error('Client payment gateways endpoint not available:', error);
    throw new Error('Unable to access payment gateways. Please try again or contact support.');
  }
}

/**
 * Get available payment gateways
 */
export async function getAvailableGateways(): Promise<{
  success: boolean;
  data?: unknown;
  message?: string;
}> {
  try {
    const response = await api.get('/payments/client/gateways/available/');
    return {
      success: true,
      data: response.data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: handleError(error),
    };
  }
}

/**
 * Create payment intent for multi-gateway support
 */
export async function createPaymentIntent(intentData: {
  amount: number;
  currency?: string;
  gatewayCode?: string;
  eventId?: number;
  invoiceId?: number;
  metadata?: Record<string, unknown>;
  savePaymentMethod?: boolean;
}): Promise<{ success: boolean; data?: unknown; message?: string }> {
  try {
    const response = await api.post('/payments/client/create-payment-intent/', intentData);
    return {
      success: true,
      data: response.data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: handleError(error),
    };
  }
}

/**
 * Confirm payment intent
 */
export async function confirmPaymentIntent(
  intentId: string,
  confirmationData: {
    paymentMethodId?: string;
    gatewayCode?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ success: boolean; data?: unknown; message?: string }> {
  try {
    const response = await api.post(
      `/payments/client/confirm-payment-intent/${intentId}/`,
      confirmationData,
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: handleError(error),
    };
  }
}

/**
 * Get payment gateway health status
 */
export async function getGatewayHealth(): Promise<{
  success: boolean;
  data?: unknown;
  message?: string;
}> {
  try {
    const response = await api.get('/payments/client/gateways/health/');
    return {
      success: true,
      data: response.data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: handleError(error),
    };
  }
}
