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
};