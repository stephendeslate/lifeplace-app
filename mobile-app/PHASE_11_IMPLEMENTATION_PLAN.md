# Phase 11: Explore & Favorites - Implementation Plan

> **Phase Status:** Ready for Implementation
> **Dependencies:** Phases 1-10 Complete, Booking APIs (Phase 6) Available
> **Reference:** [ROADMAP.md](./ROADMAP.md), [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)

---

## Overview

Phase 11 transforms the placeholder Explore and Favorites sections into fully functional discovery features, enabling users to browse venues, packages, and save favorites for quick access. This phase leverages existing booking APIs from the client-portal and backend.

### Current State

| Component | Current State | Target State |
|-----------|---------------|--------------|
| Dashboard Explore | Placeholder with "coming soon" text | Interactive search, featured venues, popular packages |
| Favorites Tab | Empty state placeholder | Full favorites management with venues/packages |
| Venue Detail | Does not exist | Complete venue detail screen with gallery |

### Backend API Endpoints (Already Available)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/venues/public/` | GET | List all active bookable venues |
| `/api/venues/public/rentable/` | GET | List venues available for rental |
| `/api/venues/public/{id}/` | GET | Get venue by ID |
| `/api/venues/public/{id}/availability/` | GET | Check venue availability |
| `/api/products/products/` | GET | List products (filter by type=PACKAGE) |
| `/api/products/categories/` | GET | List product categories |
| `/api/bookingflow/public/event-types/` | GET | List event types |

### Client-Portal Reference Files

- `frontend/client-portal/src/apis/booking/venues.api.ts` - Venue API methods
- `frontend/client-portal/src/apis/booking/products.api.ts` - Products API methods
- `frontend/client-portal/src/types/booking/venues.types.ts` - Venue type definitions

---

## Implementation Tasks

### 11.1 Type Definitions

**File:** `src/types/explore.types.ts`

```typescript
/**
 * Explore & Favorites Type Definitions
 */

// =============================================================================
// VENUE TYPES
// =============================================================================

/**
 * Venue operating rules for display
 */
export interface VenueOperatingRules {
  default_check_in_time: string;
  default_checkout_time: string;
  checkout_next_day: boolean;
  minimum_program_hours: string;
  maximum_program_hours: string | null;
  default_program_hours: string;
  is_fixed_duration: boolean;
  ingress_hours: string;
  egress_hours: string;
  earliest_start_time: string | null;
  latest_end_time: string | null;
  early_checkin_allowed: boolean;
  early_checkin_fee_per_hour: string | null;
  late_checkout_allowed: boolean;
  late_checkout_fee_per_hour: string | null;
}

/**
 * Public venue for explore/browsing
 */
export interface VenuePublic {
  id: number;
  name: string;
  code: string;
  description: string;
  is_overnight: boolean;
  minimum_capacity: number;
  maximum_capacity: number;
  recommended_capacity: number | null;
  location_description: string;
  featured_image: string | null;
  gallery_images?: string[];
  sort_order: number;
  operating_rules: VenueOperatingRules | null;
}

/**
 * Rentable venue with pricing for explore
 */
export interface RentableVenue extends VenuePublic {
  standalone_base_price: string;
  standalone_included_hours: string;
  standalone_excess_hour_price: string;
}

/**
 * Rentable venue with event-type-specific pricing
 */
export interface RentableVenueWithEventType extends RentableVenue {
  effective_base_price: string;
  effective_included_hours: string;
  effective_excess_hour_price: string;
  is_all_day_access: boolean;
  has_event_type_config: boolean;
}

// =============================================================================
// PACKAGE TYPES
// =============================================================================

/**
 * Package/Product for explore listing
 */
export interface PackagePublic {
  id: number;
  name: string;
  code: string;
  description: string | null;
  type: 'PACKAGE' | 'PRODUCT';
  category_id: number | null;
  category_name: string | null;
  base_price: string;
  pricing_model: 'FIXED' | 'HOURLY' | 'PER_PERSON';
  has_excess_hours: boolean;
  included_hours: number | null;
  excess_hour_price: string | null;
  featured_image: string | null;
  gallery_images?: string[];
  is_featured: boolean;
  sort_order: number;
  minimum_capacity: number | null;
  maximum_capacity: number | null;
  is_active: boolean;
  advance_booking_days: number | null;
  maximum_booking_days: number | null;
}

/**
 * Product category
 */
export interface ProductCategory {
  id: number;
  name: string;
  code: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

// =============================================================================
// EVENT TYPE
// =============================================================================

/**
 * Event type for filtering
 */
export interface EventType {
  id: number;
  name: string;
  code: string;
  description: string | null;
  featured_image: string | null;
  is_active: boolean;
  sort_order: number;
}

// =============================================================================
// FAVORITES TYPES
// =============================================================================

/**
 * Favorite item type
 */
export type FavoriteType = 'venue' | 'package';

/**
 * Stored favorite item
 */
export interface FavoriteItem {
  id: string; // Unique ID for the favorite entry
  type: FavoriteType;
  itemId: number;
  addedAt: string; // ISO date string
}

/**
 * Favorites state
 */
export interface FavoritesState {
  items: FavoriteItem[];
  loading: boolean;
  error: string | null;
}

// =============================================================================
// EXPLORE FILTERS
// =============================================================================

/**
 * Explore search/filter parameters
 */
export interface ExploreFilters {
  search?: string;
  eventTypeId?: number;
  categoryId?: number;
  minCapacity?: number;
  maxCapacity?: number;
  priceRange?: {
    min: number;
    max: number;
  };
}

/**
 * Explore tab type
 */
export type ExploreTab = 'venues' | 'packages';

// =============================================================================
// AVAILABILITY
// =============================================================================

/**
 * Venue availability response
 */
export interface VenueAvailability {
  venue_id: number;
  venue_name: string;
  start_date: string;
  end_date: string;
  blocked_dates: Array<{
    date: string;
    is_full_day: boolean;
    start_time: string | null;
    end_time: string | null;
    reason: string;
  }>;
}
```

