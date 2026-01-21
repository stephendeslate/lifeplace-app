/**
 * Skeleton Component
 *
 * Loading placeholder with shimmer animation.
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type SkeletonVariant = 'text' | 'rectangular' | 'circular' | 'rounded';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
}

export function Skeleton({
  variant = 'text',
  width = '100%',
  height,
  borderRadius,
  style,
  animated = true,
}: SkeletonProps) {
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    if (animated) {
      shimmerPosition.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [animated, shimmerPosition]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shimmerPosition.value,
          [-1, 1],
          [-SCREEN_WIDTH, SCREEN_WIDTH]
        ),
      },
    ],
  }));

  const variantStyles = getVariantStyles(variant, height);
  const computedWidth = typeof width === 'number' ? width : undefined;
  const computedWidthPercent = typeof width === 'string' ? width : undefined;

  return (
    <View
      style={[
        styles.base,
        variantStyles,
        computedWidth !== undefined && { width: computedWidth },
        computedWidthPercent !== undefined && { width: computedWidthPercent as any },
        borderRadius !== undefined && { borderRadius },
        style,
      ]}
    >
      {animated && (
        <Animated.View style={[styles.shimmerContainer, animatedStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.4)',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmer}
          />
        </Animated.View>
      )}
    </View>
  );
}

function getVariantStyles(variant: SkeletonVariant, height?: number): ViewStyle {
  switch (variant) {
    case 'text':
      return {
        height: height || 16,
        borderRadius: theme.borderRadius.sm,
      };
    case 'rectangular':
      return {
        height: height || 100,
        borderRadius: 0,
      };
    case 'circular':
      return {
        height: height || 40,
        width: height || 40,
        borderRadius: (height || 40) / 2,
      };
    case 'rounded':
      return {
        height: height || 100,
        borderRadius: theme.borderRadius.lg,
      };
    default:
      return {
        height: height || 16,
        borderRadius: theme.borderRadius.sm,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.neutral[200],
    overflow: 'hidden',
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmer: {
    width: '100%',
    height: '100%',
  },
});

// =============================================================================
// SKELETON PRESETS
// =============================================================================

export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[skeletonStyles.card, style]}>
      <Skeleton variant="rounded" height={120} />
      <View style={skeletonStyles.cardContent}>
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="50%" height={14} style={skeletonStyles.mt} />
        <View style={skeletonStyles.row}>
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={80} height={24} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonEventCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[skeletonStyles.eventCard, style]}>
      <View style={skeletonStyles.eventRow}>
        <Skeleton variant="circular" width={50} height={50} />
        <View style={skeletonStyles.eventContent}>
          <Skeleton variant="text" width="80%" height={18} />
          <Skeleton variant="text" width="60%" height={14} style={skeletonStyles.mt} />
          <View style={skeletonStyles.row}>
            <Skeleton variant="rounded" width={70} height={22} />
            <Skeleton variant="rounded" width={70} height={22} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({
  count = 3,
  renderItem,
}: {
  count?: number;
  renderItem?: () => React.ReactNode;
}) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={skeletonStyles.listItem}>
          {renderItem ? renderItem() : <SkeletonEventCard />}
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, // Slightly higher for skeleton visibility
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  eventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, // Slightly higher for skeleton visibility
    shadowRadius: 8,
    elevation: 2,
  },
  eventRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  eventContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  mt: {
    marginTop: theme.spacing.xs,
  },
  listItem: {
    marginBottom: theme.spacing.md,
  },
});

export default Skeleton;
