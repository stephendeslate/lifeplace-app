/**
 * VenueSelectionStep
 *
 * Multi-venue selection with pricing and capacity display.
 * Features:
 * - Event-type-specific pricing via getEffectivePricing
 * - Support for config-provided available_venues_details
 * - Validation indicator during validation
 * - Selection summary with venue names
 *
 * Adapted from: frontend/client-portal/src/components/booking/steps/VenueSelectionStep.tsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Check, MapPin, Users, Clock, Star } from 'phosphor-react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useRentableVenues } from '@/hooks/booking';
import { useBookingContext } from '@/contexts/BookingContext';
import { VenuesAPI } from '@/apis/booking/venues.api';
import { formatCurrency } from '@/utils/currency';
import type { StepComponentProps } from '../StepRenderer';
import type {
  VenueSelectionStepData,
  VenueSelectionStepConfiguration,
  RentableVenue,
  RentableVenueWithEventType,
  MatchedPackage,
} from '@/types/booking';
import * as Haptics from 'expo-haptics';

type VenueSelectionStepProps = StepComponentProps<VenueSelectionStepData, VenueSelectionStepConfiguration> & {
  /** Whether step is currently being validated */
  isValidating?: boolean;
};

export function VenueSelectionStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
  isValidating = false,
}: VenueSelectionStepProps) {
  const { state, actions } = useBookingContext();
  // Use currentFlow.event_type for consistency with PackageSelectionStep
  const eventTypeId = state.currentFlow?.event_type;

  // Find package selection step for "View packages" navigation
  const packageSelectionStepIndex = useMemo(() => {
    const steps = state.currentFlow?.enabled_steps || [];
    return steps.findIndex(s => s.step_type === 'package_selection');
  }, [state.currentFlow?.enabled_steps]);

  // Handle navigation to package selection step
  const handleViewPackages = useCallback(async () => {
    if (packageSelectionStepIndex >= 0) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await actions.goToStep(packageSelectionStepIndex);
    }
  }, [packageSelectionStepIndex, actions]);

  const { data: apiVenues, isLoading, error } = useRentableVenues(eventTypeId);

  const [selectedVenueIds, setSelectedVenueIds] = useState<number[]>(
    data.selected_venue_ids || []
  );

  // Configuration is required - these are business-critical values that must be set
  // If configuration is missing, show an error state instead of using silent fallbacks
  const isConfigurationValid = configuration &&
    typeof configuration.min_venues === 'number' &&
    typeof configuration.max_venues === 'number';

  // Extract configuration values - no fallbacks for required business fields
  const min_venues = configuration?.min_venues;
  const max_venues = configuration?.max_venues;
  const show_bundle_discount = configuration?.show_bundle_discount ?? true;
  const bundle_discount_percentage = configuration?.bundle_discount_percent ?? configuration?.bundle_discount_percentage ?? 10;
  const show_pricing = configuration?.show_pricing ?? true;
  const show_included_hours = configuration?.show_included_hours ?? true;
  const title = configuration?.title || 'Select Your Venue';
  const description = configuration?.description;
  const available_venues_details = configuration?.available_venues_details;
  const show_package_recommendations = configuration?.show_package_recommendations ?? true;
  const show_view_packages_option = configuration?.show_view_packages_option ?? true;
  const view_packages_button_text = configuration?.view_packages_button_text || 'Not sure? View our packages instead';

  // Query for matching packages when venues are selected
  const { data: matchingPackagesData, isLoading: isLoadingPackages } = useQuery({
    queryKey: ['matchingPackages', selectedVenueIds, eventTypeId],
    queryFn: () => VenuesAPI.findMatchingPackages({
      venue_ids: selectedVenueIds,
      event_type_id: eventTypeId,
    }),
    enabled: selectedVenueIds.length > 0 && show_package_recommendations === true,
    staleTime: 30000, // Cache for 30 seconds
    retry: false, // Don't retry on failure
    throwOnError: false, // Don't throw errors to the crash reporter
  });

  const matchingPackages = matchingPackagesData?.packages || [];

  // Use configured venues if available, otherwise use API-fetched venues
  const venues = useMemo((): RentableVenueWithEventType[] => {
    return available_venues_details || apiVenues || [];
  }, [available_venues_details, apiVenues]);

  // Get selected venue objects for display
  const selectedVenueObjects = useMemo(() => {
    return venues.filter((v) => selectedVenueIds.includes(v.id));
  }, [venues, selectedVenueIds]);

  const isMultiSelect = max_venues > 1;

  useEffect(() => {
    setSelectedVenueIds(data.selected_venue_ids || []);
  }, [data.selected_venue_ids]);

  const handleToggleVenue = useCallback(async (venueId: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let newSelection: number[];

    if (isMultiSelect) {
      if (selectedVenueIds.includes(venueId)) {
        newSelection = selectedVenueIds.filter((id) => id !== venueId);
      } else if (selectedVenueIds.length < max_venues) {
        newSelection = [...selectedVenueIds, venueId];
      } else {
        return; // Max venues reached
      }
    } else {
      newSelection = selectedVenueIds.includes(venueId) ? [] : [venueId];
    }

    setSelectedVenueIds(newSelection);
    onDataChange({ selected_venue_ids: newSelection });
  }, [selectedVenueIds, max_venues, isMultiSelect, onDataChange]);

  const isVenueSelected = (venueId: number) => selectedVenueIds.includes(venueId);

  const getValidationMessage = (): string | null => {
    if (!isConfigurationValid) return null;
    if (selectedVenueIds.length < min_venues!) {
      return `Please select at least ${min_venues} venue${min_venues! > 1 ? 's' : ''}`;
    }
    return null;
  };

  // Configuration error - business must configure min/max venues
  if (!isConfigurationValid) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Configuration Required</Text>
        <Text style={styles.errorText}>
          This booking step has not been properly configured. Please contact support.
        </Text>
        <Text style={styles.errorDetail}>
          Missing: min_venues and max_venues configuration
        </Text>
      </View>
    );
  }

  // Only show loading if we don't have config-provided venues
  if (isLoading && !available_venues_details) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Loading venues...</Text>
      </View>
    );
  }

  if (error && !available_venues_details) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Couldn't Load Venues</Text>
        <Text style={styles.errorText}>
          There was a problem loading available venues. Please try again.
        </Text>
      </View>
    );
  }

  if (venues.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>No Venues Available</Text>
        <Text style={styles.errorText}>
          No spaces are currently available for selection.
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
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {description || (isMultiSelect
            ? `Choose up to ${max_venues} venues for your event`
            : 'Choose where you want to host your event')}
        </Text>
      </View>

      {/* View Packages Option */}
      {show_view_packages_option && packageSelectionStepIndex >= 0 && (
        <TouchableOpacity
          style={styles.viewPackagesButton}
          onPress={handleViewPackages}
          activeOpacity={0.7}
        >
          <Star size={18} color={colors.primary.black} />
          <Text style={styles.viewPackagesText}>{view_packages_button_text}</Text>
        </TouchableOpacity>
      )}

      {/* Multi-venue discount banner */}
      {isMultiSelect && show_bundle_discount && selectedVenueIds.length > 1 && (
        <View style={styles.discountBanner}>
          <Star size={18} color={colors.secondary.forest} weight="fill" />
          <Text style={styles.discountText}>
            {bundle_discount_percentage}% multi-venue discount applied!
          </Text>
        </View>
      )}

      {/* Selection count */}
      {isMultiSelect && (
        <View style={styles.selectionCount}>
          <Text style={styles.selectionCountText}>
            {selectedVenueIds.length} of {max_venues} venues selected
          </Text>
        </View>
      )}

      {/* Venue List */}
      <View style={styles.venueList}>
        {venues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            selected={isVenueSelected(venue.id)}
            onPress={() => handleToggleVenue(venue.id)}
            showPricing={show_pricing}
            showIncludedHours={show_included_hours}
            disabled={!isVenueSelected(venue.id) && selectedVenueIds.length >= max_venues}
          />
        ))}
      </View>

      {/* Selection summary */}
      {selectedVenueIds.length > 0 && (
        <View style={styles.selectionSummary}>
          <View style={styles.selectionSummaryHeader}>
            <Check size={18} color={colors.secondary.forest} weight="bold" />
            <Text style={styles.selectionSummaryLabel}>Selected:</Text>
          </View>
          <Text style={styles.selectionSummaryText}>
            {selectedVenueObjects.map((v) => v.name).join(', ')}
          </Text>
          <Text style={styles.selectionSummaryHint}>
            You'll choose your package in the next step.
          </Text>
        </View>
      )}

      {/* Matching Package Recommendations */}
      {show_package_recommendations && selectedVenueIds.length > 0 && matchingPackages.length > 0 && (
        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>
            Matching Packages Found
          </Text>
          <Text style={styles.recommendationsSubtitle}>
            These pre-made packages include your selected venues
          </Text>
          {isLoadingPackages ? (
            <ActivityIndicator size="small" color={colors.primary.black} style={{ marginVertical: spacing.md }} />
          ) : (
            matchingPackages.slice(0, 3).map((pkg: MatchedPackage) => (
              <View key={pkg.id} style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packagePrice}>{formatCurrency(pkg.price)}</Text>
                </View>
                {pkg.description && (
                  <Text style={styles.packageDescription} numberOfLines={2}>
                    {pkg.description}
                  </Text>
                )}
                <View style={styles.packageMeta}>
                  <Text style={styles.packageMatchType}>
                    {pkg.match_type === 'exact' ? 'Exact match' :
                     pkg.match_type === 'superset' ? 'Includes extra venues' :
                     'Partial match'}
                  </Text>
                  {pkg.savings_vs_custom && parseFloat(pkg.savings_vs_custom) > 0 && (
                    <Text style={styles.packageSavings}>
                      Save {formatCurrency(pkg.savings_vs_custom)}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Validation message */}
      {(validationErrors?.selected_venue_ids || getValidationMessage()) && (
        <Text style={styles.validationError}>
          {validationErrors?.selected_venue_ids?.[0] || getValidationMessage()}
        </Text>
      )}

      {/* Validation indicator */}
      {isValidating && (
        <View style={styles.validatingContainer}>
          <ActivityIndicator size="small" color={colors.neutral.darkGray} />
          <Text style={styles.validatingText}>Validating selection...</Text>
        </View>
      )}
    </ScrollView>
  );
}

interface VenueCardProps {
  venue: RentableVenue | RentableVenueWithEventType;
  selected: boolean;
  onPress: () => void;
  showPricing?: boolean;
  showIncludedHours?: boolean;
  disabled?: boolean;
}

function VenueCard({
  venue,
  selected,
  onPress,
  showPricing = true,
  showIncludedHours = true,
  disabled = false,
}: VenueCardProps) {
  const {
    name,
    description,
    featured_image,
    location_description,
    capacity_min,
    capacity_max,
    is_featured,
  } = venue;

  // Use getEffectivePricing for event-type-specific pricing
  const pricing = VenuesAPI.getEffectivePricing(venue);

  return (
    <TouchableOpacity
      style={[
        styles.venueCard,
        selected && styles.venueCardSelected,
        disabled && styles.venueCardDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {/* Image */}
      <View style={styles.venueImageContainer}>
        {featured_image ? (
          <Image
            source={{ uri: featured_image }}
            style={styles.venueImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.venueImage, styles.venueImagePlaceholder]}>
            <MapPin size={32} color={colors.neutral.gray} />
          </View>
        )}

        {is_featured && (
          <View style={styles.featuredBadge}>
            <Star size={12} color={colors.semantic.warning} weight="fill" />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
        )}

        {selected && (
          <View style={styles.selectedBadge}>
            <Check size={16} color={colors.neutral.white} weight="bold" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.venueContent}>
        <Text style={styles.venueName} numberOfLines={1}>{name}</Text>

        {location_description && (
          <View style={styles.venueLocation}>
            <MapPin size={14} color={colors.neutral.gray} />
            <Text style={styles.venueLocationText} numberOfLines={1}>
              {location_description}
            </Text>
          </View>
        )}

        {description && (
          <Text style={styles.venueDescription} numberOfLines={2}>
            {description}
          </Text>
        )}

        {/* Meta info */}
        <View style={styles.venueMeta}>
          {/* Capacity */}
          {(capacity_min || capacity_max) && (
            <View style={styles.venueMetaItem}>
              <Users size={14} color={colors.neutral.darkGray} />
              <Text style={styles.venueMetaText}>
                {capacity_min && capacity_max
                  ? `${capacity_min}-${capacity_max}`
                  : capacity_max || capacity_min} guests
              </Text>
            </View>
          )}

          {/* Hours */}
          {showIncludedHours && (
            <View style={styles.venueMetaItem}>
              <Clock size={14} color={colors.neutral.darkGray} />
              <Text style={styles.venueMetaText}>
                {pricing.isOvernight
                  ? 'Overnight'
                  : pricing.isAllDayAccess
                    ? 'All-day access'
                    : `${pricing.includedHours || 0} hrs included`}
              </Text>
            </View>
          )}
        </View>

        {/* Pricing - using effective pricing from API */}
        {showPricing && pricing.basePrice && (
          <View style={styles.venuePricing}>
            <View style={styles.venuePriceMain}>
              <Text style={styles.venuePrice}>
                {formatCurrency(parseFloat(pricing.basePrice), { currency: 'PHP' })}
              </Text>
              <Text style={styles.venuePriceUnit}>
                {pricing.isOvernight
                  ? '/ night'
                  : pricing.isAllDayAccess
                    ? '/ day'
                    : `/ ${pricing.includedHours || 0} hrs`}
              </Text>
            </View>
            {!pricing.isAllDayAccess && !pricing.isOvernight && pricing.excessHourPrice && (
              <Text style={styles.venueExcessRate}>
                +{formatCurrency(parseFloat(pricing.excessHourPrice), { currency: 'PHP' })}/hr extra
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
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
  errorDetail: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontFamily: 'monospace',
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
  viewPackagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.neutral.cream,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
    borderStyle: 'dashed',
  } as const,
  viewPackagesText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  // Package recommendations styles
  recommendationsContainer: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  recommendationsTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  recommendationsSubtitle: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.md,
  },
  packageCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  packageName: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
    flex: 1,
  },
  packagePrice: {
    ...typeScale.titleSmall,
    color: colors.secondary.forest,
  },
  packageDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  packageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageMatchType: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  packageSavings: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.forestSubtle,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  discountText: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  selectionCount: {
    marginBottom: spacing.md,
  },
  selectionCountText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  venueList: {
    gap: spacing.md,
  },
  venueCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  venueCardSelected: {
    borderColor: colors.primary.black,
  },
  venueCardDisabled: {
    opacity: 0.5,
  },
  venueImageContainer: {
    position: 'relative',
  },
  venueImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.neutral.sand,
  },
  venueImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.alpha.black60,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.full,
    gap: spacing.xxs,
  },
  featuredBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueContent: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  venueName: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  venueLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  venueLocationText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    flex: 1,
  },
  venueDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.xxs,
  },
  venueMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  venueMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  venueMetaText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  venuePricing: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  venuePriceMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs,
  },
  venuePrice: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
    fontWeight: '700',
  },
  venuePriceUnit: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  venueExcessRate: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.xxs,
  },
  validationError: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  selectionSummary: {
    backgroundColor: colors.secondary.forestSubtle,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  selectionSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  selectionSummaryLabel: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  selectionSummaryText: {
    ...typeScale.bodySmall,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  selectionSummaryHint: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  validatingText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
});

export default VenueSelectionStep;