**Verification Checklist:**
- [ ] Types match backend API responses
- [ ] Types align with client-portal definitions
- [ ] All fields properly typed (no `any`)

---

### 11.2 Explore API Layer

**File:** `src/apis/explore.api.ts`

```typescript
/**
 * Explore API
 *
 * API functions for venue discovery, package browsing, and search.
 */

import api from '@/utils/api';
import type {
  VenuePublic,
  RentableVenue,
  RentableVenueWithEventType,
  PackagePublic,
  ProductCategory,
  EventType,
  VenueAvailability,
  ExploreFilters,
} from '@/types/explore.types';

// =============================================================================
// VENUES
// =============================================================================

/**
 * Get all active bookable venues
 */
export async function getVenues(): Promise<VenuePublic[]> {
  const response = await api.get<VenuePublic[]>('/venues/public/');
  return response.data;
}

/**
 * Get venues available for rental with pricing
 * @param eventTypeId Optional event type ID for event-type-specific pricing
 */
export async function getRentableVenues(
  eventTypeId?: number
): Promise<RentableVenueWithEventType[]> {
  const params = eventTypeId ? { event_type_id: eventTypeId } : {};
  const response = await api.get<RentableVenueWithEventType[]>(
    '/venues/public/rentable/',
    { params }
  );
  return response.data;
}

/**
 * Get venue by ID
 */
export async function getVenueById(venueId: number): Promise<VenuePublic> {
  const response = await api.get<VenuePublic>(`/venues/public/${venueId}/`);
  return response.data;
}

/**
 * Get venue availability for date range
 */
export async function getVenueAvailability(
  venueId: number,
  startDate: string,
  endDate: string
): Promise<VenueAvailability> {
  const response = await api.get<VenueAvailability>(
    `/venues/public/${venueId}/availability/`,
    {
      params: { start_date: startDate, end_date: endDate },
    }
  );
  return response.data;
}

/**
 * Search venues by filters
 */
export async function searchVenues(
  filters: ExploreFilters
): Promise<VenuePublic[]> {
  const venues = await getVenues();

  return venues.filter((venue) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = venue.name.toLowerCase().includes(searchLower);
      const matchesDescription = venue.description?.toLowerCase().includes(searchLower);
      const matchesLocation = venue.location_description?.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesDescription && !matchesLocation) {
        return false;
      }
    }

    // Capacity filter
    if (filters.minCapacity && venue.maximum_capacity < filters.minCapacity) {
      return false;
    }
    if (filters.maxCapacity && venue.minimum_capacity > filters.maxCapacity) {
      return false;
    }

    return true;
  });
}

// =============================================================================
// PACKAGES
// =============================================================================

/**
 * Get all active packages
 */
export async function getPackages(): Promise<PackagePublic[]> {
  const response = await api.get<{
    count: number;
    results: PackagePublic[];
  }>('/products/products/', {
    params: { is_active: true, type: 'PACKAGE' },
  });
  return response.data.results || [];
}

/**
 * Get featured packages
 */
export async function getFeaturedPackages(): Promise<PackagePublic[]> {
  const packages = await getPackages();
  return packages
    .filter((pkg) => pkg.is_featured)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Get packages by category
 */
export async function getPackagesByCategory(
  categoryId: number
): Promise<PackagePublic[]> {
  const response = await api.get<{
    count: number;
    results: PackagePublic[];
  }>('/products/products/', {
    params: { is_active: true, type: 'PACKAGE', category_id: categoryId },
  });
  return response.data.results || [];
}

/**
 * Get package by ID
 */
export async function getPackageById(packageId: number): Promise<PackagePublic> {
  const response = await api.get<PackagePublic>(`/products/products/${packageId}/`);
  return response.data;
}

/**
 * Search packages by filters
 */
export async function searchPackages(
  filters: ExploreFilters
): Promise<PackagePublic[]> {
  const packages = await getPackages();

  return packages.filter((pkg) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = pkg.name.toLowerCase().includes(searchLower);
      const matchesDescription = pkg.description?.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesDescription) {
        return false;
      }
    }

    // Category filter
    if (filters.categoryId && pkg.category_id !== filters.categoryId) {
      return false;
    }

    // Price range filter
    if (filters.priceRange) {
      const price = parseFloat(pkg.base_price);
      if (price < filters.priceRange.min || price > filters.priceRange.max) {
        return false;
      }
    }

    // Capacity filter
    if (filters.minCapacity && pkg.maximum_capacity && pkg.maximum_capacity < filters.minCapacity) {
      return false;
    }

    return true;
  });
}

// =============================================================================
// CATEGORIES
// =============================================================================

/**
 * Get all product categories
 */
export async function getCategories(): Promise<ProductCategory[]> {
  const response = await api.get<ProductCategory[]>('/products/categories/', {
    params: { is_active: true },
  });
  return response.data;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Get all event types
 */
export async function getEventTypes(): Promise<EventType[]> {
  const response = await api.get<EventType[]>('/bookingflow/public/event-types/');
  return response.data;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get effective pricing for a venue
 */
export function getVenueEffectivePricing(
  venue: RentableVenue | RentableVenueWithEventType
): {
  basePrice: string;
  includedHours: string;
  excessHourPrice: string;
  isAllDayAccess: boolean;
} {
  const venueWithEventType = venue as RentableVenueWithEventType;

  if (venueWithEventType.has_event_type_config) {
    return {
      basePrice: venueWithEventType.effective_base_price || venue.standalone_base_price,
      includedHours: venueWithEventType.effective_included_hours || venue.standalone_included_hours,
      excessHourPrice: venueWithEventType.effective_excess_hour_price || venue.standalone_excess_hour_price,
      isAllDayAccess: venueWithEventType.is_all_day_access || false,
    };
  }

  return {
    basePrice: venue.standalone_base_price,
    includedHours: venue.standalone_included_hours,
    excessHourPrice: venue.standalone_excess_hour_price,
    isAllDayAccess: false,
  };
}

/**
 * Format price for display (PHP)
 */
export function formatPrice(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format capacity range for display
 */
export function formatCapacity(min: number, max: number): string {
  if (min === max) {
    return `${min} guests`;
  }
  return `${min}-${max} guests`;
}
```

