// frontend/admin-crm/src/utils/timezone.ts

/**
 * Timezone utilities for admin CRM
 * Supports dual timezone display for admins managing Philippines-based events
 */

import { parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone, fromZonedTime } from 'date-fns-tz';

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

/**
 * Get the current date in Manila timezone
 * This should be used instead of new Date() when determining "today" for calendar display
 */
export function getTodayInManila(): Date {
  const now = new Date();
  return toZonedTime(now, BUSINESS_TIMEZONE);
}

/**
 * Get a date string (YYYY-MM-DD) for the current date in Manila timezone
 */
export function getTodayStringInManila(): string {
  return formatInTimeZone(new Date(), BUSINESS_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Check if a given date is "today" in Manila timezone
 */
export function isTodayInManila(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const todayStr = getTodayStringInManila();
  const dateStr = formatInTimeZone(dateObj, BUSINESS_TIMEZONE, 'yyyy-MM-dd');
  return todayStr === dateStr;
}

/**
 * Format a date for API requests (always in Manila timezone context)
 * Returns YYYY-MM-DD format
 */
export function formatDateForApi(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Get the day of month in Manila timezone
 */
export function getDayOfMonthInManila(date: Date): number {
  return parseInt(formatInTimeZone(date, BUSINESS_TIMEZONE, 'd'), 10);
}

/**
 * Get the day of week in Manila timezone (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeekInManila(date: Date): number {
  // 'i' returns 1-7 (Mon-Sun), we want 0-6 (Sun-Sat)
  const isoDay = parseInt(formatInTimeZone(date, BUSINESS_TIMEZONE, 'i'), 10);
  return isoDay === 7 ? 0 : isoDay; // Convert: 7 (Sunday) -> 0, 1-6 stay as is
}

/**
 * Check if two dates are the same month in Manila timezone
 */
export function isSameMonthInManila(date1: Date, date2: Date): boolean {
  const month1 = formatInTimeZone(date1, BUSINESS_TIMEZONE, 'yyyy-MM');
  const month2 = formatInTimeZone(date2, BUSINESS_TIMEZONE, 'yyyy-MM');
  return month1 === month2;
}

/**
 * Generate calendar grid dates for a month in Manila timezone
 * Returns dates that correctly represent the Manila calendar view
 */
export function getCalendarGridDates(currentDate: Date): Date[] {
  // Get the first day of the month in Manila
  const yearMonth = formatInTimeZone(currentDate, BUSINESS_TIMEZONE, 'yyyy-MM');
  const firstOfMonth = new Date(`${yearMonth}-01T00:00:00+08:00`);

  // Get the day of week for the first of the month (0 = Sunday)
  const firstDayOfWeek = getDayOfWeekInManila(firstOfMonth);

  // Calculate the start of the calendar grid (may be in previous month)
  const startDate = new Date(firstOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfWeek);

  // Get the last day of the month
  const year = parseInt(formatInTimeZone(currentDate, BUSINESS_TIMEZONE, 'yyyy'), 10);
  const month = parseInt(formatInTimeZone(currentDate, BUSINESS_TIMEZONE, 'M'), 10);
  const lastOfMonth = new Date(year, month, 0); // Day 0 of next month = last day of current month
  lastOfMonth.setHours(12, 0, 0, 0); // Noon to avoid DST issues

  // Get the day of week for the last of the month
  const lastDayOfWeek = getDayOfWeekInManila(lastOfMonth);

  // Calculate the end of the calendar grid (may be in next month)
  const endDate = new Date(lastOfMonth);
  endDate.setDate(endDate.getDate() + (6 - lastDayOfWeek));

  // Generate all dates in the grid
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(12, 0, 0, 0); // Noon to avoid DST issues

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Format a date in Manila timezone with a given format string
 */
export function formatInManila(date: Date, formatStr: string): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, formatStr);
}

/**
 * Generate week dates in Manila timezone
 */
export function getWeekDates(currentDate: Date): Date[] {
  const dayOfWeek = getDayOfWeekInManila(currentDate);
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
  startOfWeek.setHours(12, 0, 0, 0);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    dates.push(date);
  }

  return dates;
}

/**
 * Parse a date-only string (YYYY-MM-DD) as Manila time (midnight PHT)
 *
 * IMPORTANT: Use this instead of `new Date(dateString)` when parsing date strings
 * from the API or calendar data. JavaScript's `new Date("YYYY-MM-DD")` interprets
 * the date as UTC midnight, which causes incorrect day calculations in other timezones.
 *
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @returns Date object representing midnight PHT on that date
 */
export function parseDateStringAsManila(dateStr: string): Date {
  // Append time and PHT offset, then parse
  // fromZonedTime interprets the datetime as being in the specified timezone
  return fromZonedTime(`${dateStr}T00:00:00`, BUSINESS_TIMEZONE);
}

/**
 * Parse a datetime string (without timezone) as Manila time
 *
 * IMPORTANT: Use this instead of `parseISO(dateTimeString)` when parsing datetime
 * strings from the API. The API returns datetimes without timezone info, but they
 * are stored as Philippine Time (PHT). Using parseISO would incorrectly interpret
 * them as the browser's local timezone.
 *
 * @param dateTimeStr - DateTime string in "YYYY-MM-DDTHH:mm:ss" format (no timezone)
 * @returns Date object representing that moment in PHT
 */
export function parseDateTimeAsManila(dateTimeStr: string): Date {
  // If the string already has a timezone, parse it directly
  if (dateTimeStr.includes('+') || dateTimeStr.includes('Z') || dateTimeStr.match(/[+-]\d{2}:\d{2}$/)) {
    return parseISO(dateTimeStr);
  }
  // Otherwise, interpret as Manila time
  return fromZonedTime(dateTimeStr, BUSINESS_TIMEZONE);
}

/**
 * Check if two dates represent the same day in Manila timezone
 *
 * IMPORTANT: Use this instead of date-fns `isSameDay` when comparing dates that
 * should be compared in Manila timezone context. The standard `isSameDay` compares
 * dates in the browser's local timezone, which can give incorrect results.
 *
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns true if both dates are the same day in Manila timezone
 */
export function isSameDayInManila(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;

  const d1Str = formatInTimeZone(d1, BUSINESS_TIMEZONE, 'yyyy-MM-dd');
  const d2Str = formatInTimeZone(d2, BUSINESS_TIMEZONE, 'yyyy-MM-dd');

  return d1Str === d2Str;
}