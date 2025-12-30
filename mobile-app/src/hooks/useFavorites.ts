/**
 * Favorites Hook
 *
 * Hook for accessing favorite venues and packages with full details.
 */

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { getVenueById, getPackageById } from '@/apis/explore.api';
import { exploreKeys } from './useExplore';
import type { VenuePublic, PackagePublic, FavoriteType } from '@/types/explore.types';

interface FavoriteWithDetails {
  id: string;
  type: FavoriteType;
  itemId: number;
  addedAt: string;
  details: VenuePublic | PackagePublic | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Get all favorites with their full details
 */
export function useFavoritesWithDetails() {
  const { items, isHydrated } = useFavoritesStore();

  // Separate venues and packages
  const venueFavorites = items.filter((item) => item.type === 'venue');
  const packageFavorites = items.filter((item) => item.type === 'package');

  // Fetch venue details
  const venueQueries = useQueries({
    queries: venueFavorites.map((fav) => ({
      queryKey: exploreKeys.venueDetail(fav.itemId),
      queryFn: () => getVenueById(fav.itemId),
      enabled: isHydrated,
      staleTime: 5 * 60 * 1000,
    })),
  });

  // Fetch package details
  const packageQueries = useQueries({
    queries: packageFavorites.map((fav) => ({
      queryKey: exploreKeys.packageDetail(fav.itemId),
      queryFn: () => getPackageById(fav.itemId),
      enabled: isHydrated,
      staleTime: 5 * 60 * 1000,
    })),
  });

  // Combine results
  const favorites = useMemo((): FavoriteWithDetails[] => {
    const venueResults: FavoriteWithDetails[] = venueFavorites.map((fav, index) => ({
      ...fav,
      details: venueQueries[index]?.data ?? null,
      isLoading: venueQueries[index]?.isLoading ?? false,
      error: venueQueries[index]?.error ?? null,
    }));

    const packageResults: FavoriteWithDetails[] = packageFavorites.map((fav, index) => ({
      ...fav,
      details: packageQueries[index]?.data ?? null,
      isLoading: packageQueries[index]?.isLoading ?? false,
      error: packageQueries[index]?.error ?? null,
    }));

    // Sort by addedAt (most recent first)
    return [...venueResults, ...packageResults].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  }, [venueFavorites, packageFavorites, venueQueries, packageQueries]);

  const isLoading = venueQueries.some((q) => q.isLoading) ||
                    packageQueries.some((q) => q.isLoading);

  const venueCount = venueFavorites.length;
  const packageCount = packageFavorites.length;

  return {
    favorites,
    isLoading,
    isHydrated,
    venueCount,
    packageCount,
    totalCount: items.length,
  };
}

/**
 * Get favorite venues only
 */
export function useFavoriteVenues() {
  const { items, isHydrated } = useFavoritesStore();
  const venueFavorites = items.filter((item) => item.type === 'venue');

  const queries = useQueries({
    queries: venueFavorites.map((fav) => ({
      queryKey: exploreKeys.venueDetail(fav.itemId),
      queryFn: () => getVenueById(fav.itemId),
      enabled: isHydrated,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const venues = queries
    .map((q) => q.data)
    .filter((v): v is VenuePublic => v !== undefined);

  return {
    venues,
    isLoading: queries.some((q) => q.isLoading),
    count: venueFavorites.length,
  };
}

/**
 * Get favorite packages only
 */
export function useFavoritePackages() {
  const { items, isHydrated } = useFavoritesStore();
  const packageFavorites = items.filter((item) => item.type === 'package');

  const queries = useQueries({
    queries: packageFavorites.map((fav) => ({
      queryKey: exploreKeys.packageDetail(fav.itemId),
      queryFn: () => getPackageById(fav.itemId),
      enabled: isHydrated,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const packages = queries
    .map((q) => q.data)
    .filter((p): p is PackagePublic => p !== undefined);

  return {
    packages,
    isLoading: queries.some((q) => q.isLoading),
    count: packageFavorites.length,
  };
}
