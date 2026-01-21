/**
 * IncludedVenuesBottomSheet Component
 *
 * A bottom sheet modal that displays venues included in a package.
 * Must be rendered at the screen level (outside ScrollView) to display properly.
 *
 * Features:
 * - Scrollable venue list with mini cards
 * - Navigation to venue detail screens
 * - Venue prefetching on press-in
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { BottomSheet } from '@/components/common/BottomSheet';
import { VenueMiniCard } from './VenueMiniCard';
import { usePrefetchVenue } from '@/hooks/useExplore';
import { spacing } from '@/theme';
import type { PackageIncludedVenue } from '@/types/explore.types';

// =============================================================================
// TYPES
// =============================================================================

export interface IncludedVenuesBottomSheetProps {
  /** Whether the bottom sheet is open */
  isOpen: boolean;
  /** Callback when the bottom sheet should close */
  onClose: () => void;
  /** List of venues to display */
  venues: PackageIncludedVenue[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function IncludedVenuesBottomSheet({
  isOpen,
  onClose,
  venues,
}: IncludedVenuesBottomSheetProps) {
  const router = useRouter();
  const prefetchVenue = usePrefetchVenue();

  const venueCount = venues?.length || 0;

  // Handle venue card press - navigate to venue detail
  const handleVenuePress = useCallback(
    (venueId: number) => {
      router.push(`/venues/${venueId}` as Href);
    },
    [router]
  );

  // Handle venue card press-in - prefetch venue data
  const handleVenuePressIn = useCallback(
    (venueId: number) => {
      prefetchVenue(venueId);
    },
    [prefetchVenue]
  );

  if (!venues || venues.length === 0) {
    return null;
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Included Venues (${venueCount})`}
      snapPoints={['50%', '85%']}
      initialSnapIndex={0}
    >
      <View style={styles.venueList}>
        {venues.map((venue) => (
          <VenueMiniCard
            key={venue.id}
            venue={venue}
            onPress={() => handleVenuePress(venue.id)}
            onPressIn={() => handleVenuePressIn(venue.id)}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  venueList: {
    paddingTop: spacing.sm,
  },
});
