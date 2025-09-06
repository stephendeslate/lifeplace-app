// frontend/admin-crm/src/apis/sales.api.ts

import api from '../utils/api';
import type {
  QuoteTemplate,
  QuoteTemplateProduct,
  EventQuote,
  QuoteLineItem,
  QuoteOption,
  QuoteActivity,
  QuoteReminder,
  CreateQuoteTemplateData,
  UpdateQuoteTemplateData,
  CreateQuoteTemplateProductData,
  UpdateQuoteTemplateProductData,
  CreateEventQuoteData,
  UpdateEventQuoteData,
  CreateQuoteLineItemData,
  UpdateQuoteLineItemData,
  CreateQuoteOptionData,
  QuoteTemplateFilters,
  EventQuoteFilters,
  QuoteLineItemFilters,
  QuoteSigningData,
} from '../types/sales.types';
import type { PaginatedResponse } from '../types/common.types';

export const salesApi = {
  // Quote Templates
  getQuoteTemplates: async (filters?: QuoteTemplateFilters): Promise<QuoteTemplate[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_type) params.append('event_type', filters.event_type.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    
    const response = await api.get(`/sales/templates/?${params.toString()}`);
    const data = response.data as PaginatedResponse<QuoteTemplate> | QuoteTemplate[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getQuoteTemplate: async (id: number): Promise<QuoteTemplate> => {
    const response = await api.get<QuoteTemplate>(`/sales/templates/${id}/`);
    return response.data;
  },

  createQuoteTemplate: async (data: CreateQuoteTemplateData): Promise<QuoteTemplate> => {
    const response = await api.post<QuoteTemplate>('/sales/templates/', data);
    return response.data;
  },

  updateQuoteTemplate: async (id: number, data: UpdateQuoteTemplateData): Promise<QuoteTemplate> => {
    const response = await api.patch<QuoteTemplate>(`/sales/templates/${id}/`, data);
    return response.data;
  },

  deleteQuoteTemplate: async (id: number): Promise<void> => {
    await api.delete(`/sales/templates/${id}/`);
  },

  getActiveQuoteTemplates: async (): Promise<QuoteTemplate[]> => {
    const response = await api.get('/sales/templates/active/');
    const data = response.data as PaginatedResponse<QuoteTemplate> | QuoteTemplate[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getTemplatesForEventType: async (eventTypeId: number): Promise<QuoteTemplate[]> => {
    const response = await api.get(`/sales/templates/for_event_type/?event_type=${eventTypeId}`);
    const data = response.data as PaginatedResponse<QuoteTemplate> | QuoteTemplate[];
    return Array.isArray(data) ? data : data.results || [];
  },

  // Quote Template Products
  getQuoteTemplateProducts: async (): Promise<QuoteTemplateProduct[]> => {
    const response = await api.get('/sales/template-products/');
    const data = response.data as PaginatedResponse<QuoteTemplateProduct> | QuoteTemplateProduct[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getQuoteTemplateProduct: async (id: number): Promise<QuoteTemplateProduct> => {
    const response = await api.get<QuoteTemplateProduct>(`/sales/template-products/${id}/`);
    return response.data;
  },

  createQuoteTemplateProduct: async (data: CreateQuoteTemplateProductData): Promise<QuoteTemplateProduct> => {
    const response = await api.post<QuoteTemplateProduct>('/sales/template-products/', data);
    return response.data;
  },

  updateQuoteTemplateProduct: async (id: number, data: UpdateQuoteTemplateProductData): Promise<QuoteTemplateProduct> => {
    const response = await api.patch<QuoteTemplateProduct>(`/sales/template-products/${id}/`, data);
    return response.data;
  },

  deleteQuoteTemplateProduct: async (id: number): Promise<void> => {
    await api.delete(`/sales/template-products/${id}/`);
  },

  // Event Quotes
  getEventQuotes: async (filters?: EventQuoteFilters): Promise<EventQuote[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_id) params.append('event_id', filters.event_id.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.template) params.append('template', filters.template.toString());
    
    const response = await api.get(`/sales/quotes/?${params.toString()}`);
    const data = response.data as PaginatedResponse<EventQuote> | EventQuote[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getEventQuote: async (id: number): Promise<EventQuote> => {
    const response = await api.get<EventQuote>(`/sales/quotes/?event=${id}/`);
    return response.data;
  },

  createEventQuote: async (data: CreateEventQuoteData): Promise<EventQuote> => {
    const response = await api.post<EventQuote>('/sales/quotes/', data);
    return response.data;
  },

  updateEventQuote: async (id: number, data: UpdateEventQuoteData): Promise<EventQuote> => {
    const response = await api.patch<EventQuote>(`/sales/quotes/${id}/`, data);
    return response.data;
  },

  deleteEventQuote: async (id: number): Promise<void> => {
    await api.delete(`/sales/quotes/${id}/`);
  },

  getQuotesForEvent: async (eventId: number): Promise<EventQuote[]> => {
    const response = await api.get<EventQuote[]>(`/sales/quotes/for_event/?event_id=${eventId}`);
    return response.data;
  },

  sendQuote: async (id: number): Promise<EventQuote> => {
    const response = await api.post<EventQuote>(`/sales/quotes/${id}/send/`);
    return response.data;
  },

  acceptQuote: async (id: number, notes?: string): Promise<EventQuote> => {
    const response = await api.post<EventQuote>(`/sales/quotes/${id}/accept/`, { notes });
    return response.data;
  },

  rejectQuote: async (id: number, notes?: string): Promise<EventQuote> => {
    const response = await api.post<EventQuote>(`/sales/quotes/${id}/reject/`, { notes });
    return response.data;
  },

  duplicateQuote: async (id: number): Promise<EventQuote> => {
    const response = await api.post<EventQuote>(`/sales/quotes/${id}/duplicate/`);
    return response.data;
  },

  // Quote Line Items
  getQuoteLineItems: async (filters?: QuoteLineItemFilters): Promise<QuoteLineItem[]> => {
    const params = new URLSearchParams();
    if (filters?.quote) params.append('quote', filters.quote.toString());
    
    const response = await api.get(`/sales/line-items/?${params.toString()}`);
    const data = response.data as PaginatedResponse<QuoteLineItem> | QuoteLineItem[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getQuoteLineItem: async (id: number): Promise<QuoteLineItem> => {
    const response = await api.get<QuoteLineItem>(`/sales/line-items/${id}/`);
    return response.data;
  },

  createQuoteLineItem: async (data: CreateQuoteLineItemData): Promise<QuoteLineItem> => {
    const response = await api.post<QuoteLineItem>('/sales/line-items/', data);
    return response.data;
  },

  updateQuoteLineItem: async (id: number, data: UpdateQuoteLineItemData): Promise<QuoteLineItem> => {
    const response = await api.patch<QuoteLineItem>(`/sales/line-items/${id}/`, data);
    return response.data;
  },

  deleteQuoteLineItem: async (id: number): Promise<void> => {
    await api.delete(`/sales/line-items/${id}/`);
  },

  // Quote Options
  getQuoteOptions: async (quoteId: number): Promise<QuoteOption[]> => {
    const response = await api.get<QuoteOption[]>(`/sales/quotes/${quoteId}/options/`);
    return response.data;
  },

  createQuoteOption: async (data: CreateQuoteOptionData): Promise<QuoteOption> => {
    const response = await api.post<QuoteOption>('/sales/options/', data);
    return response.data;
  },

  updateQuoteOption: async (id: number, data: Partial<CreateQuoteOptionData>): Promise<QuoteOption> => {
    const response = await api.patch<QuoteOption>(`/sales/options/${id}/`, data);
    return response.data;
  },

  deleteQuoteOption: async (id: number): Promise<void> => {
    await api.delete(`/sales/options/${id}/`);
  },

  // Quote Activities
  getQuoteActivities: async (quoteId: number): Promise<QuoteActivity[]> => {
    const response = await api.get<QuoteActivity[]>(`/sales/quotes/${quoteId}/activities/`);
    return response.data;
  },

  // Quote Reminders
  getQuoteReminders: async (quoteId: number): Promise<QuoteReminder[]> => {
    const response = await api.get<QuoteReminder[]>(`/sales/quotes/${quoteId}/reminders/`);
    return response.data;
  },

  createQuoteReminder: async (quoteId: number, data: { scheduled_date: string; message?: string }): Promise<QuoteReminder> => {
    const response = await api.post<QuoteReminder>(`/sales/quotes/${quoteId}/reminders/`, data);
    return response.data;
  },

  // Quote Preview and Generation
  previewQuote: async (id: number): Promise<Blob> => {
    const response = await api.get<Blob>(`/sales/quotes/${id}/preview/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  generateQuotePDF: async (id: number): Promise<Blob> => {
    const response = await api.get<Blob>(`/sales/quotes/${id}/pdf/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Quote Approval/Signing
  signQuote: async (id: number, data: QuoteSigningData): Promise<EventQuote> => {
    const response = await api.post<EventQuote>(`/sales/quotes/${id}/sign/`, data);
    return response.data;
  },

  getQuotesForClient: async (clientId: number) : Promise<EventQuote[]> =>  {
    const response = await api.get<PaginatedResponse<EventQuote>>(`/sales/quotes/?client_id=${clientId}`);
    return response.data.results;
  },
};