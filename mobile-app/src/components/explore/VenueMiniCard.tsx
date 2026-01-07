/**
 * VenueMiniCard Component
 *
 * A compact venue card for displaying venues included in a package.
 * Shows essential venue information with navigation affordance.
 *
 * Features:
 * - Thumbnail image with fallback
 * - Venue name and location
 * - Capacity indicator
 * - Overnight badge
 * - Chevron navigation indicator
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image, ImageErrorEventData } from 'expo-image';
import { MapPin, Users, Moon, CaretRight } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { formatCapacity } from '@/apis/explore.api';
import { FALLBACK_IMAGES } from '@/constants/images';
import type { PackageIncludedVenue } from '@/types/explore.types';

// =============================================================================
// CONSTANTS
// =============================================================================

const THUMBNAIL_SIZE = 80;

// =============================================================================
// TYPES
// =============================================================================

export interface VenueMiniCardProps {
  /** Venue data from package included venues */
  venue: PackageIncludedVenue;
  /** Callback when the card is pressed */
  onPress: () => void;
  /** Optional callback for press-in (for prefetching) */
  onPressIn?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function VenueMiniCard({ venue, onPress, onPressIn }: VenueMiniCardProps) {
  // Track if the remote image failed to load
  const [imageError, setImageError] = useState(false);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const handlePressIn = useCallback(() => {
    onPressIn?.();
  }, [onPressIn]);

  // Handle image load error - fall back to placeholder
  const handleImageError = useCallback((event: ImageErrorEventData) => {
    setImageError(true);
  }, []);

  // Determine image source: use remote URL if available and not errored, otherwise fallback
  const imageSource =
    venue.featured_image && !imageError
      ? { uri: venue.featured_image }
      : FALLBACK_IMAGES.venue;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {/* Thumbnail Image */}
      <View style={styles.imageContainer}>
        <Image
          source={imageSource}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={handleImageError}
        />
        {/* Overnight Badge Overlay */}
        {venue.is_overnight && (
          <View style={styles.overnightBadge}>
            <Moon size={12} color={colors.neutral.white} weight="fill" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Venue Name */}
        <Text style={styles.name} numberOfLines={1}>
          {venue.name}
        </Text>

        {/* Location */}
        {venue.location_description ? (
          <View style={styles.locationRow}>
            <MapPin size={12} color={colors.neutral.gray} weight="fill" />
            <Text style={styles.location} numberOfLines={1}>
              {venue.location_description}
            </Text>
          </View>
        ) : null}

        {/* Info Row: Capacity + Overnight */}
        <View style={styles.infoRow}>
          {/* Only show capacity if we have the data */}
          {(venue.minimum_capacity !== undefined && venue.maximum_capacity !== undefined) && (
            <View style={styles.infoItem}>
              <Users size={14} color={colors.neutral.darkGray} />
              <Text style={styles.infoText}>
                {formatCapacity(venue.minimum_capacity, venue.maximum_capacity)}
              </Text>
            </View>
          )}
          {venue.is_overnight && (
            <View style={styles.infoItem}>
              <Moon size={14} color={colors.tertiary.teal} />
              <Text style={[styles.infoText, styles.overnightText]}>Overnight</Text>
            </View>
          )}
        </View>
      </View>

      {/* Navigation Indicator */}
      <View style={styles.chevronContainer}>
        <CaretRight size={20} color={colors.neutral.gray} />
      </View>
    </Pressable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: layout.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overnightBadge: {
    position: 'absolute',
    bottom: spacing.xxs,
    left: spacing.xxs,
    backgroundColor: colors.tertiary.teal,
    borderRadius: layout.borderRadius.xs,
    padding: spacing.xxs,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  name: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginBottom: spacing.xxs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xxs,
  },
  location: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  infoText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  overnightText: {
    color: colors.tertiary.teal,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: spacing.xs,
  },
});
