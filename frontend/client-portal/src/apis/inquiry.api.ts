// frontend/client-portal/src/apis/inquiry.api.ts

import api from '../utils/api';
import type { ContactFormData } from '../pages/contact/types/contact.types';

export interface InquiryResponse {
  success: boolean;
  message: string;
  inquiry_id: string;
}

export interface InquiryError {
  errors?: {
    name?: string;
    email?: string;
    message?: string;
    inquiry_type?: string;
  };
  error?: string;
}

export const inquiryApi = {
  /**
   * Submit a contact form inquiry
   * Creates a Lead in the backend
   */
  submitInquiry: async (data: ContactFormData): Promise<InquiryResponse> => {
    // Map frontend inquiry type to backend format
    const inquiryTypeMap: Record<string, string> = {
      GENERAL_INQUIRY: 'GENERAL',
      EVENT_QUESTION: 'EVENT_QUESTION',
      PARTNERSHIP_INTEREST: 'PARTNERSHIP',
      PRICING_QUESTION: 'PRICING',
      OTHER: 'OTHER',
    };

    const payload = {
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      inquiry_type: inquiryTypeMap[data.inquiryType] || 'GENERAL',
      message: data.message,
    };

    const response = await api.post<InquiryResponse>('/events/public/inquiries/', payload);
    return response.data;
  },
};

export default inquiryApi;
