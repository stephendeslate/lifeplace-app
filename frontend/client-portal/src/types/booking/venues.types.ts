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
