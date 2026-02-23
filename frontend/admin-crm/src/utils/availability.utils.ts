// frontend/admin-crm/src/utils/availability.utils.ts

import type {
  AvailabilityStatus,
  DateAvailabilityInfo,
  AvailabilityIndicator,
  EventConflict,
} from '../types/availability.types';
import { tokens } from '../design-system';

/**
 * Utility functions for availability system
 */
export class AvailabilityUtils {
  /**
   * Get color theme for availability status
   */
  static getStatusColor(status: AvailabilityStatus): string {
    switch (status) {
      case 'available':
        return tokens.color.success[500];
      case 'partially_booked':
        return tokens.color.warning[500];
      case 'fully_booked':
        return tokens.color.error[500];
      case 'blocked':
        return tokens.color.neutral[500];
      case 'outside_range':
        return tokens.color.neutral[300];
      default:
        return tokens.color.neutral[400];
    }
  }

  /**
   * Get MUI color variant for availability status
   */
  static getStatusMuiColor(
    status: AvailabilityStatus,
  ): 'success' | 'warning' | 'error' | 'info' | 'default' {
    switch (status) {
      case 'available':
        return 'success';
      case 'partially_booked':
        return 'warning';
      case 'fully_booked':
      case 'blocked':
        return 'error';
      case 'outside_range':
        return 'default';
      default:
        return 'info';
    }
  }

