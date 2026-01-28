/**
 * VIP API
 *
 * API calls for the VIP rewards domain. All endpoints use the /vip/client/
 * prefix for authenticated client access.
 */

import api from '@/utils/api';
import type {
  ClientVIPStatus,
  VIPBenefit,
  VIPRedemptionRequest,
  VIPRedemptionResponse,
} from '@/types/vip.types';

export const vipApi = {
  /**
   * Get current client's VIP status including tier, points, and progress
   */
  getMyStatus: async (): Promise<ClientVIPStatus> => {
    const response = await api.get<ClientVIPStatus>('/vip/client/my-status/');
    return response.data;
  },

  /**
   * Get all benefits available to the client's current tier
   */
  getMyBenefits: async (): Promise<VIPBenefit[]> => {
    const response = await api.get<VIPBenefit[]>('/vip/client/my-benefits/');
    return response.data;
  },

  /**
   * Get benefits that can be redeemed with points
   */
  getRedeemableBenefits: async (): Promise<VIPBenefit[]> => {
    const response = await api.get<VIPBenefit[]>('/vip/client/redeemable-benefits/');
    return response.data;
  },

  /**
   * Redeem a benefit for a specific event
   */
  redeemBenefit: async (data: VIPRedemptionRequest): Promise<VIPRedemptionResponse> => {
    const response = await api.post<VIPRedemptionResponse>(
      '/vip/client/redeem-benefit/',
      data
    );
    return response.data;
  },
};

export default vipApi;
