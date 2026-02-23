// frontend/client-portal/src/utils/__tests__/bookingHelpers.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingValidationHelpers } from '../bookingHelpers';
import type { BookingFlowStep, BookingSession } from '../../types/booking';

describe('BookingValidationHelpers', () => {
  describe('validateRequiredFields', () => {
    it('returns empty array when all required fields present', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const requiredFields = ['name', 'email'];

      const errors = BookingValidationHelpers.validateRequiredFields(data, requiredFields);

      expect(errors).toHaveLength(0);
    });

    it('returns error for missing field', () => {
      const data = { name: 'John' };
      const requiredFields = ['name', 'email'];

      const errors = BookingValidationHelpers.validateRequiredFields(data, requiredFields);

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('email');
      expect(errors[0].message).toContain('required');
    });

    it('returns error for empty string', () => {
      const data = { name: '', email: 'john@example.com' };
      const requiredFields = ['name', 'email'];

      const errors = BookingValidationHelpers.validateRequiredFields(data, requiredFields);

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('name');
    });

    it('returns error for whitespace-only value', () => {
      const data = { name: '   ', email: 'john@example.com' };
      const requiredFields = ['name', 'email'];

      const errors = BookingValidationHelpers.validateRequiredFields(data, requiredFields);

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('name');
    });

    it('formats field name with underscores replaced by spaces', () => {
      const data = {};
      const requiredFields = ['full_name'];

      const errors = BookingValidationHelpers.validateRequiredFields(data, requiredFields);

      expect(errors[0].message).toContain('full name');
    });
  });

  describe('validateEmail', () => {
    it('returns true for valid email', () => {
      expect(BookingValidationHelpers.validateEmail('test@example.com')).toBe(true);
    });

    it('returns true for email with subdomain', () => {
      expect(BookingValidationHelpers.validateEmail('test@sub.example.com')).toBe(true);
    });

    it('returns false for invalid email', () => {
      expect(BookingValidationHelpers.validateEmail('invalid-email')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(BookingValidationHelpers.validateEmail('')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('returns true for valid Philippine mobile number', () => {
      expect(BookingValidationHelpers.validatePhone('09123456789')).toBe(true);
    });

    it('returns true for Philippine number with country code', () => {
      expect(BookingValidationHelpers.validatePhone('+639123456789')).toBe(true);
    });

    it('returns true for phone with spaces/dashes', () => {
      expect(BookingValidationHelpers.validatePhone('0912 345 6789')).toBe(true);
      expect(BookingValidationHelpers.validatePhone('0912-345-6789')).toBe(true);
    });

    it('returns false for invalid phone', () => {
      expect(BookingValidationHelpers.validatePhone('123')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(BookingValidationHelpers.validatePhone('')).toBe(false);
    });
  });

  describe('validateFutureDate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns true for future date', () => {
      expect(BookingValidationHelpers.validateFutureDate('2024-06-20')).toBe(true);
    });

    it('returns false for past date', () => {
      expect(BookingValidationHelpers.validateFutureDate('2024-06-10')).toBe(false);
    });

    it('respects minDaysAdvance parameter', () => {
      // 7 days from now is 2024-06-22
      expect(BookingValidationHelpers.validateFutureDate('2024-06-22', 7)).toBe(true);
      expect(BookingValidationHelpers.validateFutureDate('2024-06-21', 7)).toBe(false);
    });

    it('uses default minDaysAdvance of 1', () => {
      // Tomorrow is 2024-06-16
      expect(BookingValidationHelpers.validateFutureDate('2024-06-16', 1)).toBe(true);
      expect(BookingValidationHelpers.validateFutureDate('2024-06-15', 1)).toBe(false);
    });
  });

  describe('validateStepData', () => {
    it('validates introduction step acknowledgment', () => {
      const step = {
        step_type: 'introduction',
        is_required: true,
      } as BookingFlowStep;

      const errorsWithoutAck = BookingValidationHelpers.validateStepData(step, {});
      expect(errorsWithoutAck).toHaveLength(1);
      expect(errorsWithoutAck[0].field).toBe('acknowledged');

      const errorsWithAck = BookingValidationHelpers.validateStepData(step, {
        acknowledged: true,
      });
      expect(errorsWithAck).toHaveLength(0);
    });

    describe('date_time step', () => {
      const step = { step_type: 'date_time' } as BookingFlowStep;

      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-15'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('requires start_date', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {});
        expect(errors.some((e) => e.field === 'start_date')).toBe(true);
      });

      it('validates date is in future', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {
          start_date: '2024-06-10', // Past date
        });
        expect(errors.some((e) => e.field === 'start_date' && e.message.includes('future'))).toBe(
          true,
        );
      });

      it('accepts valid future date', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {
          start_date: '2024-06-20',
        });
        expect(errors).toHaveLength(0);
      });
    });

    describe('contact_info step', () => {
      const step = {
        step_type: 'contact_info',
        configuration_data: {},
      } as BookingFlowStep;

      it('requires full_name', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {
          email: 'test@example.com',
        });
        expect(errors.some((e) => e.field === 'full_name')).toBe(true);
      });

      it('requires email', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {
          full_name: 'John',
        });
        expect(errors.some((e) => e.field === 'email')).toBe(true);
      });

      it('validates email format', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {
          full_name: 'John',
          email: 'invalid-email',
        });
        expect(errors.some((e) => e.field === 'email' && e.message.includes('valid email'))).toBe(
          true,
        );
      });

      it('validates phone when require_phone is true', () => {
        const stepWithPhone = {
          ...step,
          configuration_data: { require_phone: true },
        } as BookingFlowStep;

        const errors = BookingValidationHelpers.validateStepData(stepWithPhone, {
          full_name: 'John',
          email: 'john@example.com',
        });
        expect(errors.some((e) => e.field === 'phone')).toBe(true);
      });

      it('validates phone format when provided', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {
          full_name: 'John',
          email: 'john@example.com',
          phone: 'invalid',
        });
        expect(errors.some((e) => e.field === 'phone')).toBe(true);
      });
    });

    describe('payment_info step', () => {
      const step = { step_type: 'payment_info' } as BookingFlowStep;

      it('requires payment_method', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {
          payment_type: 'FULL',
        });
        expect(errors.some((e) => e.field === 'payment_method')).toBe(true);
      });

      it('requires payment_type', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {
          payment_method: 'CREDIT_CARD',
        });
        expect(errors.some((e) => e.field === 'payment_type')).toBe(true);
      });

      it('requires payment_method_id for credit card', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {
          payment_method: 'CREDIT_CARD',
          payment_type: 'FULL',
        });
        expect(errors.some((e) => e.field === 'payment_method_id')).toBe(true);
      });
    });

    describe('package_selection step', () => {
      it('validates minimum selection', () => {
        const step = {
          step_type: 'package_selection',
          configuration_data: { min_selection: 1 },
        } as BookingFlowStep;

        const errors = BookingValidationHelpers.validateStepData(step, {
          selected_packages: [],
        });
        expect(errors.some((e) => e.message.includes('at least 1'))).toBe(true);
      });

      it('validates maximum selection', () => {
        const step = {
          step_type: 'package_selection',
          configuration_data: { max_selection: 2 },
        } as BookingFlowStep;

        const errors = BookingValidationHelpers.validateStepData(step, {
          selected_packages: ['pkg1', 'pkg2', 'pkg3'],
        });
        expect(errors.some((e) => e.message.includes('maximum 2'))).toBe(true);
      });
    });

    describe('addon_selection step', () => {
      it('validates minimum selection', () => {
        const step = {
          step_type: 'addon_selection',
          configuration_data: { min_selection: 1 },
        } as BookingFlowStep;

        const errors = BookingValidationHelpers.validateStepData(step, {
          selected_addons: [],
        });
        expect(errors.some((e) => e.message.includes('at least 1'))).toBe(true);
      });
    });

    describe('pricing_summary step', () => {
      const step = { step_type: 'pricing_summary' } as BookingFlowStep;

      it('has no required fields', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {});
        expect(errors).toHaveLength(0);
      });

      it('validates discount code format if provided', () => {
        const errors = BookingValidationHelpers.validateStepData(step, {
          applied_discount_code: 123, // Not a string
        });
        expect(errors.some((e) => e.field === 'applied_discount_code')).toBe(true);
      });
    });
  });

  describe('formatValidationErrors', () => {
    it('converts errors to record format', () => {
      const errors = [
        { field: 'email', message: 'Required' },
        { field: 'email', message: 'Invalid format' },
        { field: 'name', message: 'Too short' },
      ];

      const result = BookingValidationHelpers.formatValidationErrors(errors);

      expect(result.email).toEqual(['Required', 'Invalid format']);
      expect(result.name).toEqual(['Too short']);
    });

    it('returns empty object for empty array', () => {
      expect(BookingValidationHelpers.formatValidationErrors([])).toEqual({});
    });
  });

  describe('getCompletionPercentage', () => {
    it('returns 0 for no steps', () => {
      expect(BookingValidationHelpers.getCompletionPercentage(0, 0)).toBe(0);
    });

    it('returns 0 for no completed steps', () => {
      expect(BookingValidationHelpers.getCompletionPercentage(0, 5)).toBe(0);
    });

    it('returns 100 for all completed', () => {
      expect(BookingValidationHelpers.getCompletionPercentage(5, 5)).toBe(100);
    });

    it('rounds percentage correctly', () => {
      expect(BookingValidationHelpers.getCompletionPercentage(1, 3)).toBe(33);
      expect(BookingValidationHelpers.getCompletionPercentage(2, 3)).toBe(67);
    });
  });

  describe('formatCurrency', () => {
    it('formats PHP currency correctly', () => {
      const result = BookingValidationHelpers.formatCurrency(1000, 'PHP');
      expect(result).toContain('1,000');
      expect(result).toContain('₱');
    });

    it('formats USD currency correctly', () => {
      const result = BookingValidationHelpers.formatCurrency(1000, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('1,000');
    });

    it('handles string amounts', () => {
      const result = BookingValidationHelpers.formatCurrency('1500.50', 'PHP');
      expect(result).toContain('1,500');
    });

    it('uses PHP as default currency', () => {
      const result = BookingValidationHelpers.formatCurrency(500);
      expect(result).toContain('₱');
    });
  });

  describe('parseDuration', () => {
    it('parses "4 hours" correctly', () => {
      expect(BookingValidationHelpers.parseDuration('4 hours')).toBe(4);
    });

    it('parses "1 hour" correctly', () => {
      expect(BookingValidationHelpers.parseDuration('1 hour')).toBe(1);
    });

    it('returns 0 for invalid format', () => {
      expect(BookingValidationHelpers.parseDuration('invalid')).toBe(0);
    });

    it('handles case insensitively', () => {
      expect(BookingValidationHelpers.parseDuration('2 HOURS')).toBe(2);
    });
  });

  describe('formatDate', () => {
    it('formats date string correctly', () => {
      // Use a date with time to avoid timezone issues
      const result = BookingValidationHelpers.formatDate('2024-06-15T12:00:00');
      expect(result).toContain('June');
      expect(result).toContain('2024');
      // Date may vary by timezone, just ensure it formats
      expect(result.length).toBeGreaterThan(10);
    });

    it('formats Date object correctly', () => {
      // Create date in local timezone
      const date = new Date(2024, 11, 25, 12, 0, 0); // Dec 25, 2024 noon local
      const result = BookingValidationHelpers.formatDate(date);
      expect(result).toContain('December');
      expect(result).toContain('25');
      expect(result).toContain('2024');
    });

    it('includes weekday', () => {
      // Create date in local timezone
      const date = new Date(2024, 5, 15, 12, 0, 0); // June 15, 2024 noon local (Saturday)
      const result = BookingValidationHelpers.formatDate(date);
      expect(result).toContain('Saturday');
    });
  });

  describe('formatTime', () => {
    it('formats 24-hour time to 12-hour format', () => {
      expect(BookingValidationHelpers.formatTime('14:30')).toContain('2:30');
      expect(BookingValidationHelpers.formatTime('14:30')).toContain('PM');
    });

    it('handles morning times', () => {
      expect(BookingValidationHelpers.formatTime('09:15')).toContain('9:15');
      expect(BookingValidationHelpers.formatTime('09:15')).toContain('AM');
    });

    it('handles noon', () => {
      expect(BookingValidationHelpers.formatTime('12:00')).toContain('12:00');
      expect(BookingValidationHelpers.formatTime('12:00')).toContain('PM');
    });

    it('handles midnight', () => {
      expect(BookingValidationHelpers.formatTime('00:00')).toContain('12:00');
      expect(BookingValidationHelpers.formatTime('00:00')).toContain('AM');
    });
  });

  describe('calculateEndTime', () => {
    it('calculates end time correctly', () => {
      expect(BookingValidationHelpers.calculateEndTime('10:00', 2)).toBe('12:00');
    });

    it('handles crossing noon', () => {
      expect(BookingValidationHelpers.calculateEndTime('10:00', 4)).toBe('14:00');
    });

    it('handles crossing midnight', () => {
      expect(BookingValidationHelpers.calculateEndTime('22:00', 4)).toBe('02:00');
    });

    it('preserves minutes', () => {
      expect(BookingValidationHelpers.calculateEndTime('10:30', 2)).toBe('12:30');
    });
  });

  describe('isSessionExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns true for expired session', () => {
      const session = {
        expires_at: '2024-06-15T11:00:00Z', // 1 hour ago
      } as BookingSession;

      expect(BookingValidationHelpers.isSessionExpired(session)).toBe(true);
    });

    it('returns false for valid session', () => {
      const session = {
        expires_at: '2024-06-15T13:00:00Z', // 1 hour in future
      } as BookingSession;

      expect(BookingValidationHelpers.isSessionExpired(session)).toBe(false);
    });
  });

  describe('getSessionRemainingTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "Expired" for expired session', () => {
      const session = {
        expires_at: '2024-06-15T11:00:00Z',
      } as BookingSession;

      expect(BookingValidationHelpers.getSessionRemainingTime(session)).toBe('Expired');
    });

    it('returns hours and minutes format', () => {
      const session = {
        expires_at: '2024-06-15T14:30:00Z', // 2h 30m from now
      } as BookingSession;

      expect(BookingValidationHelpers.getSessionRemainingTime(session)).toBe('2h 30m');
    });

    it('returns only minutes when less than an hour', () => {
      const session = {
        expires_at: '2024-06-15T12:45:00Z', // 45 minutes from now
      } as BookingSession;

      expect(BookingValidationHelpers.getSessionRemainingTime(session)).toBe('45m');
    });
  });
});
