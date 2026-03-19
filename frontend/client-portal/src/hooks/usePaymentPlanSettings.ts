// frontend/client-portal/src/hooks/usePaymentPlanSettings.ts

import { useQuery } from '@tanstack/react-query';
import { FinancialApi } from '../apis/financial';

/**
 * Hook to fetch global payment plan settings
 * CONSOLIDATED: Single source of truth for payment plan configuration
 * Used for deposit percentages, balance due days, installment defaults, etc.
 */
export const usePaymentPlanSettings = () => {
  return useQuery({
    queryKey: ['payment-plan-settings'],
    queryFn: () => FinancialApi.getPaymentPlanSettings(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
};
