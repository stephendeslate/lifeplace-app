/**
 * EventTypeDetailModal
 *
 * Full event type details modal with gallery, features, and booking CTA.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, ArrowRight, Clock, Users, MapPin } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typeScale, layout, shadows, gradients } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import type { EventType } from '@/types/booking';
import { Button } from '@/components/common';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EventTypeDetailModalProps {
  visible: boolean;
  eventType: EventType | null;
  onClose: () => void;
  onBook: (eventType: EventType) => void;
}

export function EventTypeDetailModal({
  visible,
  eventType,
  onClose,
  onBook,
}: EventTypeDetailModalProps) {
  const insets = useSafeAreaInsets();

  if (!eventType) return null;

  const {
    name,
    description,
    icon,
    image_url,
    features = [],
    starting_price,
    gallery_images = [],
  } = eventType;

  const allImages = image_url ? [image_url, ...gallery_images] : gallery_images;

  const handleBook = () => {
    onBook(eventType);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {image_url ? (
            <Image
              source={{ uri: image_url }}
              style={styles.heroImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Text style={styles.heroPlaceholderIcon}>{icon || '🎉'}</Text>
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
          />

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { top: insets.top + spacing.md }]}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={colors.neutral.white} weight="bold" />
          </TouchableOpacity>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{name}</Text>
            {starting_price && (
              <Text style={styles.heroPrice}>
                Starting at {formatCurrency(parseFloat(starting_price), { currency: 'PHP' })}
              </Text>
            )}
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Description */}
          {description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          )}

          {/* Features */}
          {features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's Included</Text>
              <View style={styles.featuresList}>
                {features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Check size={14} color={colors.secondary.forest} weight="bold" />
                    </View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Gallery */}
          {allImages.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gallery</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryContainer}
              >
                {allImages.map((imageUrl, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.galleryItem}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.galleryImage}
                      contentFit="cover"
                      transition={200}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Spacer for bottom button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[styles.bottomCta, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.ctaPrice}>
            <Text style={styles.ctaPriceLabel}>Starting at</Text>
            <Text style={styles.ctaPriceValue}>
              {starting_price
                ? formatCurrency(parseFloat(starting_price), { currency: 'PHP' })
                : 'Request Quote'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleBook}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Book Now</Text>
            <ArrowRight size={20} color={colors.neutral.white} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  heroContainer: {
    height: SCREEN_HEIGHT * 0.4,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral.sand,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderIcon: {
    fontSize: 80,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  closeButton: {
    position: 'absolute',
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.alpha.black40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  heroTitle: {
    ...typeScale.displayMedium,
    color: colors.neutral.white,
    marginBottom: spacing.xs,
  },
  heroPrice: {
    ...typeScale.titleMedium,
    color: colors.alpha.white90,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  description: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    lineHeight: 24,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary.forestSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    flex: 1,
  },
  galleryContainer: {
    paddingRight: spacing.lg,
    gap: spacing.sm,
  },
  galleryItem: {
    borderRadius: layout.borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  galleryImage: {
    width: 200,
    height: 150,
    backgroundColor: colors.neutral.sand,
  },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
    ...shadows.lg,
  },
  ctaPrice: {
    gap: 2,
  },
  ctaPriceLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  ctaPriceValue: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    fontWeight: '700',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.forest,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
  },
  ctaButtonText: {
    ...typeScale.labelLarge,
    color: colors.neutral.white,
    fontWeight: '600',
  },
});

export default EventTypeDetailModal;
