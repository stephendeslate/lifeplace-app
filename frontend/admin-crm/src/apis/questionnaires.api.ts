// frontend/admin-crm/src/apis/questionnaires.api.ts

import api from '../utils/api';
import type {
  Questionnaire,
  QuestionnaireField,
  QuestionnaireResponse,
  CreateQuestionnaireData,
  UpdateQuestionnaireData,
  CreateQuestionnaireFieldData,
  UpdateQuestionnaireFieldData,
  QuestionnaireFilters,
  QuestionnaireFieldFilters,
  QuestionnaireResponseFilters,
  ReorderQuestionnairesData,
  ReorderFieldsData,
  SaveEventResponsesData,
} from '../types/questionnaires.types';
import type { PaginatedResponse } from '../types/common.types';

export const questionnairesApi = {
  // Questionnaires
  getQuestionnaires: async (filters?: QuestionnaireFilters): Promise<Questionnaire[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_type_id) params.append('event_type', filters.event_type_id.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    
    const response = await api.get(`/questionnaires/questionnaires/?${params.toString()}`);
    const data = response.data as PaginatedResponse<Questionnaire> | Questionnaire[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getQuestionnaire: async (id: number): Promise<Questionnaire> => {
    const response = await api.get<Questionnaire>(`/questionnaires/questionnaires/${id}/`);
    return response.data;
  },

  createQuestionnaire: async (data: CreateQuestionnaireData): Promise<Questionnaire> => {
    const response = await api.post<Questionnaire>('/questionnaires/questionnaires/', data);
    return response.data;
  },

  updateQuestionnaire: async (id: number, data: UpdateQuestionnaireData): Promise<Questionnaire> => {
    const response = await api.patch<Questionnaire>(`/questionnaires/questionnaires/${id}/`, data);
    return response.data;
  },

  deleteQuestionnaire: async (id: number): Promise<void> => {
    await api.delete(`/questionnaires/questionnaires/${id}/`);
  },

  getActiveQuestionnaires: async (): Promise<Questionnaire[]> => {
    const response = await api.get('/questionnaires/questionnaires/active/');
    const data = response.data as PaginatedResponse<Questionnaire> | Questionnaire[];
    return Array.isArray(data) ? data : data.results || [];
  },

  reorderQuestionnaires: async (data: ReorderQuestionnairesData): Promise<Questionnaire[]> => {
    const response = await api.post<Questionnaire[]>('/questionnaires/questionnaires/reorder/', data);
    return response.data;
  },

  duplicateQuestionnaire: async (id: number, newName?: string): Promise<Questionnaire> => {
    const response = await api.post<Questionnaire>(`/questionnaires/questionnaires/${id}/duplicate/`, {
      name: newName,
    });
    return response.data;
  },

  getValidationRules: async (): Promise<{ rules: Record<string, unknown>; field_types: string[] }> => {
    const response = await api.get('/questionnaires/questionnaires/validation_rules/');
    return response.data;
  },

  // Questionnaire Fields
  getQuestionnaireFields: async (questionnaireId: number): Promise<QuestionnaireField[]> => {
    const response = await api.get<QuestionnaireField[]>(`/questionnaires/questionnaires/${questionnaireId}/fields/`);
    return response.data;
  },

  getFields: async (filters?: QuestionnaireFieldFilters): Promise<QuestionnaireField[]> => {
    const params = new URLSearchParams();
    if (filters?.questionnaire_id) params.append('questionnaire_id', filters.questionnaire_id.toString());
    
    const response = await api.get(`/questionnaires/fields/?${params.toString()}`);
    const data = response.data as PaginatedResponse<QuestionnaireField> | QuestionnaireField[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getField: async (id: number): Promise<QuestionnaireField> => {
    const response = await api.get<QuestionnaireField>(`/questionnaires/fields/${id}/`);
    return response.data;
  },

  createField: async (data: CreateQuestionnaireFieldData): Promise<QuestionnaireField> => {
    const response = await api.post<QuestionnaireField>('/questionnaires/fields/', data);
    return response.data;
  },

  updateField: async (id: number, data: UpdateQuestionnaireFieldData): Promise<QuestionnaireField> => {
    const response = await api.patch<QuestionnaireField>(`/questionnaires/fields/${id}/`, data);
    return response.data;
  },

  deleteField: async (id: number): Promise<void> => {
    await api.delete(`/questionnaires/fields/${id}/`);
  },

  reorderFields: async (data: ReorderFieldsData): Promise<QuestionnaireField[]> => {
    const response = await api.post<QuestionnaireField[]>('/questionnaires/fields/reorder/', data);
    return response.data;
  },

  // Questionnaire Responses
  getResponses: async (filters?: QuestionnaireResponseFilters): Promise<QuestionnaireResponse[]> => {
    const params = new URLSearchParams();
    if (filters?.event_id) params.append('event', filters.event_id.toString());
    
    const response = await api.get(`/questionnaires/responses/?${params.toString()}`);
    const data = response.data as PaginatedResponse<QuestionnaireResponse> | QuestionnaireResponse[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getResponse: async (id: number): Promise<QuestionnaireResponse> => {
    const response = await api.get<QuestionnaireResponse>(`/questionnaires/responses/${id}/`);
    return response.data;
  },

  createResponse: async (data: Omit<QuestionnaireResponse, 'id' | 'created_at' | 'updated_at'>): Promise<QuestionnaireResponse> => {
    const response = await api.post<QuestionnaireResponse>('/questionnaires/responses/', data);
    return response.data;
  },

  updateResponse: async (id: number, data: Partial<QuestionnaireResponse>): Promise<QuestionnaireResponse> => {
    const response = await api.patch<QuestionnaireResponse>(`/questionnaires/responses/${id}/`, data);
    return response.data;
  },

  deleteResponse: async (id: number): Promise<void> => {
    await api.delete(`/questionnaires/responses/${id}/`);
  },

  saveEventResponses: async (data: SaveEventResponsesData): Promise<QuestionnaireResponse[]> => {
    const response = await api.post<QuestionnaireResponse[]>('/questionnaires/responses/save_event_responses/', data);
    return response.data;
  },

  // Analytics
  getQuestionnaireAnalytics: async (id: number): Promise<QuestionnaireAnalytics> => {
    const response = await api.get<QuestionnaireAnalytics>(`/questionnaires/questionnaires/${id}/analytics/`);
    return response.data;
  },

  getAnalyticsSummary: async (): Promise<QuestionnaireAnalyticsSummary[]> => {
    const response = await api.get<QuestionnaireAnalyticsSummary[]>('/questionnaires/questionnaires/analytics_summary/');
    return response.data;
  },

  getResponseTrends: async (id: number, days?: number): Promise<QuestionnaireResponseTrends> => {
    const params = days ? `?days=${days}` : '';
    const response = await api.get<QuestionnaireResponseTrends>(`/questionnaires/questionnaires/${id}/response_trends/${params}`);
    return response.data;
  },

  getFieldValueDistribution: async (fieldId: number, limit?: number): Promise<FieldValueDistribution> => {
    const params = limit ? `?limit=${limit}` : '';
    const response = await api.get<FieldValueDistribution>(`/questionnaires/fields/${fieldId}/value_distribution/${params}`);
    return response.data;
  },
};

// Analytics types
export interface QuestionnaireAnalytics {
  questionnaire_id: number;
  questionnaire_name: string;
  total_fields: number;
  required_fields: number;
  events_with_responses: number;
  complete_responses: number;
  incomplete_responses: number;
  completion_rate: number;
  field_completion_rates: Record<string, FieldCompletionRate>;
  recent_activity: {
    last_7_days: number;
    last_30_days: number;
    last_90_days: number;
  };
}

export interface FieldCompletionRate {
  field_id: number;
  field_type: string;
  required: boolean;
  response_count: number;
  completion_rate: number;
}

export interface QuestionnaireAnalyticsSummary {
  questionnaire_id: number;
  questionnaire_name: string;
  is_active: boolean;
  total_fields: number;
  events_with_responses: number;
  total_responses: number;
}

export interface QuestionnaireResponseTrends {
  questionnaire_id: number;
  questionnaire_name: string;
  period_days: number;
  daily_counts: Array<{
    date: string | null;
    events: number;
    responses: number;
  }>;
}

export interface FieldValueDistribution {
  field_id: number;
  field_name: string;
  field_type: string;
  total_responses: number;
  distribution: Array<{
    value: string;
    count: number;
    percentage: number;
  }>;
}