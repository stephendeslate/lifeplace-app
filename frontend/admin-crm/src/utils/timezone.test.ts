import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BUSINESS_TIMEZONE,
  BUSINESS_TIMEZONE_DISPLAY,
  ADMIN_TIMEZONES,
  formatPhilippinesTime,
  formatWithUserPreference,
  formatDualTimezone,
  isWithinBusinessHours,
  getBusinessHoursStatus,
  getUserTimezone,
  formatForCalendar,
  getTimezoneOffset,
  getTodayInManila,
  getTodayStringInManila,
  isTodayInManila,
  formatDateForApi,
  getDayOfMonthInManila,
  getDayOfWeekInManila,
  isSameMonthInManila,
  getCalendarGridDates,
  getWeekDates,
  formatInManila,
  parseDateStringAsManila,
  parseDateTimeAsManila,
  isSameDayInManila,
} from './timezone';

describe('constants', () => {
  it('exports correct business timezone', () => {
    expect(BUSINESS_TIMEZONE).toBe('Asia/Manila');
    expect(BUSINESS_TIMEZONE_DISPLAY).toBe('PHT');
  });

  it('exports admin timezones array', () => {
    expect(ADMIN_TIMEZONES.length).toBeGreaterThan(0);
    expect(ADMIN_TIMEZONES.find((tz) => tz.value === 'Asia/Manila')).toBeDefined();
  });
});

describe('formatPhilippinesTime', () => {
  it('formats a Date object with PHT label by default', () => {
    // Jan 15, 2025 10:30 AM PHT = Jan 15, 2025 02:30 UTC
    const date = new Date('2025-01-15T02:30:00Z');
    const result = formatPhilippinesTime(date);
    expect(result).toContain('Jan 15, 2025');
    expect(result).toContain('10:30 AM');
    expect(result).toContain('PHT');
  });

  it('formats without timezone label when includeTimezone is false', () => {
    const date = new Date('2025-01-15T02:30:00Z');
    const result = formatPhilippinesTime(date, false);
    expect(result).not.toContain('PHT');
  });

  it('formats naive datetime string as PHT', () => {
    // Naive string should be treated as PHT per ADR-001
    const result = formatPhilippinesTime('2025-01-15T10:30:00');
    expect(result).toContain('Jan 15, 2025');
    expect(result).toContain('10:30 AM');
    expect(result).toContain('PHT');
  });

  it('formats ISO string with Z correctly', () => {
    const result = formatPhilippinesTime('2025-01-15T02:30:00Z');
    expect(result).toContain('10:30 AM');
    expect(result).toContain('PHT');
  });

  it('supports custom format string', () => {
    const date = new Date('2025-01-15T02:30:00Z');
    const result = formatPhilippinesTime(date, false, 'yyyy-MM-dd');
    expect(result).toBe('2025-01-15');
  });
});

describe('formatWithUserPreference', () => {
  it('returns only primary for business_only mode', () => {
    const result = formatWithUserPreference('2025-01-15T10:30:00', {
      mode: 'business_only',
    });
    expect(result.primary).toContain('PHT');
    expect(result.secondary).toBeUndefined();
  });

  it('returns primary and secondary for business_with_local mode', () => {
    const result = formatWithUserPreference('2025-01-15T10:30:00', {
      mode: 'business_with_local',
      userTimezone: 'America/Los_Angeles',
    });
    expect(result.primary).toContain('PHT');
    expect(result.secondary).toBeDefined();
  });

  it('returns combined string for dual_display mode', () => {
    const result = formatWithUserPreference('2025-01-15T10:30:00', {
      mode: 'dual_display',
      userTimezone: 'America/Los_Angeles',
    });
    expect(result.primary).toContain('/');
  });

  it('returns only primary when user timezone matches business timezone', () => {
    const result = formatWithUserPreference('2025-01-15T10:30:00', {
      mode: 'business_with_local',
      userTimezone: 'Asia/Manila',
    });
    expect(result.secondary).toBeUndefined();
  });
});