**Verification Checklist:**
- [ ] All API endpoints tested against backend
- [ ] Error handling for network failures
- [ ] Response parsing matches types

---

### 11.3 Favorites Store (Zustand)

**File:** `src/stores/favoritesStore.ts`

Favorites are stored locally using `expo-secure-store` for persistence. This provides offline access and fast performance without requiring backend changes.

```typescript
/**
 * Favorites Store
 *
 * Zustand store for managing user favorites.
 * Persisted to SecureStore for offline access.
 */

import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { FavoriteItem, FavoriteType } from '@/types/explore.types';

// =============================================================================
// SECURE STORE ADAPTER
// =============================================================================

const secureStoreStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

// =============================================================================
// STORE TYPES
// =============================================================================

interface FavoritesState {
  items: FavoriteItem[];
  isHydrated: boolean;
}

interface FavoritesActions {
  addFavorite: (type: FavoriteType, itemId: number) => void;
  removeFavorite: (type: FavoriteType, itemId: number) => void;
  toggleFavorite: (type: FavoriteType, itemId: number) => void;
  isFavorite: (type: FavoriteType, itemId: number) => boolean;
  getFavoritesByType: (type: FavoriteType) => FavoriteItem[];
  clearAllFavorites: () => void;
  setHydrated: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useFavoritesStore = create<FavoritesState & FavoritesActions>()(
  persist(
    (set, get) => ({
      // State
      items: [],
      isHydrated: false,

      // Actions
      addFavorite: (type: FavoriteType, itemId: number) => {
        const existing = get().items.find(
          (item) => item.type === type && item.itemId === itemId
        );

        if (existing) return; // Already favorited

        const newItem: FavoriteItem = {
          id: `${type}-${itemId}-${Date.now()}`,
          type,
          itemId,
          addedAt: new Date().toISOString(),
        };

        set((state) => ({
          items: [...state.items, newItem],
        }));
      },

      removeFavorite: (type: FavoriteType, itemId: number) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.type === type && item.itemId === itemId)
          ),
        }));
      },

      toggleFavorite: (type: FavoriteType, itemId: number) => {
        const isFav = get().isFavorite(type, itemId);
        if (isFav) {
          get().removeFavorite(type, itemId);
        } else {
          get().addFavorite(type, itemId);
        }
      },

      isFavorite: (type: FavoriteType, itemId: number) => {
        return get().items.some(
          (item) => item.type === type && item.itemId === itemId
        );
      },

      getFavoritesByType: (type: FavoriteType) => {
        return get().items.filter((item) => item.type === type);
      },

      clearAllFavorites: () => {
        set({ items: [] });
      },

      setHydrated: () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: 'lifeplace-favorites',
      storage: createJSONStorage(() => secureStoreStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

// =============================================================================
// HOOK FOR SPECIFIC ITEM
// =============================================================================

/**
 * Hook to check and toggle favorite status for a specific item
 */
export function useFavorite(type: FavoriteType, itemId: number) {
  const { isFavorite, toggleFavorite, addFavorite, removeFavorite } = useFavoritesStore();

  return {
    isFavorite: isFavorite(type, itemId),
    toggle: () => toggleFavorite(type, itemId),
    add: () => addFavorite(type, itemId),
    remove: () => removeFavorite(type, itemId),
  };
}
```

