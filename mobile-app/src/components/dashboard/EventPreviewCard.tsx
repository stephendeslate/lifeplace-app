/**
 * EventPreviewCard Component
 *
 * Card for displaying the next upcoming event on the dashboard.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Calendar, MapPin, Clock, ArrowRight, Users } from 'phosphor-react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { theme } from '@/theme';
import { Badge } from '@/components/common';
import { formatEventDate, formatTimeRange, getEventCountdown } from '@/utils/formatting';
import {
  getEventStatusLabel,
  getPaymentStatusLabel,
} from '@/utils/eventHelpers';
import type { Event } from '@/types/events.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface EventPreviewCardProps {
  event: Event;
  onPress: () => void;
  testID?: string;
}

export const EventPreviewCard = memo(function EventPreviewCard({ event, onPress, testID }: EventPreviewCardProps) {
  const scale = useSharedValue(1);
  const countdown = getEventCountdown(event.start_date);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getStatusBadgeVariant = () => {
    switch (event.status) {
      case 'CONFIRMED':
        return 'primary';
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPaymentBadgeVariant = () => {
    switch (event.payment_status) {
      case 'PAID':
        return 'success';
      case 'PARTIAL':
        return 'warning';
      case 'OVERDUE':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
      testID={testID}
    >
      {/* Image or Placeholder */}
      <View style={styles.imageContainer}>
        {event.venue_image_url ? (
          <Image
            source={{ uri: event.venue_image_url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Calendar size={32} color={theme.colors.neutral[400]} weight="light" />
          </View>
        )}
        {countdown && (
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Badges */}
        <View style={styles.badges}>
          <Badge
            label={getEventStatusLabel(event.status)}
            variant={getStatusBadgeVariant()}
            size="small"
          />
          <Badge
            label={getPaymentStatusLabel(event.payment_status)}
            variant={getPaymentBadgeVariant()}
            size="small"
          />
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>
          {event.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {event.event_type_name}
        </Text>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Calendar size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.detailText}>
              {formatEventDate(event.start_date, event.end_date)}
            </Text>
          </View>
          {event.venue_name && (
            <View style={styles.detailRow}>
              <MapPin size={16} color={theme.colors.neutral[500]} />
              <Text style={styles.detailText} numberOfLines={1}>
                {event.venue_name}
              </Text>
            </View>
          )}
        </View>

        {/* Arrow indicator */}
        <View style={styles.arrowContainer}>
          <ArrowRight size={20} color={theme.colors.primary[500]} />
        </View>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    height: 140,
    backgroundColor: theme.colors.neutral[100],
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[50],
  },
  countdownBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  countdownText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.surface,
  },
  content: {
    padding: theme.spacing.md,
  },
  badges: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.md,
  },
  details: {
    gap: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  detailText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
    flex: 1,
  },
  arrowContainer: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
  },
});

export default EventPreviewCard;

// Display name for debugging
EventPreviewCard.displayName = 'EventPreviewCard';
