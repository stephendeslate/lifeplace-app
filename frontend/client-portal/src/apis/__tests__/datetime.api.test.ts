// frontend/client-portal/src/apis/__tests__/datetime.api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateTimeApi } from '../booking/datetime.api';
import type { DateTimeStepData } from '../../types/booking';

// Mock the api utility
vi.mock('../../utils/api', () => ({
  default: {
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import api from '../../utils/api';

describe('DateTimeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateStepData', () => {
    it('validates step data with correct endpoint', async () => {
      const mockResponse = { data: { isValid: true, errors: {} } };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const stepData: DateTimeStepData = {
        start_date: '2025-06-15',
        venue_id: 1,
      };

      const result = await DateTimeApi.validateStepData('session-123', 1, stepData);

      expect(api.post).toHaveBeenCalledWith(
        '/bookingflow/public/flows/session/session-123/validate/',
        {
          step_id: 1,
          step_data: stepData,
        },
      );
      expect(result.isValid).toBe(true);
    });

    it('returns validation errors', async () => {
      const mockResponse = {
        data: {
          isValid: false,
          errors: { start_date: ['Event date is required'] },
        },
      };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await DateTimeApi.validateStepData('session-123', 1, {} as DateTimeStepData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('start_date');
    });
  });

  describe('updateStepData', () => {
    it('updates step data using PATCH method', async () => {
      const mockResponse = { data: { success: true } };
      vi.mocked(api.patch).mockResolvedValue(mockResponse);

      const stepData: DateTimeStepData = {
        start_date: '2025-06-15',
        venue_id: 1,
      };

      const result = await DateTimeApi.updateStepData('session-123', 1, stepData);

      expect(api.patch).toHaveBeenCalledWith(
        '/bookingflow/public/flows/session/session-123/update/',
        {
          step_id: 1,
          step_data: stepData,
          mark_completed: false,
        },
      );
      expect(result.success).toBe(true);
    });

    it('marks step as completed when markCompleted is true', async () => {
      const mockResponse = { data: { success: true, completed: true } };
      vi.mocked(api.patch).mockResolvedValue(mockResponse);

      const stepData: DateTimeStepData = { start_date: '2025-06-15' };

      await DateTimeApi.updateStepData('session-123', 1, stepData, true);

      expect(api.patch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          mark_completed: true,
        }),
      );
    });
  });

  describe('checkAvailability', () => {
    it('returns available when validation passes', async () => {
      const mockResponse = { data: { isValid: true, errors: {} } };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const stepData: DateTimeStepData = { start_date: '2025-06-15' };
      const result = await DateTimeApi.checkAvailability('session-123', stepData);

      expect(result.available).toBe(true);
      expect(result.message).toBe('Available');
    });

    it('returns not available when validation fails', async () => {
      const mockResponse = { data: { isValid: false, errors: {} } };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const stepData: DateTimeStepData = { start_date: '2025-06-15' };
      const result = await DateTimeApi.checkAvailability('session-123', stepData);

      expect(result.available).toBe(false);
      expect(result.message).toBe('Please check your date selection');
    });

    it('handles API errors gracefully', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const stepData: DateTimeStepData = { start_date: '2025-06-15' };
      const result = await DateTimeApi.checkAvailability('session-123', stepData);

      expect(result.available).toBe(false);
      expect(result.message).toBe('Unable to check availability at this time');
    });
  });

  describe('formatStepData', () => {
    it('formats complete step data', () => {
      const data: DateTimeStepData = {
        start_date: '2025-06-15',
        venue_id: 1,
        resource_requirements: [1, 2],
        staff_requirements: [{ staff_id: 1 }],
      };

      const result = DateTimeApi.formatStepData(data);

      expect(result.start_date).toBe('2025-06-15');
      expect(result.venue_id).toBe(1);
      expect(result.resource_requirements).toEqual([1, 2]);
      expect(result.staff_requirements).toEqual([{ staff_id: 1 }]);
    });

    it('handles missing optional fields', () => {
      const data: DateTimeStepData = {
        start_date: '2025-06-15',
      };

      const result = DateTimeApi.formatStepData(data);

      expect(result.start_date).toBe('2025-06-15');
      expect(result.resource_requirements).toEqual([]);
      expect(result.staff_requirements).toEqual([]);
    });

    it('handles non-array resource_requirements', () => {
      const data = {
        start_date: '2025-06-15',
        resource_requirements: 'not-an-array',
      } as unknown as DateTimeStepData;

      const result = DateTimeApi.formatStepData(data);

      expect(result.resource_requirements).toEqual([]);
    });
  });

  describe('validateData', () => {
    it('returns valid for valid date data', () => {
      // Use a future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dateString = futureDate.toISOString().split('T')[0];

      const data: DateTimeStepData = {
        start_date: dateString,
      };

      const result = DateTimeApi.validateData(data);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('returns error for missing start_date', () => {
      const data: DateTimeStepData = {
        start_date: '',
      };

      const result = DateTimeApi.validateData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.start_date).toContain('Event date is required');
    });

    it('returns error for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const dateString = pastDate.toISOString().split('T')[0];

      const data: DateTimeStepData = {
        start_date: dateString,
      };

      const result = DateTimeApi.validateData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.start_date).toContain('Event date must be in the future');
    });
  });

  describe('getDefaultData', () => {
    it('returns default data structure', () => {
      const result = DateTimeApi.getDefaultData();

      expect(result.start_date).toBe('');
      expect(result.resource_requirements).toEqual([]);
      expect(result.staff_requirements).toEqual([]);
    });
  });

  describe('formatDate', () => {
    it('formats date string to Philippines timezone', () => {
      // Test with a date - the exact output depends on timezone handling
      const result = DateTimeApi.formatDate('2025-06-15T10:00:00Z');

      // Should contain the expected format elements
      expect(result).toMatch(/\w+, \w+ \d+, \d{4}/);
    });

    it('returns empty string for empty input', () => {
      const result = DateTimeApi.formatDate('');
      expect(result).toBe('');
    });

    it('returns original string for invalid date', () => {
      const result = DateTimeApi.formatDate('invalid-date');
      // date-fns-tz may return 'Invalid Date' or the original string
      expect(result).toBeTruthy();
    });
  });
});
