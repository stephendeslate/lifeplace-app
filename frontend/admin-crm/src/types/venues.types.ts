// frontend/admin-crm/src/types/venues.types.ts

export interface VenueOperatingRules {
  id: number;
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
  allow_custom_ingress: boolean;
  allow_custom_egress: boolean;
  min_ingress_hours: string;
  max_ingress_hours: string;
  min_egress_hours: string;
  max_egress_hours: string;
  // Time Constraints
  earliest_start_time: string | null;
  latest_end_time: string | null;
  hard_cutoff_time: string | null;
  hard_cutoff_next_day: boolean;
  early_access_minutes: number;
  // Early Check-in
  early_checkin_allowed: boolean;
  early_checkin_fee_per_hour: string | null;
  earliest_checkin_time: string | null;
  // Late Checkout
  late_checkout_allowed: boolean;
  late_checkout_fee_per_hour: string | null;
  late_checkout_max_hours: number;
  latest_checkout_time: string | null;
  // Custom Rules
  custom_rules: VenueCustomRules;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface VenueCustomRules {
  violation_fees?: Array<{
    code: string;
    description: string;
    fee: number;
  }>;
  policies?: Array<{
    code: string;
    description: string;
  }>;
  music_curfew?: string;
  notes?: string;
}

export interface Venue {
  id: number;
  name: string;
  code: string;
  description: string;
  is_overnight: boolean;
  minimum_capacity: number;
  maximum_capacity: number;
  recommended_capacity: number | null;
  is_active: boolean;
  is_bookable: boolean;
  location_description: string;
  featured_image: string | null;
  gallery_images: string[];
  sort_order: number;
  // Standalone pricing (for custom package curation)
  is_rentable_standalone: boolean;
  standalone_base_price: string | null;
  standalone_included_hours: string | null;
  standalone_excess_hour_price: string | null;
  operating_rules: VenueOperatingRules | null;
  packages_count: number;
  created_at: string;
  updated_at: string;
}

export interface VenueListItem {
  id: number;
  name: string;
  code: string;
  is_overnight: boolean;
  is_active: boolean;
  is_bookable: boolean;
  minimum_capacity: number;
  maximum_capacity: number;
  featured_image: string | null;
  sort_order: number;
  is_rentable_standalone: boolean;
  has_operating_rules: boolean;
  packages_count: number;
}

export interface VenueDetail extends Venue {
  packages: PackageVenueInfo[];
  blocked_dates: VenueBlockedDate[];
}

export interface PackageVenueInfo {
  id: number;
  name: string;
  is_primary: boolean;
  access_order: number;
  access_duration_hours: string | null;
  notes: string;
}

export interface CreateVenueData {
  name: string;
  code: string;
  description?: string;
  is_overnight?: boolean;
  minimum_capacity?: number;
  maximum_capacity: number;
  recommended_capacity?: number | null;
  is_active?: boolean;
  is_bookable?: boolean;
  location_description?: string;
  featured_image?: string | null;
  gallery_images?: string[];
  sort_order?: number;
  // Standalone pricing (for custom package curation)
  is_rentable_standalone?: boolean;
  standalone_base_price?: number | null;
  standalone_included_hours?: number | null;
  standalone_excess_hour_price?: number | null;
  operating_rules?: CreateOperatingRulesData;
}

export type UpdateVenueData = Partial<CreateVenueData>;

export interface CreateOperatingRulesData {
  default_check_in_time: string;
  default_checkout_time: string;
  checkout_next_day?: boolean;
  minimum_program_hours?: string;
  maximum_program_hours?: string | null;
  default_program_hours?: string;
  is_fixed_duration?: boolean;
  ingress_hours?: string;
  egress_hours?: string;
  allow_custom_ingress?: boolean;
  allow_custom_egress?: boolean;
  min_ingress_hours?: string;
  max_ingress_hours?: string;
  min_egress_hours?: string;
  max_egress_hours?: string;
  earliest_start_time?: string | null;
  latest_end_time?: string | null;
  hard_cutoff_time?: string | null;
  hard_cutoff_next_day?: boolean;
  early_access_minutes?: number;
  early_checkin_allowed?: boolean;
  early_checkin_fee_per_hour?: string | null;
  earliest_checkin_time?: string | null;
  late_checkout_allowed?: boolean;
  late_checkout_fee_per_hour?: string | null;
  late_checkout_max_hours?: number;
  latest_checkout_time?: string | null;
  custom_rules?: VenueCustomRules;
}

// Package-Venue relationship
export interface PackageVenue {
  id: number;
  package: number;
  package_name: string;
  venue: number;
  venue_name: string;
  venue_code: string;
  venue_is_overnight: boolean;
  is_primary: boolean;
  access_order: number;
  access_duration_hours: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PackageVenueInline {
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
  operating_rules: VenueOperatingRules | null;
}

export interface CreatePackageVenueData {
  package: number;
  venue: number;
  is_primary?: boolean;
  access_order?: number;
  access_duration_hours?: string | null;
  notes?: string;
}

export interface BulkAssignVenuesData {
  package_id: number;
  venues: Array<{
    venue_id: number;
    is_primary?: boolean;
    access_order?: number;
    access_duration_hours?: string | null;
    notes?: string;
  }>;
}

// Venue Blocked Date
export interface VenueBlockedDate {
  id: number;
  venue: number;
  venue_name: string;
  date: string;
  reason: string;
  is_full_day: boolean;
  blocked_start_time: string | null;
  blocked_end_time: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBlockedDateData {
  venue: number;
  date: string;
  reason: string;
  is_full_day?: boolean;
  blocked_start_time?: string | null;
  blocked_end_time?: string | null;
}

// Calculate Times Response
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

// Venue availability
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
