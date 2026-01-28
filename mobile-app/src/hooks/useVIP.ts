/**
 * useVIP Hooks
 *
 * React Query hooks for VIP rewards functionality.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vipApi } from '@/apis/vip.api';
import type { VIPRedemptionRequest } from '@/types/vip.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const vipKeys = {
  all: ['vip'] as const,
  status: () => [...vipKeys.all, 'status'] as const,
  benefits: () => [...vipKeys.all, 'benefits'] as const,
  redeemable: () => [...vipKeys.all, 'redeemable'] as const,
};

// =============================================================================
// VIP STATUS HOOK
// =============================================================================

/**
 * Fetch current client's VIP status.
 * Handles 403 gracefully (VIP program may not be enabled for client).
 */
export function useVIPStatus() {
  return useQuery({
    queryKey: vipKeys.status(),
    queryFn: () => vipApi.getMyStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 403 (client may not have VIP access)
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 403) {
        return false;
      }
      // Default retry behavior for other errors
      return failureCount < 3;
    },
  });
}

// =============================================================================
// VIP BENEFITS HOOK
// =============================================================================

/**
 * Fetch all benefits available to the client's current tier.
 */
export function useVIPBenefits() {
  return useQuery({
    queryKey: vipKeys.benefits(),
    queryFn: () => vipApi.getMyBenefits(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =============================================================================
// REDEEMABLE BENEFITS HOOK
// =============================================================================

/**
 * Fetch benefits that can be redeemed with points.
 */
export function useRedeemableBenefits() {
  return useQuery({
    queryKey: vipKeys.redeemable(),
    queryFn: () => vipApi.getRedeemableBenefits(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// REDEEM BENEFIT MUTATION
// =============================================================================

/**
 * Redeem a benefit for a specific event.
 * Invalidates VIP status and benefits cache on success.
 */
export function useRedeemBenefit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VIPRedemptionRequest) => vipApi.redeemBenefit(data),
    onSuccess: () => {
      // Invalidate VIP-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: vipKeys.status() });
      queryClient.invalidateQueries({ queryKey: vipKeys.redeemable() });
      // Also invalidate events in case redemption affects event details
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
