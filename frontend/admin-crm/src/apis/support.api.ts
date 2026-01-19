// frontend/admin-crm/src/apis/support.api.ts

import api from '../utils/api';
import type {
  SupportInquiry,
  SupportInquiryDetail,
  SupportInquiryUpdate,
  SupportReply,
  SupportStats,
  SupportFilters,
  SupportMessage,
} from '../types/support.types';

export const supportApi = {
  // List all support inquiries
  getInquiries: async (filters?: SupportFilters): Promise<SupportInquiry[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.assigned_admin) params.append('assigned_admin', filters.assigned_admin);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get<SupportInquiry[]>(`/messaging/admin/support/?${params.toString()}`);
    return response.data;
  },

  // Get single support inquiry detail
  getInquiry: async (id: string): Promise<SupportInquiryDetail> => {
    const response = await api.get<SupportInquiryDetail>(`/messaging/admin/support/${id}/`);
    return response.data;
  },

  // Update support inquiry (status, priority, assignment)
  updateInquiry: async (id: string, data: SupportInquiryUpdate): Promise<SupportInquiry> => {
    const response = await api.patch<SupportInquiry>(`/messaging/admin/support/${id}/`, data);
    return response.data;
  },

  // Add a reply to support inquiry
  addReply: async (inquiryId: string, data: SupportReply): Promise<SupportMessage> => {
    const response = await api.post<SupportMessage>(
      `/messaging/admin/support/${inquiryId}/add_reply/`,
      data
    );
    return response.data;
  },

  // Get support statistics
  getStats: async (): Promise<SupportStats> => {
    const response = await api.get<SupportStats>('/messaging/admin/support/stats/');
    return response.data;
  },
};
