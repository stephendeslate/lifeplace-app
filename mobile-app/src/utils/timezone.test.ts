/**
 * Timezone Utilities Tests
 */

import {
  BUSINESS_TIMEZONE,
  BUSINESS_TIMEZONE_DISPLAY,
  formatPhilippinesTime,
  formatBookingTime,
  formatDateRange,
  getTimezoneNotice,
  formatDateForPicker,
  formatTimeForPicker,
  parseTimeString,
  calculateDurationHours,
  addHoursToTime,
} from './timezone';

describe('timezone utilities', () => {
  // ===========================================================================
  // CONSTANTS
  // ===========================================================================

  describe('constants', () => {
    it('has correct business timezone', () => {
      expect(BUSINESS_TIMEZONE).toBe('Asia/Manila');
    });

    it('has correct timezone display name', () => {
      expect(BUSINESS_TIMEZONE_DISPLAY).toBe('PHT');
    });
  });

  // ===========================================================================
  // formatPhilippinesTime
  // ===========================================================================

  describe('formatPhilippinesTime', () => {
    it('formats a Date object', () => {
      const date = new Date('2025-06-15T10:00:00Z');
      const result = formatPhilippinesTime(date);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formats an ISO string', () => {
      const result = formatPhilippinesTime('2025-06-15T10:00:00Z');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('uses custom format string', () => {
      const date = new Date('2025-06-15T10:00:00Z');
      const result = formatPhilippinesTime(date, 'yyyy-MM-dd');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  // ===========================================================================
  // formatBookingTime
  // ===========================================================================

  describe('formatBookingTime', () => {
    it('returns object with primary, timezone, and full properties', () => {
      const result = formatBookingTime('2025-06-15T10:00:00Z');

      expect(result).toHaveProperty('primary');
      expect(result).toHaveProperty('timezone');
      expect(result).toHaveProperty('full');
    });

    it('includes PHT in timezone string', () => {
      const result = formatBookingTime('2025-06-15T10:00:00Z');
      expect(result.timezone).toContain('PHT');
    });

    it('full contains date and time', () => {
      const result = formatBookingTime('2025-06-15T10:00:00Z');
      expect(result.full).toContain('at');
      expect(result.full).toContain('PHT');
    });
  });

  // ===========================================================================
  // formatDateRange
  // ===========================================================================

  describe('formatDateRange', () => {
    it('formats single date when no end date', () => {
      const result = formatDateRange('2025-06-15');
      expect(result).toContain('Jun');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('formats single date when start equals end', () => {
      const result = formatDateRange('2025-06-15', '2025-06-15');
      expect(result).not.toContain('-');
    });

    it('formats date range with different dates', () => {
      const result = formatDateRange('2025-06-15', '2025-06-20');
      expect(result).toContain('-');
    });

    it('formats date range across months', () => {
      const result = formatDateRange('2025-06-28', '2025-07-02');
      expect(result).toContain('-');
      expect(result).toContain('Jun');
      expect(result).toContain('Jul');
    });
  });

  // ===========================================================================
  // getTimezoneNotice
  // ===========================================================================

  describe('getTimezoneNotice', () => {
    it('returns booking notice', () => {
      const result = getTimezoneNotice('booking');
      expect(result).toContain('Philippines');
      expect(result).toContain('PHT');
    });

    it('returns confirmation notice', () => {
      const result = getTimezoneNotice('confirmation');
      expect(result).toContain('Philippines');
      expect(result).toContain('UTC+8');
    });

    it('returns calendar notice', () => {
      const result = getTimezoneNotice('calendar');
      expect(result).toContain('PHT');
    });

    it('returns general notice by default', () => {
      const result = getTimezoneNotice();
      expect(result).toContain('Philippines');
    });
  });

  // ===========================================================================
  // formatDateForPicker
  // ===========================================================================

  describe('formatDateForPicker', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date('2025-06-15T10:00:00Z');
      const result = formatDateForPicker(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns correct date components', () => {
      const date = new Date(2025, 5, 15); // June 15, 2025
      const result = formatDateForPicker(date);
      expect(result).toBe('2025-06-15');
    });
  });

  // ===========================================================================
  // formatTimeForPicker
  // ===========================================================================

  describe('formatTimeForPicker', () => {
    it('formats time as HH:mm', () => {
      const date = new Date(2025, 5, 15, 14, 30);
      const result = formatTimeForPicker(date);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('returns correct time components', () => {
      const date = new Date(2025, 5, 15, 14, 30);
      const result = formatTimeForPicker(date);
      expect(result).toBe('14:30');
    });

    it('pads single digit hours and minutes', () => {
      const date = new Date(2025, 5, 15, 9, 5);
      const result = formatTimeForPicker(date);
      expect(result).toBe('09:05');
    });
  });

  // ===========================================================================
  // parseTimeString
  // ===========================================================================

  describe('parseTimeString', () => {
    it('parses HH:mm format', () => {
      const result = parseTimeString('14:30');
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });

    it('parses with base date', () => {
      const baseDate = new Date(2025, 5, 15);
      const result = parseTimeString('10:00', baseDate);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(10);
    });

    it('parses midnight', () => {
      const result = parseTimeString('00:00');
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it('parses end of day', () => {
      const result = parseTimeString('23:59');
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });
  });

  // ===========================================================================
  // calculateDurationHours
  // ===========================================================================

  describe('calculateDurationHours', () => {
    it('calculates duration between two times', () => {
      const result = calculateDurationHours('09:00', '17:00');
      expect(result).toBe(8);
    });

    it('handles half hours', () => {
      const result = calculateDurationHours('09:00', '12:30');
      expect(result).toBe(3.5);
    });

    it('handles overnight events', () => {
      const result = calculateDurationHours('22:00', '02:00');
      expect(result).toBe(4);
    });

    it('handles same start and end time', () => {
      const result = calculateDurationHours('10:00', '10:00');
      expect(result).toBe(0);
    });
  });

  // ===========================================================================
  // addHoursToTime
  // ===========================================================================

  describe('addHoursToTime', () => {
    it('adds whole hours', () => {
      const result = addHoursToTime('10:00', 2);
      expect(result).toBe('12:00');
    });

    it('adds fractional hours', () => {
      const result = addHoursToTime('10:00', 1.5);
      expect(result).toBe('11:30');
    });

    it('handles wraparound past midnight', () => {
      const result = addHoursToTime('22:00', 4);
      expect(result).toBe('02:00');
    });

    it('handles subtracting hours (negative)', () => {
      const result = addHoursToTime('10:00', -2);
      expect(result).toBe('08:00');
    });
  });
});
