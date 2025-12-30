/**
 * Venues API
 *
 * API functions for venue selection and management in booking flow.
 * Adapted from: frontend/client-portal/src/apis/booking/venues.api.ts
 */

import api from '@/utils/api';
import type {
  RentableVenue,
  RentableVenueWithEventType,
  VenueAvailabilityResponse,
  CalculatedEventTimes,
  FindMatchingPackagesResponse,
  CustomPackageEstimate,
  VenueOperatingRulesPublic,
  StepValidationResult,
  VenueSelectionStepData,
} from '@/types/booking';

// =============================================================================
// TYPES
// =============================================================================

interface VenuePublic {
  id: number;
  name: string;
  description: string;
  capacity: number;
  thumbnail_url: string | null;
  images: Array<{ id: number; image_url: string; alt_text: string }>;
  amenities: Array<{ name: string; icon: string }>;
  operating_rules: VenueOperatingRulesPublic | null;
  is_active: boolean;
}

interface CalculateTimesRequest {
  event_date: string;
  program_hours: number;
}

interface CreateFromVenuesRequest {
  venue_ids: number[];
  event_type_id?: number;
  session_id?: string;
}

interface CreateFromVenuesResponse {
  product_id: number;
  name: string;
  base_price: string;
  included_venues: Array<{
    venue_id: number;
    venue_name: string;
    included_hours: string;
    excess_hour_price: string;
  }>;
  multi_venue_discount_applied: boolean;
  discount_percentage: number;
}

interface FindMatchingPackagesRequest {
  venue_ids: number[];
  event_type_id?: number;
}

// =============================================================================
// VENUES API
// =============================================================================

