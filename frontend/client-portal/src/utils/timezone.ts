// frontend/client-portal/src/utils/timezone.ts

/**
 * Timezone utilities for Philippines-based events
 * All events occur in the Philippines (Asia/Manila timezone, UTC+8)
 */

import { parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

// Business timezone constants
export const BUSINESS_TIMEZONE = 'Asia/Manila';
export const BUSINESS_TIMEZONE_DISPLAY = 'PHT';
export const BUSINESS_TIMEZONE_FULL = 'Philippines Time';
export const BUSINESS_TIMEZONE_OFFSET = '+08:00';

/**
 * Format a date/time for display - ALWAYS in Philippines timezone
 * This is the primary formatting function - all times are Philippines time
 */
export function formatPhilippinesTime(
  date: string | Date,
  includeTimezone: boolean = true,
  formatString: string = 'MMMM d, yyyy \'at\' h:mm a'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const formatted = formatInTimeZone(dateObj, BUSINESS_TIMEZONE, formatString);
  
  if (includeTimezone) {
    return `${formatted} ${BUSINESS_TIMEZONE_DISPLAY}`;
  }
  return formatted;
}

/**
 * Get the user's local timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert Philippines time to user's local time for reference
 */
export function convertToUserTime(
  date: string | Date,
  userTimezone?: string
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const tz = userTimezone || getUserTimezone();
  
  try {
    return formatInTimeZone(dateObj, tz, 'MMM d, yyyy h:mm a zzz');
  } catch {
    // Fallback to Philippines time if conversion fails
    return formatPhilippinesTime(date);
  }
}

/**
 * SIMPLIFIED: Just format Philippines time - user timezone is NOT relevant for bookings
 * All event selections are in Philippines time, period.
 */
export function getSimplePhilippinesTime(date: string | Date): string {
  return formatPhilippinesTime(date);
}

/**
 * Format time for booking display - SIMPLE Philippines time only
 * No user timezone confusion - everything is Philippines time
 */
export function formatBookingTime(date: string | Date): {
  primary: string;
  notice: string;
} {
  return {
    primary: formatPhilippinesTime(date),
    notice: `All event times are in ${BUSINESS_TIMEZONE_FULL} (${BUSINESS_TIMEZONE_DISPLAY})`
  };
}

/**
 * Get timezone notice text for display
 */
export function getTimezoneNotice(context: 'booking' | 'confirmation' | 'general' = 'general'): string {
  switch (context) {
    case 'booking':
      return `Select your preferred date and time. All events take place in the Philippines (${BUSINESS_TIMEZONE_DISPLAY} timezone).`;
    case 'confirmation':
      return `Your event is confirmed for the time shown in ${BUSINESS_TIMEZONE_FULL} (${BUSINESS_TIMEZONE_DISPLAY}).`;
    default:
      return `All times shown in ${BUSINESS_TIMEZONE_FULL} (${BUSINESS_TIMEZONE_DISPLAY})`;
  }
}

/**
 * For booking purposes, user timezone is irrelevant
 * All selections are Philippines time - this function is deprecated
 * @deprecated - User timezone doesn't matter for event bookings
 */
export function isUserInDifferentTimezone(): boolean {
  return false; // Always return false - user timezone is irrelevant
}

/**
 * Format date for date picker (always in Philippines timezone)
 */
export function formatDateForPicker(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, BUSINESS_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Format time for time picker (always in Philippines timezone)
 */
export function formatTimeForPicker(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, BUSINESS_TIMEZONE, 'HH:mm');
}

/**
 * Combine date and time strings into a Philippines timezone datetime
 */
export function combineDateAndTime(dateString: string, timeString: string): Date {
  const combined = `${dateString}T${timeString}:00${BUSINESS_TIMEZONE_OFFSET}`;
  return parseISO(combined);
}

/**
 * Business hours check (9 AM - 6 PM Philippines time)
 */
export function isWithinBusinessHours(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const philippinesTime = toZonedTime(dateObj, BUSINESS_TIMEZONE);
  const hours = philippinesTime.getHours();
  const dayOfWeek = philippinesTime.getDay();
  
  // Check if weekend (0 = Sunday, 6 = Saturday)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // Check if within business hours (9 AM - 6 PM)
  return hours >= 9 && hours < 18;
}

/**
 * Get next available business day in Philippines timezone
 */
export function getNextBusinessDay(): Date {
  const now = new Date();
  const philippinesNow = toZonedTime(now, BUSINESS_TIMEZONE);
  const nextDay = new Date(philippinesNow);
  
  // Move to next day
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Skip weekends
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  // Set to 9 AM Philippines time
  nextDay.setHours(9, 0, 0, 0);
  
  return nextDay;
}