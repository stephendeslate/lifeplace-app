/**
 * Explore Screen
 *
 * Full explore screen with:
 * - Tab navigation (Venues / Packages)
 * - Search with debounce
 * - Category/event type filter chips
 * - Pull-to-refresh
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';

import {
  useRentableVenues,
  usePackages,
  useCategories,
  usePrefetchVenue,
  usePrefetchPackage,
} from '@/hooks/useExplore';
import { VenueCard, PackageCard, SearchBar, CategoryChips } from '@/components/explore';
import { Skeleton, EmptyState, ScreenErrorBoundary, SegmentControl } from '@/components/common';
import type { Segment } from '@/components/common';
import { theme } from '@/theme';
import type { ExploreTab, RentableVenueWithEventType, PackagePublic } from '@/types/explore.types';

const TAB_SEGMENTS: Segment<ExploreTab>[] = [
  { id: 'venues', label: 'Venues', value: 'venues' },
  { id: 'packages', label: 'Packages', value: 'packages' },
];

function ExploreScreenContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  // State
  const [activeTab, setActiveTab] = useState<ExploreTab>(
    (params.tab as ExploreTab) || 'venues'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Data hooks
  const {
    data: venues,
    isLoading: venuesLoading,
    refetch: refetchVenues,
  } = useRentableVenues();
  const {
    data: packages,
    isLoading: packagesLoading,
    refetch: refetchPackages,
  } = usePackages();
  const { data: categories } = useCategories();

  // Prefetch
  const prefetchVenue = usePrefetchVenue();
  const prefetchPackage = usePrefetchPackage();

  // Filter venues
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

  // Filter packages
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

      if (selectedCategoryId && pkg.category_id !== selectedCategoryId) {
        return false;
      }

      return true;
    });
  }, [packages, searchQuery, selectedCategoryId]);

  // Category options for chips
  const categoryOptions = useMemo(() => {
    if (!categories) return [];
    return categories.map((cat) => ({ id: cat.id, name: cat.name }));
  }, [categories]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchVenues(), refetchPackages()]);
    setRefreshing(false);
  }, [refetchVenues, refetchPackages]);

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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CaretLeft size={24} color={theme.colors.primary.black} />
        </Pressable>
        <Text style={styles.title}>Explore</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus={false}
        />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <SegmentControl
          segments={TAB_SEGMENTS}
          selectedValue={activeTab}
          onSelect={setActiveTab}
        />
      </View>

      {/* Category Chips (only for packages) */}
      {activeTab === 'packages' && categoryOptions.length > 0 && (
        <View style={styles.chipsContainer}>
          <CategoryChips
            options={categoryOptions}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
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
            title={searchQuery ? 'No Results Found' : `No ${activeTab === 'venues' ? 'Venues' : 'Packages'}`}
            description={
              searchQuery
                ? `We couldn't find any ${activeTab} matching "${searchQuery}"`
                : `No ${activeTab} are currently available.`
            }
            actionLabel={searchQuery ? 'Clear Search' : undefined}
            onAction={searchQuery ? () => setSearchQuery('') : undefined}
          />
        </View>
      ) : (
        <FlashList
          data={data as (RentableVenueWithEventType | PackagePublic)[]}
          renderItem={renderItem as (props: { item: RentableVenueWithEventType | PackagePublic }) => React.ReactElement}
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

export default function ExploreScreen() {
  return (
    <ScreenErrorBoundary screenName="Explore">
      <ExploreScreenContent />
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typeScale.titleLarge,
    color: theme.colors.primary.black,
  },
  placeholder: {
    width: 44,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  tabContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  chipsContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
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