export const VenuesAPI = {
  /**
   * Get all active bookable venues.
   *
   * GET /venues/public/
   */
  getActiveVenues: async (): Promise<VenuePublic[]> => {
    const response = await api.get<VenuePublic[]>('/venues/public/');
    return response.data;
  },

  /**
   * Get all venues available for standalone rental (custom package curation).
   *
   * GET /venues/public/rentable/
   *
   * @param eventTypeId Optional event type ID for event-type-specific pricing
   */
  getRentableVenues: async (eventTypeId?: number): Promise<RentableVenueWithEventType[]> => {
    const params = eventTypeId ? { event_type_id: eventTypeId } : {};
    const response = await api.get<RentableVenueWithEventType[]>('/venues/public/rentable/', {
      params,
    });
    return response.data;
  },

  /**
   * Get effective pricing from a venue.
   * Uses event-type config if available, otherwise standalone pricing.
   */
  getEffectivePricing: (
    venue: RentableVenue | RentableVenueWithEventType
  ): {
    basePrice: string;
    includedHours: string;
    excessHourPrice: string;
    isAllDayAccess: boolean;
  } => {
    const venueWithEventType = venue as RentableVenueWithEventType;

    // If venue has event-type-specific config, use effective_* fields
    if (venueWithEventType.has_event_type_config) {
      return {
        basePrice: venueWithEventType.effective_base_price || venue.standalone_base_price,
        includedHours: venueWithEventType.effective_included_hours || venue.standalone_included_hours,
        excessHourPrice:
          venueWithEventType.effective_excess_hour_price || venue.standalone_excess_hour_price,
        isAllDayAccess: venueWithEventType.is_all_day_access || false,
      };
    }

    // Fallback to standalone pricing
    return {
      basePrice: venue.standalone_base_price,
      includedHours: venue.standalone_included_hours,
      excessHourPrice: venue.standalone_excess_hour_price,
      isAllDayAccess: false,
    };
  },

  /**
   * Create a custom package from selected venues.
   *
   * POST /products/products/create_from_venues/
   */
  createFromVenues: async (data: CreateFromVenuesRequest): Promise<CreateFromVenuesResponse> => {
    const response = await api.post<CreateFromVenuesResponse>(
      '/products/products/create_from_venues/',
      data
    );
    return response.data;
  },

  /**
   * Find pre-made packages that match or partially match the selected venues.
   *
   * POST /products/products/find_matching_packages/
   */
  findMatchingPackages: async (
    data: FindMatchingPackagesRequest
  ): Promise<FindMatchingPackagesResponse> => {
    const response = await api.post<FindMatchingPackagesResponse>(
      '/products/products/find_matching_packages/',
      data
    );
    return response.data;
  },

  /**
   * Get venue by ID.
   *
   * GET /venues/public/:venueId/
   */
  getVenue: async (venueId: number): Promise<VenuePublic> => {
    const response = await api.get<VenuePublic>(`/venues/public/${venueId}/`);
    return response.data;
  },

  /**
   * Calculate event times based on venue rules.
   *
   * POST /venues/public/:venueId/calculate_times/
   */
  calculateTimes: async (
    venueId: number,
    data: CalculateTimesRequest
  ): Promise<CalculatedEventTimes> => {
    const response = await api.post<CalculatedEventTimes>(
      `/venues/public/${venueId}/calculate_times/`,
      data
    );
    return response.data;
  },

  /**
   * Check venue availability for a date range.
   *
   * GET /venues/public/:venueId/availability/
   */
  getVenueAvailability: async (
    venueId: number,
    startDate: string,
    endDate: string
  ): Promise<VenueAvailabilityResponse> => {
    const response = await api.get<VenueAvailabilityResponse>(
      `/venues/public/${venueId}/availability/?start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  },

  /**
   * Check if a specific date is available for a venue.
   */
  isDateAvailable: async (
    venueId: number,
    date: string
  ): Promise<{ available: boolean; reason?: string }> => {
    try {
      const availability = await VenuesAPI.getVenueAvailability(venueId, date, date);
      const blockedDate = availability.blocked_dates.find((b) => b.date === date);

      if (blockedDate) {
        return {
          available: false,
          reason: blockedDate.reason || 'Date not available',
        };
      }

      return { available: true };
    } catch {
      return {
        available: false,
        reason: 'Unable to check availability',
      };
    }
  },

  /**
   * Validate venue selection step data.
   *
   * POST /bookingflow/public/flows/session/:sessionId/validate/
   */
  validateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: VenueSelectionStepData
  ): Promise<StepValidationResult> => {
    const response = await api.post<StepValidationResult>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      {
        step_id: stepId,
        step_data: stepData,
      }
    );
    return response.data;
  },

  /**
   * Update venue selection step data.
   *
   * PATCH /bookingflow/public/flows/session/:sessionId/update/
   */
  updateStepData: async (
    sessionId: string,
    stepId: number,
    stepData: VenueSelectionStepData,
    markCompleted: boolean = false
  ): Promise<Record<string, unknown>> => {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted,
      }
    );
    return response.data as Record<string, unknown>;
  },

  /**
   * Validate data client-side.
   */
  validateData: (
    data: VenueSelectionStepData,
    minVenues: number = 1,
    maxVenues: number = 10
  ): { isValid: boolean; errors: Record<string, string[]> } => {
    const errors: Record<string, string[]> = {};

    if (!data.selected_venue_ids || data.selected_venue_ids.length === 0) {
      errors.selected_venue_ids = ['Please select at least one venue'];
    } else if (data.selected_venue_ids.length < minVenues) {
      errors.selected_venue_ids = [`Please select at least ${minVenues} venue(s)`];
    } else if (data.selected_venue_ids.length > maxVenues) {
      errors.selected_venue_ids = [`You can select up to ${maxVenues} venues`];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Get default data.
   */
  getDefaultData: (): VenueSelectionStepData => {
    return {
      selected_venue_ids: [],
    };
  },

  /**
   * Calculate custom package estimate from selected venues.
   */
  calculateCustomPackageEstimate: (
    venues: RentableVenueWithEventType[],
    selectedVenueIds: number[]
  ): CustomPackageEstimate => {
    const selectedVenues = venues.filter((v) => selectedVenueIds.includes(v.id));

    let totalBasePrice = 0;

    const venueDetails = selectedVenues.map((venue) => {
      const pricing = VenuesAPI.getEffectivePricing(venue);
      const basePrice = parseFloat(pricing.basePrice);
      totalBasePrice += basePrice;

      return {
        venue_id: venue.id,
        venue_name: venue.name,
        base_price: pricing.basePrice,
        included_hours: pricing.includedHours,
        excess_hour_price: pricing.excessHourPrice,
      };
    });

    // Apply 10% multi-venue discount if more than one venue
    const multiVenueDiscount = selectedVenueIds.length > 1 ? 0.1 : 0;
    const discountAmount = totalBasePrice * multiVenueDiscount;
    const finalPrice = totalBasePrice - discountAmount;

    return {
      venues: venueDetails,
      subtotal: totalBasePrice.toFixed(2),
      multi_venue_discount: discountAmount.toFixed(2),
      discount_percentage: multiVenueDiscount * 100,
      total_price: finalPrice.toFixed(2),
    };
  },

  /**
   * Format time for display.
   */
  formatTime: (timeString: string): string => {
    if (!timeString) return '';

    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  },

  /**
   * Format duration for display.
   */
  formatDuration: (hours: number): string => {
    if (hours === 1) return '1 hour';
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    return `${hours} hours`;
  },
};

export default VenuesAPI;
