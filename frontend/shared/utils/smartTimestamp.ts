import {
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  format,
  isToday,
  isYesterday,
  isThisWeek,
  isValid,
  parseISO,
} from 'date-fns';

/**
 * Smart timestamp formatter that transitions from relative to absolute timestamps
 * based on message age for better UX.
 *
 * @param timestamp - ISO timestamp string from backend
 * @returns Formatted timestamp string according to hybrid rules
 */
export function formatSmartTimestamp(timestamp: string): string {
  try {
    // Handle null/undefined inputs
    if (!timestamp) {
      return 'Recently';
    }

    // Parse the timestamp - handle both ISO strings and Date objects
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);

    // Validate the parsed date
    if (!isValid(date)) {
      return 'Recently';
    }

    const now = new Date();
    const minutesDiff = differenceInMinutes(now, date);
    const hoursDiff = differenceInHours(now, date);
    const daysDiff = differenceInDays(now, date);

    // Rule 1: < 1 minute -> "Just now"
    if (minutesDiff < 1) {
      return 'Just now';
    }

    // Rule 2: < 1 hour -> "X minutes ago"
    if (minutesDiff < 60) {
      return `${minutesDiff} minute${minutesDiff === 1 ? '' : 's'} ago`;
    }

    // Rule 3: < 24 hours -> "X hours ago"
    if (hoursDiff < 24 && isToday(date)) {
      return `${hoursDiff} hour${hoursDiff === 1 ? '' : 's'} ago`;
    }

    // Rule 4: < 2 days -> "Yesterday at 2:30 PM"
    if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    }

    // Rule 5: < 7 days -> "Monday at 10:15 AM"
    if (daysDiff < 7 && isThisWeek(date)) {
      return `${format(date, 'EEEE')} at ${format(date, 'h:mm a')}`;
    }

    // Rule 6: > 7 days -> "Jan 15, 2025 at 3:45 PM"
    return `${format(date, 'MMM d, yyyy')} at ${format(date, 'h:mm a')}`;
  } catch (error) {
    // Graceful fallback for any parsing errors
    console.warn('Failed to parse timestamp:', timestamp, error);
    return 'Recently';
  }
}
