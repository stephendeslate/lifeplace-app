// Simplified unified pricing hook - single source of truth
// Supports venue-based excess hours pricing (Phase 6)
// The backend API returns PricingLineItem[] with venue_details for per-venue breakdown
import { useState, useEffect, useCallback, useRef } from 'react';
import { useBooking } from '../../contexts/BookingContext';
import { BookingCoreApi } from '../../apis/booking/core';
import type { SelectedPackage, SelectedAddon, PricingLineItem } from '../../types/booking';

export interface SimplePricingBreakdown {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  formattedSubtotal: string;
  formattedTax: string;
  formattedDiscount: string;
  formattedTotal: string;
  lineItems: PricingLineItem[]; // Includes venue_details for per-venue excess hours
  discountDetails?: {
    name: string;
    code: string;
    type: string;
    value: string;
    amount: string;
  };
}

export const useSimplePricing = (
  selectedPackages: SelectedPackage[] = [],
  selectedAddons: SelectedAddon[] = [],
  discountCode?: string,
  venueAdditionalHours?: Record<string, number>,
) => {
  const { state, actions } = useBooking();
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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Use ref to track tax rate for comparison without causing re-renders
  // This prevents the infinite loop where setTaxRate -> state change -> callback recreate -> effect trigger
  const taxRateRef = useRef(state.taxRate);
  taxRateRef.current = state.taxRate;

  // Simple check if we have items
  const hasItems = selectedPackages.length > 0 || selectedAddons.length > 0;
  const totalItemCount =
    selectedPackages.reduce((sum, pkg) => sum + pkg.quantity, 0) +
    selectedAddons.reduce((sum, addon) => sum + addon.quantity, 0);

  // Serialize venue hours for dependency comparison
  const venueHoursKey = JSON.stringify(venueAdditionalHours || {});

  // Calculate pricing using server API
  const calculatePricing = useCallback(async () => {
    if (!state.currentSession || !hasItems) {
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
      });
      return;
    }

    setLoading(true);
    setError(null);
    setDiscountError(null);

    try {
      const result = await BookingCoreApi.calculatePricing(
        state.currentSession.session_id,
        discountCode,
        venueAdditionalHours,
      );

      const subtotal = parseFloat(result.subtotal);
      const tax = parseFloat(result.tax);
      const discount = parseFloat(result.discount);
      const total = parseFloat(result.total);

      // Store the tax rate from backend for optimistic calculations (only if changed)
      // Use ref for comparison to avoid stale closure issues that cause infinite loops
      if (result.tax_rate) {
        const taxRateDecimal = parseFloat(result.tax_rate) / 100; // Convert from percentage to decimal
        if (taxRateRef.current !== taxRateDecimal) {
          actions.setTaxRate(taxRateDecimal);
        }
      }

      setPricing({
        subtotal,
        tax,
        discount,
        total,
        formattedSubtotal: `₱${subtotal.toLocaleString()}`,
        formattedTax: `₱${tax.toLocaleString()}`,
        formattedDiscount: `₱${discount.toLocaleString()}`,
        formattedTotal: `₱${total.toLocaleString()}`,
        lineItems: result.line_items || [],
        discountDetails: result.discount_details,
      });

      if (result.discount_error) {
        setDiscountError(result.discount_error);
      }
    } catch (err) {
      setError('Failed to calculate pricing');
      if (import.meta.env.DEV) console.error('Pricing calculation error:', err);

      // Fallback calculation if server fails - use ref tax rate, no hardcoded default
      const subtotal =
        selectedPackages.reduce((sum, pkg) => sum + parseFloat(pkg.price) * pkg.quantity, 0) +
        selectedAddons.reduce((sum, addon) => sum + parseFloat(addon.price) * addon.quantity, 0);
      const tax = subtotal * (taxRateRef.current || 0);
      const total = subtotal + tax;

      setPricing({
        subtotal,
        tax,
        discount: 0,
        total,
        formattedSubtotal: `₱${subtotal.toLocaleString()}`,
        formattedTax: `₱${tax.toLocaleString()}`,
        formattedDiscount: '₱0',
        formattedTotal: `₱${total.toLocaleString()}`,
        lineItems: [],
      });
    } finally {
      setLoading(false);
    }
    // Note: actions is intentionally omitted from deps - it's not memoized in BookingContext
    // and would cause infinite loops. The individual action functions (setTaxRate) are stable.
    // taxRateRef is used instead of state.taxRate to avoid circular dependency:
    // setTaxRate -> state change -> callback recreate -> useEffect trigger -> API call -> repeat
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.currentSession,
    hasItems,
    discountCode,
    selectedPackages,
    selectedAddons,
    venueAdditionalHours,
    venueHoursKey,
  ]);

  // Recalculate when dependencies change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculatePricing();
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [calculatePricing]);

  return {
    pricing,
    loading,
    error,
    discountError,
    hasItems,
    totalItemCount,
    recalculate: calculatePricing,
  };
};
