// frontend/client-portal/src/apis/__tests__/booking.core.api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookingCoreApi } from '../booking/core.api';
import api from '../../utils/api';

// Mock the api utility
vi.mock('../../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe('BookingCoreApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getEventTypes', () => {
    it('fetches event types from correct endpoint', async () => {
      const mockEventTypes = [
        { id: 1, name: 'Wedding', icon: 'wedding' },
        { id: 2, name: 'Corporate', icon: 'business' },
      ];
      mockApi.get.mockResolvedValueOnce({ data: mockEventTypes });

      const result = await BookingCoreApi.getEventTypes();

      expect(mockApi.get).toHaveBeenCalledWith('/events/event-types/');
      expect(result).toEqual(mockEventTypes);
    });
  });

  describe('getAvailableFlows', () => {
    it('fetches all flows when no event type specified', async () => {
      const mockFlows = [{ id: 1, name: 'Standard Flow' }];
      mockApi.get.mockResolvedValueOnce({ data: mockFlows });

      const result = await BookingCoreApi.getAvailableFlows();

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/public/flows/', {
        params: {},
      });
      expect(result).toEqual(mockFlows);
    });

    it('filters flows by event type when specified', async () => {
      const mockFlows = [{ id: 1, name: 'Wedding Flow', event_type: 1 }];
      mockApi.get.mockResolvedValueOnce({ data: mockFlows });

      const result = await BookingCoreApi.getAvailableFlows(1);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/public/flows/', {
        params: { event_type: 1 },
      });
      expect(result).toEqual(mockFlows);
    });
  });

  describe('getFlowById', () => {
    it('fetches specific flow by ID', async () => {
      const mockFlow = { id: 1, name: 'Wedding Flow', steps: [] };
      mockApi.get.mockResolvedValueOnce({ data: mockFlow });

      const result = await BookingCoreApi.getFlowById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/public/flows/1/');
      expect(result).toEqual(mockFlow);
    });
  });

  describe('startSession', () => {
    it('creates new session for flow', async () => {
      const mockSession = {
        session_id: 'uuid-123',
        flow: { id: 1 },
        current_step: 0,
        expires_at: '2024-06-15T12:00:00Z',
      };
      mockApi.post.mockResolvedValueOnce({ data: mockSession });

      const result = await BookingCoreApi.startSession(1);

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/public/flows/1/start_session/', {
        booking_flow: 1,
        ip_address: undefined,
        user_agent: undefined,
        referrer_url: undefined,
      });
      expect(result).toEqual(mockSession);
    });

    it('includes optional session data', async () => {
      const mockSession = { session_id: 'uuid-123' };
      mockApi.post.mockResolvedValueOnce({ data: mockSession });

      await BookingCoreApi.startSession(1, {
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        referrer_url: 'https://google.com',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/public/flows/1/start_session/', {
        booking_flow: 1,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        referrer_url: 'https://google.com',
      });
    });
  });

  describe('getSession', () => {
    it('retrieves session by UUID', async () => {
      const mockSession = { session_id: 'uuid-123', current_step: 2 };
      mockApi.get.mockResolvedValueOnce({ data: mockSession });

      const result = await BookingCoreApi.getSession('uuid-123');

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/public/flows/session/uuid-123/');
      expect(result).toEqual(mockSession);
    });
  });

  describe('updateSessionData', () => {
    it('updates session step data using PATCH', async () => {
      const mockResponse = { success: true };
      mockApi.patch.mockResolvedValueOnce({ data: mockResponse });

      const stepData = { venue_id: 'venue-1' };
      const result = await BookingCoreApi.updateSessionData('uuid-123', 1, stepData, false);

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/bookingflow/public/flows/session/uuid-123/update/',
        {
          step_id: 1,
          step_data: stepData,
          mark_completed: false,
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('marks step as completed when proceedToNext is true', async () => {
      mockApi.patch.mockResolvedValueOnce({ data: {} });

      await BookingCoreApi.updateSessionData('uuid-123', 1, { data: 'test' }, true);

      expect(mockApi.patch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ mark_completed: true }),
      );
    });

    it('handles booking_data wrapper', async () => {
      mockApi.patch.mockResolvedValueOnce({ data: {} });

      const data = { booking_data: { venue_id: 'venue-1' } };
      await BookingCoreApi.updateSessionData('uuid-123', 1, data, false);

      expect(mockApi.patch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ step_data: { venue_id: 'venue-1' } }),
      );
    });
  });

  describe('validateStepData', () => {
    it('validates step data without saving', async () => {
      const mockResult = { valid: true, errors: [] };
      mockApi.post.mockResolvedValueOnce({ data: mockResult });

      const result = await BookingCoreApi.validateStepData('uuid-123', 1, {
        email: 'test@example.com',
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/bookingflow/public/flows/session/uuid-123/validate/',
        {
          step_id: 1,
          step_data: { email: 'test@example.com' },
        },
      );
      expect(result).toEqual(mockResult);
    });

    it('returns validation errors', async () => {
      const mockResult = {
        valid: false,
        errors: [{ field: 'email', message: 'Invalid email' }],
      };
      mockApi.post.mockResolvedValueOnce({ data: mockResult });

      const result = await BookingCoreApi.validateStepData('uuid-123', 1, {
        email: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('validateAvailability', () => {
    it('validates date availability and returns reservation token', async () => {
      const mockResult = {
        available: true,
        reservation_token: 'res-token-123',
        expires_at: '2024-06-15T12:05:00Z',
      };
      mockApi.post.mockResolvedValueOnce({ data: mockResult });

      const result = await BookingCoreApi.validateAvailability('uuid-123');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/bookingflow/public/flows/session/uuid-123/validate-availability/',
      );
      expect(result.available).toBe(true);
      expect(result.reservation_token).toBe('res-token-123');
    });

    it('returns unavailability with blocking event', async () => {
      const mockResult = {
        available: false,
        error: 'Date is already booked',
        blocking_event_id: 456,
      };
      mockApi.post.mockResolvedValueOnce({ data: mockResult });

      const result = await BookingCoreApi.validateAvailability('uuid-123');

      expect(result.available).toBe(false);
      expect(result.blocking_event_id).toBe(456);
    });
  });

  describe('releaseReservation', () => {
    it('releases date reservation', async () => {
      const mockResult = { success: true };
      mockApi.post.mockResolvedValueOnce({ data: mockResult });

      const result = await BookingCoreApi.releaseReservation('uuid-123', 'res-token-123');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/bookingflow/public/flows/session/uuid-123/release-reservation/',
        { reservation_token: 'res-token-123' },
      );
      expect(result.success).toBe(true);
    });
  });

  describe('completeBooking', () => {
    it('completes booking with payment type', async () => {
      const mockResult = {
        success: true,
        event: { id: 1, title: 'Wedding Event' },
        booking_reference: 'BK-12345',
      };
      mockApi.post.mockResolvedValueOnce({ data: mockResult });

      const result = await BookingCoreApi.completeBooking('uuid-123', 'payment');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/bookingflow/public/flows/session/uuid-123/complete/',
        { completion_type: 'payment' },
      );
      expect(result).toEqual(mockResult);
    });

    it('completes booking with quote type', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });

      await BookingCoreApi.completeBooking('uuid-123', 'quote');

      expect(mockApi.post).toHaveBeenCalledWith(expect.any(String), {
        completion_type: 'quote',
      });
    });

    it('includes reservation token when provided', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await BookingCoreApi.completeBooking('uuid-123', 'payment', 'res-token-123');

      expect(mockApi.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ reservation_token: 'res-token-123' }),
      );
    });

    it('defaults to payment completion type', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await BookingCoreApi.completeBooking('uuid-123');

      expect(mockApi.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ completion_type: 'payment' }),
      );
    });
  });

  describe('getFlowPaymentGateways', () => {
    it('fetches payment gateways for flow', async () => {
      const mockGateways = {
        gateways: [
          { id: 1, code: 'stripe', name: 'Stripe' },
          { id: 2, code: 'gcash', name: 'GCash' },
        ],
      };
      mockApi.get.mockResolvedValueOnce({ data: mockGateways });

      const result = await BookingCoreApi.getFlowPaymentGateways(1);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/public/flows/1/payment_gateways/');
      expect(result).toEqual(mockGateways);
    });
  });

  describe('abandonSession', () => {
    it('abandons session without reason', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await BookingCoreApi.abandonSession('uuid-123');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/bookingflow/public/flows/session/uuid-123/abandon/',
        {},
      );
    });

    it('abandons session with reason', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await BookingCoreApi.abandonSession('uuid-123', 'User navigated away');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/bookingflow/public/flows/session/uuid-123/abandon/',
        { reason: 'User navigated away' },
      );
    });
  });

  describe('goToStep', () => {
    it('navigates to specific step', async () => {
      const mockResponse = { current_step: 3 };
      mockApi.patch.mockResolvedValueOnce({ data: mockResponse });

      const result = await BookingCoreApi.goToStep('uuid-123', 3);

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/bookingflow/public/flows/session/uuid-123/go-to-step/',
        { step_id: 3 },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('calculatePricing', () => {
    it('calculates pricing without discount', async () => {
      const mockPricing = {
        subtotal: '10000.00',
        tax: '1200.00',
        discount: '0.00',
        total: '11200.00',
      };
      mockApi.post.mockResolvedValueOnce({ data: mockPricing });

      const result = await BookingCoreApi.calculatePricing('uuid-123');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/bookingflow/public/flows/session/uuid-123/calculate-pricing/',
        {},
      );
      expect(result).toEqual(mockPricing);
    });

    it('calculates pricing with discount code', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await BookingCoreApi.calculatePricing('uuid-123', 'SUMMER20');

      expect(mockApi.post).toHaveBeenCalledWith(expect.any(String), {
        discount_code: 'SUMMER20',
      });
    });

    it('includes venue additional hours', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });

      await BookingCoreApi.calculatePricing('uuid-123', undefined, {
        'venue-1': 2,
      });

      expect(mockApi.post).toHaveBeenCalledWith(expect.any(String), {
        venue_additional_hours: { 'venue-1': 2 },
      });
    });
  });

  describe('Session Helpers', () => {
    describe('isSessionExpired', () => {
      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('returns true for expired session', () => {
        expect(BookingCoreApi.isSessionExpired('2024-06-15T11:00:00Z')).toBe(true);
      });

      it('returns false for valid session', () => {
        expect(BookingCoreApi.isSessionExpired('2024-06-15T13:00:00Z')).toBe(false);
      });

      it('returns true for exactly current time', () => {
        expect(BookingCoreApi.isSessionExpired('2024-06-15T12:00:00Z')).toBe(true);
      });
    });

    describe('getSessionTimeRemaining', () => {
      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('returns expired for past time', () => {
        const result = BookingCoreApi.getSessionTimeRemaining('2024-06-15T11:00:00Z');
        expect(result.expired).toBe(true);
        expect(result.hours).toBe(0);
        expect(result.minutes).toBe(0);
      });

      it('calculates hours and minutes correctly', () => {
        const result = BookingCoreApi.getSessionTimeRemaining('2024-06-15T14:30:00Z');
        expect(result.expired).toBe(false);
        expect(result.hours).toBe(2);
        expect(result.minutes).toBe(30);
      });

      it('handles less than an hour remaining', () => {
        const result = BookingCoreApi.getSessionTimeRemaining('2024-06-15T12:45:00Z');
        expect(result.hours).toBe(0);
        expect(result.minutes).toBe(45);
      });
    });
  });

  describe('Local Storage Helpers', () => {
    describe('saveSessionToLocal', () => {
      it('saves session to localStorage', () => {
        const sessionData = { step: 1, data: { venue: 'venue-1' } };

        BookingCoreApi.saveSessionToLocal('uuid-123', sessionData);

        const stored = localStorage.getItem('booking_session_uuid-123');
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored!);
        expect(parsed.step).toBe(1);
        expect(parsed.lastSaved).toBeDefined();
      });
    });

    describe('loadSessionFromLocal', () => {
      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('loads session from localStorage', () => {
        const sessionData = { step: 2, expires_at: '2024-06-15T13:00:00Z' };
        localStorage.setItem('booking_session_uuid-123', JSON.stringify(sessionData));

        const result = BookingCoreApi.loadSessionFromLocal('uuid-123');

        expect(result).not.toBeNull();
        expect(result?.step).toBe(2);
      });

      it('returns null for non-existent session', () => {
        const result = BookingCoreApi.loadSessionFromLocal('non-existent');
        expect(result).toBeNull();
      });

      it('returns null and clears expired session', () => {
        const sessionData = { step: 2, expires_at: '2024-06-15T11:00:00Z' };
        localStorage.setItem('booking_session_uuid-123', JSON.stringify(sessionData));

        const result = BookingCoreApi.loadSessionFromLocal('uuid-123');

        expect(result).toBeNull();
        expect(localStorage.getItem('booking_session_uuid-123')).toBeNull();
      });
    });

    describe('clearSessionFromLocal', () => {
      it('removes session from localStorage', () => {
        localStorage.setItem('booking_session_uuid-123', JSON.stringify({ step: 1 }));

        BookingCoreApi.clearSessionFromLocal('uuid-123');

        expect(localStorage.getItem('booking_session_uuid-123')).toBeNull();
      });
    });

    describe('clearAllSessionsFromLocal', () => {
      it('removes all booking sessions', () => {
        localStorage.setItem('booking_session_1', JSON.stringify({ step: 1 }));
        localStorage.setItem('booking_session_2', JSON.stringify({ step: 2 }));
        localStorage.setItem('other_key', 'preserved');

        BookingCoreApi.clearAllSessionsFromLocal();

        expect(localStorage.getItem('booking_session_1')).toBeNull();
        expect(localStorage.getItem('booking_session_2')).toBeNull();
        expect(localStorage.getItem('other_key')).toBe('preserved');
      });
    });

    describe('cleanupExpiredSessions', () => {
      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('removes expired sessions', () => {
        localStorage.setItem(
          'booking_session_expired',
          JSON.stringify({ expires_at: '2024-06-15T11:00:00Z' }),
        );
        localStorage.setItem(
          'booking_session_valid',
          JSON.stringify({ expires_at: '2024-06-15T13:00:00Z' }),
        );

        BookingCoreApi.cleanupExpiredSessions();

        expect(localStorage.getItem('booking_session_expired')).toBeNull();
        expect(localStorage.getItem('booking_session_valid')).not.toBeNull();
      });

      it('removes invalid JSON data', () => {
        localStorage.setItem('booking_session_invalid', 'not-valid-json');

        BookingCoreApi.cleanupExpiredSessions();

        expect(localStorage.getItem('booking_session_invalid')).toBeNull();
      });
    });
  });

  describe('formatStepData', () => {
    it('formats introduction step data', () => {
      const result = BookingCoreApi.formatStepData('introduction', {
        acknowledged: 1,
      });
      expect(result.acknowledged).toBe(true);
    });

    it('formats date_time step data', () => {
      const result = BookingCoreApi.formatStepData('date_time', {
        start_date: '2024-06-15',
        start_time: '10:00',
        duration: '4',
      });
      expect(result.start_date).toBe('2024-06-15');
      expect(result.start_time).toBe('10:00');
      expect(result.duration).toBe(4);
    });

    it('formats questionnaire step data', () => {
      const result = BookingCoreApi.formatStepData('questionnaire', {
        responses: { q1: 'answer1' },
      });
      expect(result.responses).toEqual({ q1: 'answer1' });
    });

    it('formats package_selection step data', () => {
      const result = BookingCoreApi.formatStepData('package_selection', {
        selected_packages: ['pkg-1', 'pkg-2'],
      });
      expect(result.selected_packages).toEqual(['pkg-1', 'pkg-2']);
    });

    it('formats contact_info step data', () => {
      const result = BookingCoreApi.formatStepData('contact_info', {
        full_name: 'John Doe',
        email: 'john@example.com',
        create_account: 1,
      });
      expect(result.full_name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.create_account).toBe(true);
    });

    it('formats payment_info step data', () => {
      const result = BookingCoreApi.formatStepData('payment_info', {
        payment_method: 'CREDIT_CARD',
        payment_type: 'FULL',
      });
      expect(result.payment_method).toBe('CREDIT_CARD');
      expect(result.payment_type).toBe('FULL');
    });

    it('returns data as-is for unknown step type', () => {
      const data = { custom_field: 'value' };
      const result = BookingCoreApi.formatStepData('unknown_step', data);
      expect(result).toEqual(data);
    });
  });

  describe('handleApiError', () => {
    it('extracts detail from axios error response', () => {
      // Create an Error instance with axios-like response structure
      const error = new Error('Request failed') as Error & {
        response?: { data?: { detail?: string; message?: string } };
      };
      error.response = { data: { detail: 'Session expired' } };

      const result = BookingCoreApi.handleApiError(error);

      expect(result).toBe('Session expired');
    });

    it('extracts message from axios error response', () => {
      // Create an Error instance with axios-like response structure
      const error = new Error('Request failed') as Error & {
        response?: { data?: { detail?: string; message?: string } };
      };
      error.response = { data: { message: 'Invalid data' } };

      const result = BookingCoreApi.handleApiError(error);

      expect(result).toBe('Invalid data');
    });

    it('uses error message as fallback', () => {
      const error = new Error('Network error');

      const result = BookingCoreApi.handleApiError(error);

      expect(result).toBe('Network error');
    });

    it('returns generic message for non-Error', () => {
      const result = BookingCoreApi.handleApiError('string error');

      expect(result).toBe('An unexpected error occurred');
    });
  });
});
