/**
 * Favorites Screen
 *
 * Shows user's saved venues and packages.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Heart, Buildings, Package } from 'phosphor-react-native';
import { useRouter, type Href } from 'expo-router';

import { useFavoritesWithDetails } from '@/hooks/useFavorites';
import { VenueCard, PackageCard } from '@/components/explore';
import { Skeleton, EmptyState } from '@/components/common';
import { colors, spacing, typeScale, layout } from '@/theme';
import type { FavoriteType, VenuePublic, PackagePublic } from '@/types/explore.types';

type FilterType = 'all' | 'venue' | 'package';

export default function FavoritesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    favorites,
    isLoading,
    isHydrated,
    venueCount,
    packageCount,
    totalCount,
  } = useFavoritesWithDetails();

  const filteredFavorites = favorites.filter((fav) => {
    if (filter === 'all') return true;
    return fav.type === filter;
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // React Query will refetch on next access
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleItemPress = (type: FavoriteType, itemId: number) => {
    if (type === 'venue') {
      router.push(`/venues/${itemId}` as Href);
    } else {
      router.push(`/packages/${itemId}` as Href);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: (typeof favorites)[0] }) => {
      if (item.isLoading) {
        return <Skeleton variant="rounded" height={120} style={styles.cardSkeleton} />;
      }

      if (!item.details) {
        return null;
      }

      if (item.type === 'venue') {
        return (
          <VenueCard
            venue={item.details as VenuePublic}
            onPress={() => handleItemPress(item.type, item.itemId)}
            style={styles.card}
          />
        );
      }

      return (
        <PackageCard
          package={item.details as PackagePublic}
          onPress={() => handleItemPress(item.type, item.itemId)}
          style={styles.card}
        />
      );
    },
    []
  );

  if (!isHydrated || isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Saved</Text>
        </View>
        <View style={styles.content}>
          <Skeleton variant="rounded" height={220} style={styles.cardSkeleton} />
          <Skeleton variant="rounded" height={220} style={styles.cardSkeleton} />
          <Skeleton variant="rounded" height={220} style={styles.cardSkeleton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved</Text>
        <Text style={styles.subtitle}>
          {totalCount} {totalCount === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <Pressable
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({totalCount})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'venue' && styles.filterTabActive]}
          onPress={() => setFilter('venue')}
        >
          <Buildings size={16} color={filter === 'venue' ? colors.neutral.white : colors.neutral.gray} />
          <Text style={[styles.filterText, filter === 'venue' && styles.filterTextActive]}>
            Venues ({venueCount})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'package' && styles.filterTabActive]}
          onPress={() => setFilter('package')}
        >
          <Package size={16} color={filter === 'package' ? colors.neutral.white : colors.neutral.gray} />
          <Text style={[styles.filterText, filter === 'package' && styles.filterTextActive]}>
            Packages ({packageCount})
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {filteredFavorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="heart"
            title={filter === 'all' ? 'No Saved Items' : `No Saved ${filter === 'venue' ? 'Venues' : 'Packages'}`}
            description={
              filter === 'all'
                ? 'Save your favorite venues and packages for quick access later.'
                : `You haven't saved any ${filter === 'venue' ? 'venues' : 'packages'} yet.`
            }
            actionLabel="Explore"
            onAction={() => router.push('/explore' as Href)}
          />
        </View>
      ) : (
        <FlashList
          data={filteredFavorites}
          renderItem={renderItem}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typeScale.headlineLarge,
    color: colors.primary.black,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.neutral.sand,
  },
  filterTabActive: {
    backgroundColor: colors.primary.black,
  },
  filterText: {
    ...typeScale.labelMedium,
    color: colors.neutral.gray,
  },
  filterTextActive: {
    color: colors.neutral.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.bottomNavHeight + spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
    width: '100%',
    marginRight: 0,
  },
  cardSkeleton: {
    marginBottom: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
});
