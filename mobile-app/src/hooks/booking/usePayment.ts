/**
 * usePayment Hook
 *
 * React Query hooks for payment processing.
 * Supports: Stripe, PayPal, GCash, PayMaya, Bank Transfer, Manual
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentAPI, BookingCoreAPI } from '@/apis/booking';
import { useToast } from '@/contexts/ToastContext';
import type {
  PaymentGateway,
  PaymentGatewayResponse,
  PaymentStepData,
  PaymentType,
  StepValidationResult,
} from '@/types/booking';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const paymentKeys = {
  all: ['payments'] as const,
  gateways: () => [...paymentKeys.all, 'gateways'] as const,
  flowGateways: (flowId: number) => [...paymentKeys.all, 'flowGateways', flowId] as const,
  gateway: (gatewayId: number) => [...paymentKeys.all, 'gateway', gatewayId] as const,
  gatewayConfig: (gatewayCode: string) =>
    [...paymentKeys.all, 'gatewayConfig', gatewayCode] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch all active payment gateways.
 */
export function usePaymentGateways() {
  return useQuery({
    queryKey: paymentKeys.gateways(),
    queryFn: () => PaymentAPI.getPaymentGateways(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch payment gateways for a specific booking flow.
 */
export function useFlowPaymentGateways(flowId: number) {
  return useQuery({
    queryKey: paymentKeys.flowGateways(flowId),
    queryFn: () => BookingCoreAPI.getFlowPaymentGateways(flowId),
    enabled: flowId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a specific payment gateway.
 */
export function usePaymentGateway(gatewayId: number) {
  return useQuery({
    queryKey: paymentKeys.gateway(gatewayId),
    queryFn: () => PaymentAPI.getPaymentGateway(gatewayId),
    enabled: gatewayId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch gateway public configuration.
 */
export function useGatewayPublicConfig(gatewayCode: string) {
  return useQuery({
    queryKey: paymentKeys.gatewayConfig(gatewayCode),
    queryFn: () => PaymentAPI.getGatewayPublicConfig(gatewayCode),
    enabled: !!gatewayCode,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Validate payment step data.
 */
export function useValidatePayment() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
    }: {
      sessionId: string;
      stepId: number;
      stepData: PaymentStepData;
    }) => PaymentAPI.validateStepData(sessionId, stepId, stepData),
  });
}

/**
 * Update payment step data.
 */
export function useUpdatePayment() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
      markCompleted,
    }: {
      sessionId: string;
      stepId: number;
      stepData: PaymentStepData;
      markCompleted?: boolean;
    }) => PaymentAPI.updateStepData(sessionId, stepId, stepData, markCompleted),
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to process payment.';
      showToast(message, 'error');
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Calculate deposit amount.
 */
export function useCalculateDeposit(
  totalAmount: string | number,
  depositType: 'PERCENTAGE' | 'FIXED',
  depositValue: string | number
): number {
  return PaymentAPI.calculateDepositAmount(totalAmount, depositType, depositValue);
}

/**
 * Calculate remaining balance.
 */
export function useCalculateBalance(
  totalAmount: string | number,
  depositAmount: string | number
): number {
  return PaymentAPI.calculateRemainingBalance(totalAmount, depositAmount);
}

/**
 * Format amount for display.
 */
export function useFormatAmount(amount: string | number, currency: string = 'PHP'): string {
  return PaymentAPI.formatAmount(amount, currency);
}

/**
 * Get gateway display name.
 */
export function useGatewayDisplayName(gateway: PaymentGateway): string {
  return PaymentAPI.getGatewayDisplayName(gateway);
}

/**
 * Get gateway icon identifier.
 */
export function useGatewayIcon(gateway: PaymentGateway): string {
  return PaymentAPI.getGatewayIcon(gateway);
}

/**
 * Get supported payment methods for a gateway.
 */
export function useSupportedPaymentMethods(gateway: PaymentGateway): string[] {
  return PaymentAPI.getSupportedPaymentMethods(gateway);
}

/**
 * Check if gateway is in test mode.
 */
export function useIsTestMode(gateway: PaymentGateway): boolean {
  return PaymentAPI.isTestMode(gateway);
}

/**
 * Check if gateway supports a specific feature.
 */
export function useSupportsFeature(gateway: PaymentGateway, feature: string): boolean {
  return PaymentAPI.supportsFeature(gateway, feature);
}

/**
 * Validate payment method data for a gateway.
 */
export function useValidatePaymentMethod(
  gateway: PaymentGateway,
  paymentData: Record<string, unknown>
): { isValid: boolean; errors: Record<string, string[]> } {
  return PaymentAPI.validatePaymentMethod(gateway, paymentData);
}

/**
 * Validate amount limits for a gateway.
 */
export function useValidateAmountLimits(
  gateway: PaymentGateway,
  amount: number
): { isValid: boolean; error?: string } {
  return PaymentAPI.validateAmountLimits(gateway, amount);
}

/**
 * Format payment data for booking session.
 */
export function useFormatPaymentData(
  gateway: PaymentGateway,
  paymentMethod: string,
  paymentType: PaymentType,
  additionalData: Record<string, unknown> = {}
): PaymentStepData {
  return PaymentAPI.formatPaymentData(gateway, paymentMethod, paymentType, additionalData);
}

/**
 * Validate payment data client-side.
 */
export function useValidatePaymentData(
  data: PaymentStepData
): { isValid: boolean; errors: Record<string, string[]> } {
  return PaymentAPI.validateData(data);
}

/**
 * Prefetch gateway data.
 */
export function usePrefetchGateway() {
  const queryClient = useQueryClient();

  return (gatewayId: number) => {
    queryClient.prefetchQuery({
      queryKey: paymentKeys.gateway(gatewayId),
      queryFn: () => PaymentAPI.getPaymentGateway(gatewayId),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Invalidate payment queries.
 */
export function useInvalidatePayments() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: paymentKeys.all });
  };
}
