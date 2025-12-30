/**
 * usePricing Hook
 *
 * React Query hooks for pricing calculations and summary.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookingCoreAPI, ProductsAPI } from '@/apis/booking';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/utils/currency';
import type {
  PricingCalculation,
  PricingSummaryStepData,
  SelectedPackage,
  SelectedAddon,
  StepValidationResult,
} from '@/types/booking';
import { bookingSessionKeys } from './useBookingSession';

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Calculate pricing for the session.
 */
export function useCalculatePricing() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      sessionId,
      discountCode,
      venueAdditionalHours,
    }: {
      sessionId: string;
      discountCode?: string;
      venueAdditionalHours?: Record<string, number>;
    }) => BookingCoreAPI.calculatePricing(sessionId, discountCode, venueAdditionalHours),
    onSuccess: (response, variables) => {
      // Update cached session with new pricing
      queryClient.setQueryData(
        bookingSessionKeys.session(variables.sessionId),
        (old: Record<string, unknown> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            total_price: response.total,
            pricing: response,
          };
        }
      );
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to calculate pricing.';
      showToast(message, 'error');
    },
  });
}

/**
 * Apply discount code.
 */
export function useApplyDiscountCode() {
  const { showToast } = useToast();
  const calculatePricing = useCalculatePricing();

  return useMutation({
    mutationFn: async ({
      sessionId,
      discountCode,
      venueAdditionalHours,
    }: {
      sessionId: string;
      discountCode: string;
      venueAdditionalHours?: Record<string, number>;
    }) => {
      // First validate the discount code
      const discount = await ProductsAPI.validateDiscountCode(discountCode);

      // Then calculate pricing with the discount
      const pricing = await BookingCoreAPI.calculatePricing(
        sessionId,
        discountCode,
        venueAdditionalHours
      );

      return { discount, pricing };
    },
    onSuccess: (response) => {
      showToast(
        `Discount applied: ${response.discount.name}`,
        'success'
      );
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Invalid discount code.';
      showToast(message, 'error');
    },
  });
}

/**
 * Remove discount code.
 */
export function useRemoveDiscountCode() {
  const calculatePricing = useCalculatePricing();

  return useMutation({
    mutationFn: async ({
      sessionId,
      venueAdditionalHours,
    }: {
      sessionId: string;
      venueAdditionalHours?: Record<string, number>;
    }) => {
      // Recalculate pricing without discount
      return BookingCoreAPI.calculatePricing(sessionId, undefined, venueAdditionalHours);
    },
  });
}

/**
 * Validate pricing summary step data.
 */
export function useValidatePricingSummary() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
    }: {
      sessionId: string;
      stepId: number;
      stepData: PricingSummaryStepData;
    }) =>
      BookingCoreAPI.validateStepData(sessionId, stepId, stepData as Record<string, unknown>),
  });
}

/**
 * Update pricing summary step data.
 */
export function useUpdatePricingSummary() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
      markCompleted,
    }: {
      sessionId: string;
      stepId: number;
      stepData: PricingSummaryStepData;
      markCompleted?: boolean;
    }) =>
      BookingCoreAPI.updateSessionData(
        sessionId,
        stepId,
        stepData as Record<string, unknown>,
        markCompleted
      ),
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Calculate packages total.
 */
export function usePackagesTotal(packages: SelectedPackage[]): number {
  return packages.reduce((sum, pkg) => {
    const basePrice = parseFloat(pkg.price) * pkg.quantity;
    const excessCost = pkg.excess_hour_cost ? parseFloat(pkg.excess_hour_cost) : 0;
    return sum + basePrice + excessCost;
  }, 0);
}

/**
 * Calculate addons total.
 */
export function useAddonsTotal(addons: SelectedAddon[]): number {
  return addons.reduce((sum, addon) => {
    return sum + parseFloat(addon.price) * addon.quantity;
  }, 0);
}

/**
 * Calculate subtotal.
 */
export function useSubtotal(packages: SelectedPackage[], addons: SelectedAddon[]): number {
  const packagesTotal = packages.reduce((sum, pkg) => {
    const basePrice = parseFloat(pkg.price) * pkg.quantity;
    const excessCost = pkg.excess_hour_cost ? parseFloat(pkg.excess_hour_cost) : 0;
    return sum + basePrice + excessCost;
  }, 0);

  const addonsTotal = addons.reduce((sum, addon) => {
    return sum + parseFloat(addon.price) * addon.quantity;
  }, 0);

  return packagesTotal + addonsTotal;
}

/**
 * Calculate tax amount.
 */
export function useTaxAmount(subtotal: number, taxRate: number): number {
  return subtotal * taxRate;
}

/**
 * Calculate total with tax.
 */
export function useTotalWithTax(subtotal: number, taxRate: number): number {
  return subtotal * (1 + taxRate);
}

/**
 * Calculate total with discount.
 */
export function useTotalWithDiscount(
  subtotal: number,
  taxRate: number,
  discountType: 'PERCENTAGE' | 'FIXED',
  discountValue: number
): { discount: number; total: number } {
  const tax = subtotal * taxRate;
  const totalBeforeDiscount = subtotal + tax;

  let discount = 0;
  if (discountType === 'PERCENTAGE') {
    discount = totalBeforeDiscount * (discountValue / 100);
  } else {
    discount = discountValue;
  }

  const total = Math.max(0, totalBeforeDiscount - discount);

  return { discount, total };
}

/**
 * Format pricing summary for display.
 */
export function useFormattedPricingSummary(pricing: PricingCalculation): {
  items: Array<{ label: string; value: string; type: string }>;
  total: string;
} {
  const items: Array<{ label: string; value: string; type: string }> = [];

  // Add line items
  pricing.lineItems.forEach((item) => {
    items.push({
      label: item.quantity > 1 ? `${item.item_name} (×${item.quantity})` : item.item_name,
      value: formatCurrency(item.total_price),
      type: item.type,
    });
  });

  // Add subtotal if different from total
  if (pricing.subtotal !== pricing.total) {
    items.push({
      label: 'Subtotal',
      value: pricing.formattedSubtotal,
      type: 'SUBTOTAL',
    });
  }

  // Add tax if applicable
  if (parseFloat(pricing.tax) > 0) {
    items.push({
      label: `Tax (${(pricing.tax_rate * 100).toFixed(0)}%)`,
      value: pricing.formattedTax,
      type: 'TAX',
    });
  }

  // Add discount if applicable
  if (parseFloat(pricing.discount) > 0) {
    items.push({
      label: pricing.discount_code ? `Discount (${pricing.discount_code})` : 'Discount',
      value: `-${pricing.formattedDiscount}`,
      type: 'DISCOUNT',
    });
  }

  return {
    items,
    total: pricing.formattedTotal,
  };
}

/**
 * Validate pricing summary data client-side.
 */
export function useValidatePricingSummaryData(data: PricingSummaryStepData): {
  isValid: boolean;
  errors: Record<string, string[]>;
} {
  const errors: Record<string, string[]> = {};

  if (!data.terms_accepted) {
    errors.terms_accepted = ['Please accept the terms and conditions'];
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
