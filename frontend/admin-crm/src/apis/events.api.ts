// frontend/admin-crm/src/apis/events.api.ts

import api from '../utils/api';
import type {
  EventType,
  Event,
  CreateEventTypeData,
  UpdateEventTypeData,
  CreateEventData,
  UpdateEventData,
  EventFilters,
  EventTypeFilters,
} from '../types/events.types';

import type { EventFile, CreateEventFileData, UpdateEventFileData } from '../types/events.types';
import type { PaginatedResponse, PaginationParams } from '../types/common.types';

export const eventsApi = {
  // Event Types
  getEventTypes: async (filters?: EventTypeFilters): Promise<EventType[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    
    const response = await api.get(`/events/event-types/?${params.toString()}`);
    
    // Handle paginated response - extract results array
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results as EventType[];
    }
    
    // Fallback for direct array response
    return Array.isArray(response.data) ? response.data : [];
  },

  getEventType: async (id: number): Promise<EventType> => {
    const response = await api.get<EventType>(`/events/event-types/${id}/`);
    return response.data;
  },

  createEventType: async (data: CreateEventTypeData): Promise<EventType> => {
    const response = await api.post<EventType>('/events/event-types/', data);
    return response.data;
  },

  updateEventType: async (id: number, data: UpdateEventTypeData): Promise<EventType> => {
    const response = await api.patch<EventType>(`/events/event-types/${id}/`, data);
    return response.data;
  },

  deleteEventType: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await api.delete<{ detail?: string }>(`/events/event-types/${id}/`);
    
    // Handle both 204 (deleted) and 200 (marked inactive) responses
    if (response.status === 204) {
      return { success: true };
    } else {
      return { 
        success: false, 
        message: response.data?.detail || 'Event type was marked as inactive because it is in use.' 
      };
    }
  },

  // Events with pagination
  getEvents: async (filters?: EventFilters & PaginationParams): Promise<PaginatedResponse<Event>> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_type) params.append('event_type', filters.event_type.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.client) params.append('client', filters.client.toString());
    if (filters?.start_date_from) params.append('start_date_from', filters.start_date_from);
    if (filters?.start_date_to) params.append('start_date_to', filters.start_date_to);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    
    const response = await api.get<PaginatedResponse<Event>>(`/events/events/?${params.toString()}`);
    return response.data;
  },

  getEvent: async (id: number): Promise<Event> => {
    const response = await api.get<Event>(`/events/events/${id}/`);
    return response.data;
  },

  createEvent: async (data: CreateEventData): Promise<Event> => {
    const response = await api.post<Event>('/events/events/', data);
    return response.data;
  },

  updateEvent: async (id: number, data: UpdateEventData): Promise<Event> => {
    const response = await api.patch<Event>(`/events/events/${id}/`, data);
    return response.data;
  },

  deleteEvent: async (id: number): Promise<void> => {
    await api.delete(`/events/events/${id}/`);
  },

  // Export events
  exportEvents: async (filters?: EventFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_type) params.append('event_type', filters.event_type.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.client) params.append('client', filters.client.toString());
    if (filters?.start_date_from) params.append('start_date_from', filters.start_date_from);
    if (filters?.start_date_to) params.append('start_date_to', filters.start_date_to);
    
    const response = await api.get<Blob>(`/events/events/export/?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Event Files
  getEventFiles: async (eventId: number, category?: string): Promise<EventFile[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('event', eventId.toString());
    
    const response = await api.get(`/events/files/?${params.toString()}`);
    
    // Handle paginated response - extract results array
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results as EventFile[];
    }
    
    // Fallback for direct array response
    return Array.isArray(response.data) ? response.data : [];
  },

  getEventFile: async (id: number): Promise<EventFile> => {
    const response = await api.get<EventFile>(`/events/files/${id}/`);
    return response.data;
  },

  createEventFile: async (data: CreateEventFileData, file: File): Promise<EventFile> => {
    const formData = new FormData();
    formData.append('event', data.event.toString());
    formData.append('category', data.category);
    formData.append('name', data.name);
    formData.append('file', file);
    if (data.description) formData.append('description', data.description);
    if (data.is_public !== undefined) formData.append('is_public', data.is_public.toString());

    const response = await api.post<EventFile>('/events/files/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateEventFile: async (id: number, data: UpdateEventFileData, file?: File): Promise<EventFile> => {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.category) formData.append('category', data.category);
    if (data.is_public !== undefined) formData.append('is_public', data.is_public.toString());
    if (file) formData.append('file', file);

    const response = await api.patch<EventFile>(`/events/files/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteEventFile: async (id: number): Promise<void> => {
    await api.delete(`/events/files/${id}/`);
  },

  downloadEventFile: async (id: number): Promise<Blob> => {
    const response = await api.get<Blob>(`/events/files/${id}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Check-in/out operations
  checkIn: async (eventId: number, notes?: string): Promise<Event> => {
    const response = await api.post<Event>(`/events/events/${eventId}/check_in/`, { notes });
    return response.data;
  },

  checkout: async (eventId: number, notes?: string, calculateLateFee?: boolean): Promise<Event & { late_checkout_fee?: { fee_amount: string; reason: string } }> => {
    const response = await api.post(`/events/events/${eventId}/checkout/`, {
      notes,
      calculate_late_fee: calculateLateFee
    });
    return response.data;
  },

  markNoShow: async (eventId: number, notes?: string): Promise<Event> => {
    const response = await api.post<Event>(`/events/events/${eventId}/no_show/`, { notes });
    return response.data;
  },

  getCheckInStatus: async (eventId: number): Promise<{
    check_in_status: string;
    scheduled_check_in_time: string | null;
    scheduled_checkout_time: string | null;
    actual_check_in_time: string | null;
    actual_checkout_time: string | null;
    checked_in_by_name: string | null;
    checked_out_by_name: string | null;
    check_in_notes: string;
    checkout_notes: string;
    late_checkout_fee_applied: boolean;
    late_checkout_fee_amount: string | null;
    can_check_in: boolean;
    can_checkout: boolean;
    can_mark_no_show: boolean;
  }> => {
    const response = await api.get(`/events/events/${eventId}/check_in_status/`);
    return response.data;
  },

  previewLateCheckoutFee: async (eventId: number): Promise<{
    fee_applicable: boolean;
    fee_amount: string;
    fee_type: string | null;
    hours_late: number;
    grace_minutes: number;
    reason: string;
  }> => {
    const response = await api.get(`/events/events/${eventId}/late_checkout_preview/`);
    return response.data;
  },
};