/**
 * VIPTierBadge Component
 *
 * Displays a VIP tier name with colored badge and icon.
 * Uses relational language (e.g., "Partner Member" instead of "Level 1").
 */

import React, { memo } from 'react';
import { StyleSheet, Text, View, type ViewStyle, type StyleProp } from 'react-native';
import { User, Handshake, Star } from 'phosphor-react-native';
import { theme } from '@/theme';
import type { VIPTier } from '@/types/vip.types';

// =============================================================================
// TIER CONFIGURATION
// =============================================================================

/**
 * Tier color configuration matching CEO requirements:
 * - Guest: #6B7280 (gray)
 * - Partner: #3B82F6 (blue)
 * - Premier: #F59E0B (amber/gold)
 */
const TIER_COLORS: Record<string, { background: string; text: string; icon: string }> = {
  Guest: {
    background: '#F3F4F6',
    text: '#6B7280',
    icon: '#6B7280',
  },
  Partner: {
    background: '#DBEAFE',
    text: '#1D4ED8',
    icon: '#3B82F6',
  },
  Premier: {
    background: '#FEF3C7',
    text: '#B45309',
    icon: '#F59E0B',
  },
};

/**
 * Get display name for tier (relational language).
 * - "Guest" stays as "Guest"
 * - "Partner" becomes "Partner Member"
 * - "Premier" becomes "Premier Member"
 */
function getTierDisplayName(tierName: string): string {
  switch (tierName) {
    case 'Partner':
      return 'Partner Member';
    case 'Premier':
      return 'Premier Member';
    default:
      return tierName;
  }
}

/**
 * Get icon component for tier.
 * - Guest: User icon
 * - Partner: Handshake icon
 * - Premier: Star icon
 */
function getTierIcon(
  tierName: string,
  size: number,
  color: string
): React.ReactNode {
  switch (tierName) {
    case 'Partner':
      return <Handshake size={size} color={color} weight="fill" />;
    case 'Premier':
      return <Star size={size} color={color} weight="fill" />;
    default:
      return <User size={size} color={color} weight="fill" />;
  }
}

// =============================================================================
// TYPES
// =============================================================================

export type VIPTierBadgeSize = 'small' | 'medium' | 'large';

export interface VIPTierBadgeProps {
  tier: VIPTier;
  size?: VIPTierBadgeSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// =============================================================================
// SIZE CONFIGURATION
// =============================================================================

function getSizeStyles(size: VIPTierBadgeSize) {
  switch (size) {
    case 'small':
      return {
        container: {
          paddingHorizontal: theme.spacing.xs,
          paddingVertical: 2,
          borderRadius: theme.borderRadius.sm,
          gap: 4,
        } as ViewStyle,
        iconSize: 12,
        fontSize: theme.typography.sizes.xs,
      };
    case 'large':
      return {
        container: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.borderRadius.md,
          gap: 8,
        } as ViewStyle,
        iconSize: 20,
        fontSize: theme.typography.sizes.md,
      };
    default: // medium
      return {
        container: {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: 4,
          borderRadius: theme.borderRadius.sm,
          gap: 6,
        } as ViewStyle,
        iconSize: 16,
        fontSize: theme.typography.sizes.sm,
      };
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export const VIPTierBadge = memo(function VIPTierBadge({
  tier,
  size = 'medium',
  style,
  testID,
}: VIPTierBadgeProps) {
  const tierColors = TIER_COLORS[tier.name] || TIER_COLORS.Guest;
  const sizeStyles = getSizeStyles(size);
  const displayName = getTierDisplayName(tier.name);

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: tierColors.background },
        sizeStyles.container,
        style,
      ]}
      testID={testID}
    >
      {getTierIcon(tier.name, sizeStyles.iconSize, tierColors.icon)}
      <Text
        style={[
          styles.label,
          { color: tierColors.text, fontSize: sizeStyles.fontSize },
        ]}
      >
        {displayName}
      </Text>
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: theme.typography.fonts.semibold,
  },
});

export default VIPTierBadge;

// Display name for debugging
VIPTierBadge.displayName = 'VIPTierBadge';