**Verification Checklist:**
- [ ] Store persists across app restarts
- [ ] Toggle works correctly
- [ ] Store clears on logout (integrate with auth)

---

### 11.4 Explore Hooks

**File:** `src/hooks/useExplore.ts`

```typescript
/**
 * Explore Hooks
 *
 * React Query hooks for venues, packages, and search.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVenues,
  getRentableVenues,
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
```

**Verification Checklist:**
- [ ] All queries have appropriate stale times
- [ ] Prefetching works on card press
- [ ] Search debouncing implemented in UI

---

### 11.5 Favorites Hook

**File:** `src/hooks/useFavorites.ts`

```typescript
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
```

---

### 11.6 Explore Components

**Directory:** `src/components/explore/`

#### 11.6.1 VenueCard Component

**File:** `src/components/explore/VenueCard.tsx`

A card component displaying venue information with:
- Featured image with gradient overlay
- Venue name and location
- Capacity indicator (people icons)
- Starting price display
- Favorite toggle button

**Key Props:**
- `venue: VenuePublic | RentableVenue`
- `onPress: () => void`
- `showPrice?: boolean`
- `compact?: boolean`

#### 11.6.2 PackageCard Component

**File:** `src/components/explore/PackageCard.tsx`

A card component displaying package information with:
- Featured image
- Package name and category
- Price display (base price)
- Featured badge (if is_featured)
- Included hours indicator
- Favorite toggle button

