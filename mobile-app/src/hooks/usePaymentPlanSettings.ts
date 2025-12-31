/**
 * usePaymentPlanSettings Hook
 *
 * Fetch global payment plan settings from backend.
 * CONSOLIDATED: Single source of truth for payment plan configuration.
 * Used for deposit percentages, balance due days, refund policy, etc.
 *
 * Adapted from: frontend/client-portal/src/hooks/usePaymentPlanSettings.ts
 */

import { useQuery } from '@tanstack/react-query';
import { PaymentAPI } from '@/apis/booking';
import type { PaymentPlanSettings } from '@/types/booking';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const paymentPlanSettingsKeys = {
  all: ['paymentPlanSettings'] as const,
  settings: () => [...paymentPlanSettingsKeys.all, 'settings'] as const,
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch global payment plan settings.
 *
 * @returns Query result with payment plan settings data
 */
export const usePaymentPlanSettings = () => {
  return useQuery({
    queryKey: paymentPlanSettingsKeys.settings(),
    queryFn: () => PaymentAPI.getPaymentPlanSettings(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Get deposit calculation from settings.
 *
 * @param totalAmount - Total amount to calculate deposit from
 * @returns Deposit amount and remaining balance
 */
export const useDepositCalculation = (totalAmount: number) => {
  const { data: settings, isLoading } = usePaymentPlanSettings();

  if (isLoading || !settings) {
    return {
      depositPercentage: 50, // Default fallback
      depositAmount: totalAmount * 0.5,
      remainingBalance: totalAmount * 0.5,
      isLoading,
    };
  }

  const depositPercentage = settings.default_deposit_percentage || 50;
  const depositAmount = (totalAmount * depositPercentage) / 100;
  const remainingBalance = totalAmount - depositAmount;

  return {
    depositPercentage,
    depositAmount,
    remainingBalance,
    isLoading,
  };
};

/**
 * Get refund policy from settings.
 *
 * @returns Refund policy details
 */
export const useRefundPolicy = () => {
  const { data: settings, isLoading } = usePaymentPlanSettings();

  if (isLoading || !settings) {
    return {
      allowRefunds: false,
      refundDeadlineHours: 0,
      refundPercentage: 0,
      refundPolicyText: '',
      isLoading,
    };
  }

  return {
    allowRefunds: settings.allow_refunds,
    refundDeadlineHours: settings.refund_deadline_hours,
    refundPercentage: settings.refund_percentage,
    refundPolicyText: settings.refund_policy_text,
    isLoading,
  };
};

/**
 * Get balance due settings.
 *
 * @param eventDate - Event date to calculate balance due date from
 * @returns Balance due date and days before event
 */
export const useBalanceDueDate = (eventDate?: string) => {
  const { data: settings, isLoading } = usePaymentPlanSettings();

  if (isLoading || !settings || !eventDate) {
    return {
      balanceDueDays: 7, // Default fallback
      balanceDueDate: null,
      gracePeriodDays: 3,
      isLoading,
    };
  }

  const balanceDueDays = settings.balance_due_days || 7;
  const gracePeriodDays = settings.grace_period_days || 3;

  // Calculate balance due date (balanceDueDays before event)
  const eventDateObj = new Date(eventDate);
  const balanceDueDate = new Date(eventDateObj);
  balanceDueDate.setDate(balanceDueDate.getDate() - balanceDueDays);

  return {
    balanceDueDays,
    balanceDueDate: balanceDueDate.toISOString().split('T')[0],
    gracePeriodDays,
    isLoading,
  };
};

/**
 * Get formatted refund policy text for display.
 *
 * @returns Formatted refund policy string
 */
export const useFormattedRefundPolicy = () => {
  const { allowRefunds, refundDeadlineHours, refundPercentage, refundPolicyText, isLoading } =
    useRefundPolicy();

  if (isLoading) {
    return {
      text: 'Loading refund policy...',
      isLoading,
    };
  }

  if (!allowRefunds) {
    return {
      text: 'No refunds available.',
      isLoading,
    };
  }

  // Use custom text if available
  if (refundPolicyText) {
    return {
      text: refundPolicyText,
      isLoading,
    };
  }

  // Generate default text
  const hours = refundDeadlineHours;
  const percentage = refundPercentage;
  const days = Math.floor(hours / 24);

  let timeText: string;
  if (days > 0) {
    timeText = `${days} day${days > 1 ? 's' : ''}`;
  } else {
    timeText = `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  return {
    text: `Cancellations made at least ${timeText} before the event are eligible for a ${percentage}% refund.`,
    isLoading,
  };
};

export default usePaymentPlanSettings;
