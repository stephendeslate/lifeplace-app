/**
 * EventTypeCard
 *
 * Individual event type display card with image, features, and pricing.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ArrowRight, Star } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows, gradients } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import type { EventType } from '@/types/booking';

interface EventTypeCardProps {
  eventType: EventType;
  onPress: (eventType: EventType) => void;
  onViewDetails?: (eventType: EventType) => void;
  variant?: 'standard' | 'compact' | 'featured';
  selected?: boolean;
}

export function EventTypeCard({
  eventType,
  onPress,
  onViewDetails,
  variant = 'standard',
  selected = false,
}: EventTypeCardProps) {
  const {
    name,
    description,
    icon,
    image_url,
    features = [],
    starting_price,
  } = eventType;

  const handlePress = () => {
    onPress(eventType);
  };

  const handleViewDetails = () => {
    onViewDetails?.(eventType);
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, selected && styles.compactContainerSelected]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {image_url ? (
          <Image
            source={{ uri: image_url }}
            style={styles.compactImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.compactImage, styles.compactImagePlaceholder]}>
            <Text style={styles.placeholderIcon}>{icon || '🎉'}</Text>
          </View>
        )}
        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={1}>{name}</Text>
          {starting_price && (
            <Text style={styles.compactPrice}>
              From {formatCurrency(parseFloat(starting_price), { currency: 'PHP' })}
            </Text>
          )}
        </View>
        {selected && (
          <View style={styles.selectedBadge}>
            <Check size={14} color={colors.neutral.white} weight="bold" />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Featured variant
  if (variant === 'featured') {
    return (
      <TouchableOpacity
        style={styles.featuredContainer}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={{ uri: image_url || '' }}
          style={styles.featuredImage}
          imageStyle={styles.featuredImageStyle}
        >
          <LinearGradient
            colors={gradients.heroFade.colors}
            style={styles.featuredGradient}
          >
            <View style={styles.featuredBadge}>
              <Star size={14} color={colors.semantic.warning} weight="fill" />
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
            <View style={styles.featuredContent}>
              <Text style={styles.featuredName}>{name}</Text>
              {description && (
                <Text style={styles.featuredDescription} numberOfLines={2}>
                  {description}
                </Text>
              )}
              {starting_price && (
                <Text style={styles.featuredPrice}>
                  Starting at {formatCurrency(parseFloat(starting_price), { currency: 'PHP' })}
                </Text>
              )}
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  // Standard variant
  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.containerSelected]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Image */}
      {image_url ? (
        <Image
          source={{ uri: image_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderIcon}>{icon || '🎉'}</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {selected && (
            <View style={styles.selectedIndicator}>
              <Check size={16} color={colors.neutral.white} weight="bold" />
            </View>
          )}
        </View>

        {description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}

        {/* Features */}
        {features.length > 0 && (
          <View style={styles.features}>
            {features.slice(0, 3).map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Check size={12} color={colors.secondary.forest} weight="bold" />
                <Text style={styles.featureText} numberOfLines={1}>{feature}</Text>
              </View>
            ))}
            {features.length > 3 && (
              <Text style={styles.moreFeatures}>+{features.length - 3} more</Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {starting_price ? (
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Starting at</Text>
              <Text style={styles.price}>
                {formatCurrency(parseFloat(starting_price), { currency: 'PHP' })}
              </Text>
            </View>
          ) : (
            <View />
          )}

          <TouchableOpacity
            style={styles.selectButton}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <Text style={styles.selectButtonText}>Select</Text>
            <ArrowRight size={16} color={colors.neutral.white} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Standard variant
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    overflow: 'hidden',
    ...shadows.sm,
  },
  containerSelected: {
    borderWidth: 2,
    borderColor: colors.primary.black,
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: colors.neutral.sand,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
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
  description: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  features: {
    gap: spacing.xxs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    flex: 1,
  },
  moreFeatures: {
    ...typeScale.labelSmall,
    color: colors.tertiary.teal,
    marginLeft: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  priceContainer: {
    gap: 2,
  },
  priceLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  price: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '700',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.black,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.xxs,
  },
  selectButtonText: {
    ...typeScale.labelMedium,
    color: colors.neutral.white,
    fontWeight: '600',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  compactContainerSelected: {
    borderWidth: 2,
    borderColor: colors.primary.black,
  },
  compactImage: {
    width: 60,
    height: 60,
    borderRadius: layout.borderRadius.sm,
    backgroundColor: colors.neutral.sand,
  },
  compactImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  compactName: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  compactPrice: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Featured variant
  featuredContainer: {
    borderRadius: layout.cardBorderRadiusLarge,
    overflow: 'hidden',
    ...shadows.md,
  },
  featuredImage: {
    width: '100%',
    height: 240,
  },
  featuredImageStyle: {
    borderRadius: layout.cardBorderRadiusLarge,
  },
  featuredGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.alpha.black60,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.full,
    gap: spacing.xxs,
  },
  featuredBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  featuredContent: {
    gap: spacing.xs,
  },
  featuredName: {
    ...typeScale.headlineMedium,
    color: colors.neutral.white,
  },
  featuredDescription: {
    ...typeScale.bodyMedium,
    color: colors.alpha.white80,
  },
  featuredPrice: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
    fontWeight: '600',
  },
});

export default EventTypeCard;