describe('formatDualTimezone', () => {
  it('returns both business and admin formatted strings', () => {
    const result = formatDualTimezone('2025-01-15T10:30:00', 'America/Los_Angeles');
    expect(result.business).toContain('PHT');
    expect(result.admin).toBeDefined();
    expect(typeof result.isSameDay).toBe('boolean');
  });

  it('detects different days across timezones', () => {
    // 1 AM PHT = Previous day in LA
    const result = formatDualTimezone('2025-01-15T01:00:00', 'America/Los_Angeles');
    expect(result.isSameDay).toBe(false);
  });

  it('detects same day when times are in the middle of the day', () => {
    // 12 noon PHT = still same day (previous evening) in LA during non-DST
    // Actually 12 noon PHT Jan 15 = Jan 14 8pm PST, so different day
    const result = formatDualTimezone('2025-01-15T22:00:00', 'America/Los_Angeles');
    // 10 PM PHT Jan 15 = 6 AM PST Jan 15
    expect(result.isSameDay).toBe(true);
  });
});

describe('isWithinBusinessHours', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for weekday 10 AM PHT', () => {
    // Wed Jan 15, 2025 10:00 AM PHT = Jan 15 02:00 UTC
    expect(isWithinBusinessHours(new Date('2025-01-15T02:00:00Z'))).toBe(true);
  });

  it('returns false for weekday 8 AM PHT (before 9)', () => {
    // Wed Jan 15, 2025 8:00 AM PHT = Jan 15 00:00 UTC
    expect(isWithinBusinessHours(new Date('2025-01-15T00:00:00Z'))).toBe(false);
  });

  it('returns false for weekday 6 PM PHT (at close)', () => {
    // Wed Jan 15, 2025 6:00 PM PHT = Jan 15 10:00 UTC
    expect(isWithinBusinessHours(new Date('2025-01-15T10:00:00Z'))).toBe(false);
  });

  it('returns true at boundary 9:00 AM PHT', () => {
    // Wed Jan 15, 2025 9:00 AM PHT = Jan 15 01:00 UTC
    expect(isWithinBusinessHours(new Date('2025-01-15T01:00:00Z'))).toBe(true);
  });

  it('returns true at boundary 5:59 PM PHT', () => {
    // Wed Jan 15, 2025 5:59 PM PHT = Jan 15 09:59 UTC
    expect(isWithinBusinessHours(new Date('2025-01-15T09:59:00Z'))).toBe(true);
  });

  it('returns false on Saturday', () => {
    // Sat Jan 18, 2025 12:00 PM PHT = Jan 18 04:00 UTC
    expect(isWithinBusinessHours(new Date('2025-01-18T04:00:00Z'))).toBe(false);
  });

  it('returns false on Sunday', () => {
    // Sun Jan 19, 2025 12:00 PM PHT = Jan 19 04:00 UTC
    expect(isWithinBusinessHours(new Date('2025-01-19T04:00:00Z'))).toBe(false);
  });
});

describe('getBusinessHoursStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns open during business hours', () => {
    // Wed Jan 15, 2025 10:00 AM PHT
    vi.setSystemTime(new Date('2025-01-15T02:00:00Z'));
    const result = getBusinessHoursStatus();
    expect(result.isOpen).toBe(true);
    expect(result.message).toContain('open');
  });

  it('returns closed after hours with nextOpenTime', () => {
    // Wed Jan 15, 2025 8:00 PM PHT
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    const result = getBusinessHoursStatus();
    expect(result.isOpen).toBe(false);
    expect(result.message).toContain('closed');
    expect(result.nextOpenTime).toBeDefined();
  });

  it('returns closed on weekends', () => {
    // Sat Jan 18, 2025 12:00 PM PHT
    vi.setSystemTime(new Date('2025-01-18T04:00:00Z'));
    const result = getBusinessHoursStatus();
    expect(result.isOpen).toBe(false);
    expect(result.nextOpenTime).toBeDefined();
  });
});

