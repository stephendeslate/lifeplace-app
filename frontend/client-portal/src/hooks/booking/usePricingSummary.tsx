// frontend/client-portal/src/hooks/booking/usePricingSummary.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProductsApi } from '../../apis/booking/products.api';
import type {
  SelectedPackage,
  SelectedAddon,
  Discount,
  ProductOption,
} from '../../types/booking';

// Pricing breakdown structure
export interface PricingBreakdown {
  packages: Array<{
    id: number;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    includedHours?: number;
    excessHours?: number;
    excessCost?: number;
  }>;
  addons: Array<{
    id: number;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

// Hook for pricing calculations
export const usePricingSummary = (
  selectedPackages: SelectedPackage[] = [],
  selectedAddons: SelectedAddon[] = [],
  eventDuration?: number,
  appliedDiscount?: Discount | null,
  taxRate: number = 0.12 // 12% default tax rate
) => {
  const [breakdown, setBreakdown] = useState<PricingBreakdown>({
    packages: [],
    addons: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate pricing breakdown
  const calculatePricing = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let subtotal = 0;
      const calculatedPackages = [];
      const calculatedAddons = [];

      // Calculate packages with duration considerations
      for (const pkg of selectedPackages) {
        const unitPrice = parseFloat(pkg.price);
        let packageTotal = unitPrice * pkg.quantity;
        let excessHours = 0;
        let excessCost = 0;

        // Handle excess hours if package has this feature and duration is provided
        if (eventDuration && pkg.included_hours && pkg.excess_hour_price) {
          if (eventDuration > pkg.included_hours) {
            excessHours = eventDuration - pkg.included_hours;
            excessCost = excessHours * parseFloat(pkg.excess_hour_price) * pkg.quantity;
            packageTotal += excessCost;
          }
        }

        const packageItem = {
          id: pkg.id,
          name: pkg.name,
          quantity: pkg.quantity,
          unitPrice: unitPrice,
          total: packageTotal,
          includedHours: pkg.included_hours,
          excessHours: excessHours > 0 ? excessHours : undefined,
          excessCost: excessCost > 0 ? excessCost : undefined,
        };

        calculatedPackages.push(packageItem);
        subtotal += packageTotal;
      }

      // Calculate addons
      for (const addon of selectedAddons) {
        const unitPrice = parseFloat(addon.price);
        const addonTotal = unitPrice * addon.quantity;

        const addonItem = {
          id: addon.id,
          name: addon.name,
          quantity: addon.quantity,
          unitPrice: unitPrice,
          total: addonTotal,
        };

        calculatedAddons.push(addonItem);
        subtotal += addonTotal;
      }

      // Calculate discount
      let discountAmount = 0;
      if (appliedDiscount) {
        discountAmount = calculateDiscountAmount(subtotal, appliedDiscount);
      }

      // Calculate tax (applied after discount)
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * taxRate;

      // Calculate total
      const total = subtotal + taxAmount - discountAmount;

      setBreakdown({
        packages: calculatedPackages,
        addons: calculatedAddons,
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total: Math.max(0, total), // Ensure total is not negative
      });

    } catch (err) {
      const errorMessage = ProductsApi.handleProductsError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedPackages, selectedAddons, eventDuration, appliedDiscount, taxRate]);

  // Calculate discount amount based on type
  const calculateDiscountAmount = useCallback((subtotal: number, discount: Discount): number => {
    switch (discount.discount_type) {
      case 'PERCENTAGE':
        const percentage = parseFloat(discount.value.toString());
        return subtotal * (percentage / 100);
      
      case 'FIXED':
        const fixedAmount = parseFloat(discount.value.toString());
        return Math.min(fixedAmount, subtotal); // Don't exceed subtotal
      
      case 'FREE_HOURS':
        // For MVP, we'll just return 0 for free hours discounts
        // This could be enhanced later to calculate based on hourly rates
        return 0;
      
      default:
        return 0;
    }
  }, []);

  // Format currency for display
  const formatCurrency = useCallback((amount: number): string => {
    return ProductsApi.formatPrice(amount.toString());
  }, []);

  // Get formatted breakdown for display
  const formattedBreakdown = useMemo(() => ({
    packages: breakdown.packages,
    addons: breakdown.addons,
    subtotal: formatCurrency(breakdown.subtotal),
    tax: formatCurrency(breakdown.tax),
    discount: formatCurrency(breakdown.discount),
    total: formatCurrency(breakdown.total),
    rawTotal: breakdown.total,
  }), [breakdown, formatCurrency]);

  // Check if there are any items selected
  const hasItems = useMemo(() => {
    return selectedPackages.length > 0 || selectedAddons.length > 0;
  }, [selectedPackages, selectedAddons]);

  // Get total item count
  const totalItemCount = useMemo(() => {
    const packageCount = selectedPackages.reduce((total, pkg) => total + pkg.quantity, 0);
    const addonCount = selectedAddons.reduce((total, addon) => total + addon.quantity, 0);
    return packageCount + addonCount;
  }, [selectedPackages, selectedAddons]);

  // Recalculate when dependencies change
  useEffect(() => {
    calculatePricing();
  }, [calculatePricing]);

  return {
    breakdown,
    formattedBreakdown,
    loading,
    error,
    hasItems,
    totalItemCount,
    formatCurrency,
    recalculate: calculatePricing,
  };
};

// Hook for discount validation and application
export const useDiscountValidation = () => {
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const validateDiscountCode = useCallback(async (code: string): Promise<Discount | null> => {
    if (!code.trim()) {
      setDiscountError('Please enter a discount code');
      return null;
    }

    setValidatingDiscount(true);
    setDiscountError(null);

    try {
      const discount = await ProductsApi.validateDiscountCode(code.trim());
      return discount;
    } catch (err) {
      const errorMessage = ProductsApi.handleProductsError(err);
      setDiscountError(errorMessage);
      return null;
    } finally {
      setValidatingDiscount(false);
    }
  }, []);

  const clearDiscountError = useCallback(() => {
    setDiscountError(null);
  }, []);

  return {
    validateDiscountCode,
    validatingDiscount,
    discountError,
    clearDiscountError,
  };
};

// Hook for pricing summary step data management
export const usePricingSummaryStep = (
  selectedPackages: SelectedPackage[] = [],
  selectedAddons: SelectedAddon[] = [],
  eventDuration?: number,
  initialDiscount?: Discount | null
) => {
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(initialDiscount || null);
  const [discountCode, setDiscountCode] = useState<string>('');

  const {
    breakdown,
    formattedBreakdown,
    loading: calculatingPricing,
    error: pricingError,
    hasItems,
    totalItemCount,
    formatCurrency,
    recalculate,
  } = usePricingSummary(selectedPackages, selectedAddons, eventDuration, appliedDiscount);

  const {
    validateDiscountCode,
    validatingDiscount,
    discountError,
    clearDiscountError,
  } = useDiscountValidation();

  // Apply discount code
  const applyDiscountCode = useCallback(async (code: string) => {
    const discount = await validateDiscountCode(code);
    if (discount) {
      setAppliedDiscount(discount);
      setDiscountCode(code);
    }
  }, [validateDiscountCode]);

  // Remove applied discount
  const removeDiscount = useCallback(() => {
    setAppliedDiscount(null);
    setDiscountCode('');
    clearDiscountError();
  }, [clearDiscountError]);

  // Get step data for submission
  const getStepData = useCallback(() => ({
    subtotal: breakdown.subtotal.toFixed(2),
    tax: breakdown.tax.toFixed(2),
    discount: breakdown.discount.toFixed(2),
    total: breakdown.total.toFixed(2),
    applied_discount: appliedDiscount,
  }), [breakdown, appliedDiscount]);

  return {
    // Pricing data
    breakdown,
    formattedBreakdown,
    hasItems,
    totalItemCount,
    
    // Discount management
    appliedDiscount,
    discountCode,
    setDiscountCode,
    applyDiscountCode,
    removeDiscount,
    
    // Loading states
    calculatingPricing,
    validatingDiscount,
    
    // Errors
    pricingError,
    discountError,
    
    // Utilities
    formatCurrency,
    recalculate,
    getStepData,
  };
};