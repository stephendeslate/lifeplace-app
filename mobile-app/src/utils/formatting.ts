/**
 * Formatting Utilities
 *
 * Date, time, currency, and text formatting helpers.
 */

import { format, formatDistanceToNow, isValid, parseISO, differenceInDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { BUSINESS_TIMEZONE } from './timezone';

// Re-export for backwards compatibility - use BUSINESS_TIMEZONE from timezone.ts
const DEFAULT_TIMEZONE = BUSINESS_TIMEZONE;

// =============================================================================
// DATE FORMATTING
// =============================================================================

/**
 * Safely parse an ISO date string
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Format a date with timezone support
 */
export function formatDate(
  dateString: string | null | undefined,
  formatStr = 'MMM dd, yyyy',
  timezone = DEFAULT_TIMEZONE
): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '';
    return formatInTimeZone(date, timezone, formatStr);
  } catch {
    return '';
  }
}

/**
 * Format an event date range
 */
export function formatEventDate(
  startDate: string | null | undefined,
  endDate?: string | null,
  timezone = DEFAULT_TIMEZONE
): string {
  if (!startDate) return 'Date TBD';

  const start = formatDate(startDate, 'EEEE, MMMM dd, yyyy', timezone);

  if (!endDate) return start;

  const startFormatted = formatDate(startDate, 'yyyy-MM-dd', timezone);
  const endFormatted = formatDate(endDate, 'yyyy-MM-dd', timezone);

  if (startFormatted === endFormatted) return start;

  const end = formatDate(endDate, 'MMMM dd, yyyy', timezone);
  return `${start} - ${end}`;
}

/**
 * Format a date for display in a card (shorter format)
 */
export function formatCardDate(
  dateString: string | null | undefined,
  timezone = DEFAULT_TIMEZONE
): string {
  return formatDate(dateString, 'MMM dd, yyyy', timezone);
}

/**
 * Format a date with day of week
 */
export function formatDateWithDay(
  dateString: string | null | undefined,
  timezone = DEFAULT_TIMEZONE
): string {
  return formatDate(dateString, 'EEE, MMM dd', timezone);
}

// =============================================================================
// TIME FORMATTING
// =============================================================================

/**
 * Format a time string (HH:mm or datetime)
 */
export function formatTime(
  timeString: string | null | undefined,
  formatStr = 'h:mm a',
  timezone = DEFAULT_TIMEZONE
): string {
  if (!timeString) return '';

  try {
    // If it's a full datetime string
    if (timeString.includes('T') || timeString.includes(' ')) {
      const date = parseISO(timeString);
      if (!isValid(date)) return '';
      return formatInTimeZone(date, timezone, formatStr);
    }

    // If it's just a time string (HH:mm)
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return format(date, formatStr);
  } catch {
    return '';
  }
}

/**
 * Format a time range
 */
export function formatTimeRange(
  startTime: string | null | undefined,
  endTime?: string | null
): string {
  const start = formatTime(startTime);
  if (!start) return '';

  const end = formatTime(endTime);
  if (!end) return start;

  return `${start} - ${end}`;
}

// =============================================================================
// RELATIVE TIME
// =============================================================================

/**
 * Get relative time from now (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

/**
 * Get days until an event (returns null if date is past)
 */
export function getDaysUntil(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return null;
    const days = differenceInDays(date, new Date());
    return days >= 0 ? days : null;
  } catch {
    return null;
  }
}

/**
 * Get event countdown text
 */
export function getEventCountdown(dateString: string | null | undefined): string | null {
  const days = getDaysUntil(dateString);
  if (days === null) return null;

  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days} days away`;
  if (days <= 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} away`;
  }
  if (days <= 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} away`;
  }
  return null;
}

// =============================================================================
// CURRENCY FORMATTING
// =============================================================================

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'PHP',
  options?: Intl.NumberFormatOptions
): string {
  if (amount === null || amount === undefined) return '';

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) return '';

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(numericAmount);
}

/**
 * Format a compact currency amount (e.g., $1.2K, $3.5M)
 */
export function formatCompactCurrency(
  amount: number | string | null | undefined,
  currency = 'PHP'
): string {
  if (amount === null || amount === undefined) return '';

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) return '';

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(numericAmount);
}

// =============================================================================
// TEXT FORMATTING
// =============================================================================

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format status text (replace underscores with spaces, title case)
 */
export function formatStatus(status: string): string {
  return titleCase(status.replace(/_/g, ' '));
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const pluralForm = plural || `${singular}s`;
  return count === 1 ? singular : pluralForm;
}

/**
 * Format a count with label (e.g., "3 items", "1 item")
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}

// =============================================================================
// FILE SIZE FORMATTING
// =============================================================================

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