describe('getTodayInManila / getTodayStringInManila', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a Date object', () => {
    vi.setSystemTime(new Date('2025-01-15T02:00:00Z'));
    const today = getTodayInManila();
    expect(today).toBeInstanceOf(Date);
  });

  it('returns YYYY-MM-DD string', () => {
    vi.setSystemTime(new Date('2025-01-15T02:00:00Z'));
    expect(getTodayStringInManila()).toBe('2025-01-15');
  });

  it('handles cross-midnight correctly (UTC vs PHT)', () => {
    // Jan 15 11 PM UTC = Jan 16 7 AM PHT
    vi.setSystemTime(new Date('2025-01-15T23:00:00Z'));
    expect(getTodayStringInManila()).toBe('2025-01-16');
  });
});

describe('isTodayInManila', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for today', () => {
    vi.setSystemTime(new Date('2025-01-15T02:00:00Z'));
    expect(isTodayInManila('2025-01-15T10:00:00')).toBe(true);
  });

  it('returns false for yesterday', () => {
    vi.setSystemTime(new Date('2025-01-15T02:00:00Z'));
    expect(isTodayInManila('2025-01-14T10:00:00')).toBe(false);
  });
});

describe('parseDateStringAsManila', () => {
  it('parses YYYY-MM-DD as PHT midnight', () => {
    const date = parseDateStringAsManila('2025-01-15');
    // Midnight PHT = Jan 14 16:00 UTC
    expect(date.toISOString()).toBe('2025-01-14T16:00:00.000Z');
  });
});

describe('parseDateTimeAsManila', () => {
  it('parses naive string as PHT', () => {
    const date = parseDateTimeAsManila('2025-01-15T10:30:00');
    // 10:30 AM PHT = 2:30 AM UTC
    expect(date.toISOString()).toBe('2025-01-15T02:30:00.000Z');
  });

  it('preserves ISO string with Z', () => {
    const date = parseDateTimeAsManila('2025-01-15T02:30:00Z');
    expect(date.toISOString()).toBe('2025-01-15T02:30:00.000Z');
  });

  it('preserves ISO string with offset', () => {
    const date = parseDateTimeAsManila('2025-01-15T10:30:00+08:00');
    expect(date.toISOString()).toBe('2025-01-15T02:30:00.000Z');
  });
});

describe('isSameDayInManila', () => {
  it('returns true for same day strings', () => {
    expect(isSameDayInManila('2025-01-15T01:00:00', '2025-01-15T23:00:00')).toBe(true);
  });

  it('returns false for different day strings', () => {
    expect(isSameDayInManila('2025-01-15T10:00:00', '2025-01-16T10:00:00')).toBe(false);
  });

  it('handles cross-midnight UTC but same PHT day', () => {
    // Both are Jan 15 in PHT
    // 8 AM PHT = Jan 15 00:00 UTC
    // 4 PM PHT = Jan 15 08:00 UTC
    expect(isSameDayInManila('2025-01-15T08:00:00', '2025-01-15T16:00:00')).toBe(true);
  });
});

describe('formatDateForApi', () => {
  it('returns YYYY-MM-DD in Manila timezone', () => {
    // Jan 15 2:30 AM UTC = Jan 15 10:30 AM PHT
    const date = new Date('2025-01-15T02:30:00Z');
    expect(formatDateForApi(date)).toBe('2025-01-15');
  });

  it('handles UTC midnight correctly (next day in PHT)', () => {
    // Jan 15 11 PM UTC = Jan 16 7 AM PHT
    const date = new Date('2025-01-15T23:00:00Z');
    expect(formatDateForApi(date)).toBe('2025-01-16');
  });
});

describe('getDayOfMonthInManila', () => {
  it('returns day of month in Manila timezone', () => {
    const date = new Date('2025-01-15T02:00:00Z');
    expect(getDayOfMonthInManila(date)).toBe(15);
  });
});

