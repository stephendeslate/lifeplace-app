// frontend/client-portal/src/apis/communications.api.ts

import api from '../utils/api';
import type {
  CommunicationTemplate,
  CommunicationRecord,
  CommunicationFilters,
  SendCommunicationData,
  PreviewCommunicationData,
  PreviewResponse,
  CommunicationAnalytics,
} from '../types/communications.types';

export const communicationsApi = {
  // Templates (read-only for clients)
  getTemplates: async (filters?: { category?: string; channel?: string }): Promise<CommunicationTemplate[]> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.channel) params.append('channel', filters.channel);
    
    const response = await api.get(`/communications/templates/?${params.toString()}`);
    const data = response.data as { results?: CommunicationRecord[] } | CommunicationRecord[];
    // If data has a 'results' property, return it; otherwise, return data as CommunicationRecord[]
    return (data as any).results || data;
  },

  getTemplate: async (id: number): Promise<CommunicationTemplate> => {
    const response = await api.get<CommunicationTemplate>(`/communications/templates/${id}/`);
    return response.data;
  },

  // Communication Records (filtered to current user's records)
  getRecords: async (filters?: CommunicationFilters): Promise<CommunicationRecord[]> => {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.template_name) params.append('template_name', filters.template_name);
    if (filters?.channel) params.append('channel', filters.channel);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.delivery_status) params.append('status', filters.delivery_status);
    if (filters?.client_id) params.append('client_id', filters.client_id.toString());
    
    const response = await api.get(`/communications/records/?${params.toString()}`);
    const data = response.data as { results?: CommunicationRecord[] } | CommunicationRecord[];
    return (data as any).results || data;
  },

  getRecord: async (id: string): Promise<CommunicationRecord> => {
    const response = await api.get<CommunicationRecord>(`/communications/records/${id}/`);
    return response.data;
  },

  // Preview Template
  previewTemplate: async (data: PreviewCommunicationData): Promise<PreviewResponse> => {
    const response = await api.post<PreviewResponse>(`/communications/templates/${data.template_id}/preview/`, {
      context_data: data.context_data,
    });
    return response.data;
  },

  // Send Manual Communication (if allowed for clients)
  sendManual: async (data: SendCommunicationData): Promise<CommunicationRecord> => {
    const response = await api.post<CommunicationRecord>('/communications/records/send_manual/', data);
    return response.data;
  },

  // Analytics
  getAnalytics: async (templateName?: string, days: number = 30): Promise<CommunicationAnalytics> => {
    const params = new URLSearchParams();
    if (templateName) params.append('template_name', templateName);
    params.append('days', days.toString());
    
    const response = await api.get(`/communications/records/analytics/?${params.toString()}`);
    return response.data as CommunicationAnalytics;
  },

  // Variable Schemas (for form building)
  getVariableSchemas: async (): Promise<Record<string, any>> => {
    const response = await api.get<Record<string, any>>('/communications/templates/variable_schemas/');
    return response.data;
  },

  // Mark message as read
  markAsRead: async (recordId: string): Promise<{ message: string; opened_at?: string }> => {
    const response = await api.post<{ message: string; opened_at?: string }>(`/communications/records/${recordId}/mark_as_read/`);
    return response.data;
  },

  // Mark message as unread
  markAsUnread: async (recordId: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/communications/records/${recordId}/mark_as_unread/`);
    return response.data;
  },
};