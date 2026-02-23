// frontend/client-portal/src/apis/vip.api.ts

import api from '../utils/api';
import type {
  ClientVIPStatus,
  VIPBenefit,
  VIPRedemptionRequest,
  VIPRedemptionResponse,
} from '../types/vip.types';

/**
 * VIP API service for client portal
 * All endpoints use the /vip/client/ prefix for client-specific access
 */
export class VIPApi {
  /**
   * Get the current client's VIP status
   */
  static async getMyStatus(): Promise<ClientVIPStatus> {
    const response = await api.get<ClientVIPStatus>('/vip/client/my-status/');
    return response.data;
  }

  /**
   * Get all benefits available to the current client based on their tier
   */
  static async getMyBenefits(): Promise<VIPBenefit[]> {
    const response = await api.get<VIPBenefit[]>('/vip/client/my-benefits/');
    return response.data;
  }

  /**
   * Get redeemable benefits (benefits that require points and can be redeemed)
   */
  static async getRedeemableBenefits(): Promise<VIPBenefit[]> {
    const response = await api.get<VIPBenefit[]>('/vip/client/redeemable-benefits/');
    return response.data;
  }

  /**
   * Redeem a benefit for a specific event
   */
  static async redeemBenefit(request: VIPRedemptionRequest): Promise<VIPRedemptionResponse> {
    const response = await api.post<VIPRedemptionResponse>('/vip/client/redeem-benefit/', request);
    return response.data;
  }

  /**
   * Handle API errors and extract meaningful messages
   */
  static handleError(error: unknown): string {
    const errorObj = error as {
      response?: {
        data?: { detail?: string; message?: string; error?: string };
        status?: number;
      };
    };

    if (errorObj.response?.data) {
      const data = errorObj.response.data;

      if (data.detail) {
        return data.detail;
      }

      if (data.message) {
        return data.message;
      }

      if (data.error) {
        return data.error;
      }
    }

    if (errorObj.response?.status === 403) {
      return 'You do not have permission to access VIP information.';
    }

    if (errorObj.response?.status === 404) {
      return 'VIP information not found.';
    }

    if (errorObj.response?.status && errorObj.response.status >= 500) {
      return 'A server error occurred. Please try again later.';
    }

    return 'An unexpected error occurred while processing your VIP request.';
  }
}

export default VIPApi;
