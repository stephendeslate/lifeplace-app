import { useState, useCallback, useEffect, useMemo } from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { useSimplePricing } from '@/hooks/booking/useSimplePricing';
import { BookingCoreApi } from '@/apis/booking/core';
import { useCurrencySettings } from '@/hooks/useCurrency';
import { formatPhilippinesTime } from '@/utils/timezone';
import type {
  PricingSummaryStepData,
  PricingSummaryStepConfiguration,
  BookingFlow,
  SelectedPackage,
} from '@/types/booking';

interface UsePricingSummaryLogicParams {
  stepData: PricingSummaryStepData;
  config: PricingSummaryStepConfiguration | null;
  onDataChange: (data: PricingSummaryStepData) => void;
  flow?: BookingFlow | null;
}

export function usePricingSummaryLogic({
  stepData,
  config: _config,
  onDataChange,
  flow,
}: UsePricingSummaryLogicParams) {
  const { state, actions } = useBooking();
  const { formatAmount } = useCurrencySettings();
  const [discountCodeInput, setDiscountCodeInput] = useState<string>('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  // Get selected packages and addons from step data - memoized to prevent infinite loops
  const selectedPackages: SelectedPackage[] = useMemo(
    () =>
      state.stepData.package_selection?.selected_packages ||
      (
        state.stepData.venue_selection as {
          selected_packages?: SelectedPackage[];
        }
      )?.selected_packages ||
      (state.currentSession?.booking_data?.selected_packages as SelectedPackage[] | undefined) ||
      [],
    [
      state.stepData.package_selection?.selected_packages,
      state.stepData.venue_selection,
      state.currentSession?.booking_data?.selected_packages,
    ],
  );

  const selectedAddons = useMemo(
    () => state.stepData.addon_selection?.selected_addons || [],
    [state.stepData.addon_selection?.selected_addons],
  );

  // Get venue_additional_hours from addon_selection or package_selection step data
  const venueAdditionalHours = useMemo(
    () =>
      state.stepData.addon_selection?.venue_additional_hours ||
      state.stepData.package_selection?.venue_additional_hours ||
      (state.currentSession?.booking_data?.venue_additional_hours as
        | Record<string, number>
        | undefined) ||
      undefined,
    [
      state.stepData.addon_selection?.venue_additional_hours,
      state.stepData.package_selection?.venue_additional_hours,
      state.currentSession?.booking_data?.venue_additional_hours,
    ],
  );

  // Use simplified unified pricing hook
  const {
    pricing,
    loading: calculatingPricing,
    error: pricingError,
    hasItems,
    totalItemCount,
    recalculate,
  } = useSimplePricing(
    selectedPackages,
    selectedAddons,
    stepData.applied_discount_code,
    venueAdditionalHours,
  );

  // Determine if this is "quote mode"
  const hasPackagesSelected = selectedPackages.length > 0;
  const isQuoteMode = !hasPackagesSelected && selectedAddons.length > 0;

  // Update parent component with calculated pricing data
  const updatePricingData = useCallback(async () => {
    const newStepData: PricingSummaryStepData = {
      applied_discount_code: stepData.applied_discount_code || undefined,
      special_requests: stepData.special_requests || '',
      terms_accepted: stepData.terms_accepted || false,
      marketing_consent: stepData.marketing_consent || false,
    };

    if (JSON.stringify(newStepData) === JSON.stringify(stepData)) {
      return;
    }

    try {
      onDataChange(newStepData);
      await actions.updateStepData('pricing_summary', newStepData as Record<string, unknown>);

      const totalString = pricing.total.toFixed(2);
      if (state.totalPrice !== totalString) {
        await actions.updateTotalPrice(totalString);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to update pricing data:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepData, onDataChange, pricing.total, state.totalPrice]);

  // Update pricing data when total changes
  useEffect(() => {
    if (hasItems && !calculatingPricing) {
      const timeoutId = setTimeout(() => {
        updatePricingData();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [pricing.total, hasItems, calculatingPricing, updatePricingData]);

  // Sync pricing breakdown to context for footer display
  useEffect(() => {
    if (hasItems && !calculatingPricing) {
      actions.setPricingBreakdown({
        subtotal: pricing.subtotal.toFixed(2),
        tax: pricing.tax.toFixed(2),
        discount: pricing.discount.toFixed(2),
        formattedSubtotal: pricing.formattedSubtotal,
        formattedTax: pricing.formattedTax,
        formattedDiscount: pricing.formattedDiscount,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing, hasItems, calculatingPricing]);

  // Handle discount code application
  const handleApplyDiscount = async () => {
    if (!discountCodeInput.trim()) return;

    setValidatingDiscount(true);
    setDiscountError(null);

    try {
      const codeToValidate = discountCodeInput.trim();
      const sessionId = state.currentSession?.session_id;
      if (!sessionId) return;

      const result = await BookingCoreApi.calculatePricing(
        sessionId,
        codeToValidate,
        venueAdditionalHours,
      );

      if (result.discount_error) {
        setDiscountError(result.discount_error);
      } else {
        onDataChange({
          ...stepData,
          applied_discount_code: codeToValidate,
        });
        setDiscountCodeInput('');
      }
    } catch (_error) {
      setDiscountError('Unable to validate discount code. Please try again.');
    } finally {
      setValidatingDiscount(false);
    }
  };

  // Handle discount removal
  const handleRemoveDiscount = () => {
    onDataChange({
      ...stepData,
      applied_discount_code: undefined,
    });
    setDiscountError(null);
    setDiscountCodeInput('');
    recalculate();
  };

  // Handle discount code input changes
  const handleDiscountInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountCodeInput(event.target.value);
    setDiscountError(null);
  };

  // Handle terms acceptance change
  const handleTermsChange = (accepted: boolean) => {
    onDataChange({ ...stepData, terms_accepted: accepted });
  };

  // Handle marketing consent change
  const handleMarketingConsentChange = (consent: boolean) => {
    onDataChange({ ...stepData, marketing_consent: consent });
  };

  // Handle special requests change
  const handleSpecialRequestsChange = (requests: string) => {
    onDataChange({ ...stepData, special_requests: requests });
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return formatPhilippinesTime(dateString, false, 'MMMM d, yyyy');
  };

  // Determine if we're updating prices
  const isUpdatingPrices = calculatingPricing && hasItems;

  return {
    // State
    discountCodeInput,
    discountError,
    validatingDiscount,

    // Pricing data
    pricing,
    calculatingPricing,
    pricingError,
    hasItems,
    totalItemCount,
    selectedPackages,
    selectedAddons,
    isQuoteMode,
    isUpdatingPrices,

    // Context
    formatAmount,
    flow,

    // Handlers
    handleApplyDiscount,
    handleRemoveDiscount,
    handleDiscountInputChange,
    handleTermsChange,
    handleMarketingConsentChange,
    handleSpecialRequestsChange,
    formatDate,
  };
}
