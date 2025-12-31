/**
 * PackageSelectionStep
 *
 * Package selection with support for pre-made packages and custom venue bundles.
 * Aligned with: frontend/client-portal/src/components/booking/steps/CleanPackageSelectionStep.tsx
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Check,
  Package,
  Clock,
  Plus,
  Minus,
  Wrench,
  Info,
  CheckCircle,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { usePackages, useRentableVenues } from '@/hooks/booking';
import { useBookingContext } from '@/contexts/BookingContext';
import { VenuesAPI } from '@/apis/booking';
import { formatCurrency } from '@/utils/currency';
import { differenceInDays, parseISO } from 'date-fns';
import type { StepComponentProps } from '../StepRenderer';
import type {
  PackageSelectionStepData,
  PackageSelectionStepConfiguration,
  SelectedPackage,
  RentableVenueWithEventType,
} from '@/types/booking';
import type { ProductOption } from '@/apis/booking/products.api';
import * as Haptics from 'expo-haptics';

type PackageSelectionStepProps = StepComponentProps<PackageSelectionStepData, PackageSelectionStepConfiguration>;

// =============================================================================
// VENUE HOURS SELECTOR COMPONENT
// =============================================================================

interface VenueHoursSelectorProps {
  venues: RentableVenueWithEventType[];
  venueHours: Record<number, number>;
  onHoursChange: (venueId: number, hours: number) => void;
  maxHours?: number;
}

function VenueHoursSelector({
  venues,
  venueHours,
  onHoursChange,
  maxHours = 10,
}: VenueHoursSelectorProps) {
  return (
    <View style={styles.venueHoursContainer}>
      <Text style={styles.venueHoursTitle}>Customize Your Hours</Text>
      <Text style={styles.venueHoursSubtitle}>
        Need more time? Add additional hours to your venues.
      </Text>

      {venues.map((venue) => {
        const pricing = VenuesAPI.getEffectivePricing(venue);
        const additionalHours = venueHours[venue.id] || 0;
        const excessPrice = parseFloat(pricing.excessHourPrice || '0');
        const includedHours = pricing.includedHours;
        const totalCost = additionalHours * excessPrice;

        // Skip hours selector for all-day access venues
        if (pricing.isAllDayAccess) {
          return (
            <View key={venue.id} style={styles.venueHoursItemAllDay}>
              <View style={styles.venueHoursInfo}>
                <Text style={styles.venueHoursVenueName}>{venue.name}</Text>
                <Text style={styles.allDayLabel}>All-day access included</Text>
              </View>
              <View style={styles.allDayBadge}>
                <Text style={styles.allDayBadgeText}>All Day</Text>
              </View>
            </View>
          );
        }

        return (
          <View key={venue.id} style={styles.venueHoursItem}>
            <View style={styles.venueHoursInfo}>
              <Text style={styles.venueHoursVenueName}>{venue.name}</Text>
              <Text style={styles.venueHoursIncluded}>
                Includes {includedHours} hours
              </Text>
            </View>

            <View style={styles.venueHoursControls}>
              <Text style={styles.needMoreLabel}>Need more?</Text>

              <View style={styles.hoursStepper}>
                <TouchableOpacity
                  style={[
                    styles.hoursStepperButton,
                    additionalHours === 0 && styles.hoursStepperButtonDisabled,
                  ]}
                  onPress={() => onHoursChange(venue.id, Math.max(0, additionalHours - 1))}
                  disabled={additionalHours === 0}
                >
                  <Minus
                    size={16}
                    color={additionalHours === 0 ? colors.neutral.gray : colors.primary.black}
                  />
                </TouchableOpacity>

                <Text style={styles.hoursStepperValue}>+{additionalHours}</Text>

                <TouchableOpacity
                  style={[
                    styles.hoursStepperButton,
                    additionalHours >= maxHours && styles.hoursStepperButtonDisabled,
                  ]}
                  onPress={() => onHoursChange(venue.id, Math.min(maxHours, additionalHours + 1))}
                  disabled={additionalHours >= maxHours}
                >
                  <Plus
                    size={16}
                    color={additionalHours >= maxHours ? colors.neutral.gray : colors.primary.black}
                  />
                </TouchableOpacity>
              </View>

              {additionalHours > 0 && (
                <View style={styles.hoursAddedBadge}>
                  <Text style={styles.hoursAddedText}>
                    +{formatCurrency(totalCost, { currency: 'PHP' })}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.excessRateText}>
              Additional hours: {formatCurrency(excessPrice, { currency: 'PHP' })}/hr
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// =============================================================================
// PACKAGE CARD COMPONENT
// =============================================================================

interface PackageCardProps {
  package: ProductOption;
  selected: boolean;
  quantity: number;
  onPress: () => void;
  onQuantityChange: (delta: number) => void;
  showPricing?: boolean;
  showDescription?: boolean;
  showImage?: boolean;
  showQuantity?: boolean;
  disabled?: boolean;
  isCustomBundle?: boolean;
  isMultiVenue?: boolean;
}

function PackageCard({
  package: pkg,
  selected,
  quantity,
  onPress,
  onQuantityChange,
  showPricing = true,
  showDescription = true,
  showImage = true,
  showQuantity = false,
  disabled = false,
  isCustomBundle = false,
  isMultiVenue = false,
}: PackageCardProps) {
  const {
    name,
    description,
    thumbnail_url,
    base_price,
    pricing_model,
    included_hours,
    excess_hour_price,
    has_excess_hours,
  } = pkg;

  return (
    <TouchableOpacity
      style={[
        styles.packageCard,
        selected && styles.packageCardSelected,
        disabled && styles.packageCardDisabled,
        isCustomBundle && styles.packageCardCustomBundle,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {/* Custom Bundle Badge */}
      {isCustomBundle && (
        <View style={styles.customBundleBadge}>
          <Wrench size={14} color={colors.neutral.white} />
          <Text style={styles.customBundleBadgeText}>
            {isMultiVenue ? 'Custom Bundle' : 'Venue Package'}
          </Text>
        </View>
      )}

      {/* Image */}
      {showImage && thumbnail_url && !isCustomBundle && (
        <Image
          source={{ uri: thumbnail_url }}
          style={styles.packageImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      )}

      {/* Content */}
      <View style={[styles.packageContent, isCustomBundle && styles.packageContentCustomBundle]}>
        <View style={styles.packageHeader}>
          <View style={styles.packageTitleRow}>
            <Package size={20} color={isCustomBundle ? colors.tertiary.teal : colors.accent.wood} />
            <Text style={styles.packageName} numberOfLines={1}>{name}</Text>
          </View>
          {selected && (
            <View style={[styles.selectedIndicator, isCustomBundle && styles.selectedIndicatorCustom]}>
              <Check size={16} color={colors.neutral.white} weight="bold" />
            </View>
          )}
        </View>

        {showDescription && description && (
          <Text style={styles.packageDescription} numberOfLines={2}>
            {description}
          </Text>
        )}

        {/* Hours info */}
        {included_hours && (
          <View style={styles.hoursInfo}>
            <Clock size={14} color={colors.neutral.darkGray} />
            <Text style={styles.hoursText}>
              {included_hours === 'All day' ? 'All-day access' : `${included_hours} hours included`}
            </Text>
          </View>
        )}

        {/* Pricing */}
        {showPricing && (
          <View style={styles.packagePricing}>
            <View>
              <Text style={[styles.packagePrice, isCustomBundle && styles.packagePriceCustom]}>
                {formatCurrency(parseFloat(base_price), { currency: 'PHP' })}
              </Text>
              <Text style={styles.packagePriceUnit}>
                {pricing_model === 'HOURLY' ? 'per hour' : 'per event'}
              </Text>
            </View>

            {/* Excess hour pricing */}
            {has_excess_hours && excess_hour_price && (
              <View style={styles.excessHourInfo}>
                <Text style={styles.excessHourLabel}>Additional hours:</Text>
                <Text style={styles.excessHourPrice}>
                  {formatCurrency(parseFloat(excess_hour_price), { currency: 'PHP' })}/hr
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Quantity Selector */}
        {showQuantity && (
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              <Minus size={18} color={quantity <= 1 ? colors.neutral.gray : colors.primary.black} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onQuantityChange(1)}
            >
              <Plus size={18} color={colors.primary.black} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PackageSelectionStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: PackageSelectionStepProps) {
  const { state, actions } = useBookingContext();

  // Use refs for action functions to avoid them being dependencies in useEffect
  // This prevents infinite loops when actions object changes
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const { data: packages, isLoading, error } = usePackages();

  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>(
    data.selected_packages || []
  );
  const [venueAdditionalHours, setVenueAdditionalHours] = useState<Record<number, number>>(
    data.venue_additional_hours
      ? Object.entries(data.venue_additional_hours).reduce((acc, [key, value]) => ({
          ...acc,
          [parseInt(key)]: value,
        }), {} as Record<number, number>)
      : {}
  );

  const {
    selection_type = 'SINGLE',
    min_selection = 1,
    max_selection = 1,
    show_pricing = true,
    show_descriptions = true,
    show_images = true,
  } = configuration || {};

  const isMultiSelect = selection_type === 'MULTIPLE' || max_selection > 1;

  // Get selected venue IDs from venue selection step
  const selectedVenueIds = state.stepData.venue_selection?.selected_venue_ids || [];
  const hasVenueSelection = selectedVenueIds.length > 0;

  // Get event type ID from flow (event_type is the ID directly)
  const eventTypeId = state.currentFlow?.event_type;

  // Fetch rentable venues with event-type-specific pricing
  const { data: allVenues } = useRentableVenues(eventTypeId);

  // Get selected venue objects
  const selectedVenues = useMemo(() => {
    if (!allVenues || !hasVenueSelection) return [];
    return allVenues.filter((v) => selectedVenueIds.includes(v.id));
  }, [allVenues, selectedVenueIds, hasVenueSelection]);

  // Calculate event days from date step data
  const eventDays = useMemo(() => {
    const dateData = state.stepData.date_time;
    if (!dateData?.start_date) return null;
    if (!dateData?.end_date) return 1;

    const start = parseISO(dateData.start_date);
    const end = parseISO(dateData.end_date);
    return differenceInDays(end, start) + 1;
  }, [state.stepData.date_time]);

  // Filter packages by event_days
  const filteredPackages = useMemo(() => {
    if (!packages || eventDays === null) return packages || [];

    return packages.filter((pkg) => {
      // If package has no event_days restriction, it's available for all durations
      if (pkg.event_days === null || pkg.event_days === undefined) return true;
      // Otherwise, exact match required
      return pkg.event_days === eventDays;
    });
  }, [packages, eventDays]);

  // Calculate custom bundle pricing using effective pricing
  const customBundlePricing = useMemo(() => {
    if (selectedVenues.length === 0) return null;

    const venuePricings = selectedVenues.map((v) => ({
      venue: v,
      pricing: VenuesAPI.getEffectivePricing(v),
    }));

    const subtotal = venuePricings.reduce(
      (sum, { pricing }) => sum + parseFloat(pricing.basePrice || '0'),
      0
    );

    const hasAllDayAccess = venuePricings.some(({ pricing }) => pricing.isAllDayAccess);

    const totalHours = hasAllDayAccess
      ? 24
      : venuePricings.reduce(
          (sum, { pricing }) => sum + (pricing.includedHours || 0),
          0
        );

    const hasDiscount = selectedVenues.length > 1;
    const discountPercent = 10; // 10% bundle discount for multi-venue
    const discountAmount = hasDiscount ? subtotal * (discountPercent / 100) : 0;
    const total = subtotal - discountAmount;

    const firstVenuePricing = venuePricings[0]?.pricing;
    const excessHourPrice = hasAllDayAccess ? '0' : (firstVenuePricing?.excessHourPrice || '0');

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

  // Create virtual custom bundle package
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
      id: -1, // Virtual ID for custom package
      name: packageName,
      description: packageDescription,
      base_price: customBundlePricing.total.toString(),
      included_hours: customBundlePricing.hasAllDayAccess
        ? 'All day'
        : customBundlePricing.totalHours.toString(),
      excess_hour_price: customBundlePricing.excessHourPrice,
      has_excess_hours: !customBundlePricing.hasAllDayAccess,
      pricing_model: 'FIXED',
      type: 'PACKAGE',
      is_active: true,
      is_featured: false,
    } as ProductOption;
  }, [customBundlePricing, selectedVenues, isMultiVenue]);

  useEffect(() => {
    setSelectedPackages(data.selected_packages || []);
  }, [data.selected_packages]);

  // Build complete data with venue hours
  const buildCompleteData = useCallback(
    (packages: SelectedPackage[]): PackageSelectionStepData => {
      const venueHoursForApi = Object.entries(venueAdditionalHours).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: value,
        }),
        {} as Record<string, number>
      );

      const dataToSend: PackageSelectionStepData = {
        selected_packages: packages,
      };

      if (selectedVenues.length > 0 && Object.keys(venueHoursForApi).length > 0) {
        dataToSend.venue_additional_hours = venueHoursForApi;
      }

      return dataToSend;
    },
    [venueAdditionalHours, selectedVenues.length]
  );

  const isPackageSelected = (packageId: number): boolean => {
    return selectedPackages.some((p) => p.product_id === packageId);
  };

  const getPackageQuantity = (packageId: number): number => {
    const pkg = selectedPackages.find((p) => p.product_id === packageId);
    return pkg?.quantity || 0;
  };

  const handleTogglePackage = useCallback(
    async (pkg: ProductOption) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let newSelection: SelectedPackage[];

      if (isPackageSelected(pkg.id)) {
        // Remove package
        newSelection = selectedPackages.filter((p) => p.product_id !== pkg.id);
      } else {
        // Add package
        const newPackage: SelectedPackage = {
          product_id: pkg.id,
          name: pkg.name,
          price: pkg.base_price,
          quantity: 1,
          tax_rate: parseFloat(pkg.tax_rate || '0'),
          included_hours: pkg.included_hours ?? undefined,
          excess_hour_rate: pkg.excess_hour_price ?? undefined,
        };

        // For custom bundle
        if (pkg.id === -1) {
          newPackage.is_custom_bundle = true;
          newPackage.venue_ids = selectedVenueIds;
        }

        if (isMultiSelect) {
          if (selectedPackages.length < max_selection) {
            newSelection = [...selectedPackages, newPackage];
          } else {
            return; // Max selection reached
          }
        } else {
          newSelection = [newPackage];
        }
      }

      setSelectedPackages(newSelection);
      onDataChange(buildCompleteData(newSelection));
    },
    [selectedPackages, isMultiSelect, max_selection, onDataChange, selectedVenueIds, buildCompleteData]
  );

  const handleQuantityChange = useCallback(
    async (packageId: number, delta: number) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newSelection = selectedPackages.map((p) => {
        if (p.product_id === packageId) {
          const newQuantity = Math.max(1, p.quantity + delta);
          return { ...p, quantity: newQuantity };
        }
        return p;
      });

      setSelectedPackages(newSelection);
      onDataChange(buildCompleteData(newSelection));
    },
    [selectedPackages, onDataChange, buildCompleteData]
  );

  const handleVenueHoursChange = useCallback(
    (venueId: number, hours: number) => {
      const newHours = {
        ...venueAdditionalHours,
        [venueId]: hours,
      };
      setVenueAdditionalHours(newHours);

      // Update data with new hours
      if (selectedPackages.length > 0) {
        const venueHoursForApi = Object.entries(newHours).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: value,
          }),
          {} as Record<string, number>
        );

        onDataChange({
          selected_packages: selectedPackages,
          venue_additional_hours: venueHoursForApi,
        });
      }
    },
    [venueAdditionalHours, selectedPackages, onDataChange]
  );

  // Calculate subtotal for display (packages + excess hours)
  // Follows client-portal pattern: CleanPackageSelectionStep.tsx
  const subtotalPrice = useMemo(() => {
    const packagesPrice = selectedPackages.reduce((sum, pkg) => {
      return sum + parseFloat(pkg.price) * pkg.quantity;
    }, 0);

    // Add excess hours cost for selected venues (using effective pricing)
    const excessHoursCost = selectedVenues.reduce((sum, venue) => {
      const additionalHours = venueAdditionalHours[venue.id] || 0;
      const effectivePricing = VenuesAPI.getEffectivePricing(venue);
      const excessPrice = parseFloat(effectivePricing.excessHourPrice || '0');
      return sum + additionalHours * excessPrice;
    }, 0);

    return packagesPrice + excessHoursCost;
  }, [selectedPackages, selectedVenues, venueAdditionalHours]);

  // Calculate total with tax for display (using configured rate from context)
  const totalPrice = useMemo(() => {
    const tax = subtotalPrice * (state.taxRate || 0.12);
    return subtotalPrice + tax;
  }, [subtotalPrice, state.taxRate]);

  // Update global price immediately for optimistic UI (footer display)
  // Follows client-portal pattern: triggers PricingSummaryBar as soon as packages selected
  useEffect(() => {
    if (totalPrice > 0) {
      const taxRate = state.taxRate || 0.12;
      const tax = subtotalPrice * taxRate;

      // Update pricing breakdown for detailed footer display
      // Using ref to avoid infinite loops when actions object changes
      actionsRef.current.setPricingBreakdown({
        subtotal: subtotalPrice.toFixed(2),
        tax: tax.toFixed(2),
        tax_rate: taxRate,
        discount: '0.00',
        total: totalPrice.toFixed(2),
        formattedSubtotal: formatCurrency(subtotalPrice, { currency: 'PHP' }),
        formattedTax: formatCurrency(tax, { currency: 'PHP' }),
        formattedDiscount: '',
        formattedTotal: formatCurrency(totalPrice, { currency: 'PHP' }),
        lineItems: [],
      });
    }
  }, [totalPrice, subtotalPrice, state.taxRate]);

  const isCustomBundleSelected = isPackageSelected(-1);

  const getValidationMessage = (): string | null => {
    if (selectedPackages.length < min_selection) {
      return `Please select at least ${min_selection} package${min_selection > 1 ? 's' : ''}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Loading packages...</Text>
      </View>
    );
  }

  if (error || !packages) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Couldn't Load Packages</Text>
        <Text style={styles.errorText}>
          There was a problem loading available packages. Please try again.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Package</Text>
        <Text style={styles.subtitle}>
          {isMultiSelect
            ? `Choose up to ${max_selection} packages for your event`
            : 'Choose the package that best fits your needs'}
        </Text>

        {/* Venue context */}
        {hasVenueSelection && selectedVenues.length > 0 && (
          <Text style={styles.venueContext}>
            Based on your selection: {selectedVenues.map((v) => v.name).join(', ')}
          </Text>
        )}
      </View>

      {/* Selection count */}
      {isMultiSelect && (
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedPackages.length} of {max_selection} packages selected
          </Text>
          {totalPrice > 0 && (
            <Text style={styles.totalPrice}>
              Total: {formatCurrency(totalPrice, { currency: 'PHP' })}
            </Text>
          )}
        </View>
      )}

      {/* Custom Bundle Option */}
      {customBundlePackage && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isMultiVenue ? 'Create Custom Bundle' : 'Book Your Venue'}
            </Text>
          </View>

          <PackageCard
            key="custom-bundle"
            package={customBundlePackage}
            selected={isCustomBundleSelected}
            quantity={getPackageQuantity(-1)}
            onPress={() => handleTogglePackage(customBundlePackage)}
            onQuantityChange={(delta) => handleQuantityChange(-1, delta)}
            showPricing={show_pricing}
            showDescription={show_descriptions}
            showImage={false}
            showQuantity={isMultiSelect && isCustomBundleSelected}
            disabled={!isCustomBundleSelected && selectedPackages.length >= max_selection}
            isCustomBundle={true}
            isMultiVenue={isMultiVenue}
          />

          {/* Venue Hours Selector when custom bundle is selected */}
          {isCustomBundleSelected && selectedVenues.length > 0 && (
            <VenueHoursSelector
              venues={selectedVenues}
              venueHours={venueAdditionalHours}
              onHoursChange={handleVenueHoursChange}
              maxHours={10}
            />
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CHOOSE A PRE-MADE PACKAGE</Text>
            <View style={styles.dividerLine} />
          </View>
        </>
      )}

      {/* Pre-made Package List */}
      <View style={styles.packageList}>
        {filteredPackages.length > 0 ? (
          filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              package={pkg}
              selected={isPackageSelected(pkg.id)}
              quantity={getPackageQuantity(pkg.id)}
              onPress={() => handleTogglePackage(pkg)}
              onQuantityChange={(delta) => handleQuantityChange(pkg.id, delta)}
              showPricing={show_pricing}
              showDescription={show_descriptions}
              showImage={show_images}
              showQuantity={isMultiSelect && isPackageSelected(pkg.id)}
              disabled={!isPackageSelected(pkg.id) && selectedPackages.length >= max_selection}
            />
          ))
        ) : (
          <View style={styles.noPackages}>
            <Text style={styles.noPackagesTitle}>No packages available</Text>
            {customBundlePackage && (
              <Text style={styles.noPackagesText}>
                You can create a custom package from your venue selection.
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Validation message */}
      {(validationErrors?.selected_packages || getValidationMessage()) && (
        <Text style={styles.validationError}>
          {validationErrors?.selected_packages?.[0] || getValidationMessage()}
        </Text>
      )}

      {/* Total Summary */}
      {selectedPackages.length > 0 && (
        <View style={styles.totalSummary}>
          <CheckCircle size={24} color={colors.secondary.forest} weight="fill" />
          <View style={styles.totalSummaryContent}>
            <Text style={styles.totalSummaryTitle}>
              {selectedPackages.length} {selectedPackages.length === 1 ? 'package' : 'packages'} selected
            </Text>
            <Text style={styles.totalSummaryPrice}>
              {formatCurrency(totalPrice, { currency: 'PHP' })}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  errorTitle: {
    ...typeScale.titleMedium,
    color: colors.semantic.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  venueContext: {
    ...typeScale.labelMedium,
    color: colors.tertiary.teal,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  selectionText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  totalPrice: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral.warmGray,
  },
  dividerText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginHorizontal: spacing.md,
  },
  packageList: {
    gap: spacing.md,
  },
  noPackages: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  noPackagesTitle: {
    ...typeScale.titleMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  noPackagesText: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    textAlign: 'center',
  },
  packageCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  packageCardSelected: {
    borderColor: colors.primary.black,
  },
  packageCardDisabled: {
    opacity: 0.5,
  },
  packageCardCustomBundle: {
    borderColor: colors.tertiary.teal + '40',
    backgroundColor: colors.tertiary.tealSubtle,
  },
  customBundleBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tertiary.teal,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    zIndex: 1,
  },
  customBundleBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  packageImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.neutral.sand,
  },
  packageContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  packageContentCustomBundle: {
    paddingTop: spacing.xl + spacing.sm,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  packageName: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    flex: 1,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorCustom: {
    backgroundColor: colors.tertiary.teal,
  },
  packageDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  hoursInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hoursText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  packagePricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  packagePrice: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
    fontWeight: '700',
  },
  packagePriceCustom: {
    color: colors.tertiary.teal,
  },
  packagePriceUnit: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  excessHourInfo: {
    alignItems: 'flex-end',
  },
  excessHourLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  excessHourPrice: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  validationError: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  totalSummary: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.secondary.forest + '10',
    borderWidth: 1,
    borderColor: colors.secondary.forest + '30',
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
  },
  totalSummaryContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSummaryTitle: {
    ...typeScale.titleSmall,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  totalSummaryPrice: {
    ...typeScale.titleMedium,
    color: colors.secondary.forest,
    fontWeight: '700',
  },
  // Venue Hours Selector Styles
  venueHoursContainer: {
    marginTop: spacing.lg,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
  },
  venueHoursTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  venueHoursSubtitle: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.md,
  },
  venueHoursItem: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  venueHoursItemAllDay: {
    backgroundColor: colors.secondary.forest + '10',
    borderWidth: 1,
    borderColor: colors.secondary.forest + '30',
    borderRadius: layout.borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  venueHoursInfo: {
    marginBottom: spacing.xs,
  },
  venueHoursVenueName: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '600',
  },
  venueHoursIncluded: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  allDayLabel: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
    fontWeight: '500',
  },
  allDayBadge: {
    backgroundColor: colors.secondary.forest,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.full,
  },
  allDayBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  venueHoursControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  needMoreLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  hoursStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.sm,
    padding: spacing.xxs,
    gap: spacing.xs,
  },
  hoursStepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursStepperButtonDisabled: {
    opacity: 0.3,
  },
  hoursStepperValue: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  hoursAddedBadge: {
    backgroundColor: colors.tertiary.teal,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.full,
  },
  hoursAddedText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  excessRateText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
});

export default PackageSelectionStep;