  /**
   * Get human-readable status label
   */
  static getStatusLabel(status: AvailabilityStatus): string {
    switch (status) {
      case 'available':
        return 'Available';
      case 'partially_booked':
        return 'Partially Booked';
      case 'fully_booked':
        return 'Fully Booked';
      case 'blocked':
        return 'Blocked';
      case 'outside_range':
        return 'Outside Range';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get availability indicator configuration
   */
  static getAvailabilityIndicator(availability: DateAvailabilityInfo): AvailabilityIndicator {
    const { status, can_book_event, can_create_lead } = availability;

    let tooltip = this.getStatusLabel(status);
    let severity: AvailabilityIndicator['severity'] = 'info';
    let icon = '';

    // Enhance tooltip with detailed information
    if (availability.total_events_count > 0) {
      tooltip += ` (${availability.confirmed_events_count} confirmed`;
      if (availability.lead_events_count > 0) {
        tooltip += `, ${availability.lead_events_count} leads`;
      }
      tooltip += ')';
    }

    if (availability.reasons.length > 0) {
      tooltip += '\n' + availability.reasons.join(', ');
    }

    // Set severity and icon based on booking capability
    if (can_book_event) {
      severity = 'success';
      icon = 'CheckCircle';
    } else if (can_create_lead) {
      severity = 'warning';
      icon = 'Schedule';
    } else {
      severity = 'error';
      icon = 'Block';
    }

    return {
      status,
      color: this.getStatusColor(status),
      icon,
      tooltip,
      severity,
    };
  }

  /**
   * Format conflict information for display
   */
  static formatConflicts(conflicts: EventConflict[]): string {
    if (conflicts.length === 0) return 'No conflicts';

    if (conflicts.length === 1) {
      const conflict = conflicts[0];
      return `${conflict.event_name} (${conflict.status})`;
    }

    const confirmed = conflicts.filter((c) => c.status === 'CONFIRMED').length;
    const leads = conflicts.filter((c) => c.status === 'LEAD').length;

    let result = `${conflicts.length} conflicts`;
    if (confirmed > 0) result += ` (${confirmed} confirmed`;
    if (leads > 0) result += confirmed > 0 ? `, ${leads} leads)` : ` (${leads} leads)`;
    if (confirmed === 0 && leads === 0) result += ')';

    return result;
  }

  /**
   * Get conflict severity score (higher = more severe)
   */
  static getConflictSeverity(conflict: EventConflict): number {
    const baseScore = conflict.status === 'CONFIRMED' ? 10 : 5;
    const typeMultiplier =
      conflict.severity === 'high' ? 2 : conflict.severity === 'medium' ? 1.5 : 1;
    return baseScore * typeMultiplier;
  }

  /**
   * Sort conflicts by severity (most severe first)
   */
  static sortConflictsBySeverity(conflicts: EventConflict[]): EventConflict[] {
    return [...conflicts].sort((a, b) => this.getConflictSeverity(b) - this.getConflictSeverity(a));
  }

  /**
   * Check if date is bookable based on business rules
   */
  static isDateBookable(availability: DateAvailabilityInfo, isLead = false): boolean {
    return isLead ? availability.can_create_lead : availability.can_book_event;
  }

  /**
   * Get booking restriction message
   */
  static getBookingRestrictionMessage(
    availability: DateAvailabilityInfo,
    isLead = false,
  ): string | null {
    if (this.isDateBookable(availability, isLead)) {
      return null;
    }

    if (availability.reasons.length > 0) {
      return availability.reasons[0]; // Return the primary reason
    }

    if (isLead) {
      return 'This date is not available for creating leads';
    } else {
      return 'This date is not available for booking';
    }
  }

  /**
   * Generate availability summary text
   */
  static generateAvailabilitySummary(availabilityData: DateAvailabilityInfo[]): {
    summary: string;
    details: string;
    stats: {
      total: number;
      available: number;
      partiallyBooked: number;
      fullyBooked: number;
      blocked: number;
    };
  } {
    const total = availabilityData.length;
    if (total === 0) {
      return {
        summary: 'No dates analyzed',
        details: '',
        stats: { total: 0, available: 0, partiallyBooked: 0, fullyBooked: 0, blocked: 0 },
      };
    }

    const available = availabilityData.filter((d) => d.can_book_event).length;
    const partiallyBooked = availabilityData.filter((d) => d.status === 'partially_booked').length;
    const fullyBooked = availabilityData.filter((d) => d.status === 'fully_booked').length;
    const blocked = availabilityData.filter((d) => d.status === 'blocked').length;

    const availabilityRate = Math.round((available / total) * 100);

    const summary = `${available} of ${total} dates available (${availabilityRate}%)`;

    let details = '';
    if (partiallyBooked > 0) details += `${partiallyBooked} partially booked, `;
    if (fullyBooked > 0) details += `${fullyBooked} fully booked, `;
    if (blocked > 0) details += `${blocked} blocked, `;
    details = details.replace(/, $/, ''); // Remove trailing comma

    return {
      summary,
      details,
      stats: {
        total,
        available,
        partiallyBooked,
        fullyBooked,
        blocked,
      },
    };
  }

  /**
   * Calculate optimal booking time based on availability
   */
  static findOptimalBookingDates(
    availabilityData: DateAvailabilityInfo[],
    duration = 1, // number of consecutive days needed
  ): string[] {
    if (duration === 1) {
      // Single day booking - return all available dates
      return availabilityData.filter((d) => d.can_book_event).map((d) => d.date);
    }

    // Multi-day booking - find consecutive available dates
    const availableDates = availabilityData
      .filter((d) => d.can_book_event)
      .map((d) => d.date)
      .sort();

    const consecutiveRanges: string[][] = [];
    let currentRange: string[] = [];

    for (let i = 0; i < availableDates.length; i++) {
      const currentDate = new Date(availableDates[i]);
      const nextDate = i < availableDates.length - 1 ? new Date(availableDates[i + 1]) : null;

      currentRange.push(availableDates[i]);

      // Check if next date is consecutive
      if (nextDate) {
        const diffDays = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays !== 1) {
          // End current range
          if (currentRange.length >= duration) {
            consecutiveRanges.push([...currentRange]);
          }
          currentRange = [];
        }
      } else {
        // Last date, check if current range is valid
        if (currentRange.length >= duration) {
          consecutiveRanges.push([...currentRange]);
        }
      }
    }

    // Return start dates of valid ranges
    return consecutiveRanges.map((range) => range[0]);
  }

  /**
   * Format date range for display
   */
  static formatDateRange(startDate: string, endDate?: string): string {
    const start = new Date(startDate);
    const startFormatted = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    if (!endDate || startDate === endDate) {
      return startFormatted;
    }

    const end = new Date(endDate);
    const endFormatted = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    // Check if same month
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('en-US', { month: 'short' })}`;
    }

    return `${startFormatted} - ${endFormatted}`;
  }

  /**
   * Validate date range for availability checking
   */
  static validateDateRange(
    startDate: string,
    endDate?: string,
  ): { isValid: boolean; error?: string } {
    try {
      const start = new Date(startDate);

      if (isNaN(start.getTime())) {
        return { isValid: false, error: 'Invalid start date' };
      }

      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return { isValid: false, error: 'Invalid end date' };
        }

        if (start > end) {
          return { isValid: false, error: 'Start date must be before end date' };
        }

        // Check if range is too large (prevent performance issues)
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 365) {
          return { isValid: false, error: 'Date range cannot exceed 365 days' };
        }
      }

      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid date format' };
    }
  }

  /**
   * Get next business day (skip weekends)
   */
  static getNextBusinessDay(date: Date): Date {
    const result = new Date(date);
    do {
      result.setDate(result.getDate() + 1);
    } while (result.getDay() === 0 || result.getDay() === 6); // Skip Sunday (0) and Saturday (6)
    return result;
  }

  /**
   * Check if date is a weekend
   */
  static isWeekend(date: string | Date): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Generate cache key for availability data
   */
  static generateCacheKey(params: {
    startDate: string;
    endDate?: string;
    eventTypeId?: number;
    bookingFlowId?: number;
  }): string {
    const { startDate, endDate, eventTypeId, bookingFlowId } = params;
    const parts = [
      'availability',
      startDate,
      endDate || '',
      eventTypeId?.toString() || '',
      bookingFlowId?.toString() || '',
    ];
    return parts.join(':');
  }
}