**Key Props:**
- `package: PackagePublic`
- `onPress: () => void`
- `compact?: boolean`

#### 11.6.3 FavoriteButton Component

**File:** `src/components/explore/FavoriteButton.tsx`

A heart icon button for toggling favorites with:
- Haptic feedback on toggle
- Animated fill/outline transition
- Accessible label

```typescript
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Heart } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useFavorite } from '@/stores/favoritesStore';
import { colors } from '@/theme';
import type { FavoriteType } from '@/types/explore.types';

interface FavoriteButtonProps {
  type: FavoriteType;
  itemId: number;
  size?: number;
  style?: object;
}

export function FavoriteButton({
  type,
  itemId,
  size = 24,
  style,
}: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorite(type, itemId);
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(0.8, {}, () => {
      scale.value = withSpring(1);
    });

    Haptics.impactAsync(
      isFavorite
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );

    toggle();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      accessibilityState={{ selected: isFavorite }}
    >
      <Animated.View style={animatedStyle}>
        <Heart
          size={size}
          weight={isFavorite ? 'fill' : 'regular'}
          color={isFavorite ? colors.accent.coral : colors.neutral.white}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
```

#### 11.6.4 SearchBar Component

**File:** `src/components/explore/SearchBar.tsx`

A search input with:
- Search icon
- Clear button
- Debounced input (300ms)
- Filter toggle button

#### 11.6.5 CategoryChips Component

**File:** `src/components/explore/CategoryChips.tsx`

Horizontal scrollable chips for category/event type filtering:
- "All" option
- Category name chips
- Active state styling
- Scroll indicator

#### 11.6.6 ExploreHeader Component

**File:** `src/components/explore/ExploreHeader.tsx`

Combines SearchBar and CategoryChips with:
- Tab switcher (Venues / Packages)
- Animated tab indicator
- Sticky positioning

#### 11.6.7 VenueGallery Component

**File:** `src/components/explore/VenueGallery.tsx`

Image gallery for venue detail:
- Full-screen modal on tap
- Horizontal pagination
- Zoom support
- Image counter indicator

---

### 11.7 Explore Section on Dashboard

**File:** `app/(tabs)/index.tsx` (Modify)

Replace the placeholder Explore section with:

