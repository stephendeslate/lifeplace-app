/**
 * PackageCard Component
 *
 * A card component displaying package information with:
 * - Featured image
 * - Package name and category
 * - Price display (base price)
 * - Featured badge (if is_featured)
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
import { Clock, Star } from 'phosphor-react-native';

import { FavoriteButton } from './FavoriteButton';
import { colors, spacing, typeScale, layout, shadows, brandColors } from '@/theme';
import { formatPrice } from '@/apis/explore.api';
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

  const getPricingModelLabel = () => {
    switch (pkg.pricing_model) {
      case 'HOURLY':
        return '/hour';
      case 'PER_PERSON':
        return '/person';
      case 'FIXED':
      default:
        return '';
    }
  };

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
        {/* Category */}
        {pkg.category_name && (
          <Text style={styles.category}>{pkg.category_name}</Text>
        )}

        <Text style={styles.name} numberOfLines={2}>
          {pkg.name}
        </Text>

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
          {/* Included Hours */}
          {pkg.included_hours && (
            <View style={styles.hoursRow}>
              <Clock size={14} color={colors.neutral.gray} />
              <Text style={styles.hours}>
                {pkg.included_hours}h included
              </Text>
            </View>
          )}

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {formatPrice(pkg.base_price)}
            </Text>
            {getPricingModelLabel() && (
              <Text style={styles.priceUnit}>{getPricingModelLabel()}</Text>
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
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs,
  },
  price: {
    ...typeScale.titleMedium,
    color: colors.secondary.forest,
  },
  priceUnit: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
});
