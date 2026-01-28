/**
 * VIPBenefitCard Component
 *
 * Displays an individual VIP benefit with type-specific icon and status indicator.
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
import {
  Percent,
  CurrencyDollar,
  Clock,
  HandCoins,
  CalendarCheck,
  Sparkle,
  Package,
  Gift,
  Lightning,
  ShieldCheck,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/theme';
import type { VIPBenefit, VIPBenefitType } from '@/types/vip.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// =============================================================================
// BENEFIT ICON CONFIGURATION
// =============================================================================

/**
 * Get icon component for a benefit type.
 */
function getBenefitIcon(
  benefitType: VIPBenefitType,
  size: number,
  color: string
): React.ReactNode {
  switch (benefitType) {
    case 'PERCENTAGE_DISCOUNT':
      return <Percent size={size} color={color} weight="fill" />;
    case 'FIXED_DISCOUNT':
      return <CurrencyDollar size={size} color={color} weight="fill" />;
    case 'FREE_HOURS':
      return <Clock size={size} color={color} weight="fill" />;
    case 'WAIVE_SERVICE_CHARGE':
      return <HandCoins size={size} color={color} weight="fill" />;
    case 'WAIVE_LATE_FEE':
      return <ShieldCheck size={size} color={color} weight="fill" />;
    case 'WAIVE_RESCHEDULING_FEE':
      return <CalendarCheck size={size} color={color} weight="fill" />;
    case 'PRIORITY_BOOKING':
      return <Lightning size={size} color={color} weight="fill" />;
    case 'EARLY_ACCESS':
      return <Sparkle size={size} color={color} weight="fill" />;
    case 'EXCLUSIVE_PACKAGE':
      return <Package size={size} color={color} weight="fill" />;
    case 'COMPLIMENTARY_ADDON':
      return <Gift size={size} color={color} weight="fill" />;
    default:
      return <Gift size={size} color={color} weight="fill" />;
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface VIPBenefitCardProps {
  benefit: VIPBenefit;
  compact?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const VIPBenefitCard = memo(function VIPBenefitCard({
  benefit,
  compact = false,
  onPress,
  style,
  testID,
}: VIPBenefitCardProps) {
  const scale = useSharedValue(1);
  const isRedeemable = benefit.application_mode === 'REDEEMABLE';
  const isAutomatic = benefit.application_mode === 'AUTOMATIC';

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

  // Determine status badge styling
  const statusLabel = isAutomatic ? 'Active' : 'Redeemable';
  const statusColor = isAutomatic ? theme.colors.success : theme.colors.primary;

  if (compact) {
    // Compact version for list displays
    const content = (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactIconContainer}>
          {getBenefitIcon(benefit.benefit_type, 16, theme.colors.primary[600])}
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {benefit.display_name}
          </Text>
          <Text style={styles.compactDescription} numberOfLines={1}>
            {benefit.description}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor[100] || statusColor[50] },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusColor[700] || statusColor[600] },
            ]}
          >
            {statusLabel}
          </Text>
        </View>
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
  }

  // Full card version
  const content = (
    <View style={[styles.container, style]}>
      {/* Header with icon and status */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {getBenefitIcon(benefit.benefit_type, 24, theme.colors.primary[600])}
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor[100] || statusColor[50] },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusColor[700] || statusColor[600] },
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Benefit details */}
      <Text style={styles.title}>{benefit.display_name}</Text>
      <Text style={styles.description}>{benefit.description}</Text>

      {/* Value display (if applicable) */}
      {benefit.value && (
        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Value:</Text>
          <Text style={styles.valueText}>{benefit.value}</Text>
        </View>
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xs,
  },
  title: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing.xxs,
  },
  description: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
    lineHeight: 20,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xxs,
  },
  valueLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
  },
  valueText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  compactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[800],
  },
  compactDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
});

export default VIPBenefitCard;

// Display name for debugging
VIPBenefitCard.displayName = 'VIPBenefitCard';