```typescript
// Add imports
import { useRentableVenues, useFeaturedPackages, usePrefetchVenue } from '@/hooks/useExplore';
import { VenueCard, PackageCard, SearchBar } from '@/components/explore';

// Inside DashboardScreen component
const { data: venues, isLoading: venuesLoading } = useRentableVenues();
const { data: featuredPackages, isLoading: packagesLoading } = useFeaturedPackages();
const prefetchVenue = usePrefetchVenue();

// Featured Venues section
const featuredVenues = venues?.slice(0, 4) ?? [];

// Handle search press (navigate to full explore)
const handleSearchPress = () => {
  router.push('/explore');
};

// Handle venue press
const handleVenuePress = (venueId: number) => {
  router.push(`/venues/${venueId}`);
};

// Render Explore section:
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Explore</Text>

  {/* Search Bar (navigates to explore screen) */}
  <Pressable style={styles.searchBar} onPress={handleSearchPress}>
    <MagnifyingGlass size={20} color={colors.neutral.gray} />
    <Text style={styles.searchPlaceholder}>
      Search venues, packages...
    </Text>
  </Pressable>

  {/* Featured Venues */}
  <View style={styles.subsection}>
    <View style={styles.subsectionHeader}>
      <Text style={styles.subsectionTitle}>Featured Venues</Text>
      <Pressable onPress={() => router.push('/explore?tab=venues')}>
        <Text style={styles.viewAllLink}>View All</Text>
      </Pressable>
    </View>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalList}
    >
      {venuesLoading ? (
        <VenueCardSkeleton />
      ) : (
        featuredVenues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            compact
            onPress={() => handleVenuePress(venue.id)}
            onPressIn={() => prefetchVenue(venue.id)}
          />
        ))
      )}
    </ScrollView>
  </View>

  {/* Popular Packages */}
  <View style={styles.subsection}>
    <View style={styles.subsectionHeader}>
      <Text style={styles.subsectionTitle}>Popular Packages</Text>
      <Pressable onPress={() => router.push('/explore?tab=packages')}>
        <Text style={styles.viewAllLink}>View All</Text>
      </Pressable>
    </View>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalList}
    >
      {packagesLoading ? (
        <PackageCardSkeleton />
      ) : (
        featuredPackages?.slice(0, 4).map((pkg) => (
          <PackageCard
            key={pkg.id}
            package={pkg}
            compact
            onPress={() => router.push(`/packages/${pkg.id}`)}
          />
        ))
      )}
    </ScrollView>
  </View>
</View>
```

---

### 11.8 Explore Screen (Full)

**File:** `app/explore/index.tsx`

Full explore screen with:
- Tab navigation (Venues / Packages)
- Search with debounce
- Category/event type filter chips
- Grid/list view toggle
- Pull-to-refresh
- Infinite scroll pagination

**Key Features:**
- Uses `useSearchVenues` and `useSearchPackages` hooks
- Debounced search input (300ms)
- FlashList for optimal performance
- Empty state for no results
- Error state with retry

---

### 11.9 Venue Detail Screen

**File:** `app/venues/[id].tsx`

Venue detail screen with:
- Image gallery header (swipeable)
- Venue name and location
- Capacity information
- Operating hours/rules
- Pricing information (if rentable)
- Availability calendar preview
- "Check Availability" button
- "Start Booking" CTA
- Favorite button in header

**Sections:**
1. **Hero Gallery** - Swipeable images with page indicator
2. **Info Header** - Name, location, capacity badges
3. **Description** - Full description text
4. **Operating Rules** - Check-in/out times, duration limits
5. **Pricing** (if rentable) - Base price, included hours, excess rates
6. **Availability** - Mini calendar showing next 30 days
7. **CTA** - Fixed bottom button for booking

---

### 11.10 Package Detail Screen

**File:** `app/packages/[id].tsx`

Package detail screen with:
- Featured image header
- Package name and category
- Price display
- Description
- Included venues (if package includes venues)
- Features/amenities list
- "Book Now" CTA
- Favorite button

---

### 11.11 Favorites Screen (Full)

**File:** `app/(tabs)/favorites.tsx` (Replace existing)

Full favorites screen with:
- Tab filter (All / Venues / Packages)
- Empty state when no favorites
- Favorite cards with swipe-to-remove
- Pull-to-refresh
- Navigation to detail screens

