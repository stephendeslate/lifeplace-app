// frontend/client-portal/src/components/booking/steps/CleanPackageSelectionStep/usePackageSelectionLogic.ts

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  ProductOption,
  PackageSelectionStepData,
  PackageSelectionStepConfiguration,
  SelectedPackage,
} from '@/types/booking';
import type { VenueSelectionStepData, DateTimeStepData } from '@/types/booking/stepData.types';
import { ProductsApi } from '@/apis/booking/products.api';
import { VenuesApi } from '@/apis/booking/venues.api';
import { useBooking } from '@/contexts/BookingContext';
import { useCurrencySettings } from '@/hooks/useCurrency';
import { extractGuestCount, extractChildPricingConfig } from './utils';

interface UsePackageSelectionLogicParams {
  stepData: PackageSelectionStepData;
  config: PackageSelectionStepConfiguration | null;
  onDataChange: (data: PackageSelectionStepData) => void;
  validationErrors: Record<string, string[]>;
  venueSelectionData?: VenueSelectionStepData;
  dateTimeStepData?: DateTimeStepData;
  eventTypeId?: number;
}

export function usePackageSelectionLogic({
  stepData,
  config,
  onDataChange,
  validationErrors,
  venueSelectionData,
  dateTimeStepData,
  eventTypeId,
}: UsePackageSelectionLogicParams) {
  const { state, actions } = useBooking();
  const { formatAmount } = useCurrencySettings();

  // Extract guest count from questionnaire responses (for per-person package auto-fill)
  const guestCountFromQuestionnaire = useMemo(
    () =>
      extractGuestCount(
        state.stepData?.questionnaire?.responses as Record<string, unknown> | undefined,
        state.currentFlow?.enabled_steps,
      ),
    [state.stepData?.questionnaire?.responses, state.currentFlow?.enabled_steps],
  );

  // Extract child pricing config from payment_info step
  const childPricingConfig = useMemo(
    () => extractChildPricingConfig(state.currentFlow?.enabled_steps),
    [state.currentFlow?.enabled_steps],
  );

  // Calculate event days from datetime step data
  const eventDays = useMemo(() => {
    if (!dateTimeStepData?.start_date) return null;
    if (!dateTimeStepData?.end_date) return 1; // Single day event

    const start = new Date(dateTimeStepData.start_date);
    const end = new Date(dateTimeStepData.end_date);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end day
  }, [dateTimeStepData?.start_date, dateTimeStepData?.end_date]);

  // Filter packages by event_days (exact match when eventDays is known)
  const filterPackagesByEventDays = useCallback(
    (packages: ProductOption[]): ProductOption[] => {
      if (eventDays === null) return packages;
      return packages.filter((pkg) => {
        if (pkg.event_days === null || pkg.event_days === undefined) return true;
        return pkg.event_days === eventDays;
      });
    },
    [eventDays],
  );

  const [availablePackages, setAvailablePackages] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [venueAdditionalHours, setVenueAdditionalHours] = useState<Record<number, number>>(() => {
    if (stepData.venue_additional_hours) {
      return Object.entries(stepData.venue_additional_hours).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [parseInt(key)]: value,
        }),
        {} as Record<number, number>,
      );
    }
    return {};
  });
  const selectionType = (config?.selection_type || 'SINGLE') as 'SINGLE' | 'MULTIPLE';
  const minSelection = config?.min_selection || 1;
  const maxSelection = config?.max_selection || 1;

  // Sync venue hours from stepData when it changes (e.g., when navigating back to this step)
  useEffect(() => {
    if (
      stepData.venue_additional_hours &&
      Object.keys(stepData.venue_additional_hours).length > 0
    ) {
      const hoursFromStep = Object.entries(stepData.venue_additional_hours).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [parseInt(key)]: value,
        }),
        {} as Record<number, number>,
      );

      const currentKeys = Object.keys(venueAdditionalHours).sort().join(',');
      const newKeys = Object.keys(hoursFromStep).sort().join(',');
      const currentVals = Object.values(venueAdditionalHours).sort().join(',');
      const newVals = Object.values(hoursFromStep).sort().join(',');

      if (currentKeys !== newKeys || currentVals !== newVals) {
        setVenueAdditionalHours(hoursFromStep);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- venueAdditionalHours is intentionally excluded to prevent infinite loops
  }, [stepData.venue_additional_hours]);

  // Apply event_days filtering to available packages
  const filteredPackages = useMemo(() => {
    return filterPackagesByEventDays(availablePackages);
  }, [availablePackages, filterPackagesByEventDays]);

  // Get selected venue IDs from previous step
  const selectedVenueIds = useMemo(
    () => venueSelectionData?.selected_venue_ids || [],
    [venueSelectionData?.selected_venue_ids],
  );
  const hasVenueSelection = selectedVenueIds.length > 0;

  // Fetch venues for display and custom bundle calculation with event-type-specific pricing
  const { data: allVenues } = useQuery({
    queryKey: ['rentable-venues', eventTypeId],
    queryFn: () => VenuesApi.getRentableVenues(eventTypeId),
    enabled: hasVenueSelection,
  });

  // Get selected venue objects
  const selectedVenues = useMemo(() => {
    if (!allVenues || !hasVenueSelection) return [];
    return allVenues.filter((v) => selectedVenueIds.includes(v.id));
  }, [allVenues, selectedVenueIds, hasVenueSelection]);

  // Calculate custom bundle pricing using effective pricing (event-type-specific if available)
  const customBundlePricing = useMemo(() => {
    if (selectedVenues.length === 0) return null;

    const venuePricings = selectedVenues.map((v) => ({
      venue: v,
      pricing: VenuesApi.getEffectivePricing(v),
    }));

    const subtotal = venuePricings.reduce(
      (sum, { pricing }) => sum + parseFloat(pricing.basePrice || '0'),
      0,
    );

    const hasAllDayAccess = venuePricings.some(({ pricing }) => pricing.isAllDayAccess);

    const totalHours = hasAllDayAccess
      ? 24
      : venuePricings.reduce(
          (sum, { pricing }) => sum + parseFloat(pricing.includedHours || '0'),
          0,
        );

    const hasDiscount = selectedVenues.length > 1;
    const discountPercent = 10;
    const discountAmount = hasDiscount ? subtotal * (discountPercent / 100) : 0;
    const total = subtotal - discountAmount;

    const firstVenuePricing = venuePricings[0]?.pricing;
    const excessHourPrice = hasAllDayAccess ? '0' : firstVenuePricing?.excessHourPrice || '0';

    return {
      subtotal,
      totalHours,
      hasDiscount,
      discountPercent,
      discountAmount,
      total,
      excessHourPrice,
      venueNames: selectedVenues.map((v) => v.name).join(' + '),
      hasAllDayAccess,
    };
  }, [selectedVenues]);

  // Create a virtual "custom bundle" package option
  const isMultiVenue = selectedVenues.length > 1;
  const customBundlePackage: ProductOption | null = useMemo(() => {
    if (!customBundlePricing || selectedVenues.length === 0) return null;

    const packageName = isMultiVenue
      ? `Custom: ${customBundlePricing.venueNames}`
      : selectedVenues[0]?.name || 'Your Venue';

    let packageDescription: string;
    if (isMultiVenue) {
      packageDescription = `Your custom package with ${selectedVenues.length} venues. Includes ${customBundlePricing.discountPercent}% multi-venue discount.`;
    } else if (customBundlePricing.hasAllDayAccess) {
      packageDescription = `Book ${selectedVenues[0]?.name} with all-day access for your event.`;
    } else {
      packageDescription = `Book ${selectedVenues[0]?.name} for your event.`;
    }

    return {
      id: -1,
      name: packageName,
      description: packageDescription,
      base_price: customBundlePricing.total.toString(),
      formatted_price: `₱${customBundlePricing.total.toLocaleString()}`,
      included_hours: customBundlePricing.hasAllDayAccess
        ? 'All day'
        : customBundlePricing.totalHours,
      excess_hour_price: customBundlePricing.excessHourPrice,
      has_excess_hours: !customBundlePricing.hasAllDayAccess,
      pricing_model: 'FIXED' as const,
      type: 'PACKAGE' as const,
      is_active: true,
      is_featured: false,
    } as ProductOption;
  }, [customBundlePricing, selectedVenues, isMultiVenue]);

  // Get filter_by_event_type from config
  const filterByEventType = config?.filter_by_event_type ?? true;
  const effectiveEventTypeId = filterByEventType ? eventTypeId : undefined;

  useEffect(() => {
    const loadPackages = async () => {
      setIsLoading(true);
      try {
        let packages: ProductOption[] = [];

        if (config?.available_packages_details?.length) {
          packages = config.available_packages_details;
        } else if (config?.available_categories?.length) {
          const allPackages = await ProductsApi.getPackages(effectiveEventTypeId);
          const categoryIds = new Set(config.available_categories);
          packages = allPackages.filter((pkg) => categoryIds.has(pkg.category));
        } else {
          packages = await ProductsApi.getPackages(effectiveEventTypeId);
        }

        setAvailablePackages(Array.isArray(packages) ? packages : []);
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load packages:', err);
        setAvailablePackages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPackages();
  }, [config?.available_packages_details, config?.available_categories, effectiveEventTypeId]);

  // Helper to build complete data with venue hours
  const buildCompleteData = useCallback(
    (packages: SelectedPackage[]): PackageSelectionStepData => {
      const venueHoursForApi = Object.entries(venueAdditionalHours).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: value,
        }),
        {} as Record<string, number>,
      );

      const dataToSend: PackageSelectionStepData = {
        selected_packages: packages,
      };

      if (selectedVenues.length > 0 && Object.keys(venueHoursForApi).length > 0) {
        dataToSend.venue_additional_hours = venueHoursForApi;
      }

      return dataToSend;
    },
    [venueAdditionalHours, selectedVenues.length],
  );

  // Effect to update venue hours when they change
  useEffect(() => {
    if (
      selectedVenues.length > 0 &&
      stepData.selected_packages &&
      stepData.selected_packages.length > 0
    ) {
      onDataChange(buildCompleteData(stepData.selected_packages));
    }
  }, [venueAdditionalHours]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate totals and selection state
  const selectedPackageIds = useMemo(
    () => stepData.selected_packages?.map((p) => p.product_id) || [],
    [stepData.selected_packages],
  );
  const totalSelected = stepData.selected_packages?.length || 0;
  const canSelectMore = selectionType === 'MULTIPLE' && totalSelected < maxSelection;

  // Calculate subtotal for display (packages + excess hours)
  const subtotalPrice = useMemo(() => {
    const packagesPrice =
      stepData.selected_packages?.reduce((sum, pkg) => {
        const price = parseFloat(pkg.price || '0');
        return sum + price * (pkg.quantity || 1);
      }, 0) || 0;

    const excessHoursCost = selectedVenues.reduce((sum, venue) => {
      const additionalHours = venueAdditionalHours[venue.id] || 0;
      const effectivePricing = VenuesApi.getEffectivePricing(venue);
      const excessPrice = parseFloat(effectivePricing.excessHourPrice || '0');
      return sum + additionalHours * excessPrice;
    }, 0);

    return packagesPrice + excessHoursCost;
  }, [stepData.selected_packages, selectedVenues, venueAdditionalHours]);

  // Calculate total with tax
  const totalPrice = useMemo(() => {
    const tax = subtotalPrice * state.taxRate;
    return subtotalPrice + tax;
  }, [subtotalPrice, state.taxRate]);

  // Update global price immediately for optimistic UI
  useEffect(() => {
    if (totalPrice > 0) {
      actions.setOptimisticPrice(totalPrice.toFixed(2));

      const tax = subtotalPrice * state.taxRate;
      actions.setPricingBreakdown({
        subtotal: subtotalPrice.toFixed(2),
        tax: tax.toFixed(2),
        discount: '0.00',
        formattedSubtotal: formatAmount(subtotalPrice),
        formattedTax: formatAmount(tax),
        formattedDiscount: '',
      });
    }
  }, [totalPrice, subtotalPrice, state.taxRate, formatAmount, actions]);

  // Check if custom bundle is selected
  const isCustomBundleSelected = selectedPackageIds.includes(-1);

  // Handle package selection
  const handlePackageSelect = useCallback(
    (pkg: ProductOption) => {
      const isCurrentlySelected = selectedPackageIds.includes(pkg.id);

      if (selectionType === 'SINGLE') {
        if (isCurrentlySelected) {
          onDataChange(buildCompleteData([]));
        } else {
          const isPerPerson = pkg.pricing_unit === 'PER_PERSON';
          const initialQuantity = isPerPerson
            ? Math.max(pkg.minimum_guests || 1, guestCountFromQuestionnaire || 0)
            : 1;

          const selectedPkg: SelectedPackage = {
            product_id: pkg.id,
            name: pkg.name,
            price: pkg.base_price,
            quantity: initialQuantity,
            included_hours: pkg.included_hours,
            excess_hour_price: pkg.excess_hour_price,
            pricing_unit: pkg.pricing_unit,
            pricing_unit_display: pkg.pricing_unit_display,
            minimum_guests: pkg.minimum_guests,
            maximum_guests: pkg.maximum_guests,
          };

          if (isPerPerson && childPricingConfig.enabled) {
            const adultTier =
              childPricingConfig.tiers.find((t) => t.discount_percentage === 0) ||
              childPricingConfig.tiers[0];
            const basePriceNum = parseFloat(pkg.base_price);
            selectedPkg.attendee_breakdown = childPricingConfig.tiers.map((tier) => ({
              tier_label: tier.label,
              min_age: tier.min_age,
              max_age: tier.max_age,
              count: tier === adultTier ? initialQuantity : 0,
              discount_percentage: tier.discount_percentage,
              unit_price: basePriceNum * (1 - tier.discount_percentage / 100),
              subtotal:
                tier === adultTier
                  ? basePriceNum * (1 - tier.discount_percentage / 100) * initialQuantity
                  : 0,
            }));
          }

          if (pkg.id === -1) {
            selectedPkg.is_custom_bundle = true;
            selectedPkg.venue_ids = selectedVenueIds;
          }

          onDataChange(buildCompleteData([selectedPkg]));
        }
      } else {
        // MULTIPLE selection
        if (isCurrentlySelected) {
          const updatedPackages =
            stepData.selected_packages?.filter((p) => p.product_id !== pkg.id) || [];
          onDataChange(buildCompleteData(updatedPackages));
        } else if (canSelectMore) {
          const isPerPerson = pkg.pricing_unit === 'PER_PERSON';
          const initialQuantity = isPerPerson
            ? Math.max(pkg.minimum_guests || 1, guestCountFromQuestionnaire || 0)
            : 1;

          const selectedPkg: SelectedPackage = {
            product_id: pkg.id,
            name: pkg.name,
            price: pkg.base_price,
            quantity: initialQuantity,
            included_hours: pkg.included_hours,
            excess_hour_price: pkg.excess_hour_price,
            pricing_unit: pkg.pricing_unit,
            pricing_unit_display: pkg.pricing_unit_display,
            minimum_guests: pkg.minimum_guests,
            maximum_guests: pkg.maximum_guests,
          };

          if (isPerPerson && childPricingConfig.enabled) {
            const adultTier =
              childPricingConfig.tiers.find((t) => t.discount_percentage === 0) ||
              childPricingConfig.tiers[0];
            const basePriceNum = parseFloat(pkg.base_price);
            selectedPkg.attendee_breakdown = childPricingConfig.tiers.map((tier) => ({
              tier_label: tier.label,
              min_age: tier.min_age,
              max_age: tier.max_age,
              count: tier === adultTier ? initialQuantity : 0,
              discount_percentage: tier.discount_percentage,
              unit_price: basePriceNum * (1 - tier.discount_percentage / 100),
              subtotal:
                tier === adultTier
                  ? basePriceNum * (1 - tier.discount_percentage / 100) * initialQuantity
                  : 0,
            }));
          }

          if (pkg.id === -1) {
            selectedPkg.is_custom_bundle = true;
            selectedPkg.venue_ids = selectedVenueIds;
          }

          const updatedPackages = [...(stepData.selected_packages || []), selectedPkg];
          onDataChange(buildCompleteData(updatedPackages));
        }
      }
    },
    [
      stepData.selected_packages,
      selectedPackageIds,
      selectionType,
      canSelectMore,
      onDataChange,
      selectedVenueIds,
      buildCompleteData,
      guestCountFromQuestionnaire,
      childPricingConfig,
    ],
  );

  // Handle quantity change (with PER_PERSON minimum enforcement)
  const handleQuantityChange = useCallback(
    (pkg: ProductOption, quantity: number) => {
      if (quantity === 0) {
        const updatedPackages =
          stepData.selected_packages?.filter((p) => p.product_id !== pkg.id) || [];
        onDataChange(buildCompleteData(updatedPackages));
      } else {
        let clampedQuantity = quantity;
        if (pkg.pricing_unit === 'PER_PERSON') {
          const minQty = pkg.minimum_guests || 1;
          clampedQuantity = Math.max(minQty, quantity);
        }

        const updatedPackages =
          stepData.selected_packages?.map((p) => {
            if (p.product_id !== pkg.id) return p;

            if (p.attendee_breakdown && p.attendee_breakdown.length > 0) {
              const currentTotal = p.attendee_breakdown.reduce((sum, t) => sum + t.count, 0);
              const delta = clampedQuantity - currentTotal;
              if (delta !== 0) {
                const adultIdx = p.attendee_breakdown.findIndex((t) => t.discount_percentage === 0);
                const adjustIdx = adultIdx >= 0 ? adultIdx : 0;
                const updatedBreakdown = p.attendee_breakdown.map((tier, idx) => {
                  if (idx !== adjustIdx) return tier;
                  const newCount = Math.max(0, tier.count + delta);
                  return {
                    ...tier,
                    count: newCount,
                    subtotal: tier.unit_price * newCount,
                  };
                });
                return {
                  ...p,
                  quantity: clampedQuantity,
                  attendee_breakdown: updatedBreakdown,
                };
              }
            }

            return { ...p, quantity: clampedQuantity };
          }) || [];
        onDataChange(buildCompleteData(updatedPackages));
      }
    },
    [stepData.selected_packages, onDataChange, buildCompleteData],
  );

  // Handle attendee breakdown tier count changes
  const handleAttendeeBreakdownChange = useCallback(
    (packageId: number, tierIndex: number, newCount: number) => {
      const clampedCount = Math.max(0, newCount);
      const updatedPackages =
        stepData.selected_packages?.map((p) => {
          if (p.product_id !== packageId || !p.attendee_breakdown) return p;

          const updatedBreakdown = p.attendee_breakdown.map((tier, idx) => {
            if (idx !== tierIndex) return tier;
            return {
              ...tier,
              count: clampedCount,
              subtotal: tier.unit_price * clampedCount,
            };
          });

          const totalCount = updatedBreakdown.reduce((sum, t) => sum + t.count, 0);

          const minGuests = p.minimum_guests || 1;
          if (totalCount < minGuests) {
            if (clampedCount < (p.attendee_breakdown[tierIndex]?.count ?? 0)) {
              return p;
            }
          }

          if (p.maximum_guests && totalCount > p.maximum_guests) {
            return p;
          }

          return {
            ...p,
            quantity: totalCount,
            attendee_breakdown: updatedBreakdown,
          };
        }) || [];

      onDataChange(buildCompleteData(updatedPackages));
    },
    [stepData.selected_packages, onDataChange, buildCompleteData],
  );

  // Reset attendee breakdown to default
  const handleResetBreakdown = useCallback(
    (packageId: number) => {
      const updatedPackages =
        stepData.selected_packages?.map((p) => {
          if (p.product_id !== packageId || !p.attendee_breakdown) return p;

          const adultIdx = p.attendee_breakdown.findIndex((t) => t.discount_percentage === 0);
          const resetIdx = adultIdx >= 0 ? adultIdx : 0;

          const resetBreakdown = p.attendee_breakdown.map((tier, idx) => ({
            ...tier,
            count: idx === resetIdx ? p.quantity : 0,
            subtotal: idx === resetIdx ? tier.unit_price * p.quantity : 0,
          }));

          return { ...p, attendee_breakdown: resetBreakdown };
        }) || [];

      onDataChange(buildCompleteData(updatedPackages));
    },
    [stepData.selected_packages, onDataChange, buildCompleteData],
  );

  // Handle venue hours change
  const handleVenueHoursChange = useCallback(
    (venueId: number, hours: number) => {
      const newHours = {
        ...venueAdditionalHours,
        [venueId]: hours,
      };
      setVenueAdditionalHours(newHours);

      if (stepData.selected_packages && stepData.selected_packages.length > 0) {
        const venueHoursForApi = Object.entries(newHours).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: value,
          }),
          {} as Record<string, number>,
        );

        onDataChange({
          selected_packages: stepData.selected_packages,
          venue_additional_hours: venueHoursForApi,
        });
      }
    },
    [venueAdditionalHours, stepData.selected_packages, onDataChange],
  );

  const hasFieldError = useCallback(
    (fieldName: string) => {
      return !!(validationErrors[fieldName]?.length > 0);
    },
    [validationErrors],
  );

  const getFieldError = useCallback(
    (fieldName: string) => {
      return validationErrors[fieldName]?.[0];
    },
    [validationErrors],
  );

  return {
    isLoading,
    filteredPackages,
    selectedVenues,
    customBundlePackage,
    isMultiVenue,
    isCustomBundleSelected,
    selectionType,
    minSelection,
    maxSelection,
    totalSelected,
    canSelectMore,
    selectedPackageIds,
    venueAdditionalHours,
    totalPrice,
    childPricingConfig,
    hasVenueSelection,
    handlePackageSelect,
    handleQuantityChange,
    handleAttendeeBreakdownChange,
    handleResetBreakdown,
    handleVenueHoursChange,
    hasFieldError,
    getFieldError,
  };
}
