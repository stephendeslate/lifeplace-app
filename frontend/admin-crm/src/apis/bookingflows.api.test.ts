import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../utils/api';
import { bookingFlowsApi } from './bookingflows';

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe('bookingFlowsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Booking Flows CRUD ---

  describe('getBookingFlows', () => {
    it('calls /bookingflow/flows/ with no params', async () => {
      const mockData = { results: [], count: 0, next: null, previous: null };
      mockApi.get.mockResolvedValue({ data: mockData });

      const result = await bookingFlowsApi.getBookingFlows();

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/flows/?');
      expect(result).toEqual(mockData);
    });

    it('constructs all query params', async () => {
      mockApi.get.mockResolvedValue({ data: { results: [], count: 0 } });

      await bookingFlowsApi.getBookingFlows({
        search: 'wedding',
        event_type: 2,
        is_active: true,
        page: 3,
        page_size: 10,
        ordering: '-created_at',
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('search=wedding');
      expect(calledUrl).toContain('event_type=2');
      expect(calledUrl).toContain('is_active=true');
      expect(calledUrl).toContain('page=3');
      expect(calledUrl).toContain('page_size=10');
      expect(calledUrl).toContain('ordering=-created_at');
    });
  });

  describe('getBookingFlow', () => {
    it('fetches a single booking flow by ID', async () => {
      const mockFlow = { id: 1, name: 'Wedding Booking', steps: [] };
      mockApi.get.mockResolvedValue({ data: mockFlow });

      const result = await bookingFlowsApi.getBookingFlow(1);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/flows/1/');
      expect(result).toEqual(mockFlow);
    });
  });

  describe('createBookingFlow', () => {
    it('posts flow data to /bookingflow/flows/', async () => {
      const data = { name: 'New Flow', event_type: 1 };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await bookingFlowsApi.createBookingFlow(data as never);

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/flows/', data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe('updateBookingFlow', () => {
    it('patches flow data at /bookingflow/flows/:id/', async () => {
      const data = { name: 'Updated Flow' };
      mockApi.patch.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await bookingFlowsApi.updateBookingFlow(1, data as never);

      expect(mockApi.patch).toHaveBeenCalledWith('/bookingflow/flows/1/', data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe('deleteBookingFlow', () => {
    it('deletes flow at /bookingflow/flows/:id/', async () => {
      mockApi.delete.mockResolvedValue({});

      await bookingFlowsApi.deleteBookingFlow(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/bookingflow/flows/1/');
    });
  });

  describe('duplicateBookingFlow', () => {
    it('posts duplicate data to /bookingflow/flows/:id/duplicate/', async () => {
      const data = { name: 'Copy of Flow' };
      mockApi.post.mockResolvedValue({ data: { id: 2, name: 'Copy of Flow' } });

      const result = await bookingFlowsApi.duplicateBookingFlow(1, data as never);

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/flows/1/duplicate/', data);
      expect(result).toEqual({ id: 2, name: 'Copy of Flow' });
    });
  });

  describe('getActiveBookingFlows', () => {
    it('handles paginated response by extracting results', async () => {
      const mockFlows = [{ id: 1, name: 'Active Flow', is_active: true }];
      mockApi.get.mockResolvedValue({ data: { results: mockFlows } });

      const result = await bookingFlowsApi.getActiveBookingFlows();

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/flows/active/');
      expect(result).toEqual(mockFlows);
    });

    it('handles direct array response', async () => {
      const mockFlows = [{ id: 1, name: 'Active Flow' }];
      mockApi.get.mockResolvedValue({ data: mockFlows });

      const result = await bookingFlowsApi.getActiveBookingFlows();

      expect(result).toEqual(mockFlows);
    });

    it('returns empty array for non-array response without results', async () => {
      mockApi.get.mockResolvedValue({ data: 'unexpected' });

      const result = await bookingFlowsApi.getActiveBookingFlows();

      expect(result).toEqual([]);
    });
  });

  describe('getFlowPaymentGateways', () => {
    it('fetches payment gateways for a flow', async () => {
      const mockGateways = {
        available_gateways: [{ id: 1, name: 'Stripe', code: 'stripe' }],
        default_gateway: 1,
        require_immediate_payment: true,
      };
      mockApi.get.mockResolvedValue({ data: mockGateways });

      const result = await bookingFlowsApi.getFlowPaymentGateways(5);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/flows/5/payment_gateways/');
      expect(result).toEqual(mockGateways);
    });
  });

  // --- Flow Steps ---

  describe('getFlowSteps', () => {
    it('fetches steps for a specific flow', async () => {
      const mockSteps = [{ id: 1, step_type: 'introduction', order: 0 }];
      mockApi.get.mockResolvedValue({ data: mockSteps });

      const result = await bookingFlowsApi.getFlowSteps(5);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/flows/5/steps/');
      expect(result).toEqual(mockSteps);
    });
  });

  describe('getBookingFlowSteps', () => {
    it('constructs query params for step listing', async () => {
      mockApi.get.mockResolvedValue({ data: { results: [], count: 0 } });

      await bookingFlowsApi.getBookingFlowSteps({
        search: 'intro',
        flow_id: 5,
        step_type: 'introduction',
        page: 2,
        page_size: 10,
        ordering: 'order',
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('search=intro');
      expect(calledUrl).toContain('flow_id=5');
      expect(calledUrl).toContain('step_type=introduction');
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('page_size=10');
      expect(calledUrl).toContain('ordering=order');
    });
  });

  describe('getBookingFlowStep', () => {
    it('fetches a single step by ID', async () => {
      const mockStep = { id: 10, step_type: 'venue_selection' };
      mockApi.get.mockResolvedValue({ data: mockStep });

      const result = await bookingFlowsApi.getBookingFlowStep(10);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/steps/10/');
      expect(result).toEqual(mockStep);
    });
  });

  describe('createBookingFlowStep', () => {
    it('posts step data to /bookingflow/steps/', async () => {
      const data = { flow: 5, step_type: 'date_time', order: 2 };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await bookingFlowsApi.createBookingFlowStep(data as never);

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/steps/', data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe('updateBookingFlowStep', () => {
    it('patches step data at /bookingflow/steps/:id/', async () => {
      const data = { title: 'Updated Step Title' };
      mockApi.patch.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await bookingFlowsApi.updateBookingFlowStep(1, data as never);

      expect(mockApi.patch).toHaveBeenCalledWith('/bookingflow/steps/1/', data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe('deleteBookingFlowStep', () => {
    it('deletes step at /bookingflow/steps/:id/', async () => {
      mockApi.delete.mockResolvedValue({});

      await bookingFlowsApi.deleteBookingFlowStep(10);

      expect(mockApi.delete).toHaveBeenCalledWith('/bookingflow/steps/10/');
    });
  });

  describe('reorderSteps', () => {
    it('posts reorder data to /bookingflow/steps/reorder/', async () => {
      const data = { flow_id: 5, step_ids: [3, 1, 2] };
      const mockSteps = [
        { id: 3, order: 0 },
        { id: 1, order: 1 },
        { id: 2, order: 2 },
      ];
      mockApi.post.mockResolvedValue({ data: mockSteps });

      const result = await bookingFlowsApi.reorderSteps(data as never);

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/steps/reorder/', data);
      expect(result).toEqual(mockSteps);
    });
  });

  describe('getAvailableStepTypes', () => {
    it('fetches available step types', async () => {
      const mockResponse = {
        step_types: [{ value: 'introduction', label: 'Introduction' }],
        total_count: 10,
        removed_types: [],
      };
      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await bookingFlowsApi.getAvailableStepTypes();

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/steps/available_step_types/');
      expect(result).toEqual(mockResponse);
    });
  });

  // --- Step Configuration ---

  describe('getStepConfiguration', () => {
    it('fetches step configuration', async () => {
      const mockConfig = { id: 1, step: 10, config_data: {} };
      mockApi.get.mockResolvedValue({ data: mockConfig });

      const result = await bookingFlowsApi.getStepConfiguration(10);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/steps/10/configuration/');
      expect(result).toEqual(mockConfig);
    });

    it('returns null on 404 error', async () => {
      const error = { response: { status: 404 } };
      mockApi.get.mockRejectedValue(error);

      const result = await bookingFlowsApi.getStepConfiguration(999);

      expect(result).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      const error = { response: { status: 500 } };
      mockApi.get.mockRejectedValue(error);

      await expect(bookingFlowsApi.getStepConfiguration(10)).rejects.toEqual(error);
    });
  });

  describe('updateStepConfiguration', () => {
    it('patches step configuration data', async () => {
      const data = { min_selections: 1, max_selections: 3 };
      mockApi.patch.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await bookingFlowsApi.updateStepConfiguration(10, data);

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/bookingflow/steps/10/update_configuration/',
        data,
      );
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  // --- Payment Terms Configuration ---

  describe('getPaymentTermsConfiguration', () => {
    it('fetches payment terms configuration for a step', async () => {
      const mockConfig = {
        require_immediate_payment: true,
        accept_deposit: false,
      };
      mockApi.get.mockResolvedValue({ data: mockConfig });

      const result = await bookingFlowsApi.getPaymentTermsConfiguration(10);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/bookingflow/steps/10/payment_terms_configuration/',
      );
      expect(result).toEqual(mockConfig);
    });

    it('returns null on 404 error', async () => {
      mockApi.get.mockRejectedValue({ response: { status: 404 } });

      const result = await bookingFlowsApi.getPaymentTermsConfiguration(999);

      expect(result).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      const error = { response: { status: 500 } };
      mockApi.get.mockRejectedValue(error);

      await expect(bookingFlowsApi.getPaymentTermsConfiguration(10)).rejects.toEqual(error);
    });
  });

  describe('updatePaymentTermsConfiguration', () => {
    it('patches payment terms configuration', async () => {
      const data = { require_immediate_payment: false };
      mockApi.patch.mockResolvedValue({ data: { ...data } });

      const result = await bookingFlowsApi.updatePaymentTermsConfiguration(10, data);

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/bookingflow/steps/10/update_payment_terms_configuration/',
        data,
      );
      expect(result).toEqual(data);
    });
  });

  // --- Step Validation & Availability ---

  describe('getStepValidationRules', () => {
    it('fetches validation rules for a step', async () => {
      const mockRules = {
        step_type: 'date_time',
        validation_rules: { required: true },
        custom_rules: {},
      };
      mockApi.get.mockResolvedValue({ data: mockRules });

      const result = await bookingFlowsApi.getStepValidationRules(10);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/steps/10/step_validation_rules/');
      expect(result).toEqual(mockRules);
    });
  });

  describe('getAvailabilitySettings', () => {
    it('fetches availability settings for a step', async () => {
      const mockSettings = {
        enable_real_time_availability: true,
        show_availability_status: true,
        available_days_of_week: [1, 2, 3, 4, 5],
        blocked_dates: ['2025-12-25'],
      };
      mockApi.get.mockResolvedValue({ data: mockSettings });

      const result = await bookingFlowsApi.getAvailabilitySettings(10);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/steps/10/availability_settings/');
      expect(result).toEqual(mockSettings);
    });
  });

  describe('getPaymentOptions', () => {
    it('fetches payment options for a step', async () => {
      const mockOptions = {
        available_gateways: [{ id: 1, name: 'Stripe', code: 'stripe' }],
        saved_payment_methods: [],
        require_immediate_payment: true,
        accept_deposit: false,
        deposit_amount: null,
        deposit_type: null,
        allow_payment_plans: false,
        payment_terms: 'Full payment required',
      };
      mockApi.get.mockResolvedValue({ data: mockOptions });

      const result = await bookingFlowsApi.getPaymentOptions(10);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/steps/10/payment_options/');
      expect(result).toEqual(mockOptions);
    });
  });

  describe('migrateAvailabilityToDateTime', () => {
    it('posts migration request for a step', async () => {
      const mockStep = { id: 10, step_type: 'date_time' };
      mockApi.post.mockResolvedValue({ data: mockStep });

      const result = await bookingFlowsApi.migrateAvailabilityToDateTime(10);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/bookingflow/steps/10/migrate_availability_to_datetime/',
      );
      expect(result).toEqual(mockStep);
    });
  });

  // --- Questionnaire & Package Step Configuration ---

  describe('getAvailableQuestionnaires', () => {
    it('fetches available questionnaires for a step', async () => {
      const mockQuestionnaires = [{ id: 1, name: 'Pre-Event Questions', is_active: true }];
      mockApi.get.mockResolvedValue({ data: mockQuestionnaires });

      const result = await bookingFlowsApi.getAvailableQuestionnaires(10);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/steps/10/available_questionnaires/');
      expect(result).toEqual(mockQuestionnaires);
    });
  });

  describe('assignQuestionnaires', () => {
    it('posts questionnaire assignment data', async () => {
      const data = { questionnaire_ids: [1, 2, 3] };
      const mockConfig = { id: 1, questionnaires: [1, 2, 3] };
      mockApi.post.mockResolvedValue({ data: mockConfig });

      const result = await bookingFlowsApi.assignQuestionnaires(10, data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/bookingflow/steps/10/assign_questionnaires/',
        data,
      );
      expect(result).toEqual(mockConfig);
    });
  });

  describe('getAvailablePackages', () => {
    it('fetches available packages for a step', async () => {
      const mockPackages = [{ id: 1, name: 'Premium Package', base_price: '5000.00' }];
      mockApi.get.mockResolvedValue({ data: mockPackages });

      const result = await bookingFlowsApi.getAvailablePackages(10);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/steps/10/available_packages/');
      expect(result).toEqual(mockPackages);
    });
  });

  describe('getAvailableAddons', () => {
    it('fetches available addons for a step', async () => {
      const mockAddons = [{ id: 1, name: 'Photo Booth', base_price: '2000.00' }];
      mockApi.get.mockResolvedValue({ data: mockAddons });

      const result = await bookingFlowsApi.getAvailableAddons(10);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/steps/10/available_addons/');
      expect(result).toEqual(mockAddons);
    });
  });

  describe('getAvailableCategories', () => {
    it('fetches available categories for a step', async () => {
      const mockCategories = [{ id: 1, name: 'Packages', slug: 'packages' }];
      mockApi.get.mockResolvedValue({ data: mockCategories });

      const result = await bookingFlowsApi.getAvailableCategories(10);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/steps/10/available_categories/');
      expect(result).toEqual(mockCategories);
    });
  });

  // --- Booking Sessions ---

  describe('getBookingSessions', () => {
    it('calls /bookingflow/sessions/ with no params', async () => {
      mockApi.get.mockResolvedValue({ data: { results: [] } });

      const result = await bookingFlowsApi.getBookingSessions();

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/sessions/?');
      expect(result).toEqual([]);
    });

    it('constructs filter params', async () => {
      mockApi.get.mockResolvedValue({ data: { results: [] } });

      await bookingFlowsApi.getBookingSessions({
        booking_flow: 5,
        is_completed: true,
        is_abandoned: false,
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('booking_flow=5');
      expect(calledUrl).toContain('is_completed=true');
      expect(calledUrl).toContain('is_abandoned=false');
    });

    it('handles direct array response', async () => {
      const mockSessions = [{ id: 1, is_completed: false }];
      mockApi.get.mockResolvedValue({ data: mockSessions });

      const result = await bookingFlowsApi.getBookingSessions();

      expect(result).toEqual(mockSessions);
    });
  });

  describe('getBookingSession', () => {
    it('fetches a single session by ID', async () => {
      const mockSession = { id: 5, booking_flow: 1, is_completed: false };
      mockApi.get.mockResolvedValue({ data: mockSession });

      const result = await bookingFlowsApi.getBookingSession(5);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/sessions/5/');
      expect(result).toEqual(mockSession);
    });
  });

  describe('createBookingSession', () => {
    it('posts session data to /bookingflow/sessions/', async () => {
      const data = { booking_flow: 1 };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await bookingFlowsApi.createBookingSession(data as never);

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/sessions/', data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe('updateBookingSessionData', () => {
    it('patches session data at /bookingflow/sessions/:id/update_data/', async () => {
      const data = { step_data: { venue_id: 3 } };
      mockApi.patch.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await bookingFlowsApi.updateBookingSessionData(1, data as never);

      expect(mockApi.patch).toHaveBeenCalledWith('/bookingflow/sessions/1/update_data/', data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe('completeBooking', () => {
    it('posts to complete_booking endpoint', async () => {
      const mockResponse = {
        detail: 'Booking completed',
        event: { id: 1, name: 'Wedding', status: 'confirmed' },
        session: { id: 5, is_completed: true },
      };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await bookingFlowsApi.completeBooking(5);

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/sessions/5/complete_booking/');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('abandonSession', () => {
    it('posts abandon request with optional reason', async () => {
      const mockSession = { id: 5, is_abandoned: true };
      mockApi.post.mockResolvedValue({ data: mockSession });

      const result = await bookingFlowsApi.abandonSession(5, 'Changed mind');

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/sessions/5/abandon/', {
        reason: 'Changed mind',
      });
      expect(result).toEqual(mockSession);
    });
  });

  // --- Public Endpoints ---

  describe('getPublicBookingFlows', () => {
    it('fetches public booking flows', async () => {
      const mockFlows = [{ id: 1, name: 'Wedding Flow' }];
      mockApi.get.mockResolvedValue({ data: mockFlows });

      const result = await bookingFlowsApi.getPublicBookingFlows();

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/public/flows/');
      expect(result).toEqual(mockFlows);
    });

    it('returns empty array for non-array response', async () => {
      mockApi.get.mockResolvedValue({ data: 'unexpected' });

      const result = await bookingFlowsApi.getPublicBookingFlows();

      expect(result).toEqual([]);
    });
  });

  describe('startPublicSession', () => {
    it('posts to start a public session', async () => {
      const mockResponse = {
        session_id: 'abc-123',
        current_step: null,
        expires_at: '2025-12-31T23:59:59',
        progress_percentage: 0,
      };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await bookingFlowsApi.startPublicSession(5);

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/public/flows/5/start_session/');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPublicPaymentGateways', () => {
    it('fetches public payment gateways for a flow', async () => {
      const mockGateways = {
        available_gateways: [{ id: 1, name: 'Stripe', code: 'stripe' }],
        default_gateway: 1,
        require_immediate_payment: false,
      };
      mockApi.get.mockResolvedValue({ data: mockGateways });

      const result = await bookingFlowsApi.getPublicPaymentGateways(5);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/public/flows/5/payment_gateways/');
      expect(result).toEqual(mockGateways);
    });
  });

  // --- Analytics ---

  describe('getFlowAnalytics', () => {
    it('fetches analytics for a specific flow', async () => {
      const mockAnalytics = [{ date: '2025-01-01', total_sessions: 10 }];
      mockApi.get.mockResolvedValue({ data: mockAnalytics });

      const result = await bookingFlowsApi.getFlowAnalytics(5);

      expect(mockApi.get).toHaveBeenCalledWith('/bookingflow/flows/5/analytics/?');
      expect(result).toEqual(mockAnalytics);
    });

    it('constructs date filter params', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await bookingFlowsApi.getFlowAnalytics(5, {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('start_date=2025-01-01');
      expect(calledUrl).toContain('end_date=2025-12-31');
    });

    it('returns empty array for non-array response', async () => {
      mockApi.get.mockResolvedValue({ data: 'unexpected' });

      const result = await bookingFlowsApi.getFlowAnalytics(5);

      expect(result).toEqual([]);
    });
  });

  describe('getAllAnalytics', () => {
    it('fetches all analytics with filters', async () => {
      mockApi.get.mockResolvedValue({
        data: { results: [{ date: '2025-01-01' }] },
      });

      const result = await bookingFlowsApi.getAllAnalytics({
        flow_id: 5,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('flow_id=5');
      expect(calledUrl).toContain('start_date=2025-01-01');
      expect(calledUrl).toContain('end_date=2025-12-31');
      expect(result).toEqual([{ date: '2025-01-01' }]);
    });

    it('handles direct array response', async () => {
      const mockData = [{ date: '2025-01-01' }];
      mockApi.get.mockResolvedValue({ data: mockData });

      const result = await bookingFlowsApi.getAllAnalytics();

      expect(result).toEqual(mockData);
    });
  });

  describe('updateDailyAnalytics', () => {
    it('posts daily analytics update', async () => {
      const mockAnalytics = { date: '2025-06-15', total_sessions: 5 };
      mockApi.post.mockResolvedValue({ data: mockAnalytics });

      const result = await bookingFlowsApi.updateDailyAnalytics(5, '2025-06-15');

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/analytics/update_daily/', {
        flow_id: 5,
        date: '2025-06-15',
      });
      expect(result).toEqual(mockAnalytics);
    });

    it('sends request without date when not provided', async () => {
      mockApi.post.mockResolvedValue({ data: {} });

      await bookingFlowsApi.updateDailyAnalytics(5);

      expect(mockApi.post).toHaveBeenCalledWith('/bookingflow/analytics/update_daily/', {
        flow_id: 5,
        date: undefined,
      });
    });
  });
});