```typescript
/**
 * Favorites Screen
 *
 * Shows user's saved venues and packages.
 */

import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';

import { useFavoritesWithDetails } from '@/hooks/useFavorites';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { VenueCard, PackageCard } from '@/components/explore';
import { EmptyState, Skeleton } from '@/components/common';
import { colors, spacing, typeScale, layout } from '@/theme';
import type { FavoriteType } from '@/types/explore.types';

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

  const handleRefresh = async () => {
    setRefreshing(true);
    // React Query will refetch on next access
    setRefreshing(false);
  };

  const handleItemPress = (type: FavoriteType, itemId: number) => {
    if (type === 'venue') {
      router.push(`/venues/${itemId}`);
    } else {
      router.push(`/packages/${itemId}`);
    }
  };

  const renderItem = ({ item }: { item: typeof favorites[0] }) => {
    if (item.isLoading) {
      return <Skeleton variant="rounded" height={120} style={styles.cardSkeleton} />;
    }

    if (!item.details) {
      return null;
    }

    if (item.type === 'venue') {
      return (
        <VenueCard
          venue={item.details as any}
          onPress={() => handleItemPress(item.type, item.itemId)}
          style={styles.card}
        />
      );
    }

    return (
      <PackageCard
        package={item.details as any}
        onPress={() => handleItemPress(item.type, item.itemId)}
        style={styles.card}
      />
    );
  };

  if (!isHydrated || isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Saved</Text>
        </View>
        <View style={styles.content}>
          <Skeleton variant="rounded" height={120} style={styles.cardSkeleton} />
          <Skeleton variant="rounded" height={120} style={styles.cardSkeleton} />
          <Skeleton variant="rounded" height={120} style={styles.cardSkeleton} />
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
          <Buildings size={16} color={filter === 'venue' ? colors.primary.black : colors.neutral.gray} />
          <Text style={[styles.filterText, filter === 'venue' && styles.filterTextActive]}>
            Venues ({venueCount})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'package' && styles.filterTabActive]}
          onPress={() => setFilter('package')}
        >
          <Package size={16} color={filter === 'package' ? colors.primary.black : colors.neutral.gray} />
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
            onAction={() => router.push('/explore')}
          />
        </View>
      ) : (
        <FlashList
          data={filteredFavorites}
          renderItem={renderItem}
          estimatedItemSize={140}
          contentContainerStyle={styles.listContent}
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
    backgroundColor: colors.neutral.lightGray,
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
```

---

### 11.12 Clear Favorites on Logout

**File:** `src/hooks/useAuth.ts` (Modify)

Add favorites clearing to logout flow:

