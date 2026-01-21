/**
 * Formatting Utilities Tests
 *
 * Tests for date, time, currency, and text formatting helpers.
 */

import {
  parseDate,
  formatDate,
  formatEventDate,
  formatCardDate,
  formatDateWithDay,
  formatTime,
  formatTimeRange,
  getRelativeTime,
  getDaysUntil,
  getEventCountdown,
  formatCurrency,
  formatCompactCurrency,
  truncateText,
  titleCase,
  formatStatus,
  pluralize,
  formatCount,
  formatFileSize,
} from './formatting';

// =============================================================================
// DATE FORMATTING
// =============================================================================

describe('Date Formatting', () => {
  describe('parseDate', () => {
    it('parses valid ISO date string', () => {
      const result = parseDate('2025-06-15T10:00:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toContain('2025-06-15');
    });

    it('returns null for null input', () => {
      expect(parseDate(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(parseDate(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });

    it('returns null for invalid date string', () => {
      expect(parseDate('not-a-date')).toBeNull();
    });
  });

  describe('formatDate', () => {
    it('formats date with default format', () => {
      const result = formatDate('2025-06-15T10:00:00Z');
      // Default format is 'MMM dd, yyyy'
      expect(result).toMatch(/Jun \d{2}, 2025/);
    });

    it('formats date with custom format', () => {
      const result = formatDate('2025-06-15T10:00:00Z', 'yyyy-MM-dd');
      expect(result).toBe('2025-06-15');
    });

    it('returns empty string for null input', () => {
      expect(formatDate(null)).toBe('');
    });

    it('returns empty string for invalid date', () => {
      expect(formatDate('invalid')).toBe('');
    });
  });

  describe('formatEventDate', () => {
    it('formats single day event', () => {
      const result = formatEventDate('2025-06-15');
      expect(result).toContain('Sunday');
      expect(result).toContain('June');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('returns Date TBD for null', () => {
      expect(formatEventDate(null)).toBe('Date TBD');
    });

    it('formats date range for multi-day event', () => {
      const result = formatEventDate('2025-06-15', '2025-06-17');
      expect(result).toContain('-');
      expect(result).toContain('June');
    });

    it('formats same-day event without range', () => {
      const result = formatEventDate('2025-06-15', '2025-06-15');
      expect(result).not.toContain('-');
    });
  });

  describe('formatCardDate', () => {
    it('formats date for card display', () => {
      const result = formatCardDate('2025-06-15T10:00:00Z');
      expect(result).toMatch(/Jun \d{2}, 2025/);
    });

    it('returns empty string for null', () => {
      expect(formatCardDate(null)).toBe('');
    });
  });

  describe('formatDateWithDay', () => {
    it('includes day of week', () => {
      const result = formatDateWithDay('2025-06-15T10:00:00Z');
      expect(result).toMatch(/Sun, Jun \d{2}/);
    });
  });
});

// =============================================================================
// TIME FORMATTING
// =============================================================================

describe('Time Formatting', () => {
  describe('formatTime', () => {
    it('formats datetime string', () => {
      const result = formatTime('2025-06-15T14:30:00Z');
      // Should be in format like "2:30 PM" or adjusted for timezone
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });

    it('formats simple time string (HH:mm)', () => {
      const result = formatTime('14:30');
      expect(result).toMatch(/2:30\s*PM/i);
    });

    it('returns empty string for null', () => {
      expect(formatTime(null)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(formatTime('')).toBe('');
    });
  });

  describe('formatTimeRange', () => {
    it('formats time range', () => {
      const result = formatTimeRange('10:00', '18:00');
      expect(result).toContain('-');
      expect(result).toMatch(/10:00\s*AM/i);
      expect(result).toMatch(/6:00\s*PM/i);
    });

    it('returns just start time if no end', () => {
      const result = formatTimeRange('10:00', null);
      expect(result).toMatch(/10:00\s*AM/i);
      expect(result).not.toContain('-');
    });

    it('returns empty string if no start', () => {
      expect(formatTimeRange(null, '18:00')).toBe('');
    });
  });
});

// =============================================================================
// RELATIVE TIME
// =============================================================================

describe('Relative Time', () => {
  describe('getRelativeTime', () => {
    it('returns relative time for past dates', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const result = getRelativeTime(pastDate);
      expect(result).toContain('ago');
    });

    it('returns empty string for null', () => {
      expect(getRelativeTime(null)).toBe('');
    });

    it('returns empty string for invalid date', () => {
      expect(getRelativeTime('invalid')).toBe('');
    });

    it('returns formatted time for future dates', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day ahead
      const result = getRelativeTime(futureDate);
      expect(result).toContain('PHT');
    });
  });

  describe('getDaysUntil', () => {
    it('returns days for future date', () => {
      const futureDate = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days ahead
      const result = getDaysUntil(futureDate);
      expect(result).toBeGreaterThanOrEqual(6);
      expect(result).toBeLessThanOrEqual(8);
    });

    it('returns 0 for today', () => {
      const today = new Date().toISOString();
      const result = getDaysUntil(today);
      expect(result).toBe(0);
    });

    it('returns null for past dates', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      expect(getDaysUntil(pastDate)).toBeNull();
    });

    it('returns null for null input', () => {
      expect(getDaysUntil(null)).toBeNull();
    });
  });

  describe('getEventCountdown', () => {
    it('returns "Today!" for event today', () => {
      const today = new Date().toISOString();
      expect(getEventCountdown(today)).toBe('Today!');
    });

    it('returns "Tomorrow" for event tomorrow', () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      expect(getEventCountdown(tomorrow)).toBe('Tomorrow');
    });

    it('returns "X days away" for events within a week', () => {
      const in5Days = new Date(Date.now() + 5 * 86400000).toISOString();
      const result = getEventCountdown(in5Days);
      expect(result).toMatch(/\d+ days away/);
    });

    it('returns "X week(s) away" for events within a month', () => {
      const in2Weeks = new Date(Date.now() + 14 * 86400000).toISOString();
      const result = getEventCountdown(in2Weeks);
      expect(result).toMatch(/\d+ weeks? away/);
    });

    it('returns "X month(s) away" for events within a year', () => {
      const in3Months = new Date(Date.now() + 90 * 86400000).toISOString();
      const result = getEventCountdown(in3Months);
      expect(result).toMatch(/\d+ months? away/);
    });

    it('returns null for events over a year away', () => {
      const in2Years = new Date(Date.now() + 730 * 86400000).toISOString();
      expect(getEventCountdown(in2Years)).toBeNull();
    });

    it('returns null for past dates', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      expect(getEventCountdown(yesterday)).toBeNull();
    });
  });
});

// =============================================================================
// CURRENCY FORMATTING
// =============================================================================

describe('Currency Formatting', () => {
  describe('formatCurrency', () => {
    it('formats number as PHP currency', () => {
      const result = formatCurrency(50000);
      expect(result).toContain('50,000');
      expect(result).toMatch(/₱|PHP/);
    });

    it('formats string amount', () => {
      const result = formatCurrency('50000.50');
      expect(result).toContain('50,000');
    });

    it('handles decimal amounts', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('1,234');
    });

    it('returns empty string for null', () => {
      expect(formatCurrency(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(formatCurrency(undefined)).toBe('');
    });

    it('returns empty string for NaN', () => {
      expect(formatCurrency('not-a-number')).toBe('');
    });

    it('accepts custom currency', () => {
      const result = formatCurrency(1000, 'USD');
      expect(result).toContain('1,000');
    });

    it('respects custom options', () => {
      const result = formatCurrency(1000.5, 'PHP', { minimumFractionDigits: 2 });
      expect(result).toContain('.50');
    });
  });

  describe('formatCompactCurrency', () => {
    it('formats thousands compactly', () => {
      const result = formatCompactCurrency(50000);
      expect(result).toMatch(/50K|50,000/);
    });

    it('formats millions compactly', () => {
      const result = formatCompactCurrency(1500000);
      expect(result).toMatch(/1\.5M|1,500/);
    });

    it('returns empty string for null', () => {
      expect(formatCompactCurrency(null)).toBe('');
    });

    it('returns empty string for NaN', () => {
      expect(formatCompactCurrency('invalid')).toBe('');
    });
  });
});

// =============================================================================
// TEXT FORMATTING
// =============================================================================

describe('Text Formatting', () => {
  describe('truncateText', () => {
    it('returns full text if under limit', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('truncates text with ellipsis', () => {
      const result = truncateText('Hello World', 8);
      expect(result).toBe('Hello...');
      expect(result.length).toBe(8);
    });

    it('handles exact length', () => {
      expect(truncateText('Hello', 5)).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('titleCase', () => {
    it('capitalizes first letter of each word', () => {
      expect(titleCase('hello world')).toBe('Hello World');
    });

    it('handles uppercase input', () => {
      expect(titleCase('HELLO WORLD')).toBe('Hello World');
    });

    it('handles single word', () => {
      expect(titleCase('hello')).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(titleCase('')).toBe('');
    });
  });

  describe('formatStatus', () => {
    it('converts underscores to spaces and title cases', () => {
      expect(formatStatus('in_progress')).toBe('In Progress');
    });

    it('handles single word status', () => {
      expect(formatStatus('ACTIVE')).toBe('Active');
    });

    it('handles multiple underscores', () => {
      expect(formatStatus('pending_approval_required')).toBe('Pending Approval Required');
    });
  });

  describe('pluralize', () => {
    it('returns singular for count of 1', () => {
      expect(pluralize(1, 'item')).toBe('item');
    });

    it('returns plural for count of 0', () => {
      expect(pluralize(0, 'item')).toBe('items');
    });

    it('returns plural for count > 1', () => {
      expect(pluralize(5, 'item')).toBe('items');
    });

    it('uses custom plural form', () => {
      expect(pluralize(2, 'person', 'people')).toBe('people');
    });

    it('uses custom plural for count 1', () => {
      expect(pluralize(1, 'person', 'people')).toBe('person');
    });
  });

  describe('formatCount', () => {
    it('formats count with singular', () => {
      expect(formatCount(1, 'item')).toBe('1 item');
    });

    it('formats count with plural', () => {
      expect(formatCount(5, 'item')).toBe('5 items');
    });

    it('formats count with custom plural', () => {
      expect(formatCount(3, 'person', 'people')).toBe('3 people');
    });

    it('formats zero count', () => {
      expect(formatCount(0, 'item')).toBe('0 items');
    });
  });
});

// =============================================================================
// FILE SIZE FORMATTING
// =============================================================================

describe('File Size Formatting', () => {
  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    });

    it('formats gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('formats with decimal', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('handles zero', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('handles large megabyte values', () => {
      const result = formatFileSize(5.5 * 1024 * 1024);
      expect(result).toBe('5.5 MB');
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('formatDate handles various date formats', () => {
    expect(formatDate('2025-06-15')).not.toBe('');
    expect(formatDate('2025-06-15T00:00:00')).not.toBe('');
    expect(formatDate('2025-06-15T00:00:00Z')).not.toBe('');
    expect(formatDate('2025-06-15T00:00:00+08:00')).not.toBe('');
  });

  it('formatTime handles various time formats', () => {
    expect(formatTime('10:30')).not.toBe('');
    expect(formatTime('2025-06-15T10:30:00Z')).not.toBe('');
    expect(formatTime('2025-06-15 10:30:00')).not.toBe('');
  });

  it('formatCurrency handles string decimals correctly', () => {
    const result = formatCurrency('12345.67');
    expect(result).toContain('12,345');
  });

  it('truncateText handles unicode characters', () => {
    const result = truncateText('Hello 世界 🌍', 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });
});
