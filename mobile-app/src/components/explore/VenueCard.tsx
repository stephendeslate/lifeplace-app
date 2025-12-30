/**
 * VenueCard Component
 *
 * A card component displaying venue information with:
 * - Featured image with gradient overlay
 * - Venue name and location
 * - Capacity indicator
 * - Starting price display
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
import { MapPin, Users } from 'phosphor-react-native';

import { FavoriteButton } from './FavoriteButton';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { formatPrice, formatCapacity, getVenueEffectivePricing } from '@/apis/explore.api';
import { FALLBACK_IMAGES } from '@/constants/images';
import type { VenuePublic, RentableVenue, RentableVenueWithEventType } from '@/types/explore.types';

export interface VenueCardProps {
  venue: VenuePublic | RentableVenue | RentableVenueWithEventType;
  onPress: () => void;
  onPressIn?: () => void;
  showPrice?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export function VenueCard({
  venue,
  onPress,
  onPressIn,
  showPrice = true,
  compact = false,
  style,
}: VenueCardProps) {
  const isRentable = 'standalone_base_price' in venue;
  const pricing = isRentable ? getVenueEffectivePricing(venue as RentableVenue) : null;

  const cardWidth = compact ? 240 : '100%';
  const imageHeight = compact ? 140 : 180;

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
          source={{ uri: venue.featured_image || FALLBACK_IMAGES.venue }}
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
          <FavoriteButton type="venue" itemId={venue.id} size={20} />
        </View>

        {/* Overnight Badge */}
        {venue.is_overnight && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Overnight</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {venue.name}
        </Text>

        {venue.location_description && (
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.neutral.gray} weight="fill" />
            <Text style={styles.location} numberOfLines={1}>
              {venue.location_description}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          {/* Capacity */}
          <View style={styles.capacityRow}>
            <Users size={16} color={colors.neutral.darkGray} />
            <Text style={styles.capacity}>
              {formatCapacity(venue.minimum_capacity, venue.maximum_capacity)}
            </Text>
          </View>

          {/* Price */}
          {showPrice && pricing && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>From</Text>
              <Text style={styles.price}>{formatPrice(pricing.basePrice)}</Text>
            </View>
          )}
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
  badge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.tertiary.teal,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.sm,
  },
  badgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
  },
  content: {
    padding: spacing.md,
  },
  name: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginBottom: spacing.xxs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  location: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  capacity: {
    ...typeScale.labelMedium,
    color: colors.neutral.darkGray,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  price: {
    ...typeScale.titleMedium,
    color: colors.secondary.forest,
  },
});
