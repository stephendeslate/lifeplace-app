// frontend/admin-crm/src/apis/layouts.api.ts

import api from '../utils/api';
import type {
  EmailLayout,
  EmailLayoutHistory,
  CreateLayoutData,
  UpdateLayoutData,
  LayoutPreviewData,
  LayoutPreviewResult,
  LayoutFilters,
} from '../types/layouts.types';
import type { CommunicationTemplate } from '../types/communications.types';

export const layoutsApi = {
  // CRUD operations
  getLayouts: async (filters?: LayoutFilters): Promise<EmailLayout[]> => {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) {
      params.append('is_active', String(filters.is_active));
    }
    const response = await api.get(`/communications/layouts/?${params.toString()}`);
    const data = response.data as { results?: EmailLayout[] } | EmailLayout[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getLayout: async (id: number): Promise<EmailLayout> => {
    const response = await api.get<EmailLayout>(`/communications/layouts/${id}/`);
    return response.data;
  },

  createLayout: async (data: CreateLayoutData): Promise<EmailLayout> => {
    const response = await api.post<EmailLayout>('/communications/layouts/', data);
    return response.data;
  },

  updateLayout: async (id: number, data: UpdateLayoutData): Promise<EmailLayout> => {
    const response = await api.patch<EmailLayout>(`/communications/layouts/${id}/`, data);
    return response.data;
  },

  deleteLayout: async (id: number): Promise<void> => {
    await api.delete(`/communications/layouts/${id}/`);
  },

  // Preview
  previewLayout: async (id: number, data: LayoutPreviewData): Promise<LayoutPreviewResult> => {
    const response = await api.post<LayoutPreviewResult>(`/communications/layouts/${id}/preview/`, data);
    return response.data;
  },

  // History
  getLayoutHistory: async (id: number): Promise<EmailLayoutHistory[]> => {
    const response = await api.get<EmailLayoutHistory[]>(`/communications/layouts/${id}/history/`);
    return response.data;
  },

  rollbackLayout: async (id: number, version: number): Promise<EmailLayout> => {
    const response = await api.post<EmailLayout>(`/communications/layouts/${id}/rollback/`, { version });
    return response.data;
  },

  // Utilities
  getLayoutTemplates: async (id: number): Promise<CommunicationTemplate[]> => {
    const response = await api.get<CommunicationTemplate[]>(`/communications/layouts/${id}/templates/`);
    return response.data;
  },

  duplicateLayout: async (id: number, newName?: string): Promise<EmailLayout> => {
    const response = await api.post<EmailLayout>(`/communications/layouts/${id}/duplicate/`, { new_name: newName });
    return response.data;
  },
};
