// Simplified unified pricing hook - single source of truth
import { useState, useEffect, useCallback } from 'react';
import { useBooking } from '../../contexts/BookingContext';
import { BookingCoreApi } from '../../apis/booking/core.api';
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
  lineItems: PricingLineItem[];
}

export const useSimplePricing = (
  selectedPackages: SelectedPackage[] = [],
  selectedAddons: SelectedAddon[] = [],
  discountCode?: string
) => {
  const { state } = useBooking();
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

  // Simple check if we have items
  const hasItems = selectedPackages.length > 0 || selectedAddons.length > 0;
  const totalItemCount = selectedPackages.reduce((sum, pkg) => sum + pkg.quantity, 0) +
                        selectedAddons.reduce((sum, addon) => sum + addon.quantity, 0);

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

    try {
      const result = await BookingCoreApi.calculatePricing(
        state.currentSession.session_id,
        discountCode
      );

      const subtotal = parseFloat(result.subtotal);
      const tax = parseFloat(result.tax);
      const discount = parseFloat(result.discount);
      const total = parseFloat(result.total);

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
      });
    } catch (err) {
      setError('Failed to calculate pricing');
      console.error('Pricing calculation error:', err);

      // Fallback calculation if server fails
      const subtotal = selectedPackages.reduce((sum, pkg) => sum + parseFloat(pkg.price) * pkg.quantity, 0) +
                     selectedAddons.reduce((sum, addon) => sum + parseFloat(addon.price) * addon.quantity, 0);
      const tax = subtotal * 0.12; // 12% VAT
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
  }, [state.currentSession, hasItems, discountCode, selectedPackages, selectedAddons]);

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
    hasItems,
    totalItemCount,
    recalculate: calculatePricing,
  };
};