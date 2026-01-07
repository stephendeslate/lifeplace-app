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
 * Parameters for fetching packages with filters
 */
export interface GetPackagesParams {
  eventTypeId?: number | null;
  eventDays?: number | null;
  categoryId?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
}

/**
 * Get all active packages with optional filters
 */
export async function getPackages(params?: GetPackagesParams): Promise<PackagePublic[]> {
  const queryParams: Record<string, string | boolean> = {
    is_active: params?.isActive ?? true,
    type: 'PACKAGE',
  };

  if (params?.eventTypeId) {
    queryParams.event_type_id = String(params.eventTypeId);
  }

  if (params?.eventDays) {
    queryParams.event_days = String(params.eventDays);
  }

  if (params?.categoryId) {
    queryParams.category_id = String(params.categoryId);
  }

  if (params?.isFeatured !== undefined) {
    queryParams.is_featured = params.isFeatured;
  }

  const response = await api.get<{
    count: number;
    results: PackagePublic[];
  }>('/products/products/', {
    params: queryParams,
  });
  return response.data.results || [];
}

/**
 * Get featured venues
 */
export async function getFeaturedVenues(): Promise<RentableVenueWithEventType[]> {
  const venues = await getRentableVenues();
  return venues
    .filter((venue) => venue.is_featured)
    .sort((a, b) => a.sort_order - b.sort_order);
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
  const response = await api.get<{
    count: number;
    next: string | null;
    previous: string | null;
    results: ProductCategory[];
  }>('/products/categories/', {
    params: { is_active: true },
  });
  return response.data.results || [];
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Get all event types
 */
export async function getEventTypes(): Promise<EventType[]> {
  // Event types endpoint is public (AllowAny for list/retrieve actions)
  const response = await api.get<EventType[]>('/events/event-types/');
  return response.data;
}

// =============================================================================
// BATCH FETCH FUNCTIONS
// =============================================================================

/**
 * Batch fetch multiple venues by IDs
 * Uses Promise.all for parallel requests
 * Note: If backend adds batch endpoint, update this to use single request
 */
export async function getVenuesByIds(venueIds: number[]): Promise<Map<number, VenuePublic>> {
  if (venueIds.length === 0) return new Map();

  const results = await Promise.all(
    venueIds.map(async (id) => {
      try {
        const venue = await getVenueById(id);
        return { id, venue, error: null };
      } catch (error) {
        return { id, venue: null, error };
      }
    })
  );

  const venueMap = new Map<number, VenuePublic>();
  for (const result of results) {
    if (result.venue) {
      venueMap.set(result.id, result.venue);
    }
  }
  return venueMap;
}

/**
 * Batch fetch multiple packages by IDs
 * Uses Promise.all for parallel requests
 * Note: If backend adds batch endpoint, update this to use single request
 */
export async function getPackagesByIds(packageIds: number[]): Promise<Map<number, PackagePublic>> {
  if (packageIds.length === 0) return new Map();

  const results = await Promise.all(
    packageIds.map(async (id) => {
      try {
        const pkg = await getPackageById(id);
        return { id, pkg, error: null };
      } catch (error) {
        return { id, pkg: null, error };
      }
    })
  );

  const packageMap = new Map<number, PackagePublic>();
  for (const result of results) {
    if (result.pkg) {
      packageMap.set(result.id, result.pkg);
    }
  }
  return packageMap;
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

/**
 * Check if package uses per-person pricing
 * Per-person pricing is indicated by allow_multiple=true in the backend
 */
export function isPerPersonPricing(pkg: PackagePublic): boolean {
  return pkg.allow_multiple === true;
}

/**
 * Format the per-person rate (e.g., "₱640/person")
 */
export function formatPerPersonRate(pkg: PackagePublic): string {
  return `${formatPrice(pkg.base_price)}/person`;
}

/**
 * Calculate the starting total for per-person packages
 * Total = base_price × minimum_guests
 */
export function calculateStartingTotal(pkg: PackagePublic): number | null {
  if (!isPerPersonPricing(pkg) || !pkg.minimum_guests) {
    return null;
  }
  const basePrice = parseFloat(pkg.base_price);
  return basePrice * pkg.minimum_guests;
}

/**
 * Format the starting total price for per-person packages
 * Returns "₱51,200" for base_price=640 × minimum_guests=80
 */
export function formatStartingTotal(pkg: PackagePublic): string | null {
  const total = calculateStartingTotal(pkg);
  if (total === null) {
    return null;
  }
  return formatPrice(total);
}

/**
 * Format package price with pricing model context
 * For per-person packages (allow_multiple=true), shows "Starting from ₱X"
 * For hourly packages, shows "₱X/hour"
 * For custom packages, shows "Request Quote"
 * For fixed packages, shows the base price
 */
export function formatPackagePrice(pkg: PackagePublic): string {
  // Per-person pricing: show starting total
  if (isPerPersonPricing(pkg)) {
    const startingTotal = formatStartingTotal(pkg);
    if (startingTotal) {
      return startingTotal;
    }
    // Fallback if no minimum_guests set
    return `${formatPrice(pkg.base_price)}/person`;
  }

  if (pkg.pricing_model === 'HOURLY') {
    return `${formatPrice(pkg.base_price)}/hour`;
  }

  if (pkg.pricing_model === 'CUSTOM') {
    return 'Request Quote';
  }

  return formatPrice(pkg.base_price);
}

/**
 * Get duration label from event_days
 */
export function getDurationLabel(days: number): string {
  switch (days) {
    case 1:
      return 'Day Trip';
    case 2:
      return '2D1N';
    case 3:
      return '3D2N';
    case 4:
      return '4D3N';
    default:
      return `${days} days`;
  }
}

/**
 * Get package tier from category name
 */
export function getPackageTier(categoryName: string | null): string | null {
  if (!categoryName) return null;
  if (categoryName.includes('Budget')) return 'Budget';
  if (categoryName.includes('Basic')) return 'Basic';
  if (categoryName.includes('Premium')) return 'Premium';
  if (categoryName.includes('Facilitation')) return 'Facilitation';
  if (categoryName.includes('All-In')) return 'All-In';
  return null;
}

/**
 * Check if event type uses per-person pricing
 */
export function isPerPersonEventType(eventTypeName: string | null): boolean {
  if (!eventTypeName) return false;
  return (
    eventTypeName === 'Camps & Retreats' ||
    eventTypeName === 'Team Building' ||
    eventTypeName === 'Workshops'
  );
}
