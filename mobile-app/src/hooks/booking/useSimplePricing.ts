/**
 * useSimplePricing Hook
 *
 * Unified pricing hook - single source of truth for pricing calculations.
 * Supports venue-based excess hours pricing.
 * Adapted from: frontend/client-portal/src/hooks/booking/useSimplePricing.tsx
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBookingContext } from '@/contexts/BookingContext';
import { BookingCoreAPI } from '@/apis/booking';
import { formatCurrency } from '@/utils/currency';
import type {
  SelectedPackage,
  SelectedAddon,
  PricingLineItem,
} from '@/types/booking';

// =============================================================================
// TYPES
// =============================================================================

export interface SimplePricingBreakdown {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  formattedSubtotal: string;
  formattedTax: string;
  formattedDiscount: string;
  formattedTotal: string;
  lineItems: PricingLineItem[];
  discountDetails?: {
    name: string;
    code: string;
    type: string;
    value: string;
    amount: string;
  };
  taxRate: number;
}

export interface UseSimplePricingOptions {
  debounceMs?: number;
  enableAutoCalculate?: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

export const useSimplePricing = (
  selectedPackages: SelectedPackage[] = [],
  selectedAddons: SelectedAddon[] = [],
  discountCode?: string,
  venueAdditionalHours?: Record<string, number>,
  options: UseSimplePricingOptions = {}
) => {
  const { state, actions } = useBookingContext();
  const { debounceMs = 300, enableAutoCalculate = true } = options;

  const [pricing, setPricing] = useState<SimplePricingBreakdown>({
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    formattedSubtotal: '₱0',
    formattedTax: '₱0',
    formattedDiscount: '₱0',
    formattedTotal: '₱0',
    lineItems: [],
    taxRate: 0.12,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we have items to price
  const hasItems = selectedPackages.length > 0 || selectedAddons.length > 0;

  const totalItemCount = useMemo(() => {
    return (
      selectedPackages.reduce((sum, pkg) => sum + pkg.quantity, 0) +
      selectedAddons.reduce((sum, addon) => sum + addon.quantity, 0)
    );
  }, [selectedPackages, selectedAddons]);

  // Serialize dependencies for comparison
  const packagesKey = JSON.stringify(
    selectedPackages.map((p) => ({ id: p.product_id, qty: p.quantity, price: p.price }))
  );
  const addonsKey = JSON.stringify(
    selectedAddons.map((a) => ({ id: a.product_id, qty: a.quantity, price: a.price }))
  );
  const venueHoursKey = JSON.stringify(venueAdditionalHours || {});

  // Calculate pricing using server API
  const calculatePricing = useCallback(async () => {
    const sessionId = state.currentSession?.session_id;

    if (!sessionId || !hasItems) {
      setPricing({
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        formattedSubtotal: '₱0',
        formattedTax: '₱0',
        formattedDiscount: '₱0',
        formattedTotal: '₱0',
        lineItems: [],
        taxRate: 0.12,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await BookingCoreAPI.calculatePricing(
        sessionId,
        discountCode,
        venueAdditionalHours
      );

      const subtotal = parseFloat(result.subtotal);
      const tax = parseFloat(result.tax);
      const discount = parseFloat(result.discount);
      const total = parseFloat(result.total);
      // Handle both number and string tax_rate from API
      const rawTaxRate = typeof result.tax_rate === 'number' ? result.tax_rate : parseFloat(String(result.tax_rate) || '0');
      const taxRate = rawTaxRate > 1 ? rawTaxRate / 100 : rawTaxRate; // Normalize to decimal if percentage

      // Store the tax rate in context for optimistic calculations
      if (rawTaxRate && actions.setTaxRate) {
        actions.setTaxRate(taxRate);
      }

      // Handle both snake_case (API) and camelCase (type) for lineItems
      const resultAny = result as unknown as Record<string, unknown>;
      const lineItems = (resultAny.line_items || result.lineItems || []) as PricingLineItem[];

      // Handle discount_details from API response
      const discountDetails = resultAny.discount_details as {
        name?: string;
        code?: string;
        type?: string;
        value?: string;
        amount?: string;
      } | undefined;

      const newPricing: SimplePricingBreakdown = {
        subtotal,
        tax,
        discount,
        total,
        formattedSubtotal: formatCurrency(subtotal),
        formattedTax: formatCurrency(tax),
        formattedDiscount: formatCurrency(discount),
        formattedTotal: formatCurrency(total),
        lineItems,
        taxRate,
        discountDetails: discountDetails
          ? {
              name: discountDetails.name || '',
              code: discountDetails.code || discountCode || '',
              type: discountDetails.type || 'PERCENTAGE',
              value: discountDetails.value || '0',
              amount: discountDetails.amount || result.discount,
            }
          : undefined,
      };

      setPricing(newPricing);

      // Sync pricing to context
      if (actions.setPricingBreakdown) {
        actions.setPricingBreakdown({
          subtotal: result.subtotal,
          tax: result.tax,
          tax_rate: rawTaxRate,
          discount: result.discount,
          total: result.total,
          formattedSubtotal: newPricing.formattedSubtotal,
          formattedTax: newPricing.formattedTax,
          formattedDiscount: newPricing.formattedDiscount,
          formattedTotal: newPricing.formattedTotal,
          lineItems,
        });
      }
    } catch (err) {
      console.error('Pricing calculation error:', err);
      setError('Failed to calculate pricing');

      // Fallback calculation if server fails
      const fallbackPricing = calculateFallbackPricing(
        selectedPackages,
        selectedAddons,
        state.taxRate || 0.12
      );

      setPricing(fallbackPricing);
    } finally {
      setLoading(false);
    }
  }, [
    state.currentSession?.session_id,
    hasItems,
    discountCode,
    venueAdditionalHours,
    packagesKey,
    addonsKey,
    venueHoursKey,
    state.taxRate,
    actions,
  ]);

  // Auto-recalculate when dependencies change (debounced)
  useEffect(() => {
    if (!enableAutoCalculate) return;

    const timeoutId = setTimeout(() => {
      calculatePricing();
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [calculatePricing, debounceMs, enableAutoCalculate]);

  // Get line items by type (handles both uppercase API values and lowercase legacy values)
  const getLineItemsByType = useCallback(
    (type: 'PACKAGE' | 'ADDON' | 'EXCESS_HOURS' | 'package' | 'addon' | 'venue_excess') => {
      const normalizedType = type.toUpperCase();
      // Map legacy lowercase types to uppercase
      const typeMap: Record<string, string> = {
        PACKAGE: 'PACKAGE',
        ADDON: 'ADDON',
        EXCESS_HOURS: 'EXCESS_HOURS',
        VENUE_EXCESS: 'EXCESS_HOURS',
      };
      const mappedType = typeMap[normalizedType] || normalizedType;
      return pricing.lineItems.filter((item) => item.type === mappedType);
    },
    [pricing.lineItems]
  );

  // Get venue excess hour items
  const venueExcessItems = useMemo(() => {
    return pricing.lineItems.filter(
      (item) => item.type === 'EXCESS_HOURS' || item.venue_id !== undefined
    );
  }, [pricing.lineItems]);

  return {
    // Pricing data
    pricing,
    lineItems: pricing.lineItems,
    venueExcessItems,

    // Formatted values
    formattedSubtotal: pricing.formattedSubtotal,
    formattedTax: pricing.formattedTax,
    formattedDiscount: pricing.formattedDiscount,
    formattedTotal: pricing.formattedTotal,

    // Discount info
    discountDetails: pricing.discountDetails,
    hasDiscount: pricing.discount > 0,

    // State
    loading,
    error,
    hasItems,
    totalItemCount,

    // Actions
    recalculate: calculatePricing,
    getLineItemsByType,

    // Tax info
    taxRate: pricing.taxRate,
  };
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate fallback pricing when server is unavailable.
 */
