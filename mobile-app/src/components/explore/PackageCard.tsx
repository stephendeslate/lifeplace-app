/**
 * PackageCard Component
 *
 * A card component displaying package information with:
 * - Featured image
 * - Package name and category
 * - Price display with pricing model context
 * - Featured badge (if is_featured)
 * - Duration badge for camps/team building
 * - Capacity badge for minimum guest requirements
 * - Quote required indicator for CUSTOM pricing
 * - Included hours indicator
 * - Favorite toggle button
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Clock,
  Star,
  Users,
  CalendarBlank,
  ChatCircle,
} from 'phosphor-react-native';

import { FavoriteButton } from './FavoriteButton';
import { colors, spacing, typeScale, layout, shadows, brandColors } from '@/theme';
import {
  formatPackagePrice,
  getDurationLabel,
  isPerPersonPricing,
  formatPerPersonRate,
} from '@/apis/explore.api';
import { FALLBACK_IMAGES } from '@/constants/images';
import type { PackagePublic } from '@/types/explore.types';

export interface PackageCardProps {
  package: PackagePublic;
  onPress: () => void;
  onPressIn?: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

export function PackageCard({
  package: pkg,
  onPress,
  onPressIn,
  compact = false,
  style,
}: PackageCardProps) {
  const cardWidth = compact ? 240 : '100%';
  const imageHeight = compact ? 140 : 180;

  // Determine if this is a per-person pricing package
  const showPerPersonPricing = isPerPersonPricing(pkg) && pkg.minimum_guests;
  // Check if VAT is excluded (per website: "12% VAT not included")
  const showVatExcluded = !pkg.is_tax_inclusive && pkg.pricing_model !== 'CUSTOM';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [
        styles.container,
        { width: cardWidth as number | '100%' },
        pressed && styles.pressed,
        style,
      ]}
    >
      {/* Image Container */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <Image
          source={pkg.effective_featured_image || pkg.featured_image
            ? { uri: pkg.effective_featured_image || pkg.featured_image }
            : FALLBACK_IMAGES.package}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.gradient}
        />

        {/* Favorite Button */}
        <View style={styles.favoriteButton}>
          <FavoriteButton type="package" itemId={pkg.id} size={20} />
        </View>

        {/* Featured Badge */}
        {pkg.is_featured && (
          <View style={styles.featuredBadge}>
            <Star size={12} color={colors.neutral.white} weight="fill" />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Category and Event Type */}
        {(pkg.category_name || pkg.event_type_name) && (
          <Text style={styles.category}>
            {pkg.event_type_name || pkg.category_name}
          </Text>
        )}

        <Text style={styles.name} numberOfLines={2}>
          {pkg.name}
        </Text>

        {/* Info Badges Row */}
        <View style={styles.badgesRow}>
          {/* Duration Badge */}
          {pkg.event_days && pkg.event_days > 0 && (
            <View style={styles.infoBadge}>
              <CalendarBlank size={12} color={colors.neutral.gray} />
              <Text style={styles.infoBadgeText}>
                {getDurationLabel(pkg.event_days)}
              </Text>
            </View>
          )}

          {/* Minimum Guests Badge - always show when minimum is set */}
          {pkg.minimum_guests && pkg.minimum_guests > 0 && (
            <View style={styles.infoBadge}>
              <Users size={12} color={colors.neutral.gray} />
              <Text style={styles.infoBadgeText}>
                Min {pkg.minimum_guests} pax
              </Text>
            </View>
          )}

          {/* Quote Required Badge */}
          {(pkg.pricing_model === 'CUSTOM' || pkg.requires_approval) && (
            <View style={[styles.infoBadge, styles.quoteBadge]}>
              <ChatCircle size={12} color={colors.semantic.warning} />
              <Text style={[styles.infoBadgeText, styles.quoteText]}>
                Quote
              </Text>
            </View>
          )}
        </View>

        {/* Included Venues */}
        {pkg.included_venues && pkg.included_venues.length > 0 && (
          <Text style={styles.includedVenues} numberOfLines={1}>
            Includes: {pkg.included_venues.map(v => v.name).join(', ')}
          </Text>
        )}

        {/* Rating Row */}
        {pkg.average_rating !== undefined && pkg.average_rating > 0 && (
          <View style={styles.ratingRow}>
            <Star size={14} weight="fill" color={colors.semantic.warning} />
            <Text style={styles.rating}>
              {pkg.average_rating.toFixed(1)}
            </Text>
            {pkg.review_count !== undefined && pkg.review_count > 0 && (
              <Text style={styles.reviewCount}>
                ({pkg.review_count} {pkg.review_count === 1 ? 'review' : 'reviews'})
              </Text>
            )}
          </View>
        )}

        <View style={styles.footer}>
          {/* Included Hours - only show for non-per-person, non-multi-day packages */}
          {pkg.included_hours && !pkg.event_days && !showPerPersonPricing && (
            <View style={styles.hoursRow}>
              <Clock size={14} color={colors.neutral.gray} />
              <Text style={styles.hours}>
                {pkg.included_hours}h included
              </Text>
            </View>
          )}

          {/* Price Display */}
          <View style={styles.priceContainer}>
            {showPerPersonPricing ? (
              // Per-person pricing: show "Starting from" total with rate breakdown
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>Starting from</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>
                    {formatPackagePrice(pkg)}
                  </Text>
                  {showVatExcluded && (
                    <Text style={styles.vatIndicator}>+ VAT</Text>
                  )}
                </View>
                <Text style={styles.priceBreakdown}>
                  {formatPerPersonRate(pkg)} × {pkg.minimum_guests} pax
                </Text>
              </View>
            ) : pkg.pricing_model === 'CUSTOM' || pkg.requires_approval ? (
              // Custom/quote pricing
              <Text style={styles.priceQuote}>
                {formatPackagePrice(pkg)}
              </Text>
            ) : (
              // Fixed or hourly pricing
              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  {formatPackagePrice(pkg)}
                </Text>
                {showVatExcluded && (
                  <Text style={styles.vatIndicator}>+ VAT</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    overflow: 'hidden',
    marginRight: spacing.md,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: brandColors.earth[500], // Gold for premium featured badge
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  featuredText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
  },
  content: {
    padding: spacing.md,
  },
  category: {
    ...typeScale.labelSmall,
    color: brandColors.green[500], // Brand green for category labels
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xxs,
  },
  name: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  rating: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  reviewCount: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  hours: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
  priceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  priceColumn: {
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs,
  },
  priceLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginBottom: spacing.xxs,
  },
  price: {
    ...typeScale.titleMedium,
    color: colors.secondary.forest,
  },
  priceBreakdown: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  priceQuote: {
    ...typeScale.titleMedium,
    color: colors.semantic.warning,
  },
  vatIndicator: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  includedVenues: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    marginBottom: spacing.sm,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.neutral.sand,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.sm,
  },
  infoBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  quoteBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  quoteText: {
    color: colors.semantic.warning,
  },
});
