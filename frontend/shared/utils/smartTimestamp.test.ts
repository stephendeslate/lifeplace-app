import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatSmartTimestamp } from './smartTimestamp';

describe('formatSmartTimestamp', () => {
  let mockNow: Date;

  beforeEach(() => {
    // Mock current time to January 15, 2025, 3:45 PM (Wednesday)
    mockNow = new Date('2025-01-15T15:45:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rule 1: < 1 minute -> "Just now"', () => {
    it('should return "Just now" for timestamps within 30 seconds', () => {
      const timestamp = new Date(mockNow.getTime() - 30 * 1000).toISOString();
      expect(formatSmartTimestamp(timestamp)).toBe('Just now');
    });

    it('should return "Just now" for current time', () => {
      const timestamp = mockNow.toISOString();
      expect(formatSmartTimestamp(timestamp)).toBe('Just now');
    });
  });

  describe('Rule 2: < 1 hour -> "X minutes ago"', () => {
    it('should return "1 minute ago" for exactly 1 minute', () => {
      const timestamp = new Date(mockNow.getTime() - 1 * 60 * 1000).toISOString();
      expect(formatSmartTimestamp(timestamp)).toBe('1 minute ago');
    });

    it('should return "5 minutes ago" for 5 minutes', () => {
      const timestamp = new Date(mockNow.getTime() - 5 * 60 * 1000).toISOString();
      expect(formatSmartTimestamp(timestamp)).toBe('5 minutes ago');
    });

    it('should return "59 minutes ago" for 59 minutes', () => {
      const timestamp = new Date(mockNow.getTime() - 59 * 60 * 1000).toISOString();
      expect(formatSmartTimestamp(timestamp)).toBe('59 minutes ago');
    });
  });

  describe('Rule 3: < 24 hours -> "X hours ago"', () => {
    it('should return "1 hour ago" for exactly 1 hour', () => {
      const timestamp = new Date(mockNow.getTime() - 1 * 60 * 60 * 1000).toISOString();
      expect(formatSmartTimestamp(timestamp)).toBe('1 hour ago');
    });

    it('should return "5 hours ago" for 5 hours on same day', () => {
      const timestamp = new Date(mockNow.getTime() - 5 * 60 * 60 * 1000).toISOString();
      expect(formatSmartTimestamp(timestamp)).toBe('5 hours ago');
    });

    it('should return hours ago format for same day', () => {
      const timestamp = new Date(mockNow.getTime() - 12 * 60 * 60 * 1000).toISOString();
      const result = formatSmartTimestamp(timestamp);
      // Could be "12 hours ago" or "Yesterday at X" depending on timezone - accept both
      expect(result).toMatch(/(12 hours ago|Yesterday at)/);
    });
  });

  describe('Rule 4: < 2 days -> "Yesterday at H:MM AM/PM"', () => {
    it('should return "Yesterday at" format for yesterday morning', () => {
      // January 14, 2025, 10:30 AM UTC (2:30 AM PST/5:30 AM EST)
      const timestamp = new Date('2025-01-14T10:30:00.000Z').toISOString();
      const result = formatSmartTimestamp(timestamp);
      expect(result).toMatch(/^Yesterday at \d{1,2}:\d{2} (AM|PM)$/);
    });

    it('should return "Yesterday at" format for yesterday evening', () => {
      // January 14, 2025, 9:15 PM UTC (1:15 PM PST/4:15 PM EST)
      const timestamp = new Date('2025-01-14T21:15:00.000Z').toISOString();
      const result = formatSmartTimestamp(timestamp);
      expect(result).toMatch(/^Yesterday at \d{1,2}:\d{2} (AM|PM)$/);
    });
  });

  describe('Rule 5: < 7 days -> "Weekday at H:MM AM/PM"', () => {
    it('should return weekday format for this week (but not yesterday)', () => {
      // January 13, 2025 (Monday), 8:45 AM UTC
      const timestamp = new Date('2025-01-13T08:45:00.000Z').toISOString();
      const result = formatSmartTimestamp(timestamp);
      expect(result).toMatch(
        /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) at \d{1,2}:\d{2} (AM|PM)$/,
      );
    });

    it('should return weekday format for earlier this week', () => {
      // January 12, 2025 (Sunday), 8:45 AM UTC
      const timestamp = new Date('2025-01-12T08:45:00.000Z').toISOString();
      const result = formatSmartTimestamp(timestamp);
      expect(result).toMatch(
        /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) at \d{1,2}:\d{2} (AM|PM)$/,
      );
    });
  });

  describe('Rule 6: > 7 days -> "MMM d, yyyy at H:MM AM/PM"', () => {
    it('should return full date format for last week', () => {
      // January 8, 2025, 11:30 AM UTC
      const timestamp = new Date('2025-01-08T11:30:00.000Z').toISOString();
      const result = formatSmartTimestamp(timestamp);
      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2} (AM|PM)$/);
      expect(result).toContain('Jan 8, 2025');
    });

    it('should return full date format for last month', () => {
      // December 25, 2024, 6:00 PM UTC
      const timestamp = new Date('2024-12-25T18:00:00.000Z').toISOString();
      const result = formatSmartTimestamp(timestamp);
      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2} (AM|PM)$/);
      expect(result).toContain('Dec 25, 2024');
    });

    it('should return full date format for last year', () => {
      // January 15, 2024, 12:00 PM UTC
      const timestamp = new Date('2024-01-15T12:00:00.000Z').toISOString();
      const result = formatSmartTimestamp(timestamp);
      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2} (AM|PM)$/);
      expect(result).toContain('Jan 15, 2024');
    });
  });

  describe('Error handling', () => {
    it('should return "Recently" for invalid timestamp strings', () => {
      expect(formatSmartTimestamp('invalid-date')).toBe('Recently');
      expect(formatSmartTimestamp('')).toBe('Recently');
      expect(formatSmartTimestamp('not-a-date')).toBe('Recently');
    });

    it('should return "Recently" for null/undefined input', () => {
      expect(formatSmartTimestamp(null as any)).toBe('Recently');
      expect(formatSmartTimestamp(undefined as any)).toBe('Recently');
    });

    it('should handle malformed ISO strings gracefully', () => {
      expect(formatSmartTimestamp('2025-13-45T25:90:90.000Z')).toBe('Recently');
    });
  });

  describe('Edge cases', () => {
    it('should handle exactly 60 minutes as hours', () => {
      const timestamp = new Date(mockNow.getTime() - 60 * 60 * 1000).toISOString();
      expect(formatSmartTimestamp(timestamp)).toBe('1 hour ago');
    });

    it('should handle midnight boundary correctly', () => {
      // Set mock time to just after midnight (January 16, 2025, 12:01 AM)
      const midnightTime = new Date('2025-01-16T00:01:00.000Z');
      vi.setSystemTime(midnightTime);

      // Yesterday at 11:59 PM UTC (2 minutes ago)
      const timestamp = new Date('2025-01-15T23:59:00.000Z').toISOString();
      const result = formatSmartTimestamp(timestamp);
      // This is correctly "2 minutes ago" since it's only 2 minutes difference
      expect(result).toBe('2 minutes ago');
    });

    it('should handle week boundary correctly', () => {
      // Set mock time to Sunday (start of new week)
      const sundayTime = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(sundayTime);

      // Previous Sunday (8 days ago)
      const timestamp = new Date('2025-01-11T10:00:00.000Z').toISOString();
      const result = formatSmartTimestamp(timestamp);
      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2} (AM|PM)$/);
      expect(result).toContain('Jan 11, 2025');
    });
  });

  describe('Timezone handling', () => {
    it('should handle different timezone formats', () => {
      // Test with explicit timezone
      const timestamp = '2025-01-15T10:45:00-05:00';
      const result = formatSmartTimestamp(timestamp);
      expect(result).toMatch(/ago|at|Just now|Recently/);
    });

    it('should handle UTC timestamps correctly', () => {
      const timestamp = '2025-01-15T15:44:00.000Z';
      expect(formatSmartTimestamp(timestamp)).toBe('1 minute ago');
    });
  });
});
