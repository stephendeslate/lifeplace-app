import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../utils/api';
import { questionnairesApi } from './questionnaires.api';

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

describe('questionnairesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Questionnaires CRUD
  describe('getQuestionnaires', () => {
    it('builds query params including event_type mapped from event_type_id', async () => {
      mockApi.get.mockResolvedValue({ data: { count: 0, results: [] } });

      await questionnairesApi.getQuestionnaires({
        search: 'feedback',
        event_type_id: 3,
        is_active: true,
        page: 1,
        page_size: 10,
        ordering: 'name',
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/questionnaires/questionnaires/?');
      expect(url).toContain('search=feedback');
      expect(url).toContain('event_type=3');
      expect(url).toContain('is_active=true');
      expect(url).toContain('page=1');
      expect(url).toContain('page_size=10');
      expect(url).toContain('ordering=name');
    });
  });

  describe('getQuestionnaire', () => {
    it('calls GET with questionnaire id', async () => {
      mockApi.get.mockResolvedValue({ data: { id: 5, name: 'Test' } });

      const result = await questionnairesApi.getQuestionnaire(5);

      expect(mockApi.get).toHaveBeenCalledWith('/questionnaires/questionnaires/5/');
      expect(result).toEqual({ id: 5, name: 'Test' });
    });
  });

  describe('createQuestionnaire', () => {
    it('calls POST with data', async () => {
      const data = { name: 'New Q' };
      mockApi.post.mockResolvedValue({ data: { id: 1 } });

      const result = await questionnairesApi.createQuestionnaire(data as never);

      expect(mockApi.post).toHaveBeenCalledWith('/questionnaires/questionnaires/', data);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('deleteQuestionnaire', () => {
    it('calls DELETE with id', async () => {
      mockApi.delete.mockResolvedValue({});

      await questionnairesApi.deleteQuestionnaire(3);

      expect(mockApi.delete).toHaveBeenCalledWith('/questionnaires/questionnaires/3/');
    });
  });

  describe('duplicateQuestionnaire', () => {
    it('calls POST with name in body', async () => {
      mockApi.post.mockResolvedValue({ data: { id: 10 } });

      const result = await questionnairesApi.duplicateQuestionnaire(5, 'Copy');

      expect(mockApi.post).toHaveBeenCalledWith('/questionnaires/questionnaires/5/duplicate/', {
        name: 'Copy',
      });
      expect(result).toEqual({ id: 10 });
    });
  });

  describe('reorderQuestionnaires', () => {
    it('calls POST with reorder data', async () => {
      const data = { order: [3, 1, 2] };
      mockApi.post.mockResolvedValue({ data: [] });

      await questionnairesApi.reorderQuestionnaires(data as never);

      expect(mockApi.post).toHaveBeenCalledWith('/questionnaires/questionnaires/reorder/', data);
    });
  });

  // Fields
  describe('getQuestionnaireFields', () => {
    it('calls GET on nested fields endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await questionnairesApi.getQuestionnaireFields(5);

      expect(mockApi.get).toHaveBeenCalledWith('/questionnaires/questionnaires/5/fields/');
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('getFields', () => {
    it('calls GET with questionnaire_id filter', async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await questionnairesApi.getFields({ questionnaire_id: 5 });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/questionnaires/fields/');
      expect(url).toContain('questionnaire_id=5');
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('createField', () => {
    it('calls POST to fields endpoint', async () => {
      const data = { questionnaire: 1, label: 'Name', field_type: 'text' };
      mockApi.post.mockResolvedValue({ data: { id: 1 } });

      const result = await questionnairesApi.createField(data as never);

      expect(mockApi.post).toHaveBeenCalledWith('/questionnaires/fields/', data);
      expect(result).toEqual({ id: 1 });
    });
  });

  // Responses
  describe('getResponses', () => {
    it('calls GET with event filter mapped as event param', async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await questionnairesApi.getResponses({ event_id: 10 });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/questionnaires/responses/');
      expect(url).toContain('event=10');
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('saveEventResponses', () => {
    it('calls POST to save_event_responses endpoint', async () => {
      const data = { event_id: 1, responses: [] };
      mockApi.post.mockResolvedValue({ data: [] });

      await questionnairesApi.saveEventResponses(data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/questionnaires/responses/save_event_responses/',
        data,
      );
    });
  });

  // Analytics
  describe('getQuestionnaireAnalytics', () => {
    it('calls GET with questionnaire id', async () => {
      mockApi.get.mockResolvedValue({
        data: { questionnaire_id: 5, completion_rate: 0.8 },
      });

      const result = await questionnairesApi.getQuestionnaireAnalytics(5);

      expect(mockApi.get).toHaveBeenCalledWith('/questionnaires/questionnaires/5/analytics/');
      expect(result).toEqual({ questionnaire_id: 5, completion_rate: 0.8 });
    });
  });

  describe('getResponseTrends', () => {
    it('appends days param when provided', async () => {
      mockApi.get.mockResolvedValue({ data: { daily_counts: [] } });

      await questionnairesApi.getResponseTrends(5, 14);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/questionnaires/questionnaires/5/response_trends/?days=14',
      );
    });

    it('omits days param when not provided', async () => {
      mockApi.get.mockResolvedValue({ data: { daily_counts: [] } });

      await questionnairesApi.getResponseTrends(5);

      expect(mockApi.get).toHaveBeenCalledWith('/questionnaires/questionnaires/5/response_trends/');
    });
  });

  describe('getFieldValueDistribution', () => {
    it('appends limit param when provided', async () => {
      mockApi.get.mockResolvedValue({ data: { distribution: [] } });

      await questionnairesApi.getFieldValueDistribution(3, 20);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/questionnaires/fields/3/value_distribution/?limit=20',
      );
    });
  });

  // EventQuestionnaire
  describe('getEventQuestionnairesForEvent', () => {
    it('calls GET with event id in path', async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await questionnairesApi.getEventQuestionnairesForEvent(10);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/questionnaires/event-questionnaires/for_event/10/',
      );
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('sendEventQuestionnaire', () => {
    it('calls POST to send endpoint', async () => {
      mockApi.post.mockResolvedValue({ data: { id: 5, status: 'sent' } });

      const result = await questionnairesApi.sendEventQuestionnaire(5);

      expect(mockApi.post).toHaveBeenCalledWith('/questionnaires/event-questionnaires/5/send/');
      expect(result).toEqual({ id: 5, status: 'sent' });
    });
  });

  describe('sendEventQuestionnaireReminder', () => {
    it('calls POST to send_reminder endpoint', async () => {
      mockApi.post.mockResolvedValue({});

      await questionnairesApi.sendEventQuestionnaireReminder(5);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/questionnaires/event-questionnaires/5/send_reminder/',
      );
    });
  });
});
