// frontend/client-portal/src/hooks/booking/usePricingSummary.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProductsApi } from '../../apis/booking/products.api';
import { BookingCoreApi } from '../../apis/booking/core.api';
import { useBooking } from '../../contexts/BookingContext';
import type {
  SelectedPackage,
  SelectedAddon,
  Discount,
  ProductOption,
  PricingCalculation,
  PricingSummaryStepData,
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
  appliedDiscount?: Discount | null
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packageDetails, setPackageDetails] = useState<Map<number, ProductOption>>(new Map());
  const [addonDetails, setAddonDetails] = useState<Map<number, ProductOption>>(new Map());

  // Memoize product IDs to prevent unnecessary re-fetches
  const packageIds = useMemo(() => 
    selectedPackages.map(p => p.product_id).sort((a, b) => a - b),
    [selectedPackages]
  );
  
  const addonIds = useMemo(() => 
    selectedAddons.map(a => a.product_id).sort((a, b) => a - b),
    [selectedAddons]
  );

  // Fetch product details when product IDs actually change (not array references)
  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        if (packageIds.length > 0 || addonIds.length > 0) {
          // CRITICAL FIX: Use batch API call instead of separate calls
          // This prevents the infinite loop caused by individual API requests
          const allIds = [...packageIds, ...addonIds];
          const allProductsMap = await ProductsApi.getProductsByIds(allIds);
          
          // Separate into packages and addons maps
          const packagesMap = new Map();
          const addonsMap = new Map();
          
          packageIds.forEach(id => {
            if (allProductsMap.has(id)) {
              packagesMap.set(id, allProductsMap.get(id));
            }
          });
          
          addonIds.forEach(id => {
            if (allProductsMap.has(id)) {
              addonsMap.set(id, allProductsMap.get(id));
            }
          });
          
          setPackageDetails(packagesMap);
          setAddonDetails(addonsMap);
        } else {
          // Clear all details when nothing is selected
          setPackageDetails(new Map());
          setAddonDetails(new Map());
        }
      } catch (err) {
        setError('Failed to load product details');
        console.error('Failed to fetch product details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [packageIds.join(','), addonIds.join(',')]); // Use string dependency to prevent array reference issues

  // Calculate breakdown
  const breakdown = useMemo<PricingBreakdown>(() => {
    let subtotal = 0;
    let tax = 0;
    const packageBreakdown: PricingBreakdown['packages'] = [];
    const addonBreakdown: PricingBreakdown['addons'] = [];

    // Process packages - Fixed: Use package_id
    selectedPackages.forEach(pkg => {
      const details = packageDetails.get(pkg.product_id);
      if (details) {
        const basePrice = parseFloat(details.base_price);
        let total = basePrice * pkg.quantity;
        let excessHours = 0;
        let excessCost = 0;

        // Calculate excess hours if applicable
        if (details.has_excess_hours && details.included_hours && eventDuration) {
          if (eventDuration > details.included_hours) {
            excessHours = eventDuration - details.included_hours;
            excessCost = excessHours * parseFloat(details.excess_hour_price || '0');
            total = (basePrice + excessCost) * pkg.quantity;
          }
        }

        packageBreakdown.push({
          id: pkg.product_id,
          name: pkg.name || details.name,
          quantity: pkg.quantity,
          unitPrice: basePrice,
          total,
          includedHours: details.included_hours ?? undefined,
          excessHours,
          excessCost,
        });

        subtotal += total;

        // Calculate tax
        if (details.tax_rate) {
          tax += total * (parseFloat(details.tax_rate) / 100);
        }
      }
    });

    // Process addons - CRITICAL FIX: Only process addons that are currently selected
    selectedAddons.forEach(addon => {
      const details = addonDetails.get(addon.product_id);
      if (details) {
        const basePrice = parseFloat(details.base_price);
        const total = basePrice * addon.quantity;

        addonBreakdown.push({
          id: addon.product_id,
          name: addon.name || details.name,
          quantity: addon.quantity,
          unitPrice: basePrice,
          total,
        });

        subtotal += total;

        // Calculate tax
        if (details.tax_rate) {
          tax += total * (parseFloat(details.tax_rate) / 100);
        }
      }
    });

    // Apply discount
    let discountAmount = 0;
    if (appliedDiscount) {
      if (appliedDiscount.discount_type === 'PERCENTAGE') {
        discountAmount = subtotal * (parseFloat(appliedDiscount.value) / 100);
      } else if (appliedDiscount.discount_type === 'FIXED') {
        discountAmount = parseFloat(appliedDiscount.value);
      }
      // Ensure discount doesn't exceed subtotal
      discountAmount = Math.min(discountAmount, subtotal);
    }

    const total = subtotal + tax - discountAmount;

    return {
      packages: packageBreakdown,
      addons: addonBreakdown,
      subtotal,
      tax,
      discount: discountAmount,
      total: Math.max(0, total),
    };
  }, [selectedPackages, selectedAddons, packageDetails, addonDetails, eventDuration, appliedDiscount]);

  // Force recalculation - FIXED: Clear details maps to force refetch
  const recalculate = useCallback(() => {
    // Clear the detail maps to force a refetch
    setPackageDetails(new Map());
    setAddonDetails(new Map());
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
  }, [selectedPackages.length, selectedAddons.length]);

  // Get total item count
  const totalItemCount = useMemo(() => {
    const packageCount = selectedPackages.reduce((total, pkg) => total + pkg.quantity, 0);
    const addonCount = selectedAddons.reduce((total, addon) => total + addon.quantity, 0);
    return packageCount + addonCount;
  }, [selectedPackages, selectedAddons]);

  return {
    breakdown,
    formattedBreakdown,
    loading,
    error,
    hasItems,
    totalItemCount,
    formatCurrency,
    recalculate,
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
  initialDiscountCode?: string
) => {
  const { state } = useBooking();
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [discountCode, setDiscountCode] = useState<string>(initialDiscountCode || '');
  const [serverPricing, setServerPricing] = useState<PricingCalculation | null>(null);
  const [calculatingServerPricing, setCalculatingServerPricing] = useState(false);
  const [serverPricingError, setServerPricingError] = useState<string | null>(null);

  // Define packageIds and addonIds for use in dependencies
  const packageIds = useMemo(() => 
    selectedPackages.map(p => p.product_id).sort((a, b) => a - b),
    [selectedPackages]
  );
  const addonIds = useMemo(() => 
    selectedAddons.map(a => a.product_id).sort((a, b) => a - b),
    [selectedAddons]
  );
  
  const {
    breakdown,
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

  // Calculate server-side pricing when inputs change
  useEffect(() => {
    const calculateServerPricing = async () => {
      if (!state.currentSession || !hasItems) {
        // Clear server pricing when no items
        setServerPricing(null);
        return;
      }

      setCalculatingServerPricing(true);
      setServerPricingError(null);

      try {
        const pricing = await BookingCoreApi.calculatePricing(
          state.currentSession.session_id,
          discountCode || undefined
        );
        setServerPricing(pricing);
      } catch (err) {
        setServerPricingError('Failed to calculate pricing');
        console.error('Server pricing calculation failed:', err);
      } finally {
        setCalculatingServerPricing(false);
      }
    };

    // CRITICAL FIX: Increased debounce timeout to prevent infinite loops
    // This was contributing to rapid-fire server requests that caused the loop
    const timeoutId = setTimeout(calculateServerPricing, 800);
    return () => clearTimeout(timeoutId);
  }, [state.currentSession?.session_id, hasItems, discountCode, packageIds.join(','), addonIds.join(',')]);

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

  // Get step data for submission - Only return discount code
  const getStepData = useCallback((): PricingSummaryStepData => ({
    applied_discount_code: discountCode || undefined,
  }), [discountCode]);

  // Use server pricing if available, otherwise use client-calculated pricing
  const finalBreakdown = useMemo(() => {
    if (serverPricing && serverPricing.total !== "0.00") {
      return {
        ...breakdown,
        subtotal: parseFloat(serverPricing.subtotal),
        tax: parseFloat(serverPricing.tax),
        discount: parseFloat(serverPricing.discount),
        total: parseFloat(serverPricing.total),
      };
    }
    return breakdown;
  }, [serverPricing, breakdown]);

  const finalFormattedBreakdown = useMemo(() => ({
    packages: finalBreakdown.packages,
    addons: finalBreakdown.addons,
    subtotal: formatCurrency(finalBreakdown.subtotal),
    tax: formatCurrency(finalBreakdown.tax),
    discount: formatCurrency(finalBreakdown.discount),
    total: formatCurrency(finalBreakdown.total),
    rawTotal: finalBreakdown.total,
  }), [finalBreakdown, formatCurrency]);

  return {
    // Pricing data
    breakdown: finalBreakdown,
    formattedBreakdown: finalFormattedBreakdown,
    hasItems,
    totalItemCount,
    
    // Discount management
    appliedDiscount,
    discountCode,
    setDiscountCode,
    applyDiscountCode,
    removeDiscount,
    
    // Loading states
    calculatingPricing: calculatingPricing || calculatingServerPricing,
    validatingDiscount,
    
    // Errors
    pricingError: pricingError || serverPricingError,
    discountError,
    
    // Utilities
    formatCurrency,
    recalculate,
    getStepData,

    serverPricing
  };
};