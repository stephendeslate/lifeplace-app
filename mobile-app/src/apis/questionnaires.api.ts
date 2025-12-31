/**
 * Questionnaires API
 *
 * API calls for questionnaire management matching client-portal patterns.
 */

import api from '@/utils/api';

// =============================================================================
// TYPES
// =============================================================================

export interface QuestionnaireField {
  id: number;
  questionnaire: number;
  name: string;
  type: string;
  type_display: string;
  required: boolean;
  order: number;
  options: string[];
  help_text?: string;
  created_at: string;
  updated_at: string;
}

export interface Questionnaire {
  id: number;
  name: string;
  event_type: number | null;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  fields_count: number;
  fields: QuestionnaireField[];
}

export interface QuestionnaireResponse {
  id: number;
  event: number;
  field: number;
  field_name: string;
  field_type: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface SaveEventResponsesData {
  event_id: number;
  responses: Array<{
    field_id: number;
    value: string;
  }>;
}

export interface QuestionnaireFilters {
  event_type?: number;
  is_active?: boolean;
}

// =============================================================================
// API
// =============================================================================

export const questionnairesApi = {
  /**
   * Get active questionnaires with fields
   */
  getActiveQuestionnaires: async (): Promise<Questionnaire[]> => {
    const response = await api.get('/questionnaires/questionnaires/active/');
    const data = response.data as { results?: Questionnaire[] } | Questionnaire[];
    return (data as { results?: Questionnaire[] }).results || (data as Questionnaire[]);
  },

  /**
   * Get questionnaires configured for a specific event's booking flow
   */
  getQuestionnairesForEvent: async (eventId: number): Promise<Questionnaire[]> => {
    const response = await api.get(`/questionnaires/questionnaires/for_event/${eventId}/`);
    const data = response.data as { results?: Questionnaire[] } | Questionnaire[];
    return (data as { results?: Questionnaire[] }).results || (data as Questionnaire[]);
  },

  /**
   * Get responses for specific event
   */
  getEventResponses: async (eventId: number): Promise<QuestionnaireResponse[]> => {
    const response = await api.get(`/questionnaires/responses/?event=${eventId}`);
    const data = response.data as { results?: QuestionnaireResponse[] } | QuestionnaireResponse[];
    return (data as { results?: QuestionnaireResponse[] }).results || (data as QuestionnaireResponse[]);
  },

  /**
   * Save multiple responses for event
   */
  saveEventResponses: async (
    data: SaveEventResponsesData
  ): Promise<{ success: boolean; message: string; responses: QuestionnaireResponse[] }> => {
    const response = await api.post<{
      success: boolean;
      message: string;
      responses: QuestionnaireResponse[];
    }>('/questionnaires/responses/save_event_responses/', data);
    return response.data;
  },
};

export default questionnairesApi;
