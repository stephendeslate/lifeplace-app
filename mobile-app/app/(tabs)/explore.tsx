/**
 * Explore Tab
 *
 * Venue and package discovery with:
 * - Tab navigation (Venues / Packages)
 * - Event type filtering (primary)
 * - Duration filtering for Camps/Team Building
 * - Search with debounce
 * - Pull-to-refresh
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { Info } from 'phosphor-react-native';

import {
  useRentableVenues,
  usePackages,
  useEventTypes,
  usePrefetchVenue,
  usePrefetchPackage,
} from '@/hooks/useExplore';
import {
  VenueCard,
  PackageCard,
  SearchBar,
  CAMPS_DURATION_OPTIONS,
  TEAM_BUILDING_DURATION_OPTIONS,
} from '@/components/explore';
import { Skeleton, EmptyState, ScreenErrorBoundary, FilterChips } from '@/components/common';
import type { FilterChip } from '@/components/common';
import { theme, colors, spacing, typeScale, layout } from '@/theme';
import type { ExploreTab, RentableVenueWithEventType, PackagePublic, DurationOption } from '@/types/explore.types';

const TAB_CHIPS: FilterChip<ExploreTab>[] = [
  { id: 'venues', label: 'Venues', value: 'venues' },
  { id: 'packages', label: 'Packages', value: 'packages' },
];

function ExploreTabContent() {
  const router = useRouter();
  const { eventTypeId: initialEventTypeId } = useLocalSearchParams<{ eventTypeId?: string }>();

  // State
  const [activeTab, setActiveTab] = useState<ExploreTab>('venues');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Handle deep link with pre-selected event type
  useEffect(() => {
    if (initialEventTypeId) {
      setSelectedEventTypeId(parseInt(initialEventTypeId, 10));
      setActiveTab('packages'); // Switch to packages tab when event type is pre-selected
    }
  }, [initialEventTypeId]);

  // Reset duration when event type changes
  useEffect(() => {
    setSelectedDuration(null);
  }, [selectedEventTypeId]);

  // Data hooks
  const { data: eventTypes, refetch: refetchEventTypes } = useEventTypes();
  const {
    data: venues,
    isLoading: venuesLoading,
    refetch: refetchVenues,
  } = useRentableVenues(selectedEventTypeId ?? undefined);
  const {
    data: packages,
    isLoading: packagesLoading,
    refetch: refetchPackages,
  } = usePackages({
    eventTypeId: selectedEventTypeId,
    eventDays: selectedDuration,
  });

  // Prefetch
  const prefetchVenue = usePrefetchVenue();
  const prefetchPackage = usePrefetchPackage();

  // Get selected event type name
  const selectedEventType = useMemo(() => {
    if (!selectedEventTypeId || !eventTypes) return null;
    return eventTypes.find((et) => et.id === selectedEventTypeId);
  }, [selectedEventTypeId, eventTypes]);

  // Create event type filter chips
  const eventTypeChips: FilterChip<number | null>[] = useMemo(() => {
    const chips: FilterChip<number | null>[] = [
      { id: 'all', label: 'All', value: null },
    ];
    if (eventTypes) {
      eventTypes.forEach((et) => {
        chips.push({
          id: String(et.id),
          label: et.name,
          value: et.id,
        });
      });
    }
    return chips;
  }, [eventTypes]);

  // Determine if duration filter should be shown (only for Camps/Team Building in packages tab)
  const showDurationFilter = useMemo(() => {
    if (activeTab !== 'packages') return false;
    if (!selectedEventType) return false;
    return (
      selectedEventType.name === 'Camps & Retreats' ||
      selectedEventType.name === 'Team Building'
    );
  }, [activeTab, selectedEventType]);

  // Get duration filter chips based on selected event type
  const durationChips: FilterChip<number | null>[] = useMemo(() => {
    if (!selectedEventType) return [];

    let options: DurationOption[] = [];
    if (selectedEventType.name === 'Camps & Retreats') {
      options = CAMPS_DURATION_OPTIONS;
    } else if (selectedEventType.name === 'Team Building') {
      options = TEAM_BUILDING_DURATION_OPTIONS;
    }

    return options.map((opt) => ({
      id: opt.id !== null ? String(opt.id) : 'all',
      label: opt.label,
      value: opt.days,
    }));
  }, [selectedEventType]);

  // Check if this is a per-person pricing event type
  const isPerPersonEventType = useMemo(() => {
    if (!selectedEventType) return false;
    return (
      selectedEventType.name === 'Camps & Retreats' ||
      selectedEventType.name === 'Team Building' ||
      selectedEventType.name === 'Workshops'
    );
  }, [selectedEventType]);

  // Filter venues by search only (API handles event type filtering)
  const filteredVenues = useMemo(() => {
    if (!venues) return [];

    return venues.filter((venue) => {
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesName = venue.name.toLowerCase().includes(searchLower);
        const matchesDescription = venue.description?.toLowerCase().includes(searchLower);
        const matchesLocation = venue.location_description?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesDescription && !matchesLocation) {
          return false;
        }
      }
      return true;
    });
  }, [venues, searchQuery]);

  // Filter packages by search only (API handles event type and duration filtering)
  const filteredPackages = useMemo(() => {
    if (!packages) return [];

    return packages.filter((pkg) => {
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesName = pkg.name.toLowerCase().includes(searchLower);
        const matchesDescription = pkg.description?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesDescription) {
          return false;
        }
      }
      return true;
    });
  }, [packages, searchQuery]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchVenues(), refetchPackages(), refetchEventTypes()]);
    setRefreshing(false);
  }, [refetchVenues, refetchPackages, refetchEventTypes]);

  const handleEventTypeSelect = useCallback((id: number | null) => {
    setSelectedEventTypeId(id);
    // Duration will be reset by the useEffect above
  }, []);

  const handleDurationSelect = useCallback((days: number | null) => {
    setSelectedDuration(days);
  }, []);

  const handleVenuePress = (venueId: number) => {
    router.push(`/venues/${venueId}` as Href);
  };

  const handlePackagePress = (packageId: number) => {
    router.push(`/packages/${packageId}` as Href);
  };

  // Render venue item
  const renderVenueItem = useCallback(
    ({ item }: { item: RentableVenueWithEventType }) => (
      <View style={styles.cardWrapper}>
        <VenueCard
          venue={item}
          onPress={() => handleVenuePress(item.id)}
          onPressIn={() => prefetchVenue(item.id)}
          style={styles.fullWidthCard}
        />
      </View>
    ),
    [prefetchVenue]
  );

  // Render package item
  const renderPackageItem = useCallback(
    ({ item }: { item: PackagePublic }) => (
      <View style={styles.cardWrapper}>
        <PackageCard
          package={item}
          onPress={() => handlePackagePress(item.id)}
          onPressIn={() => prefetchPackage(item.id)}
          style={styles.fullWidthCard}
        />
      </View>
    ),
    [prefetchPackage]
  );

  const isLoading = activeTab === 'venues' ? venuesLoading : packagesLoading;
  const data = activeTab === 'venues' ? filteredVenues : filteredPackages;
  const renderItem = activeTab === 'venues' ? renderVenueItem : renderPackageItem;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Find your perfect venue or package</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus={false}
        />
      </View>

      {/* Event Type Filter (primary filter) */}
      {eventTypeChips.length > 1 && (
        <FilterChips
          chips={eventTypeChips}
          selectedValue={selectedEventTypeId}
          onSelect={handleEventTypeSelect}
          style={styles.filters}
        />
      )}

      {/* Tab Switcher */}
      <FilterChips
        chips={TAB_CHIPS}
        selectedValue={activeTab}
        onSelect={setActiveTab}
        style={styles.filters}
      />

      {/* Duration Filter (only for Camps/Team Building packages) */}
      {showDurationFilter && durationChips.length > 0 && (
        <FilterChips
          chips={durationChips}
          selectedValue={selectedDuration}
          onSelect={handleDurationSelect}
          style={styles.filters}
        />
      )}

      {/* Per-person pricing info banner */}
      {activeTab === 'packages' && isPerPersonEventType && selectedEventTypeId && (
        <View style={styles.infoBanner}>
          <Info size={16} color={colors.semantic.info} />
          <Text style={styles.infoText}>
            These packages are priced per person. Minimum group size varies by package.
          </Text>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Skeleton variant="rounded" height={220} style={styles.skeleton} />
          <Skeleton variant="rounded" height={220} style={styles.skeleton} />
          <Skeleton variant="rounded" height={220} style={styles.skeleton} />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={activeTab === 'venues' ? 'building' : 'package'}
            title={searchQuery || selectedEventTypeId ? 'No Results Found' : `No ${activeTab === 'venues' ? 'Venues' : 'Packages'}`}
            description={
              searchQuery
                ? `We couldn't find any ${activeTab} matching "${searchQuery}"`
                : selectedEventTypeId
                  ? `No ${activeTab === 'venues' ? 'venues' : 'packages'} available for ${selectedEventType?.name || 'this event type'}${selectedDuration ? ` with ${durationChips.find(d => d.value === selectedDuration)?.label || ''} duration` : ''}.`
                  : `No ${activeTab} are currently available.`
            }
            actionLabel={searchQuery ? 'Clear Search' : selectedEventTypeId ? 'View All' : undefined}
            onAction={
              searchQuery
                ? () => setSearchQuery('')
                : selectedEventTypeId
                  ? () => {
                      setSelectedEventTypeId(null);
                      setSelectedDuration(null);
                    }
                  : undefined
            }
          />
        </View>
      ) : (
        <FlashList
          data={data as (RentableVenueWithEventType | PackagePublic)[]}
          renderItem={renderItem as (props: { item: RentableVenueWithEventType | PackagePublic }) => React.ReactElement}
          drawDistance={500}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

export default function ExploreTab() {
  return (
    <ScreenErrorBoundary screenName="Explore">
      <ExploreTabContent />
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typeScale.headlineLarge,
    color: theme.colors.primary.black,
  },
  subtitle: {
    ...theme.typeScale.bodyMedium,
    color: theme.colors.neutral.gray,
    marginTop: theme.spacing.xxs,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  filters: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    flexGrow: 0,
    flexShrink: 0,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.layout.borderRadius.md,
    gap: theme.spacing.sm,
  },
  infoText: {
    ...theme.typeScale.bodySmall,
    color: colors.semantic.info,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  skeleton: {
    marginBottom: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxxl,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.layout.bottomNavHeight + theme.spacing.xl,
  },
  cardWrapper: {
    marginBottom: theme.spacing.md,
  },
  fullWidthCard: {
    width: '100%',
    marginRight: 0,
  },
});