describe('getDayOfWeekInManila', () => {
  it('returns 0 for Sunday', () => {
    // Jan 19, 2025 is a Sunday, 12 noon PHT = 4 AM UTC
    const date = new Date('2025-01-19T04:00:00Z');
    expect(getDayOfWeekInManila(date)).toBe(0);
  });

  it('returns 3 for Wednesday', () => {
    // Jan 15, 2025 is a Wednesday, 12 noon PHT = 4 AM UTC
    const date = new Date('2025-01-15T04:00:00Z');
    expect(getDayOfWeekInManila(date)).toBe(3);
  });

  it('returns 6 for Saturday', () => {
    // Jan 18, 2025 is a Saturday, 12 noon PHT = 4 AM UTC
    const date = new Date('2025-01-18T04:00:00Z');
    expect(getDayOfWeekInManila(date)).toBe(6);
  });
});

describe('isSameMonthInManila', () => {
  it('returns true for same month', () => {
    const d1 = new Date('2025-01-01T04:00:00Z');
    const d2 = new Date('2025-01-31T04:00:00Z');
    expect(isSameMonthInManila(d1, d2)).toBe(true);
  });

  it('returns false for different months', () => {
    const d1 = new Date('2025-01-15T04:00:00Z');
    const d2 = new Date('2025-02-15T04:00:00Z');
    expect(isSameMonthInManila(d1, d2)).toBe(false);
  });
});

describe('getCalendarGridDates', () => {
  it('returns an array of Date objects with reasonable length', () => {
    const date = new Date('2025-01-15T04:00:00Z');
    const grid = getCalendarGridDates(date);
    // Calendar grid for a month should have 28-42 dates
    expect(grid.length).toBeGreaterThanOrEqual(28);
    expect(grid.length).toBeLessThanOrEqual(42);
    grid.forEach((d) => expect(d).toBeInstanceOf(Date));
  });

  it('covers the entire month', () => {
    const date = new Date('2025-01-15T04:00:00Z');
    const grid = getCalendarGridDates(date);
    // January 2025: grid should include Jan 1 and Jan 31
    const dayNumbers = grid.map((d) => getDayOfMonthInManila(d));
    expect(dayNumbers).toContain(1);
    expect(dayNumbers).toContain(31);
  });
});

describe('getWeekDates', () => {
  it('returns exactly 7 dates', () => {
    const date = new Date('2025-01-15T04:00:00Z');
    const week = getWeekDates(date);
    expect(week).toHaveLength(7);
  });

  it('starts on Sunday', () => {
    const date = new Date('2025-01-15T04:00:00Z');
    const week = getWeekDates(date);
    expect(getDayOfWeekInManila(week[0])).toBe(0);
  });

  it('ends on Saturday', () => {
    const date = new Date('2025-01-15T04:00:00Z');
    const week = getWeekDates(date);
    expect(getDayOfWeekInManila(week[6])).toBe(6);
  });
});

describe('formatInManila', () => {
  it('formats with custom format string', () => {
    const date = new Date('2025-01-15T02:30:00Z');
    expect(formatInManila(date, 'yyyy-MM-dd')).toBe('2025-01-15');
  });
});

describe('formatForCalendar', () => {
  it('formats with PHT label by default', () => {
    const result = formatForCalendar('2025-01-15T10:30:00');
    expect(result).toContain('PHT');
  });

  it('formats with dual timezone when requested', () => {
    const result = formatForCalendar('2025-01-15T22:00:00', true, 'America/Los_Angeles');
    expect(result).toContain('/');
  });
});

describe('getTimezoneOffset', () => {
  it('returns offset string for valid timezone', () => {
    const offset = getTimezoneOffset('Asia/Manila');
    expect(offset).toBe('+08:00');
  });

  it('returns empty string for invalid timezone', () => {
    const offset = getTimezoneOffset('Invalid/Timezone');
    expect(offset).toBe('');
  });
});

describe('getUserTimezone', () => {
  it('returns a string', () => {
    const tz = getUserTimezone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });
});
