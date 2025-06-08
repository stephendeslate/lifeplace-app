// frontend/admin-crm/src/apis/communications.api.ts

import api from '../utils/api';
import type {
  CommunicationTemplate,
  CommunicationRecord,
  CreateTemplateData,
  UpdateTemplateData,
  SendCommunicationData,
  BulkSendData,
  PreviewData,
  PreviewResult,
  AnalyticsData,
  VariableSchemas,
  CommunicationFilters
} from '../types/communications.types';

export const communicationsApi = {
  // Templates
  getTemplates: async (filters?: CommunicationFilters): Promise<CommunicationTemplate[]> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.channel) params.append('channel', filters.channel);
    if (filters?.search) params.append('search', filters.search);
    
    const response = await api.get(`/communications/templates/?${params.toString()}`);
    const data = response.data as { results?: CommunicationTemplate[] } | CommunicationTemplate[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getTemplate: async (id: number): Promise<CommunicationTemplate> => {
    const response = await api.get<CommunicationTemplate>(`/communications/templates/${id}/`);
    return response.data;
  },

  createTemplate: async (data: CreateTemplateData): Promise<CommunicationTemplate> => {
    const response = await api.post<CommunicationTemplate>('/communications/templates/', data);
    return response.data;
  },

  updateTemplate: async (id: number, data: UpdateTemplateData): Promise<CommunicationTemplate> => {
    const response = await api.patch<CommunicationTemplate>(`/communications/templates/${id}/`, data);
    return response.data;
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await api.delete(`/communications/templates/${id}/`);
  },

  previewTemplate: async (id: number, data: PreviewData): Promise<PreviewResult> => {
    const response = await api.post<PreviewResult>(`/communications/templates/${id}/preview/`, data);
    return response.data;
  },

  getVariableSchemas: async (): Promise<VariableSchemas> => {
    const response = await api.get<VariableSchemas>('/communications/templates/variable_schemas/');
    return response.data;
  },

  // Records
  getRecords: async (filters?: CommunicationFilters): Promise<CommunicationRecord[]> => {
    const params = new URLSearchParams();
    if (filters?.client_id) params.append('client_id', filters.client_id.toString());
    if (filters?.template_name) params.append('template_name', filters.template_name);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.channel) params.append('channel', filters.channel);
    
    const response = await api.get(`/communications/records/?${params.toString()}`);
    const data = response.data as { results?: CommunicationRecord[] } | CommunicationRecord[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getRecord: async (id: string): Promise<CommunicationRecord> => {
    const response = await api.get<CommunicationRecord>(`/communications/records/${id}/`);
    return response.data;
  },

  sendManual: async (data: SendCommunicationData): Promise<CommunicationRecord> => {
    const response = await api.post<CommunicationRecord>('/communications/records/send_manual/', data);
    return response.data;
  },

  sendBulk: async (data: BulkSendData): Promise<{ sent_count: number; records: CommunicationRecord[] }> => {
    const response = await api.post<{ sent_count: number; records: CommunicationRecord[] }>('/communications/records/send_bulk/', data);
    return response.data;
  },

  getAnalytics: async (templateName?: string, days: number = 30): Promise<AnalyticsData> => {
    const params = new URLSearchParams();
    if (templateName) params.append('template_name', templateName);
    params.append('days', days.toString());
    
    const response = await api.get<AnalyticsData>(`/communications/records/analytics/?${params.toString()}`);
    return response.data;
  }
};