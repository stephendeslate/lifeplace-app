/**
 * VIPStatusCard Component
 *
 * Full status card with all VIP details for the Rewards screen.
 * Contains: VIPTierBadge, VIPProgressBar, benefits list.
 * Handles Guest tier (entry-level) and Premier tier (top-tier) states.
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
import { ArrowRight, Crown, Star } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/theme';
import { VIPTierBadge } from './VIPTierBadge';
import { VIPProgressBar } from './VIPProgressBar';
import { VIPBenefitCard } from './VIPBenefitCard';
import type { ClientVIPStatus } from '@/types/vip.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// =============================================================================
// TYPES
// =============================================================================

export interface VIPStatusCardProps {
  status: ClientVIPStatus;
  onViewAllBenefits?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine if user is at the highest tier (Premier).
 */
function isTopTier(status: ClientVIPStatus): boolean {
  return status.current_tier?.name === 'Premier' || !status.next_tier;
}

/**
 * Determine if user is at the entry tier (Guest).
 */
function isEntryTier(status: ClientVIPStatus): boolean {
  return status.current_tier?.name === 'Guest' || status.current_tier?.level === 0;
}

/**
 * Get greeting message based on tier.
 */
function getTierGreeting(status: ClientVIPStatus): string {
  if (!status.current_tier) {
    return 'Welcome to LifePlace Rewards';
  }

  if (isTopTier(status)) {
    return 'Thank you for being a Premier Member!';
  }

  if (isEntryTier(status)) {
    return 'Welcome to LifePlace Rewards';
  }

  return `Welcome, ${status.current_tier.name} Member`;
}

/**
 * Get subtitle message based on tier and progress.
 */
function getTierSubtitle(status: ClientVIPStatus): string {
  if (isTopTier(status)) {
    return 'You have access to all exclusive benefits.';
  }

  if (status.next_tier && status.progress_to_next_tier?.bookings) {
    const remaining =
      status.progress_to_next_tier.bookings.required -
      status.progress_to_next_tier.bookings.current;
    if (remaining > 0) {
      return `Book ${remaining} more ${remaining === 1 ? 'event' : 'events'} to unlock ${status.next_tier.name} benefits.`;
    }
  }

  return 'Book events to unlock exclusive rewards and benefits.';
}

// =============================================================================
// COMPONENT
// =============================================================================

export const VIPStatusCard = memo(function VIPStatusCard({
  status,
  onViewAllBenefits,
  style,
  testID,
}: VIPStatusCardProps) {
  const scale = useSharedValue(1);
  const { current_tier, benefits, next_tier, progress_to_next_tier } = status;

  // Get display benefits (limit to 3 for card preview)
  const displayBenefits = benefits?.slice(0, 3) || [];
  const hasMoreBenefits = (benefits?.length || 0) > 3;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onViewAllBenefits) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleViewAllPress = () => {
    if (onViewAllBenefits) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onViewAllBenefits();
    }
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Header Section */}
      <View style={styles.header}>
        {/* Top tier celebration icon */}
        {isTopTier(status) && (
          <View style={styles.crownContainer}>
            <Crown size={24} color="#F59E0B" weight="fill" />
          </View>
        )}

        {/* Tier Badge */}
        {current_tier && (
          <VIPTierBadge tier={current_tier} size="large" />
        )}

        {/* Greeting */}
        <Text style={styles.greeting}>{getTierGreeting(status)}</Text>
        <Text style={styles.subtitle}>{getTierSubtitle(status)}</Text>
      </View>

      {/* Progress Section (only if not at top tier) */}
      {!isTopTier(status) && (
        <View style={styles.progressSection}>
          <VIPProgressBar
            progress={progress_to_next_tier}
            nextTier={next_tier}
          />
        </View>
      )}

      {/* Bookings Count */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{status.completed_bookings_count}</Text>
          <Text style={styles.statLabel}>Completed Bookings</Text>
        </View>
      </View>

      {/* Benefits Preview Section */}
      {displayBenefits.length > 0 && (
        <View style={styles.benefitsSection}>
          <View style={styles.benefitsHeader}>
            <Text style={styles.benefitsTitle}>Your Benefits</Text>
            {hasMoreBenefits && onViewAllBenefits && (
              <Pressable
                onPress={handleViewAllPress}
                hitSlop={8}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <ArrowRight size={14} color={theme.colors.primary[600]} />
              </Pressable>
            )}
          </View>

          <View style={styles.benefitsList}>
            {displayBenefits.map((benefit) => (
              <VIPBenefitCard
                key={benefit.id}
                benefit={benefit}
                compact
              />
            ))}
          </View>
        </View>
      )}

      {/* Empty state for no benefits (Guest tier) */}
      {displayBenefits.length === 0 && isEntryTier(status) && (
        <View style={styles.emptyBenefits}>
          <View style={styles.emptyIconContainer}>
            <Star size={32} color={theme.colors.neutral[400]} />
          </View>
          <Text style={styles.emptyTitle}>Start your rewards journey</Text>
          <Text style={styles.emptyDescription}>
            Complete your first booking to unlock exclusive benefits and rewards.
          </Text>
        </View>
      )}

      {/* Top tier benefits celebration */}
      {isTopTier(status) && displayBenefits.length > 0 && (
        <View style={styles.topTierMessage}>
          <Star size={16} color="#F59E0B" weight="fill" />
          <Text style={styles.topTierText}>
            Enjoying all Premier Member privileges
          </Text>
        </View>
      )}
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  crownContainer: {
    marginBottom: theme.spacing.xs,
  },
  greeting: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  subtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
    textAlign: 'center',
    maxWidth: 280,
  },
  progressSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
    marginHorizontal: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  statValue: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 28,
    color: theme.colors.neutral[800],
  },
  statLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  benefitsSection: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  benefitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  benefitsTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
  },
  benefitsList: {
    gap: theme.spacing.sm,
  },
  emptyBenefits: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  emptyTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[700],
  },
  emptyDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    maxWidth: 260,
  },
  topTierMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#FEF3C7',
    marginTop: theme.spacing.sm,
  },
  topTierText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: '#B45309',
  },
});

export default VIPStatusCard;

// Display name for debugging
VIPStatusCard.displayName = 'VIPStatusCard';
