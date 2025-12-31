/**
 * Explore Hooks
 *
 * React Query hooks for venues, packages, and search.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVenues,
  getRentableVenues,
  getFeaturedVenues,
  getVenueById,
  getVenueAvailability,
  searchVenues,
  getPackages,
  getFeaturedPackages,
  getPackagesByCategory,
  getPackageById,
  searchPackages,
  getCategories,
  getEventTypes,
} from '@/apis/explore.api';
import type { ExploreFilters } from '@/types/explore.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const exploreKeys = {
  all: ['explore'] as const,
  venues: () => [...exploreKeys.all, 'venues'] as const,
  venuesList: (filters?: ExploreFilters) =>
    [...exploreKeys.venues(), 'list', filters] as const,
  venuesRentable: (eventTypeId?: number) =>
    [...exploreKeys.venues(), 'rentable', eventTypeId] as const,
  venuesFeatured: () => [...exploreKeys.venues(), 'featured'] as const,
  venueDetail: (id: number) => [...exploreKeys.venues(), 'detail', id] as const,
  venueAvailability: (id: number, start: string, end: string) =>
    [...exploreKeys.venues(), 'availability', id, start, end] as const,
  packages: () => [...exploreKeys.all, 'packages'] as const,
  packagesList: (filters?: ExploreFilters) =>
    [...exploreKeys.packages(), 'list', filters] as const,
  packagesFeatured: () => [...exploreKeys.packages(), 'featured'] as const,
  packagesByCategory: (categoryId: number) =>
    [...exploreKeys.packages(), 'category', categoryId] as const,
  packageDetail: (id: number) => [...exploreKeys.packages(), 'detail', id] as const,
  categories: () => [...exploreKeys.all, 'categories'] as const,
  eventTypes: () => [...exploreKeys.all, 'eventTypes'] as const,
};

// =============================================================================
// VENUE HOOKS
// =============================================================================

/**
 * Get all venues
 */
export function useVenues() {
  return useQuery({
    queryKey: exploreKeys.venuesList(),
    queryFn: getVenues,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get rentable venues with pricing
 */
export function useRentableVenues(eventTypeId?: number) {
  return useQuery({
    queryKey: exploreKeys.venuesRentable(eventTypeId),
    queryFn: () => getRentableVenues(eventTypeId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get featured venues
 */
export function useFeaturedVenues() {
  return useQuery({
    queryKey: exploreKeys.venuesFeatured(),
    queryFn: getFeaturedVenues,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get venue by ID
 */
export function useVenue(venueId: number) {
  return useQuery({
    queryKey: exploreKeys.venueDetail(venueId),
    queryFn: () => getVenueById(venueId),
    enabled: venueId > 0,
  });
}

/**
 * Get venue availability
 */
export function useVenueAvailability(
  venueId: number,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: exploreKeys.venueAvailability(venueId, startDate, endDate),
    queryFn: () => getVenueAvailability(venueId, startDate, endDate),
    enabled: venueId > 0 && !!startDate && !!endDate,
    staleTime: 60 * 1000, // 1 minute (availability changes frequently)
  });
}

/**
 * Search venues with filters
 */
export function useSearchVenues(filters: ExploreFilters, enabled: boolean = true) {
  return useQuery({
    queryKey: exploreKeys.venuesList(filters),
    queryFn: () => searchVenues(filters),
    enabled: enabled && Object.keys(filters).length > 0,
    staleTime: 30 * 1000, // 30 seconds for search results
  });
}

// =============================================================================
// PACKAGE HOOKS
// =============================================================================

/**
 * Get all packages
 */
export function usePackages() {
  return useQuery({
    queryKey: exploreKeys.packagesList(),
    queryFn: getPackages,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get featured packages
 */
export function useFeaturedPackages() {
  return useQuery({
    queryKey: exploreKeys.packagesFeatured(),
    queryFn: getFeaturedPackages,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get packages by category
 */
export function usePackagesByCategory(categoryId: number) {
  return useQuery({
    queryKey: exploreKeys.packagesByCategory(categoryId),
    queryFn: () => getPackagesByCategory(categoryId),
    enabled: categoryId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get package by ID
 */
export function usePackage(packageId: number) {
  return useQuery({
    queryKey: exploreKeys.packageDetail(packageId),
    queryFn: () => getPackageById(packageId),
    enabled: packageId > 0,
  });
}

/**
 * Search packages with filters
 */
export function useSearchPackages(filters: ExploreFilters, enabled: boolean = true) {
  return useQuery({
    queryKey: exploreKeys.packagesList(filters),
    queryFn: () => searchPackages(filters),
    enabled: enabled && Object.keys(filters).length > 0,
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// CATEGORY & EVENT TYPE HOOKS
// =============================================================================

/**
 * Get product categories
 */
export function useCategories() {
  return useQuery({
    queryKey: exploreKeys.categories(),
    queryFn: getCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes (categories change rarely)
  });
}

/**
 * Get event types
 */
export function useEventTypes() {
  return useQuery({
    queryKey: exploreKeys.eventTypes(),
    queryFn: getEventTypes,
    staleTime: 10 * 60 * 1000,
  });
}

// =============================================================================
// PREFETCH UTILITIES
// =============================================================================

/**
 * Prefetch venue detail for faster navigation
 */
export function usePrefetchVenue() {
  const queryClient = useQueryClient();

  return (venueId: number) => {
    queryClient.prefetchQuery({
      queryKey: exploreKeys.venueDetail(venueId),
      queryFn: () => getVenueById(venueId),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Prefetch package detail for faster navigation
 */
export function usePrefetchPackage() {
  const queryClient = useQueryClient();

  return (packageId: number) => {
    queryClient.prefetchQuery({
      queryKey: exploreKeys.packageDetail(packageId),
      queryFn: () => getPackageById(packageId),
      staleTime: 5 * 60 * 1000,
    });
  };
}
