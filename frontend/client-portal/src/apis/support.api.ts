// frontend/client-portal/src/apis/support.api.ts

import api from '../utils/api';
import type {
  SupportSettings,
  SupportInquiry,
  SupportInquiryDetail,
  SupportInquiryCreate,
  SupportReply,
  SupportFilters,
  SupportMessage,
} from '../types/support.types';

export const supportApi = {
  // Get support settings (public endpoint)
  getSettings: async (): Promise<SupportSettings> => {
    const response = await api.get<SupportSettings>('/messaging/support-settings/');
    return response.data;
  },

  // List client's support inquiries
  getInquiries: async (filters?: SupportFilters): Promise<SupportInquiry[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);

    const response = await api.get<SupportInquiry[]>(`/messaging/support/?${params.toString()}`);
    return response.data;
  },

  // Get single support inquiry detail
  getInquiry: async (id: string): Promise<SupportInquiryDetail> => {
    const response = await api.get<SupportInquiryDetail>(`/messaging/support/${id}/`);
    return response.data;
  },

  // Create a new support inquiry
  createInquiry: async (data: SupportInquiryCreate): Promise<SupportInquiry> => {
    const response = await api.post<SupportInquiry>('/messaging/support/', data);
    return response.data;
  },

  // Add a reply to a support inquiry
  addReply: async (inquiryId: string, data: SupportReply): Promise<SupportMessage> => {
    const response = await api.post<SupportMessage>(
      `/messaging/support/${inquiryId}/add_reply/`,
      data,
    );
    return response.data;
  },
};
