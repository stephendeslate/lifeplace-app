/**
 * VenueSelectionStep
 *
 * Multi-venue selection with pricing and capacity display.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useRentableVenues } from '@/hooks/booking';
import { useBookingContext } from '@/contexts/BookingContext';
import { formatCurrency } from '@/utils/currency';
import type { StepComponentProps } from '../StepRenderer';
import type {
  VenueSelectionStepData,
  VenueSelectionStepConfiguration,
  RentableVenue,
} from '@/types/booking';
import * as Haptics from 'expo-haptics';

type VenueSelectionStepProps = StepComponentProps<VenueSelectionStepData, VenueSelectionStepConfiguration>;

export function VenueSelectionStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: VenueSelectionStepProps) {
  const { state } = useBookingContext();
  const eventTypeId = state.selectedEventType?.id;

  const { data: venues, isLoading, error } = useRentableVenues(eventTypeId);

  const [selectedVenueIds, setSelectedVenueIds] = useState<number[]>(
    data.selected_venue_ids || []
  );

  const {
    min_venues = 1,
    max_venues = 1,
    show_bundle_discount = true,
    bundle_discount_percentage = 10,
    show_pricing = true,
    show_included_hours = true,
  } = configuration || {};

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
    if (selectedVenueIds.length < min_venues) {
      return `Please select at least ${min_venues} venue${min_venues > 1 ? 's' : ''}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Loading venues...</Text>
      </View>
    );
  }

  if (error || !venues) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Couldn't Load Venues</Text>
        <Text style={styles.errorText}>
          There was a problem loading available venues. Please try again.
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
        <Text style={styles.title}>Select Your Venue</Text>
        <Text style={styles.subtitle}>
          {isMultiSelect
            ? `Choose up to ${max_venues} venues for your event`
            : 'Choose where you want to host your event'}
        </Text>
      </View>

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

      {/* Validation message */}
      {(validationErrors?.selected_venue_ids || getValidationMessage()) && (
        <Text style={styles.validationError}>
          {validationErrors?.selected_venue_ids?.[0] || getValidationMessage()}
        </Text>
      )}
    </ScrollView>
  );
}

interface VenueCardProps {
  venue: RentableVenue;
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
    featured_image_url,
    location_description,
    capacity_min,
    capacity_max,
    base_price,
    included_hours,
    excess_hour_rate,
    is_featured,
    operating_rules,
  } = venue;

  const isAllDayAccess = operating_rules?.is_all_day_access;

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
        {featured_image_url ? (
          <Image
            source={{ uri: featured_image_url }}
            style={styles.venueImage}
            contentFit="cover"
            transition={200}
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
                {isAllDayAccess ? 'All-day access' : `${included_hours || 0} hrs included`}
              </Text>
            </View>
          )}
        </View>

        {/* Pricing */}
        {showPricing && base_price && (
          <View style={styles.venuePricing}>
            <View style={styles.venuePriceMain}>
              <Text style={styles.venuePrice}>
                {formatCurrency(parseFloat(base_price), { currency: 'PHP' })}
              </Text>
              <Text style={styles.venuePriceUnit}>
                {isAllDayAccess ? '/ day' : `/ ${included_hours || 0} hrs`}
              </Text>
            </View>
            {!isAllDayAccess && excess_hour_rate && (
              <Text style={styles.venueExcessRate}>
                +{formatCurrency(parseFloat(excess_hour_rate), { currency: 'PHP' })}/hr extra
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
});

export default VenueSelectionStep;
