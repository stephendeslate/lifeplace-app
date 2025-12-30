/**
 * Timezone Utilities
 * Philippines timezone (Asia/Manila) handling for booking flow
 */

import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

// Philippines timezone constants
export const BUSINESS_TIMEZONE = 'Asia/Manila';
export const BUSINESS_TIMEZONE_DISPLAY = 'PHT';
export const BUSINESS_TIMEZONE_OFFSET = '+08:00';

/**
 * Parse a date string as Philippines time
 * Handles both timezone-aware and naive date strings
 */
export function parseAsPhilippinesTime(dateString: string): Date {
  if (!dateString) {
    return new Date();
  }

  // If already has timezone info, parse directly
  if (dateString.includes('+') || dateString.includes('Z') || dateString.includes('-', 10)) {
    return parseISO(dateString);
  }

  // For naive date strings (no timezone), treat as Philippines time
  // Append the offset to parse correctly
  const withOffset = dateString + BUSINESS_TIMEZONE_OFFSET;
  return parseISO(withOffset);
}

/**
 * Format a date in Philippines timezone
 */
export function formatPhilippinesTime(
  date: Date | string,
  formatStr: string = 'PPP p'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, BUSINESS_TIMEZONE, formatStr);
}

/**
 * Format a date for booking display with timezone label
 */
export function formatBookingTime(date: Date | string): {
  primary: string;
  timezone: string;
  full: string;
} {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const primary = formatInTimeZone(dateObj, BUSINESS_TIMEZONE, 'EEEE, MMMM d, yyyy');
  const time = formatInTimeZone(dateObj, BUSINESS_TIMEZONE, 'h:mm a');

  return {
    primary,
    timezone: `${time} ${BUSINESS_TIMEZONE_DISPLAY}`,
    full: `${primary} at ${time} ${BUSINESS_TIMEZONE_DISPLAY}`,
  };
}

/**
 * Format a date range for display
 */
export function formatDateRange(
  startDate: string,
  endDate?: string
): string {
  const start = parseISO(startDate);
  const startFormatted = formatInTimeZone(start, BUSINESS_TIMEZONE, 'MMM d, yyyy');

  if (!endDate || startDate === endDate) {
    return startFormatted;
  }

  const end = parseISO(endDate);
  const endFormatted = formatInTimeZone(end, BUSINESS_TIMEZONE, 'MMM d, yyyy');

  // Same month and year
  if (format(start, 'yyyy-MM') === format(end, 'yyyy-MM')) {
    return `${formatInTimeZone(start, BUSINESS_TIMEZONE, 'MMM d')} - ${formatInTimeZone(end, BUSINESS_TIMEZONE, 'd, yyyy')}`;
  }

  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Get timezone notice for display
 */
export function getTimezoneNotice(
  context: 'booking' | 'confirmation' | 'calendar' | 'general' = 'general'
): string {
  const notices = {
    booking: 'All times are in Philippines Standard Time (PHT)',
    confirmation: 'Event times shown in Philippines Standard Time (PHT, UTC+8)',
    calendar: 'Times are in PHT (UTC+8)',
    general: `Philippines Time (${BUSINESS_TIMEZONE_DISPLAY})`,
  };
  return notices[context];
}

/**
 * Format date for date picker (YYYY-MM-DD)
 */
export function formatDateForPicker(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format time for time picker (HH:mm)
 */
export function formatTimeForPicker(date: Date): string {
  return format(date, 'HH:mm');
}

/**
 * Parse time string (HH:mm) to Date object
 */
export function parseTimeString(timeStr: string, baseDate?: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = baseDate ? new Date(baseDate) : new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Check if a date/time is within business hours
 * Default: Monday-Friday, 9 AM - 6 PM PHT
 */
export function isWithinBusinessHours(
  date: Date,
  options?: {
    startHour?: number;
    endHour?: number;
    includeSaturday?: boolean;
    includeSunday?: boolean;
  }
): boolean {
  const {
    startHour = 9,
    endHour = 18,
    includeSaturday = false,
    includeSunday = false,
  } = options || {};

  const zonedDate = toZonedTime(date, BUSINESS_TIMEZONE);
  const hours = zonedDate.getHours();
  const day = zonedDate.getDay();

  // Check day of week
  if (day === 0 && !includeSunday) return false;
  if (day === 6 && !includeSaturday) return false;

  // Check hours
  return hours >= startHour && hours < endHour;
}

/**
 * Get the next business day
 */
export function getNextBusinessDay(
  from: Date = new Date(),
  options?: {
    includeSaturday?: boolean;
    includeSunday?: boolean;
  }
): Date {
  const { includeSaturday = false, includeSunday = false } = options || {};

  const zonedDate = toZonedTime(from, BUSINESS_TIMEZONE);
  const next = new Date(zonedDate);
  next.setHours(9, 0, 0, 0);

  // If it's already past business hours, move to next day
  if (zonedDate.getHours() >= 18) {
    next.setDate(next.getDate() + 1);
  }

  // Skip to next valid business day
  let day = next.getDay();
  while (
    (day === 0 && !includeSunday) ||
    (day === 6 && !includeSaturday)
  ) {
    next.setDate(next.getDate() + 1);
    day = next.getDay();
  }

  return next;
}

/**
 * Convert a date to Philippines timezone
 */
export function toPhilippinesTime(date: Date): Date {
  return toZonedTime(date, BUSINESS_TIMEZONE);
}

/**
 * Convert a Philippines time to UTC
 */
export function fromPhilippinesTime(date: Date): Date {
  return fromZonedTime(date, BUSINESS_TIMEZONE);
}

/**
 * Get current time in Philippines
 */
export function nowInPhilippines(): Date {
  return toZonedTime(new Date(), BUSINESS_TIMEZONE);
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 1) return 'just now';
  if (Math.abs(diffMins) < 60) {
    return diffMins > 0 ? `in ${diffMins} minutes` : `${Math.abs(diffMins)} minutes ago`;
  }
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`;
  }
  if (Math.abs(diffDays) < 7) {
    return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
  }

  return formatPhilippinesTime(dateObj, 'MMM d, yyyy');
}

/**
 * Calculate duration between two times in hours
 */
export function calculateDurationHours(
  startTime: string,
  endTime: string
): number {
  const start = parseTimeString(startTime);
  const end = parseTimeString(endTime);

  let diff = (end.getTime() - start.getTime()) / 3600000;

  // Handle overnight events
  if (diff < 0) {
    diff += 24;
  }

  return diff;
}

/**
 * Add hours to a time string
 */
export function addHoursToTime(
  timeStr: string,
  hours: number
): string {
  const date = parseTimeString(timeStr);
  date.setHours(date.getHours() + Math.floor(hours));
  date.setMinutes(date.getMinutes() + (hours % 1) * 60);
  return formatTimeForPicker(date);
}
