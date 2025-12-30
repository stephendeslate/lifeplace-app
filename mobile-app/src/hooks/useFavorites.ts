/**
 * Favorites Hook
 *
 * Hook for accessing favorite venues and packages with full details.
 * Uses batched queries for better performance.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { getVenuesByIds, getPackagesByIds } from '@/apis/explore.api';
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
 * Get all favorites with their full details using batched queries
 * This version uses a single batched query for better performance
 */
export function useFavoritesWithDetails() {
  const { items, isHydrated } = useFavoritesStore();

  // Separate venues and packages
  const venueFavorites = useMemo(
    () => items.filter((item) => item.type === 'venue'),
    [items]
  );
  const packageFavorites = useMemo(
    () => items.filter((item) => item.type === 'package'),
    [items]
  );

  // Get IDs for batched fetching
  const venueIds = useMemo(
    () => venueFavorites.map((fav) => fav.itemId),
    [venueFavorites]
  );
  const packageIds = useMemo(
    () => packageFavorites.map((fav) => fav.itemId),
    [packageFavorites]
  );

  // Batched venue query - fetches all venues in parallel with Promise.all
  const venueQuery = useQuery({
    queryKey: ['favorites', 'venues', venueIds],
    queryFn: () => getVenuesByIds(venueIds),
    enabled: isHydrated && venueIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Batched package query - fetches all packages in parallel with Promise.all
  const packageQuery = useQuery({
    queryKey: ['favorites', 'packages', packageIds],
    queryFn: () => getPackagesByIds(packageIds),
    enabled: isHydrated && packageIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Combine results
  const favorites = useMemo((): FavoriteWithDetails[] => {
    const venueMap = venueQuery.data ?? new Map<number, VenuePublic>();
    const packageMap = packageQuery.data ?? new Map<number, PackagePublic>();

    const venueResults: FavoriteWithDetails[] = venueFavorites.map((fav) => ({
      ...fav,
      details: venueMap.get(fav.itemId) ?? null,
      isLoading: venueQuery.isLoading,
      error: venueQuery.error ?? null,
    }));

    const packageResults: FavoriteWithDetails[] = packageFavorites.map((fav) => ({
      ...fav,
      details: packageMap.get(fav.itemId) ?? null,
      isLoading: packageQuery.isLoading,
      error: packageQuery.error ?? null,
    }));

    // Sort by addedAt (most recent first)
    return [...venueResults, ...packageResults].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  }, [venueFavorites, packageFavorites, venueQuery.data, packageQuery.data, venueQuery.isLoading, packageQuery.isLoading, venueQuery.error, packageQuery.error]);

  const isLoading = venueQuery.isLoading || packageQuery.isLoading;

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
 * Get favorite venues only using batched query
 */
export function useFavoriteVenues() {
  const { items, isHydrated } = useFavoritesStore();

  const venueFavorites = useMemo(
    () => items.filter((item) => item.type === 'venue'),
    [items]
  );

  const venueIds = useMemo(
    () => venueFavorites.map((fav) => fav.itemId),
    [venueFavorites]
  );

  // Batched venue query
  const query = useQuery({
    queryKey: ['favorites', 'venues', venueIds],
    queryFn: () => getVenuesByIds(venueIds),
    enabled: isHydrated && venueIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const venues = useMemo(() => {
    if (!query.data) return [];
    return Array.from(query.data.values());
  }, [query.data]);

  return {
    venues,
    isLoading: query.isLoading,
    count: venueFavorites.length,
  };
}

/**
 * Get favorite packages only using batched query
 */
export function useFavoritePackages() {
  const { items, isHydrated } = useFavoritesStore();

  const packageFavorites = useMemo(
    () => items.filter((item) => item.type === 'package'),
    [items]
  );

  const packageIds = useMemo(
    () => packageFavorites.map((fav) => fav.itemId),
    [packageFavorites]
  );

  // Batched package query
  const query = useQuery({
    queryKey: ['favorites', 'packages', packageIds],
    queryFn: () => getPackagesByIds(packageIds),
    enabled: isHydrated && packageIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const packages = useMemo(() => {
    if (!query.data) return [];
    return Array.from(query.data.values());
  }, [query.data]);

  return {
    packages,
    isLoading: query.isLoading,
    count: packageFavorites.length,
  };
}