```typescript
import { useFavoritesStore } from '@/stores/favoritesStore';

// Inside logout function:
const logout = async () => {
  try {
    // ... existing logout logic ...

    // Clear favorites on logout
    useFavoritesStore.getState().clearAllFavorites();

    // ... rest of logout ...
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

---

## File Structure Summary

```
mobile-app/
├── src/
│   ├── types/
│   │   └── explore.types.ts              # NEW
│   │
│   ├── apis/
│   │   └── explore.api.ts                # NEW
│   │
│   ├── stores/
│   │   └── favoritesStore.ts             # NEW
│   │
│   ├── hooks/
│   │   ├── useExplore.ts                 # NEW
│   │   └── useFavorites.ts               # NEW
│   │
│   └── components/
│       └── explore/
│           ├── index.ts                  # NEW - exports
│           ├── VenueCard.tsx             # NEW
│           ├── PackageCard.tsx           # NEW
│           ├── FavoriteButton.tsx        # NEW
│           ├── SearchBar.tsx             # NEW
│           ├── CategoryChips.tsx         # NEW
│           ├── ExploreHeader.tsx         # NEW
│           └── VenueGallery.tsx          # NEW
│
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx                     # MODIFY - add explore section
│   │   └── favorites.tsx                 # REPLACE - full implementation
│   │
│   ├── explore/
│   │   └── index.tsx                     # NEW
│   │
│   ├── venues/
│   │   └── [id].tsx                      # NEW
│   │
│   └── packages/
│       └── [id].tsx                      # NEW
│
└── PHASE_11_IMPLEMENTATION_PLAN.md       # THIS FILE
```

---

## Testing Checklist

### 11.1 Explore Section (Dashboard)
- [ ] Featured venues load and display
- [ ] Featured packages load and display
- [ ] Skeleton loading states show correctly
- [ ] Search bar navigates to explore screen
- [ ] "View All" links work correctly
- [ ] Horizontal scroll is smooth
- [ ] Prefetching works on card press

### 11.2 Full Explore Screen
- [ ] Tab switching works (Venues/Packages)
- [ ] Search filters results correctly
- [ ] Search is debounced (300ms)
- [ ] Category chips filter correctly
- [ ] Pull-to-refresh works
- [ ] Empty state shows for no results
- [ ] Error state shows with retry option
- [ ] Navigation to detail screens works

### 11.3 Venue Detail Screen
- [ ] Venue data loads correctly
- [ ] Image gallery is swipeable
- [ ] Gallery opens in full-screen modal
- [ ] Operating rules display correctly
- [ ] Pricing displays (if rentable)
- [ ] Availability calendar shows blocked dates
- [ ] "Start Booking" navigates to booking flow
- [ ] Favorite button toggles correctly
- [ ] Back navigation works

### 11.4 Package Detail Screen
- [ ] Package data loads correctly
- [ ] Image displays correctly
- [ ] Price and category show
- [ ] Description renders
- [ ] "Book Now" navigates to booking flow
- [ ] Favorite button toggles correctly

### 11.5 Favorites Screen
- [ ] Favorites persist across app restarts
- [ ] Filter tabs work (All/Venues/Packages)
- [ ] Empty state shows when no favorites
- [ ] Cards display correctly with details
- [ ] Navigation to detail screens works
- [ ] Favorites clear on logout
- [ ] Pull-to-refresh works

### 11.6 Favorite Button
- [ ] Heart fills/unfills on toggle
- [ ] Haptic feedback works
- [ ] Animation is smooth
- [ ] Accessible labels are correct
- [ ] Works from all locations (card, detail)

---

## Performance Considerations

1. **Image Optimization:**
   - Use `expo-image` for caching
   - Lazy load gallery images
   - Use appropriate image sizes (thumbnails vs full)

2. **List Performance:**
   - Use FlashList instead of FlatList for large lists
   - Implement prefetching on scroll
   - Memoize card components

3. **Search Debouncing:**
   - 300ms debounce on search input
   - Cancel pending requests on new search

4. **Favorites Store:**
   - Zustand with SecureStore persistence
   - Minimal re-renders with selectors
   - Hydration check before rendering

5. **Query Caching:**
   - 5-minute stale time for venues/packages
   - 1-minute stale time for availability
   - Prefetch on card hover/press

---

## Security Considerations

1. **Favorites Storage:**
   - Stored in SecureStore (encrypted)
   - Cleared on logout
   - No sensitive data in favorites

2. **API Calls:**
   - Use existing authenticated API instance
   - Handle 401 errors (redirect to login)
   - Validate response data

---

## Implementation Order

1. **Types** (11.1) - Define all type interfaces
2. **API Layer** (11.2) - Create explore API functions
3. **Favorites Store** (11.3) - Create Zustand store
4. **Explore Hooks** (11.4) - Create React Query hooks
5. **Favorites Hook** (11.5) - Create favorites hook
6. **Components** (11.6) - Build UI components
7. **Dashboard Integration** (11.7) - Update explore section
8. **Explore Screen** (11.8) - Full explore page
9. **Venue Detail** (11.9) - Venue detail screen
10. **Package Detail** (11.10) - Package detail screen
11. **Favorites Screen** (11.11) - Replace placeholder
12. **Logout Integration** (11.12) - Clear on logout
13. **Testing** - Run through all checklists

---

## Dependencies

This phase requires:
- FlashList for optimized lists (already installed)
- expo-haptics for favorite toggle feedback (already installed)
- react-native-reanimated for animations (already installed)
- Zustand for favorites store (already installed)

No new dependencies needed.

---

## Notes

- Favorites are stored locally (no backend changes needed)
- The explore API leverages existing booking flow endpoints
- This phase prepares for seamless booking flow integration
- Consider adding deep linking support for shared venue/package URLs in Phase 14
