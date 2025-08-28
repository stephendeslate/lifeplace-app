// frontend/admin-crm/src/apis/availability.api.ts

import api from '../utils/api';
import type {
  DateAvailabilityInfo,
  AvailabilityRequest,
  DateRangeAvailabilityResponse,
  BookingValidationRequest,
  BookingValidationResponse,
  NextAvailableDateRequest,
  NextAvailableDateResponse,
} from '../types/availability.types';

export class AvailabilityAPI {
  private static readonly BASE_PATH = '/events/availability';

  /**
   * Check availability for a specific date
   */
  static async checkDateAvailability(
    request: AvailabilityRequest
  ): Promise<DateAvailabilityInfo> {
    const params = new URLSearchParams();
    params.append('start_date', request.start_date);
    
    if (request.end_date) params.append('end_date', request.end_date);
    if (request.event_type_id) params.append('event_type_id', request.event_type_id.toString());
    if (request.booking_flow_id) params.append('booking_flow_id', request.booking_flow_id.toString());
    if (request.duration_hours) params.append('duration_hours', request.duration_hours.toString());
    if (request.buffer_before_hours) params.append('buffer_before_hours', request.buffer_before_hours.toString());
    if (request.buffer_after_hours) params.append('buffer_after_hours', request.buffer_after_hours.toString());
    if (request.exclude_event_id) params.append('exclude_event_id', request.exclude_event_id.toString());
    if (request.include_buffer_conflicts !== undefined) {
      params.append('include_buffer_conflicts', request.include_buffer_conflicts.toString());
    }

    const response = await api.get<DateAvailabilityInfo>(
      `${this.BASE_PATH}/check/?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Check availability for a date range
   */
  static async checkDateRangeAvailability(
    startDate: string,
    endDate: string,
    options?: {
      event_type_id?: number;
      booking_flow_id?: number;
    }
  ): Promise<DateRangeAvailabilityResponse> {
    const params = new URLSearchParams();
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    
    if (options?.event_type_id) {
      params.append('event_type_id', options.event_type_id.toString());
    }
    if (options?.booking_flow_id) {
      params.append('booking_flow_id', options.booking_flow_id.toString());
    }

    const response = await api.get<DateRangeAvailabilityResponse>(
      `${this.BASE_PATH}/range/?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Validate a booking request
   */
  static async validateBookingRequest(
    request: BookingValidationRequest
  ): Promise<BookingValidationResponse> {
    const response = await api.post<BookingValidationResponse>(
      `${this.BASE_PATH}/validate/`,
      request
    );
    return response.data;
  }

  /**
   * Find next available date
   */
  static async getNextAvailableDate(
    request: NextAvailableDateRequest = {}
  ): Promise<NextAvailableDateResponse> {
    const params = new URLSearchParams();
    
    if (request.start_date) params.append('start_date', request.start_date);
    if (request.event_type_id) params.append('event_type_id', request.event_type_id.toString());
    if (request.max_days_ahead) params.append('max_days_ahead', request.max_days_ahead.toString());

    const response = await api.get<NextAvailableDateResponse>(
      `${this.BASE_PATH}/next/?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Invalidate availability cache
   */
  static async invalidateCache(
    dateRange?: {
      start_date: string;
      end_date: string;
    }
  ): Promise<void> {
    await api.post(`${this.BASE_PATH}/cache/invalidate/`, dateRange || {});
  }

  /**
   * Batch check availability for multiple dates
   */
  static async batchCheckAvailability(
    dates: string[],
    options?: {
      event_type_id?: number;
      booking_flow_id?: number;
    }
  ): Promise<DateAvailabilityInfo[]> {
    if (dates.length === 0) return [];

    // For efficiency, use range endpoint if dates are consecutive
    const sortedDates = dates.sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];
    
    // Check if all dates are consecutive
    const isConsecutive = sortedDates.every((date, index) => {
      if (index === 0) return true;
      const prevDate = new Date(sortedDates[index - 1]);
      const currentDate = new Date(date);
      const diffTime = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 1;
    });

    if (isConsecutive && dates.length > 1) {
      // Use range endpoint for consecutive dates
      const rangeResult = await this.checkDateRangeAvailability(
        startDate,
        endDate,
        options
      );
      return rangeResult.availability.filter(availability => 
        dates.includes(availability.date)
      );
    } else {
      // Use individual requests for non-consecutive dates
      const promises = dates.map(date => 
        this.checkDateAvailability({
          start_date: date,
          ...options
        })
      );
      return Promise.all(promises);
    }
  }

  /**
   * Get availability summary for a month
   */
  static async getMonthlyAvailabilitySummary(
    year: number,
    month: number,
    options?: {
      event_type_id?: number;
      booking_flow_id?: number;
    }
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return this.checkDateRangeAvailability(startDateStr, endDateStr, options);
  }

  /**
   * Get availability for calendar view with optimized loading
   */
  static async getCalendarAvailability(
    startDate: string,
    endDate: string,
    options?: {
      event_type_id?: number;
      booking_flow_id?: number;
      include_weekends?: boolean;
    }
  ): Promise<DateAvailabilityInfo[]> {
    try {
      const response = await this.checkDateRangeAvailability(
        startDate,
        endDate,
        {
          event_type_id: options?.event_type_id,
          booking_flow_id: options?.booking_flow_id,
        }
      );

      let availability = response.availability;

      // Filter out weekends if requested
      if (options?.include_weekends === false) {
        availability = availability.filter(item => {
          const date = new Date(item.date);
          const dayOfWeek = date.getDay();
          return dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday
        });
      }

      return availability;
    } catch (error) {
      console.error('Error fetching calendar availability:', error);
      throw error;
    }
  }
}

// Export default instance
export const availabilityApi = AvailabilityAPI;