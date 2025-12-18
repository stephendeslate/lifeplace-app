// frontend/client-portal/src/types/booking/venues.types.ts

/**
 * Public venue types for client-facing booking flow
 */

export interface VenueOperatingRulesPublic {
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
  sort_order: number;
  operating_rules: VenueOperatingRulesPublic | null;
}

export interface PackageVenuePublic {
  id: number;
  venue: number;
  venue_name: string;
  venue_code: string;
  venue_is_overnight: boolean;
  venue_max_capacity: number;
  is_primary: boolean;
  access_order: number;
  access_duration_hours: string | null;
  notes: string;
  operating_rules: VenueOperatingRulesPublic | null;
}

// Time calculation types
export interface CalculatedEventTimes {
  ingress_start: string;
  program_start: string;
  program_end: string;
  egress_end: string;
  scheduled_checkout: string;
}

export interface DurationBreakdown {
  ingress_hours: number;
  program_hours: number;
  egress_hours: number;
  total_hours: number;
}

export interface EarlyCheckinInfo {
  time: string | null;
  hours: number | null;
  fee: number | null;
}

export interface LateCheckoutInfo {
  time: string | null;
  hours: number | null;
  fee: number | null;
}

export interface VenueTimeCalculation {
  venue_id: number;
  venue_name: string;
  program_date: string;
  times: CalculatedEventTimes;
  duration_breakdown: DurationBreakdown;
  early_checkin: EarlyCheckinInfo | null;
  late_checkout: LateCheckoutInfo | null;
  constraints: {
    music_curfew: string | null;
    hard_cutoff: string | null;
  };
  validation: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface CalculateTimesRequest {
  program_date: string;
  program_start_time: string;
  program_hours?: number;
  early_checkin_hours?: number | null;
  late_checkout_hours?: number | null;
}

// Venue availability types
export interface VenueAvailabilityResponse {
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

// Enhanced DateTimeStepData with venue fields
export interface DateTimeWithVenueData {
  start_date: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  duration?: number;
  venue_preference?: string;
  resource_requirements?: string[];
  staff_requirements?: string[];
  // Venue-specific fields
  venue_id?: number;
  program_duration_hours?: number;
  early_checkin_requested?: boolean;
  early_checkin_hours?: number;
  late_checkout_requested?: boolean;
  late_checkout_hours?: number;
  // Calculated times (from API)
  calculated_times?: CalculatedEventTimes;
  duration_breakdown?: DurationBreakdown;
  early_checkin_fee?: number;
  late_checkout_fee?: number;
}

// ============================================
// VENUE SELECTION STEP TYPES
// For custom package curation from venue selection
// ============================================

/**
 * Rentable venue - a venue that can be rented standalone
 * with its own pricing for custom package curation
 */
export interface RentableVenue {
  id: number;
  name: string;
  code: string;
  description: string;
  minimum_capacity: number;
  maximum_capacity: number;
  recommended_capacity: number | null;
  location_description: string;
  featured_image: string | null;
  gallery_images: string[];
  standalone_base_price: string;
  standalone_included_hours: string;
  standalone_excess_hour_price: string;
  operating_rules: VenueOperatingRulesPublic | null;
}

/**
 * Data for venue selection step
 */
export interface VenueSelectionStepData {
  selected_venue_ids: number[];
  primary_venue_id: number | null;
  custom_package_id?: number;
}

/**
 * Request to create custom package from venues
 */
export interface CreateFromVenuesRequest {
  venue_ids: number[];
  primary_venue_id: number;
  booking_session_id: string;
  category_id?: number;
}

/**
 * Response from creating custom package
 */
export interface CreateFromVenuesResponse {
  id: number;
  name: string;
  base_price: string;
  included_hours: number;
  excess_hour_price: string;
  bundle_discount_percent: string;
  venues: Array<{
    id: number;
    name: string;
    is_primary: boolean;
    hours_contribution: string | null;
    price_contribution: string | null;
  }>;
}

/**
 * Configuration for venue selection step
 */
export interface VenueSelectionStepConfiguration {
  min_venues: number;
  max_venues: number;
  show_pricing: boolean;
  show_included_hours: boolean;
  show_bundle_discount: boolean;
  bundle_discount_percent: string;
  title: string;
  description: string;
  available_venues_details?: RentableVenue[];
  // Enhanced configuration
  show_package_recommendations?: boolean;
  show_view_packages_option?: boolean;
  view_packages_button_text?: string;
}

// ============================================
// PACKAGE MATCHING TYPES
// For finding pre-made packages that match venue selection
// ============================================

/**
 * Venue info within a matched package
 */
export interface MatchedPackageVenue {
  id: number;
  name: string;
  is_primary: boolean;
  is_included_in_selection: boolean;
}

/**
 * A pre-made package that matches or partially matches venue selection
 */
export interface MatchedPackage {
  id: number;
  name: string;
  description: string | null;
  base_price: string;
  included_hours: number;
  excess_hour_price: string | null;
  match_type: 'exact' | 'superset' | 'subset' | 'partial';
  venues: MatchedPackageVenue[];
  bonus_venues: MatchedPackageVenue[];
  savings_vs_custom: string;
  savings_percent: string;
  is_better_value: boolean;
  additional_venues: MatchedPackageVenue[];
  missing_venues: Array<{ id: number; name: string }>;
}

/**
 * Custom package estimate from venue selection
 */
export interface CustomPackageEstimate {
  subtotal: string;
  discount_percent: string;
  discount_amount: string;
  total: string;
  included_hours: number;
  venues: Array<{
    id: number;
    name: string;
    price: string;
    hours: string;
  }>;
}

/**
 * Request to find matching packages
 */
export interface FindMatchingPackagesRequest {
  venue_ids: number[];
  bundle_discount_percent?: string;
}

/**
 * Response from finding matching packages
 */
export interface FindMatchingPackagesResponse {
  exact_matches: MatchedPackage[];
  partial_matches: MatchedPackage[];
  custom_package_estimate: CustomPackageEstimate | null;
}
