// frontend/admin-crm/src/apis/layouts.api.ts

import api from '../utils/api';
import type {
  EmailLayout,
  EmailLayoutHistory,
  CreateLayoutData,
  UpdateLayoutData,
  LayoutPreviewData,
  LayoutPreviewResult,
} from '../types/layouts.types';
import type { CommunicationTemplate } from '../types/communications.types';
import type { PaginatedResponse, PaginationParams } from '../types/common.types';

export interface EmailLayoutQueryParams extends PaginationParams {
  search?: string;
  is_active?: boolean;
  ordering?: string;
}

export const layoutsApi = {
  // CRUD operations
  getLayouts: async (params?: EmailLayoutQueryParams): Promise<PaginatedResponse<EmailLayout>> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.is_active !== undefined) {
      searchParams.append('is_active', String(params.is_active));
    }
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.ordering) searchParams.append('ordering', params.ordering);

    const response = await api.get<PaginatedResponse<EmailLayout>>(
      `/communications/layouts/?${searchParams.toString()}`,
    );
    return response.data;
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
    const response = await api.post<LayoutPreviewResult>(
      `/communications/layouts/${id}/preview/`,
      data,
    );
    return response.data;
  },

  // History
  getLayoutHistory: async (id: number): Promise<EmailLayoutHistory[]> => {
    const response = await api.get<EmailLayoutHistory[]>(`/communications/layouts/${id}/history/`);
    return response.data;
  },

  rollbackLayout: async (id: number, version: number): Promise<EmailLayout> => {
    const response = await api.post<EmailLayout>(`/communications/layouts/${id}/rollback/`, {
      version,
    });
    return response.data;
  },

  // Utilities
  getLayoutTemplates: async (id: number): Promise<CommunicationTemplate[]> => {
    const response = await api.get<CommunicationTemplate[]>(
      `/communications/layouts/${id}/templates/`,
    );
    return response.data;
  },

  duplicateLayout: async (id: number, newName?: string): Promise<EmailLayout> => {
    const response = await api.post<EmailLayout>(`/communications/layouts/${id}/duplicate/`, {
      new_name: newName,
    });
    return response.data;
  },
};
