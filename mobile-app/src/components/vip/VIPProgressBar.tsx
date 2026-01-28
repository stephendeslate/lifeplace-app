/**
 * VIPProgressBar Component
 *
 * Shows progress toward the next VIP tier.
 * Focuses on BOOKINGS progress only (not spending or points) per CEO requirements.
 */

import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { theme } from '@/theme';
import type { VIPProgress, VIPTier } from '@/types/vip.types';

// =============================================================================
// TIER COLORS
// =============================================================================

/**
 * Progress bar colors matching tier colors.
 */
const TIER_PROGRESS_COLORS: Record<string, string> = {
  Partner: '#3B82F6',
  Premier: '#F59E0B',
};

// =============================================================================
// TYPES
// =============================================================================

export interface VIPProgressBarProps {
  progress: VIPProgress | null | undefined;
  nextTier: VIPTier | null | undefined;
  testID?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const VIPProgressBar = memo(function VIPProgressBar({
  progress,
  nextTier,
  testID,
}: VIPProgressBarProps) {
  // Return null if no next tier (already at Premier) or no progress
  if (!nextTier || !progress) {
    return null;
  }

  // Focus on bookings progress only (CEO requirement)
  const bookingsProgress = progress.bookings;

  if (!bookingsProgress) {
    return null;
  }

  const { current, required, percentage } = bookingsProgress;
  const remaining = Math.max(0, required - current);
  const progressColor = TIER_PROGRESS_COLORS[nextTier.name] || theme.colors.primary[500];

  // Animated progress width
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    // Animate to the target percentage
    animatedWidth.value = withTiming(Math.min(percentage, 100), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage, animatedWidth]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  // Format the progress message
  const progressMessage =
    remaining === 1
      ? `1 more booking to ${nextTier.name}`
      : `${remaining} more bookings to ${nextTier.name}`;

  return (
    <View style={styles.container} testID={testID}>
      {/* Progress label */}
      <View style={styles.labelRow}>
        <Text style={styles.progressText}>{progressMessage}</Text>
        <Text style={styles.countText}>
          {current}/{required}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBackground}>
        <Animated.View
          style={[
            styles.progressBarFill,
            { backgroundColor: progressColor },
            animatedProgressStyle,
          ]}
        />
      </View>
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
  },
  countText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
});

export default VIPProgressBar;

// Display name for debugging
VIPProgressBar.displayName = 'VIPProgressBar';
