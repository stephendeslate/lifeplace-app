// frontend/client-portal/src/apis/questionnaires.api.ts

import api from '../utils/api';
import type {
  Questionnaire,
  QuestionnaireResponse,
  SaveEventResponsesData,
  EventQuestionnaire,
} from '../types/questionnaires.types';

export const questionnairesApi = {
  // Get active questionnaires with fields
  getActiveQuestionnaires: async (): Promise<Questionnaire[]> => {
    const response = await api.get('/questionnaires/questionnaires/active/');
    const data = response.data as { results?: Questionnaire[] } | Questionnaire[];
    // If data has a 'results' property, return it; otherwise, return data as Questionnaire[]
    return (data as { results?: Questionnaire[] }).results || (data as Questionnaire[]);
  },

  // Get questionnaires configured for a specific event's booking flow
  getQuestionnairesForEvent: async (eventId: number): Promise<Questionnaire[]> => {
    const response = await api.get(`/questionnaires/questionnaires/for_event/${eventId}/`);
    const data = response.data as { results?: Questionnaire[] } | Questionnaire[];
    return (data as { results?: Questionnaire[] }).results || (data as Questionnaire[]);
  },

  // Get responses for specific event
  getEventResponses: async (eventId: number): Promise<QuestionnaireResponse[]> => {
    const response = await api.get(`/questionnaires/responses/?event=${eventId}`);
    const data = response.data as { results?: QuestionnaireResponse[] } | QuestionnaireResponse[];
    return (data as { results?: QuestionnaireResponse[] }).results || (data as QuestionnaireResponse[]);
  },

  // Save multiple responses for event
  saveEventResponses: async (data: SaveEventResponsesData): Promise<{ success: boolean; message: string; responses: QuestionnaireResponse[] }> => {
    const response = await api.post<{ success: boolean; message: string; responses: QuestionnaireResponse[] }>('/questionnaires/responses/save_event_responses/', data);
    return response.data;
  },

  // EventQuestionnaire methods - for getting assigned questionnaires for an event
  getEventQuestionnairesForEvent: async (eventId: number): Promise<EventQuestionnaire[]> => {
    const response = await api.get<EventQuestionnaire[]>(`/questionnaires/event-questionnaires/for_event/${eventId}/`);
    return response.data;
  },

  getEventQuestionnaire: async (id: number): Promise<EventQuestionnaire> => {
    const response = await api.get<EventQuestionnaire>(`/questionnaires/event-questionnaires/${id}/`);
    return response.data;
  },

  getEventQuestionnaireResponses: async (id: number): Promise<QuestionnaireResponse[]> => {
    const response = await api.get<QuestionnaireResponse[]>(`/questionnaires/event-questionnaires/${id}/responses/`);
    return response.data;
  },
};