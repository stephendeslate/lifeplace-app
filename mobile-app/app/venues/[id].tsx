/**
 * Venue Detail Screen
 *
 * Venue detail screen with:
 * - Image gallery header (swipeable)
 * - Venue name and location
 * - Capacity badges (with recommended)
 * - Amenities icon grid
 * - Operating hours/rules with early/late options
 * - Pricing information (if rentable)
 * - "Start Booking" CTA
 * - Favorite button in header
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CaretLeft,
  MapPin,
  Users,
  Clock,
  Moon,
  CalendarCheck,
  Check,
  SwimmingPool,
  Car,
  SpeakerHigh,
  WifiHigh,
  Lightning,
  Tree,
  Campfire,
  Chair,
  Table,
  AirplaneTilt,
  Fan,
  Shower,
  Bed,
  Microphone,
  FilmStrip,
  CookingPot,
  Question,
} from 'phosphor-react-native';

import { useVenue, useRentableVenues } from '@/hooks/useExplore';
import { FavoriteButton, VenueGallery } from '@/components/explore';
import { Skeleton, Button } from '@/components/common';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { formatPrice, formatCapacity, getVenueEffectivePricing } from '@/apis/explore.api';
import type { RentableVenueWithEventType } from '@/types/explore.types';

// Amenity icon mapping
const AMENITY_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'pool': SwimmingPool,
  'swimming pool': SwimmingPool,
  'parking': Car,
  'sound system': SpeakerHigh,
  'sound': SpeakerHigh,
  'audio': SpeakerHigh,
  'wifi': WifiHigh,
  'wi-fi': WifiHigh,
  'internet': WifiHigh,
  'power': Lightning,
  'electricity': Lightning,
  'outlets': Lightning,
  'garden': Tree,
  'outdoor': Tree,
  'nature': Tree,
  'bonfire': Campfire,
  'fire pit': Campfire,
  'campfire': Campfire,
  'chairs': Chair,
  'seating': Chair,
  'tables': Table,
  'ac': Fan,
  'air conditioning': Fan,
  'aircon': Fan,
  'shower': Shower,
  'bathroom': Shower,
  'restroom': Shower,
  'bedroom': Bed,
  'beds': Bed,
  'accommodation': Bed,
  'microphone': Microphone,
  'mic': Microphone,
  'projector': FilmStrip,
  'screen': FilmStrip,
  'kitchen': CookingPot,
  'catering': CookingPot,
  'stage': AirplaneTilt,
  'lighting': Lightning,
  'lights': Lightning,
};

function getAmenityIcon(amenity: string): React.ComponentType<{ size: number; color: string }> {
  const lowerAmenity = amenity.toLowerCase();
  for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
    if (lowerAmenity.includes(key)) {
      return icon;
    }
  }
  return Question;
}

// Description character limit before "Read more"
const DESCRIPTION_LIMIT = 150;

export default function VenueDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const venueId = parseInt(id || '0', 10);

  // State for expandable description
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Fetch venue data
  const { data: venue, isLoading: venueLoading } = useVenue(venueId);
  const { data: rentableVenues } = useRentableVenues();

  // Find rentable venue for pricing info
  const rentableVenue = useMemo(() => {
    return rentableVenues?.find((v) => v.id === venueId) as RentableVenueWithEventType | undefined;
  }, [rentableVenues, venueId]);

  const pricing = rentableVenue ? getVenueEffectivePricing(rentableVenue) : null;

  // Description truncation logic
  const shouldTruncateDescription = venue?.description && venue.description.length > DESCRIPTION_LIMIT;
  const displayedDescription = useMemo(() => {
    if (!venue?.description) return '';
    if (!shouldTruncateDescription || isDescriptionExpanded) {
      return venue.description;
    }
    return venue.description.slice(0, DESCRIPTION_LIMIT).trim() + '...';
  }, [venue?.description, shouldTruncateDescription, isDescriptionExpanded]);

  const toggleDescription = useCallback(() => {
    setIsDescriptionExpanded((prev) => !prev);
  }, []);

  // Format program duration range
  const getProgramDurationDisplay = useCallback(() => {
    if (!venue?.operating_rules) return null;
    const { minimum_program_hours, maximum_program_hours } = venue.operating_rules;

    const minHours = parseFloat(minimum_program_hours);
    const maxHours = maximum_program_hours ? parseFloat(maximum_program_hours) : null;

    if (maxHours && maxHours !== minHours) {
      return `${minHours}-${maxHours} hours`;
    }
    return `${minHours} hours`;
  }, [venue?.operating_rules]);

  // Format price for early/late fees
  const formatFee = useCallback((fee: string | null) => {
    if (!fee) return null;
    const amount = parseFloat(fee);
    return formatPrice(amount);
  }, []);

  const handleStartBooking = () => {
    // Pass venue ID to booking flow for pre-selection
    const params = new URLSearchParams();
    if (venueId) {
      params.append('venueId', String(venueId));
    }
    const queryString = params.toString();
    router.push(`/booking${queryString ? `?${queryString}` : ''}` as Href);
  };

  if (venueLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Skeleton variant="rectangular" height={280} />
        <View style={styles.content}>
          <Skeleton variant="text" width="70%" height={32} style={styles.skeleton} />
          <Skeleton variant="text" width="50%" height={20} style={styles.skeleton} />
          <Skeleton variant="rounded" height={100} style={styles.skeleton} />
          <Skeleton variant="rounded" height={80} style={styles.skeleton} />
        </View>
      </SafeAreaView>
    );
  }

  if (!venue) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <CaretLeft size={24} color={colors.primary.black} />
          </Pressable>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Venue not found</Text>
          <Button variant="secondary" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const galleryImages = venue.gallery_images || [];
  const amenities = venue.amenities || [];
  const displayedAmenities = amenities.slice(0, 6);
  const remainingAmenitiesCount = amenities.length - 6;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          <VenueGallery
            images={galleryImages}
            featuredImage={venue.featured_image}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent']}
            style={styles.headerGradient}
          />

          {/* Header Buttons */}
          <SafeAreaView style={styles.headerOverlay} edges={['top']}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <CaretLeft size={24} color={colors.neutral.white} />
            </Pressable>
            <FavoriteButton type="venue" itemId={venue.id} size={22} />
          </SafeAreaView>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Name & Location */}
          <Text style={styles.name}>{venue.name}</Text>
          {venue.location_description && (
            <View style={styles.locationRow}>
              <MapPin size={16} color={colors.neutral.gray} weight="fill" />
              <Text style={styles.location}>{venue.location_description}</Text>
            </View>
          )}

          {/* Quick Info Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <Users size={16} color={colors.primary.black} />
              <Text style={styles.badgeText}>
                {formatCapacity(venue.minimum_capacity, venue.maximum_capacity)}
              </Text>
            </View>
            {venue.is_overnight && (
              <View style={[styles.badge, styles.badgeHighlight]}>
                <Moon size={16} color={colors.tertiary.teal} />
                <Text style={[styles.badgeText, styles.badgeTextHighlight]}>
                  Overnight
                </Text>
              </View>
            )}
          </View>

          {/* Description with Read More */}
          {venue.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{displayedDescription}</Text>
              {shouldTruncateDescription && (
                <Pressable onPress={toggleDescription} style={styles.readMoreButton}>
                  <Text style={styles.readMoreText}>
                    {isDescriptionExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Amenities Grid */}
          {amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {displayedAmenities.map((amenity, index) => {
                  const IconComponent = getAmenityIcon(amenity);
                  return (
                    <View key={index} style={styles.amenityItem}>
                      <View style={styles.amenityIconContainer}>
                        <IconComponent size={24} color={colors.primary.black} />
                      </View>
                      <Text style={styles.amenityText} numberOfLines={1}>
                        {amenity}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {remainingAmenitiesCount > 0 && (
                <Text style={styles.moreAmenities}>
                  + {remainingAmenitiesCount} more amenities
                </Text>
              )}
            </View>
          )}

          {/* Operating Rules */}
          {venue.operating_rules && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Timing</Text>
              <View style={styles.rulesCard}>
                {/* Check-in / Check-out Row */}
                <View style={styles.timingRow}>
                  <View style={styles.timingItem}>
                    <Text style={styles.timingLabel}>Check-in</Text>
                    <Text style={styles.timingValue}>
                      {venue.operating_rules.default_check_in_time}
                    </Text>
                  </View>
                  <View style={styles.timingDivider} />
                  <View style={styles.timingItem}>
                    <Text style={styles.timingLabel}>Check-out</Text>
                    <Text style={styles.timingValue}>
                      {venue.operating_rules.default_checkout_time}
                      {venue.operating_rules.checkout_next_day && ' (+1)'}
                    </Text>
                  </View>
                </View>

                {/* Program Duration - only for non-overnight venues */}
                {!venue.is_overnight && (
                  <>
                    <View style={styles.ruleDivider} />
                    <View style={styles.ruleRow}>
                      <CalendarCheck size={18} color={colors.neutral.darkGray} />
                      <View style={styles.ruleContent}>
                        <Text style={styles.ruleLabel}>Program Duration</Text>
                        <Text style={styles.ruleValue}>
                          {getProgramDurationDisplay()}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Early Check-in Option */}
                {venue.operating_rules.early_checkin_allowed && (
                  <>
                    <View style={styles.ruleDivider} />
                    <View style={styles.ruleRow}>
                      <Check size={18} color={colors.secondary.forest} />
                      <View style={styles.ruleContent}>
                        <Text style={styles.ruleLabel}>Early check-in available</Text>
                        {venue.operating_rules.early_checkin_fee_per_hour && (
                          <Text style={styles.ruleValueSubtle}>
                            +{formatFee(venue.operating_rules.early_checkin_fee_per_hour)}/hr
                          </Text>
                        )}
                      </View>
                    </View>
                  </>
                )}

                {/* Late Checkout Option */}
                {venue.operating_rules.late_checkout_allowed && (
                  <>
                    <View style={styles.ruleDivider} />
                    <View style={styles.ruleRow}>
                      <Check size={18} color={colors.secondary.forest} />
                      <View style={styles.ruleContent}>
                        <Text style={styles.ruleLabel}>Late checkout available</Text>
                        {venue.operating_rules.late_checkout_fee_per_hour && (
                          <Text style={styles.ruleValueSubtle}>
                            +{formatFee(venue.operating_rules.late_checkout_fee_per_hour)}/hr
                          </Text>
                        )}
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Pricing */}
          {pricing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pricing</Text>
              <View style={styles.pricingCard}>
                {/* Overnight venues - just show nightly rate */}
                {venue.is_overnight ? (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Nightly Rate</Text>
                    <Text style={styles.priceValue}>
                      {formatPrice(pricing.basePrice)}
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Event venues - show full pricing breakdown */}
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Base Rate</Text>
                      <Text style={styles.priceValue}>
                        {formatPrice(pricing.basePrice)}
                      </Text>
                    </View>
                    {!pricing.isAllDayAccess && (
                      <>
                        <View style={styles.priceDivider} />
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Included Hours</Text>
                          <Text style={styles.priceValue}>
                            {pricing.includedHours} hours
                          </Text>
                        </View>
                        <View style={styles.priceDivider} />
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Excess Hour Rate</Text>
                          <Text style={styles.priceValue}>
                            {formatPrice(pricing.excessHourPrice)}/hr
                          </Text>
                        </View>
                      </>
                    )}
                    {pricing.isAllDayAccess && (
                      <>
                        <View style={styles.priceDivider} />
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Access</Text>
                          <Text style={[styles.priceValue, styles.allDayText]}>
                            All-day access
                          </Text>
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed CTA */}
      <SafeAreaView style={styles.ctaContainer} edges={['bottom']}>
        <View style={styles.ctaContent}>
          {pricing && (
            <View style={styles.ctaPrice}>
              <Text style={styles.ctaPriceLabel}>
                {venue.is_overnight ? 'Per night' : 'From'}
              </Text>
              <Text style={styles.ctaPriceValue}>{formatPrice(pricing.basePrice)}</Text>
            </View>
          )}
          <Button variant="primary" onPress={handleStartBooking} style={styles.ctaButton}>
            Start Booking
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  galleryContainer: {
    position: 'relative',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  name: {
    ...typeScale.headlineLarge,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  location: {
    ...typeScale.bodyMedium,
    color: colors.neutral.gray,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.full,
    ...shadows.sm,
  },
  badgeHighlight: {
    backgroundColor: colors.tertiary.tealSubtle,
  },
  badgeText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  badgeTextHighlight: {
    color: colors.tertiary.teal,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginBottom: spacing.md,
  },
  description: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    lineHeight: 24,
  },
  readMoreButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  readMoreText: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
  },
  // Amenities styles
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  amenityItem: {
    width: '30%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  amenityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  amenityText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  moreAmenities: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
    marginTop: spacing.md,
  },
  // Rules card styles
  rulesCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timingItem: {
    flex: 1,
    alignItems: 'center',
  },
  timingLabel: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginBottom: spacing.xxs,
  },
  timingValue: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  timingDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.neutral.warmGray,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ruleContent: {
    flex: 1,
  },
  ruleLabel: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
  ruleValue: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  ruleValueSubtle: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  ruleDivider: {
    height: 1,
    backgroundColor: colors.neutral.warmGray,
    marginVertical: spacing.md,
  },
  // Pricing styles
  pricingCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  priceValue: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  allDayText: {
    color: colors.tertiary.teal,
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.neutral.warmGray,
    marginVertical: spacing.md,
  },
  // CTA styles
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: layout.borderRadius.xl,
    borderTopRightRadius: layout.borderRadius.xl,
    ...shadows.lg,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  ctaPrice: {},
  ctaPriceLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  ctaPriceValue: {
    ...typeScale.headlineMedium,
    color: colors.secondary.forest,
  },
  ctaButton: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  skeleton: {
    marginBottom: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorText: {
    ...typeScale.titleMedium,
    color: colors.neutral.darkGray,
  },
});
