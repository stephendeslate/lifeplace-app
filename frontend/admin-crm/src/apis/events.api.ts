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

  getActiveEventTypes: async (): Promise<EventType[]> => {
    const response = await api.get('/events/event-types/active/');
    return Array.isArray(response.data) ? response.data : [];
  },

  // Events
  getEvents: async (filters?: EventFilters): Promise<Event[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_type) params.append('event_type', filters.event_type.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.client) params.append('client', filters.client.toString());
    if (filters?.start_date_from) params.append('start_date_from', filters.start_date_from);
    if (filters?.start_date_to) params.append('start_date_to', filters.start_date_to);
    
    const response = await api.get(`/events/events/?${params.toString()}`);
    
    // Handle paginated response - extract results array
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results as Event[];
    }
    
    // Fallback for direct array response
    return Array.isArray(response.data) ? response.data : [];
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
};