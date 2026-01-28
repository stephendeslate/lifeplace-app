// frontend/client-portal/src/hooks/useVIP.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';
import VIPApi from '../apis/vip.api';
import type { VIPRedemptionRequest } from '../types/vip.types';

// Query keys for consistent caching
export const vipKeys = {
  all: ['vip'] as const,
  status: () => [...vipKeys.all, 'status'] as const,
  benefits: () => [...vipKeys.all, 'benefits'] as const,
  redeemableBenefits: () => [...vipKeys.all, 'redeemable-benefits'] as const,
};

// ==================== VIP STATUS ====================

/**
 * Get the current client's VIP status
 * Handles 403 gracefully (client may not have VIP access)
 */
export const useVIPStatus = () => {
  return useQuery({
    queryKey: vipKeys.status(),
    queryFn: async () => {
      try {
        return await VIPApi.getMyStatus();
      } catch (error) {
        // Handle 403 gracefully - client may not have VIP access
        const errorObj = error as { response?: { status?: number } };
        if (errorObj.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 403 errors
      const errorObj = error as { response?: { status?: number } };
      if (errorObj.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// ==================== VIP BENEFITS ====================

/**
 * Get all benefits available to the current client based on their tier
 */
export const useVIPBenefits = () => {
  return useQuery({
    queryKey: vipKeys.benefits(),
    queryFn: () => VIPApi.getMyBenefits(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Get redeemable benefits (benefits that require points and can be redeemed)
 */
export const useRedeemableBenefits = () => {
  return useQuery({
    queryKey: vipKeys.redeemableBenefits(),
    queryFn: () => VIPApi.getRedeemableBenefits(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ==================== VIP REDEMPTION ====================

/**
 * Redeem a benefit for a specific event
 */
export const useRedeemBenefit = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (request: VIPRedemptionRequest) => VIPApi.redeemBenefit(request),
    onSuccess: (redemption) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: vipKeys.status() });
      queryClient.invalidateQueries({ queryKey: vipKeys.redeemableBenefits() });

      showToast({
        type: 'success',
        title: `Successfully redeemed ${redemption.benefit_name}`,
      });
    },
    onError: (error) => {
      const message = VIPApi.handleError(error);
      showToast({ type: 'error', title: message });
    },
  });
};

export default {
  useVIPStatus,
  useVIPBenefits,
  useRedeemableBenefits,
  useRedeemBenefit,
};
