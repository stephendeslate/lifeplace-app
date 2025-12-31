/**
 * Venue Types for Booking Flow
 * Adapted from: frontend/client-portal/src/types/booking/venues.types.ts
 */

/**
 * Venue operating rules - public information
 */
export interface VenueOperatingRulesPublic {
  default_check_in_time: string; // HH:mm format
  default_check_out_time: string;
  minimum_hours: number;
  maximum_hours: number;
  early_checkin_fee_per_hour?: string;
  late_checkout_fee_per_hour?: string;
  is_all_day_access: boolean;
  capacity_min?: number;
  capacity_max?: number;
  ingress_hours?: number;
  egress_hours?: number;
  program_start_offset?: number; // hours after check-in
  program_end_offset?: number; // hours before check-out
}

/**
 * Basic venue information
 */
export interface VenuePublic {
  id: number;
  name: string;
  description?: string;
  location_description?: string;
  featured_image_url?: string;
  gallery_images?: string[];
  amenities?: string[];
  capacity_min: number;
  capacity_max: number;
  operating_rules: VenueOperatingRulesPublic;
}

/**
 * Venue within a package
 */
export interface PackageVenuePublic {
  id: number;
  venue: VenuePublic;
  included_hours: number;
  is_primary: boolean;
}

/**
 * Standalone rentable venue with pricing
 */
export interface RentableVenue extends VenuePublic {
  base_price: string;
  included_hours: number;
  excess_hour_rate: string;
  is_featured?: boolean;
  is_active: boolean;
  available_for_custom_packages: boolean;
  // Standalone pricing (when not part of an event type)
  standalone_base_price?: string;
  standalone_included_hours?: number;
  standalone_excess_hour_price?: string;
}

/**
 * Event-type-specific pricing for a venue
 */
export interface EventTypePricing {
  base_price: string;
  included_hours: number;
  excess_hour_rate: string;
}

/**
 * Venue with event-type-specific pricing
 */
export interface RentableVenueWithEventType extends RentableVenue {
  event_type_pricing?: EventTypePricing;
  // Effective pricing (merged from event type or standalone)
  has_event_type_config?: boolean;
  effective_base_price?: string;
  effective_included_hours?: number;
  effective_excess_hour_price?: string;
  // Operating rules can be at venue level too
  is_all_day_access?: boolean;
}

/**
 * Calculated event times based on venue and duration
 */
export interface CalculatedEventTimes {
  check_in_time: string;
  program_start_time: string;
  program_end_time: string;
  check_out_time: string;
  total_hours: number;
  included_hours: number;
  excess_hours: number;
  excess_hour_cost?: string;
}

/**
 * Full time calculation with validation
 */
export interface VenueTimeCalculation {
  venue_id: number;
  venue_name: string;
  times: CalculatedEventTimes;
  is_valid: boolean;
  validation_messages?: string[];
  within_operating_hours: boolean;
  early_checkin_hours?: number;
  early_checkin_fee?: string;
  late_checkout_hours?: number;
  late_checkout_fee?: string;
}

/**
 * Duration breakdown for display
 */
export interface DurationBreakdown {
  ingress_hours: number;
  program_hours: number;
  egress_hours: number;
  total_hours: number;
}

/**
 * Venue availability response
 */
export interface VenueAvailabilityResponse {
  venue_id: number;
  is_available: boolean;
  blocked_dates: string[]; // ISO date strings
  available_time_slots?: Array<{
    date: string;
    slots: Array<{
      start: string;
      end: string;
    }>;
  }>;
  conflicts?: Array<{
    date: string;
    reason: string;
  }>;
}

/**
 * Venue selection step data
 */
export interface VenueSelectionStepData {
  selected_venue_ids: number[];
}

/**
 * Venue selection step configuration
 */
export interface VenueSelectionStepConfiguration {
  title?: string;
  description?: string;
  available_venues?: RentableVenue[];
  available_venues_details?: RentableVenueWithEventType[];
  min_venues: number;
  max_venues: number;
  show_pricing: boolean;
  show_included_hours: boolean;
  show_bundle_discount: boolean;
  bundle_discount_percent: number;
  bundle_discount_percentage?: number; // Alias for bundle_discount_percent
  show_package_recommendations: boolean;
  filter_by_event_type: boolean;
}

/**
 * Matched package when selecting venues
 */
export interface MatchedPackage {
  id: number;
  name: string;
  description?: string;
  price: string;
  included_hours: number;
  venues: MatchedPackageVenue[];
  match_type: 'exact' | 'superset' | 'subset' | 'partial';
  match_score: number;
  is_featured: boolean;
  savings_vs_custom?: string;
}

/**
 * Venue info within a matched package
 */
export interface MatchedPackageVenue {
  id: number;
  name: string;
  included_hours: number;
  is_included: boolean;
}

/**
 * Custom package estimate from selected venues
 */
export interface CustomPackageEstimate {
  venues: Array<{
    id: number;
    name: string;
    base_price: string;
    included_hours: number;
    excess_hour_rate: string;
  }>;
  subtotal: string;
  bundle_discount?: string;
  bundle_discount_percent?: number;
  multi_venue_discount?: string; // Alias for bundle_discount
  discount_percentage?: number; // Alias for bundle_discount_percent
  total?: string;
  total_price?: string; // Alias for total
  total_included_hours?: number;
  is_multi_venue?: boolean;
}

/**
 * Request to find matching packages for selected venues
 */
export interface FindMatchingPackagesRequest {
  venue_ids: number[];
  event_type_id?: number;
}

/**
 * Response from package matching
 */
export interface FindMatchingPackagesResponse {
  packages: MatchedPackage[];
  custom_estimate: CustomPackageEstimate;
  recommendation: 'use_package' | 'use_custom' | 'either';
  recommendation_reason?: string;
}

/**
 * Request to create custom package from venues
 */
export interface CreateFromVenuesRequest {
  venue_ids: number[];
  event_type_id?: number;
  additional_hours?: Record<string, number>; // venue_id -> hours
}

/**
 * Response from custom package creation
 */
export interface CreateFromVenuesResponse {
  custom_package: CustomPackageEstimate;
}
