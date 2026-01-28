/**
 * VIPStatusBanner Component
 *
 * Compact banner for the ManagementLayout header / home screen.
 * Shows tier badge + progress summary in a single tappable row.
 */

import React, { memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { CaretRight } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/theme';
import { VIPTierBadge } from './VIPTierBadge';
import type { ClientVIPStatus } from '@/types/vip.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// =============================================================================
// TYPES
// =============================================================================

export interface VIPStatusBannerProps {
  status: ClientVIPStatus;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate progress summary text focused on bookings.
 */
function getProgressSummary(status: ClientVIPStatus): string | null {
  const { next_tier, progress_to_next_tier } = status;

  // Already at highest tier
  if (!next_tier) {
    return 'Thank you for your loyalty!';
  }

  // No progress data
  if (!progress_to_next_tier?.bookings) {
    return null;
  }

  const { current, required } = progress_to_next_tier.bookings;
  const remaining = Math.max(0, required - current);

  if (remaining === 0) {
    return `Congratulations! ${next_tier.name} unlocked`;
  }

  return remaining === 1
    ? `1 booking to ${next_tier.name}`
    : `${remaining} bookings to ${next_tier.name}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const VIPStatusBanner = memo(function VIPStatusBanner({
  status,
  onPress,
  style,
  testID,
}: VIPStatusBannerProps) {
  const scale = useSharedValue(1);
  const { current_tier } = status;

  // Don't render if no tier
  if (!current_tier) {
    return null;
  }

  const progressSummary = getProgressSummary(status);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const content = (
    <View style={[styles.container, style]}>
      {/* Left: Tier Badge */}
      <VIPTierBadge tier={current_tier} size="small" />

      {/* Center: Progress Summary */}
      {progressSummary && (
        <Text style={styles.progressText} numberOfLines={1}>
          {progressSummary}
        </Text>
      )}

      {/* Right: Chevron indicator (if tappable) */}
      {onPress && (
        <CaretRight size={16} color={theme.colors.neutral[400]} weight="bold" />
      )}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
        testID={testID}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return <View testID={testID}>{content}</View>;
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  progressText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
});

export default VIPStatusBanner;

// Display name for debugging
VIPStatusBanner.displayName = 'VIPStatusBanner';
