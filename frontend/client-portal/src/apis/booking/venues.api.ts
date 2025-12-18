// frontend/client-portal/src/apis/booking/venues.api.ts

import api from '../../utils/api';
import type {
  VenuePublic,
  PackageVenuePublic,
  VenueTimeCalculation,
  CalculateTimesRequest,
  VenueAvailabilityResponse,
  RentableVenue,
  CreateFromVenuesRequest,
  CreateFromVenuesResponse,
} from '../../types/booking/venues.types';

/**
 * Venues API for client-facing booking flow
 */
export class VenuesApi {

  /**
   * Get all active bookable venues
   */
  static async getActiveVenues(): Promise<VenuePublic[]> {
    const response = await api.get<VenuePublic[]>('/venues/public/');
    return response.data;
  }

  /**
   * Get all venues available for standalone rental (custom package curation)
   */
  static async getRentableVenues(): Promise<RentableVenue[]> {
    const response = await api.get<RentableVenue[]>('/venues/public/rentable/');
    return response.data;
  }

  /**
   * Create a custom package from selected venues
   */
  static async createFromVenues(data: CreateFromVenuesRequest): Promise<CreateFromVenuesResponse> {
    const response = await api.post<CreateFromVenuesResponse>(
      '/products/products/create_from_venues/',
      data
    );
    return response.data;
  }

  /**
   * Get venue by ID
   */
  static async getVenue(venueId: number): Promise<VenuePublic> {
    const response = await api.get<VenuePublic>(`/venues/public/${venueId}/`);
    return response.data;
  }

  /**
   * Get venues included in a package
   */
  static async getPackageVenues(packageId: number): Promise<PackageVenuePublic[]> {
    const response = await api.get<PackageVenuePublic[]>(
      `/venues/package-venues/by_package/?package_id=${packageId}`
    );
    return response.data;
  }

  /**
   * Get primary venue for a package (the one that determines datetime rules)
   */
  static async getPrimaryVenueForPackage(packageId: number): Promise<PackageVenuePublic | null> {
    const venues = await this.getPackageVenues(packageId);
    return venues.find(v => v.is_primary) || venues[0] || null;
  }

  /**
   * Calculate event times based on venue rules
   */
  static async calculateTimes(
    venueId: number,
    data: CalculateTimesRequest
  ): Promise<VenueTimeCalculation> {
    const response = await api.post<VenueTimeCalculation>(
      `/venues/public/${venueId}/calculate_times/`,
      data
    );
    return response.data;
  }

  /**
   * Check venue availability for a date range
   */
  static async getVenueAvailability(
    venueId: number,
    startDate: string,
    endDate: string
  ): Promise<VenueAvailabilityResponse> {
    const response = await api.get<VenueAvailabilityResponse>(
      `/venues/public/${venueId}/availability/?start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  }

  /**
   * Check if a specific date is available for a venue
   */
  static async isDateAvailable(
    venueId: number,
    date: string
  ): Promise<{ available: boolean; reason?: string }> {
    try {
      const availability = await this.getVenueAvailability(venueId, date, date);
      const blockedDate = availability.blocked_dates.find(b => b.date === date);

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
  }

  /**
   * Get default times for a venue based on its operating rules
   */
  static getDefaultTimesFromRules(venue: VenuePublic): {
    defaultCheckIn: string;
    defaultCheckout: string;
    defaultDuration: number;
    minDuration: number;
    maxDuration: number | null;
  } {
    const rules = venue.operating_rules;

    if (!rules) {
      return {
        defaultCheckIn: '10:00',
        defaultCheckout: '18:00',
        defaultDuration: 3,
        minDuration: 1,
        maxDuration: 8,
      };
    }

    return {
      defaultCheckIn: rules.default_check_in_time,
      defaultCheckout: rules.default_checkout_time,
      defaultDuration: parseFloat(rules.default_program_hours) || 3,
      minDuration: parseFloat(rules.minimum_program_hours) || 1,
      maxDuration: rules.maximum_program_hours
        ? parseFloat(rules.maximum_program_hours)
        : null,
    };
  }

  /**
   * Calculate early check-in fee
   */
  static calculateEarlyCheckinFee(
    venue: VenuePublic,
    hours: number
  ): number | null {
    const rules = venue.operating_rules;

    if (!rules?.early_checkin_allowed || !rules.early_checkin_fee_per_hour) {
      return null;
    }

    const feePerHour = parseFloat(rules.early_checkin_fee_per_hour);
    return feePerHour * hours;
  }

  /**
   * Calculate late checkout fee
   */
  static calculateLateCheckoutFee(
    venue: VenuePublic,
    hours: number
  ): number | null {
    const rules = venue.operating_rules;

    if (!rules?.late_checkout_allowed || !rules.late_checkout_fee_per_hour) {
      return null;
    }

    const feePerHour = parseFloat(rules.late_checkout_fee_per_hour);
    const maxHours = rules.late_checkout_max_hours;
    const actualHours = Math.min(hours, maxHours);

    return feePerHour * actualHours;
  }

  /**
   * Format time for display
   */
  static formatTime(timeString: string): string {
    if (!timeString) return '';

    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  }

  /**
   * Format duration for display
   */
  static formatDuration(hours: number): string {
    if (hours === 1) return '1 hour';
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    return `${hours} hours`;
  }
}

export default VenuesApi;
