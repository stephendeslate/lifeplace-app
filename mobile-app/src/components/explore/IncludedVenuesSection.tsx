/**
 * IncludedVenuesSection Component
 *
 * A section component for the Package Detail screen that displays
 * venues included in a package. Shows a summary card that triggers
 * an external bottom sheet.
 *
 * Note: The BottomSheet must be rendered at the screen level (outside ScrollView)
 * to display properly. Use IncludedVenuesBottomSheet for the modal content.
 *
 * Features:
 * - Summary card showing venue count
 * - Callback to open external bottom sheet
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Buildings, CaretRight } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { PackageIncludedVenue } from '@/types/explore.types';

// =============================================================================
// TYPES
// =============================================================================

export interface IncludedVenuesSectionProps {
  /** List of venues included in the package */
  venues: PackageIncludedVenue[];
  /** Callback when the user taps to view venues */
  onViewVenues: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function IncludedVenuesSection({ venues, onViewVenues }: IncludedVenuesSectionProps) {
  // Don't render if no venues
  if (!venues || venues.length === 0) {
    return null;
  }

  const venueCount = venues.length;
  const primaryVenue = venues.find((v) => v.is_primary);
  const venueLabel = venueCount === 1 ? 'venue' : 'venues';

  // Handle tap
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewVenues();
  }, [onViewVenues]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Included Venues</Text>

      {/* Summary Card */}
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.summaryCard, pressed && styles.summaryCardPressed]}
      >
        <View style={styles.summaryIconContainer}>
          <Buildings size={24} color={colors.secondary.forest} weight="duotone" />
        </View>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryTitle}>
            This package includes {venueCount} {venueLabel}
          </Text>
          <Text style={styles.summarySubtitle}>
            {primaryVenue
              ? `Primary: ${primaryVenue.name}`
              : 'Tap to view all venues included'}
          </Text>
        </View>
        <CaretRight size={20} color={colors.neutral.gray} />
      </Pressable>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  summaryCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.secondary.forestSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  summaryTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.xxs,
  },
  summarySubtitle: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
});
