// frontend/admin-crm/src/utils/timezone.ts

/**
 * Timezone utilities for admin CRM
 * Supports dual timezone display for admins managing Philippines-based events
 */

import { parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

// Business timezone constants (Philippines)
export const BUSINESS_TIMEZONE = 'Asia/Manila';
export const BUSINESS_TIMEZONE_DISPLAY = 'PHT';
export const BUSINESS_TIMEZONE_FULL = 'Philippines Time';
export const BUSINESS_TIMEZONE_OFFSET = '+08:00';

// Common admin timezones
export const ADMIN_TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET/CEST)' },
  { value: 'Asia/Manila', label: 'Philippines Time (PHT)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
];

interface TimezoneDisplayMode {
  mode: 'business_only' | 'business_with_local' | 'dual_display';
  userTimezone?: string;
}

/**
 * Format a date/time for display in Philippines timezone
 */
export function formatPhilippinesTime(
  date: string | Date,
  includeTimezone: boolean = true,
  formatString: string = 'MMM d, yyyy h:mm a'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const formatted = formatInTimeZone(dateObj, BUSINESS_TIMEZONE, formatString);
  
  if (includeTimezone) {
    return `${formatted} ${BUSINESS_TIMEZONE_DISPLAY}`;
  }
  return formatted;
}

/**
 * Format date/time based on user's display preferences
 */
export function formatWithUserPreference(
  date: string | Date,
  displayMode: TimezoneDisplayMode,
  formatString: string = 'MMM d, yyyy h:mm a'
): { primary: string; secondary?: string } {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  const primary = formatPhilippinesTime(date, true, formatString);
  
  if (displayMode.mode === 'business_only') {
    return { primary };
  }
  
  if (displayMode.userTimezone && displayMode.userTimezone !== BUSINESS_TIMEZONE) {
    try {
      const userFormatted = formatInTimeZone(
        dateObj,
        displayMode.userTimezone,
        formatString
      );
      const tzAbbr = formatInTimeZone(dateObj, displayMode.userTimezone, 'zzz');
      
      if (displayMode.mode === 'business_with_local') {
        // Show as secondary info
        return {
          primary,
          secondary: `(${userFormatted} ${tzAbbr})`
        };
      } else if (displayMode.mode === 'dual_display') {
        // Show side by side
        return {
          primary: `${primary} / ${userFormatted} ${tzAbbr}`
        };
      }
    } catch (error) {
      console.error('Error formatting user timezone:', error);
    }
  }
  
  return { primary };
}

/**
 * Get the user's local timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert datetime between timezones
 */
export function convertTimezone(
  date: string | Date,
  fromTimezone: string,
  toTimezone: string
): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // First convert to the source timezone
  const sourceTime = toZonedTime(dateObj, fromTimezone);
  
  // Then convert to target timezone
  return toZonedTime(sourceTime, toTimezone);
}

/**
 * Format dual timezone display for admin view
 */
export function formatDualTimezone(
  date: string | Date,
  adminTimezone: string = 'America/Los_Angeles'
): {
  business: string;
  admin: string;
  isSameDay: boolean;
} {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  const businessFormatted = formatInTimeZone(
    dateObj,
    BUSINESS_TIMEZONE,
    'MMM d, yyyy h:mm a'
  );
  
  const adminFormatted = formatInTimeZone(
    dateObj,
    adminTimezone,
    'MMM d, yyyy h:mm a'
  );
  
  const businessDate = formatInTimeZone(dateObj, BUSINESS_TIMEZONE, 'yyyy-MM-dd');
  const adminDate = formatInTimeZone(dateObj, adminTimezone, 'yyyy-MM-dd');
  
  return {
    business: `${businessFormatted} ${BUSINESS_TIMEZONE_DISPLAY}`,
    admin: `${adminFormatted} ${formatInTimeZone(dateObj, adminTimezone, 'zzz')}`,
    isSameDay: businessDate === adminDate
  };
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
 * Get business hours status message
 */
export function getBusinessHoursStatus(): {
  isOpen: boolean;
  message: string;
  nextOpenTime?: string;
} {
  const now = new Date();
  const isOpen = isWithinBusinessHours(now);
  
  if (isOpen) {
    return {
      isOpen: true,
      message: 'Business is currently open'
    };
  }
  
  const philippinesNow = toZonedTime(now, BUSINESS_TIMEZONE);
  const hours = philippinesNow.getHours();
  const dayOfWeek = philippinesNow.getDay();
  
  let nextOpenTime: Date;
  
  if (dayOfWeek === 0) {
    // Sunday - next open is Monday 9 AM
    nextOpenTime = new Date(philippinesNow);
    nextOpenTime.setDate(philippinesNow.getDate() + 1);
    nextOpenTime.setHours(9, 0, 0, 0);
  } else if (dayOfWeek === 6) {
    // Saturday - next open is Monday 9 AM
    nextOpenTime = new Date(philippinesNow);
    nextOpenTime.setDate(philippinesNow.getDate() + 2);
    nextOpenTime.setHours(9, 0, 0, 0);
  } else if (hours < 9) {
    // Before business hours - open today at 9 AM
    nextOpenTime = new Date(philippinesNow);
    nextOpenTime.setHours(9, 0, 0, 0);
  } else {
    // After business hours - open tomorrow at 9 AM
    nextOpenTime = new Date(philippinesNow);
    nextOpenTime.setDate(philippinesNow.getDate() + 1);
    
    // Skip to Monday if tomorrow is weekend
    if (nextOpenTime.getDay() === 0) {
      nextOpenTime.setDate(nextOpenTime.getDate() + 1);
    } else if (nextOpenTime.getDay() === 6) {
      nextOpenTime.setDate(nextOpenTime.getDate() + 2);
    }
    
    nextOpenTime.setHours(9, 0, 0, 0);
  }
  
  return {
    isOpen: false,
    message: 'Business is currently closed',
    nextOpenTime: formatPhilippinesTime(nextOpenTime)
  };
}

/**
 * Format time for calendar/scheduler display
 */
export function formatForCalendar(
  date: string | Date,
  showBothTimezones: boolean = false,
  adminTimezone?: string
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!showBothTimezones || !adminTimezone) {
    return formatPhilippinesTime(date, true, 'MMM d h:mm a');
  }
  
  const dual = formatDualTimezone(date, adminTimezone);
  
  if (dual.isSameDay) {
    return `${formatInTimeZone(dateObj, BUSINESS_TIMEZONE, 'h:mm a')} ${BUSINESS_TIMEZONE_DISPLAY} / ${formatInTimeZone(dateObj, adminTimezone, 'h:mm a zzz')}`;
  } else {
    return `${dual.business} / ${dual.admin}`;
  }
}

/**
 * Get timezone offset display
 */
export function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const offset = formatInTimeZone(now, timezone, 'xxx'); // e.g., "+08:00"
    return offset;
  } catch {
    return '';
  }
}