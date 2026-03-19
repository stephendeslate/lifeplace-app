import { formatInTimeZone } from 'date-fns-tz';
import { isValid, parseISO } from 'date-fns';

export const PHILIPPINE_TIMEZONE = 'Asia/Manila';

export const safeFormatDate = (
  dateString: string | null | undefined,
  timezone: string,
  format: string,
  fallback = 'Date not available',
): string => {
  if (!dateString) return fallback;
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return fallback;
    return formatInTimeZone(dateString, timezone, format);
  } catch {
    return fallback;
  }
};