function calculateFallbackPricing(
  packages: SelectedPackage[],
  addons: SelectedAddon[],
  taxRate: number
): SimplePricingBreakdown {
  const packagesTotal = packages.reduce((sum, pkg) => {
    const basePrice = parseFloat(pkg.price) * pkg.quantity;
    const excessCost = pkg.excess_hour_cost ? parseFloat(pkg.excess_hour_cost) : 0;
    return sum + basePrice + excessCost;
  }, 0);

  const addonsTotal = addons.reduce((sum, addon) => {
    return sum + parseFloat(addon.price) * addon.quantity;
  }, 0);

  const subtotal = packagesTotal + addonsTotal;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    discount: 0,
    total,
    formattedSubtotal: formatCurrency(subtotal),
    formattedTax: formatCurrency(tax),
    formattedDiscount: '₱0',
    formattedTotal: formatCurrency(total),
    lineItems: [],
    taxRate,
  };
}

/**
 * Calculate pricing optimistically (without server call).
 * Useful for immediate UI feedback.
 */
export function useOptimisticPricing(
  packages: SelectedPackage[],
  addons: SelectedAddon[],
  taxRate: number = 0.12,
  discountPercentage: number = 0
) {
  return useMemo(() => {
    const packagesTotal = packages.reduce((sum, pkg) => {
      const basePrice = parseFloat(pkg.price) * pkg.quantity;
      return sum + basePrice;
    }, 0);

    const addonsTotal = addons.reduce((sum, addon) => {
      return sum + parseFloat(addon.price) * addon.quantity;
    }, 0);

    const subtotal = packagesTotal + addonsTotal;
    const discount = subtotal * (discountPercentage / 100);
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * taxRate;
    const total = taxableAmount + tax;

    return {
      subtotal,
      tax,
      discount,
      total,
      packagesTotal,
      addonsTotal,
      formattedSubtotal: formatCurrency(subtotal),
      formattedTax: formatCurrency(tax),
      formattedDiscount: formatCurrency(discount),
      formattedTotal: formatCurrency(total),
    };
  }, [packages, addons, taxRate, discountPercentage]);
}

export default useSimplePricing;
