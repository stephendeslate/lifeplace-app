/**
 * EventCard Component
 *
 * Card for displaying an event in the events list.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, View, Pressable, type ViewStyle, type StyleProp } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Calendar, MapPin, Clock, Users, Warning } from 'phosphor-react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { theme } from '@/theme';
import { Badge } from '@/components/common';
import { formatCardDate, getEventCountdown } from '@/utils/formatting';
import {
  getEventStatusLabel,
  getPaymentStatusLabel,
  getEventStatusColor,
  getPaymentStatusColor,
  eventRequiresAttention,
} from '@/utils/eventHelpers';
import type { Event } from '@/types/events.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface EventCardProps {
  event: Event;
  onPress: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const EventCard = memo(function EventCard({ event, onPress, compact = false, style, testID }: EventCardProps) {
  const scale = useSharedValue(1);
  const countdown = getEventCountdown(event.start_date);
  const requiresAttention = eventRequiresAttention(event);

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

  if (compact) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.containerCompact, animatedStyle, style]}
        testID={testID}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <Text style={styles.title} numberOfLines={1}>
              {event.name}
            </Text>
            <Badge
              label={getEventStatusLabel(event.status)}
              variant={getStatusBadgeVariant()}
              size="small"
            />
          </View>
          <View style={styles.compactDetails}>
            <View style={styles.detailRow}>
              <Calendar size={14} color={theme.colors.neutral[500]} />
              <Text style={styles.detailTextSmall}>
                {formatCardDate(event.start_date)}
              </Text>
            </View>
            {countdown && (
              <Text style={styles.countdownTextCompact}>{countdown}</Text>
            )}
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle, style]}
      testID={testID}
    >
      <View style={styles.content}>
        {/* Left side - Date badge */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>
            {new Date(event.start_date).getDate()}
          </Text>
          <Text style={styles.dateMonth}>
            {new Date(event.start_date).toLocaleString('default', {
              month: 'short',
            })}
          </Text>
          {countdown && (
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownBadgeText}>
                {event.days_until_event ?? 0}d
              </Text>
            </View>
          )}
        </View>

        {/* Main content */}
        <View style={styles.mainContent}>
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
            {requiresAttention && (
              <View style={styles.attentionIndicator}>
                <Warning size={14} color={theme.colors.error[500]} weight="fill" />
              </View>
            )}
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
            {event.venue_name && (
              <View style={styles.detailRow}>
                <MapPin size={14} color={theme.colors.neutral[500]} />
                <Text style={styles.detailText} numberOfLines={1}>
                  {event.venue_name}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Clock size={14} color={theme.colors.neutral[500]} />
              <Text style={styles.detailText}>
                {event.current_stage_name}
              </Text>
            </View>
          </View>

          {/* Contract status */}
          {event.pending_signature_required && (
            <View style={styles.contractWarning}>
              <Warning size={12} color={theme.colors.warning[600]} />
              <Text style={styles.contractWarningText}>
                Contract signature required
              </Text>
            </View>
          )}
        </View>

        {/* Image thumbnail (if available) */}
        {event.venue_image_url && (
          <View style={styles.thumbnail}>
            <Image
              source={{ uri: event.venue_image_url }}
              style={styles.thumbnailImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, // Reduced for minimal aesthetic
    shadowRadius: 8,
    elevation: 2,
    marginBottom: theme.spacing.md,
  },
  containerCompact: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.sm,
  },
  content: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  dateBadge: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    position: 'relative',
  },
  dateDay: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.primary[600],
  },
  dateMonth: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary[500],
    textTransform: 'uppercase',
  },
  countdownBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  countdownBadgeText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 10,
    color: theme.colors.surface,
  },
  mainContent: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    alignItems: 'center',
  },
  attentionIndicator: {
    marginLeft: 'auto',
  },
  title: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.sm,
  },
  details: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[600],
    flex: 1,
  },
  detailTextSmall: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[600],
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  contractWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.xs,
    backgroundColor: theme.colors.warning[50],
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  contractWarningText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 10,
    color: theme.colors.warning[700],
  },
  compactContent: {
    gap: theme.spacing.xs,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countdownTextCompact: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary[500],
  },
});

export default EventCard;

// Display name for debugging
EventCard.displayName = 'EventCard';
