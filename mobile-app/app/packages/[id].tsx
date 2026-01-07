/**
 * Package Detail Screen
 *
 * Package detail screen with:
 * - Featured image header
 * - Package name and category
 * - Price display
 * - Description
 * - Features list
 * - "Book Now" CTA
 * - Favorite button
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CaretLeft,
  Clock,
  Users,
  Star,
  CurrencyDollar,
  CalendarBlank,
} from 'phosphor-react-native';

import { usePackage } from '@/hooks/useExplore';
import { FavoriteButton } from '@/components/explore';
import { Skeleton, Button } from '@/components/common';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import {
  formatPrice,
  isPerPersonPricing,
  formatPerPersonRate,
  formatStartingTotal,
  getDurationLabel,
} from '@/apis/explore.api';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/800x600/FAF9F7/9B9590?text=Package';

export default function PackageDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const packageId = parseInt(id || '0', 10);

  // Fetch package data
  const { data: pkg, isLoading } = usePackage(packageId);

  const handleBookNow = () => {
    // Pass event type and package ID to booking flow for pre-selection
    const params = new URLSearchParams();
    if (pkg?.event_type_id) {
      params.append('eventTypeId', String(pkg.event_type_id));
    }
    if (pkg?.id) {
      params.append('packageId', String(pkg.id));
    }
    const queryString = params.toString();
    router.push(`/booking${queryString ? `?${queryString}` : ''}` as Href);
  };

  // Determine pricing type for display
  const showPerPersonPricing = pkg ? isPerPersonPricing(pkg) && pkg.minimum_guests : false;
  const showVatExcluded = pkg ? !pkg.is_tax_inclusive && pkg.pricing_model !== 'CUSTOM' : false;

  const getPricingModelLabel = () => {
    if (!pkg) return '';
    if (isPerPersonPricing(pkg)) {
      return 'per person';
    }
    switch (pkg.pricing_model) {
      case 'HOURLY':
        return 'per hour';
      case 'CUSTOM':
        return 'custom quote';
      case 'FIXED':
      default:
        return 'fixed price';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Skeleton variant="rectangular" height={280} />
        <View style={styles.content}>
          <Skeleton variant="text" width="40%" height={16} style={styles.skeleton} />
          <Skeleton variant="text" width="70%" height={32} style={styles.skeleton} />
          <Skeleton variant="rounded" height={100} style={styles.skeleton} />
          <Skeleton variant="rounded" height={80} style={styles.skeleton} />
        </View>
      </SafeAreaView>
    );
  }

  if (!pkg) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <CaretLeft size={24} color={colors.primary.black} />
          </Pressable>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Package not found</Text>
          <Button variant="secondary" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Header */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: pkg.effective_featured_image || pkg.featured_image || PLACEHOLDER_IMAGE }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.4)']}
            style={styles.imageGradient}
          />

          {/* Header Buttons */}
          <SafeAreaView style={styles.headerOverlay} edges={['top']}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <CaretLeft size={24} color={colors.neutral.white} />
            </Pressable>
            <FavoriteButton type="package" itemId={pkg.id} size={22} />
          </SafeAreaView>

          {/* Featured Badge */}
          {pkg.is_featured && (
            <View style={styles.featuredBadge}>
              <Star size={14} color={colors.neutral.white} weight="fill" />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Category */}
          {pkg.category_name && (
            <Text style={styles.category}>{pkg.category_name}</Text>
          )}

          {/* Name */}
          <Text style={styles.name}>{pkg.name}</Text>

          {/* Quick Info Badges */}
          <View style={styles.badgesRow}>
            {/* Duration badge for multi-day packages */}
            {pkg.event_days && pkg.event_days > 0 && (
              <View style={styles.badge}>
                <CalendarBlank size={16} color={colors.primary.black} />
                <Text style={styles.badgeText}>{getDurationLabel(pkg.event_days)}</Text>
              </View>
            )}
            {/* Pricing model badge */}
            <View style={styles.badge}>
              <CurrencyDollar size={16} color={colors.primary.black} />
              <Text style={styles.badgeText}>{getPricingModelLabel()}</Text>
            </View>
            {/* Minimum guests - always show when set */}
            {pkg.minimum_guests && pkg.minimum_guests > 0 && (
              <View style={styles.badge}>
                <Users size={16} color={colors.primary.black} />
                <Text style={styles.badgeText}>Min {pkg.minimum_guests} pax</Text>
              </View>
            )}
            {/* Included hours for non-per-person packages */}
            {pkg.included_hours && !showPerPersonPricing && (
              <View style={styles.badge}>
                <Clock size={16} color={colors.primary.black} />
                <Text style={styles.badgeText}>{pkg.included_hours}h included</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {pkg.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About This Package</Text>
              <Text style={styles.description}>{pkg.description}</Text>
            </View>
          )}

          {/* Pricing Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing Details</Text>
            <View style={styles.pricingCard}>
              {showPerPersonPricing ? (
                // Per-person pricing breakdown
                <>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Rate per Person</Text>
                    <Text style={styles.priceValue}>{formatPerPersonRate(pkg)}</Text>
                  </View>
                  <View style={styles.priceDivider} />
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Minimum Guests</Text>
                    <Text style={styles.priceValue}>{pkg.minimum_guests} pax</Text>
                  </View>
                  <View style={styles.priceDivider} />
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Starting Total</Text>
                    <View style={styles.priceWithVat}>
                      <Text style={styles.priceValueHighlight}>
                        {formatStartingTotal(pkg)}
                      </Text>
                      {showVatExcluded && (
                        <Text style={styles.vatText}>+ VAT</Text>
                      )}
                    </View>
                  </View>
                  {showVatExcluded && (
                    <>
                      <View style={styles.priceDivider} />
                      <Text style={styles.vatNote}>
                        12% VAT is not included in the prices shown above
                      </Text>
                    </>
                  )}
                </>
              ) : (
                // Fixed/hourly/custom pricing
                <>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>
                      {pkg.pricing_model === 'CUSTOM' ? 'Starting Price' : 'Base Price'}
                    </Text>
                    <View style={styles.priceWithVat}>
                      <Text style={styles.priceValue}>{formatPrice(pkg.base_price)}</Text>
                      {showVatExcluded && (
                        <Text style={styles.vatText}>+ VAT</Text>
                      )}
                    </View>
                  </View>
                  {pkg.included_hours && (
                    <>
                      <View style={styles.priceDivider} />
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Included Hours</Text>
                        <Text style={styles.priceValue}>{pkg.included_hours} hours</Text>
                      </View>
                    </>
                  )}
                  {pkg.has_excess_hours && pkg.excess_hour_price && (
                    <>
                      <View style={styles.priceDivider} />
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Excess Hour Rate</Text>
                        <Text style={styles.priceValue}>
                          {formatPrice(pkg.excess_hour_price)}/hr
                        </Text>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Booking Info */}
          {(pkg.advance_booking_days || pkg.maximum_booking_days) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Booking Information</Text>
              <View style={styles.infoCard}>
                {pkg.advance_booking_days && (
                  <View style={styles.infoRow}>
                    <CalendarBlank size={18} color={colors.neutral.darkGray} />
                    <Text style={styles.infoText}>
                      Book at least {pkg.advance_booking_days} days in advance
                    </Text>
                  </View>
                )}
                {pkg.maximum_booking_days && (
                  <View style={styles.infoRow}>
                    <CalendarBlank size={18} color={colors.neutral.darkGray} />
                    <Text style={styles.infoText}>
                      Book up to {pkg.maximum_booking_days} days ahead
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed CTA */}
      <SafeAreaView style={styles.ctaContainer} edges={['bottom']}>
        <View style={styles.ctaContent}>
          <View style={styles.ctaPrice}>
            <Text style={styles.ctaPriceLabel}>Starting from</Text>
            <View style={styles.ctaPriceRow}>
              <Text style={styles.ctaPriceValue}>
                {showPerPersonPricing
                  ? formatStartingTotal(pkg)
                  : formatPrice(pkg.base_price)}
              </Text>
              {showVatExcluded && (
                <Text style={styles.ctaVatText}>+ VAT</Text>
              )}
            </View>
            {showPerPersonPricing && (
              <Text style={styles.ctaPriceBreakdown}>
                {formatPerPersonRate(pkg)} × {pkg.minimum_guests} pax
              </Text>
            )}
          </View>
          <Button variant="primary" onPress={handleBookNow} style={styles.ctaButton}>
            Book Now
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
  imageContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  featuredBadge: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.lg,
    backgroundColor: colors.accent.wood,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: layout.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featuredText: {
    ...typeScale.labelMedium,
    color: colors.neutral.white,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  category: {
    ...typeScale.labelMedium,
    color: colors.tertiary.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  name: {
    ...typeScale.headlineLarge,
    color: colors.primary.black,
    marginBottom: spacing.md,
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
  badgeText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
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
  priceValueHighlight: {
    ...typeScale.titleMedium,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  priceWithVat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  vatText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  vatNote: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.neutral.warmGray,
    marginVertical: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    flex: 1,
  },
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
  ctaPrice: {
    flexShrink: 1,
  },
  ctaPriceLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  ctaPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  ctaPriceValue: {
    ...typeScale.headlineMedium,
    color: colors.secondary.forest,
  },
  ctaVatText: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
  },
  ctaPriceBreakdown: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
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
