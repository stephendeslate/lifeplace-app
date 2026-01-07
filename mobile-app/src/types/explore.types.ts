/**
 * Explore & Favorites Type Definitions
 *
 * Types for venue discovery, package browsing, and favorites management.
 */

// =============================================================================
// VENUE TYPES
// =============================================================================

/**
 * Venue operating rules for display
 * Matches VenueOperatingRulesPublic from client-portal
 */
export interface VenueOperatingRules {
  // Check-in/Checkout
  default_check_in_time: string;
  default_checkout_time: string;
  checkout_next_day: boolean;
  // Program Duration
  minimum_program_hours: string;
  maximum_program_hours: string | null;
  default_program_hours: string;
  is_fixed_duration: boolean;
  // Ingress/Egress
  ingress_hours: string;
  egress_hours: string;
  // Time Constraints
  earliest_start_time: string | null;
  latest_end_time: string | null;
  hard_cutoff_time: string | null;
  hard_cutoff_next_day: boolean;
  early_access_minutes: number;
  // Early Check-in (public info)
  early_checkin_allowed: boolean;
  early_checkin_fee_per_hour: string | null;
  earliest_checkin_time: string | null;
  // Late Checkout (public info)
  late_checkout_allowed: boolean;
  late_checkout_fee_per_hour: string | null;
  late_checkout_max_hours: number;
  latest_checkout_time: string | null;
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
  /** List of amenity names (e.g., ['Pool', 'Parking', 'Sound System']) */
  amenities?: string[];
  is_featured: boolean;
  sort_order: number;
  operating_rules: VenueOperatingRules | null;
  /** Average rating (0-5 scale) - optional, added when reviews enabled */
  average_rating?: number;
  /** Number of reviews - optional, added when reviews enabled */
  review_count?: number;
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
  // Effective images with venue fallback (for packages)
  effective_featured_image: string | null;
  effective_gallery_images?: string[];
  is_featured: boolean;
  sort_order: number;
  minimum_capacity: number | null;
  maximum_capacity: number | null;
  is_active: boolean;
  advance_booking_days: number | null;
  maximum_booking_days: number | null;
  /** Average rating (0-5 scale) - optional, added when reviews enabled */
  average_rating?: number;
  /** Number of reviews - optional, added when reviews enabled */
  review_count?: number;
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
