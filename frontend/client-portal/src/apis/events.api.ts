// frontend/client-portal/src/apis/events.api.ts

import api from '../utils/api';
import type {
  Event,
  EventDetail,
  EventTimeline,
  EventFile,
  EventFilters,
  EventPreferencesUpdate,
  EventNote,
  EventsListResponse
} from '../types/events.types';

export const eventsApi = {
  // List client events with optional filters
  getEvents: async (filters?: EventFilters): Promise<Event[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.upcoming_only) params.append('upcoming_only', 'true');
    
    const response = await api.get(`/client/events/?${params.toString()}`);
    const data = response.data as EventsListResponse | Event[];
    
    // Handle both paginated and non-paginated responses
    return (data as EventsListResponse).results || (data as Event[]);
  },

  // Get single event details
  getEvent: async (id: number): Promise<EventDetail> => {
    const response = await api.get<EventDetail>(`/client/events/${id}/`);
    return response.data;
  },

  // Get event timeline (activity log)
  getEventTimeline: async (id: number): Promise<EventTimeline[]> => {
    const response = await api.get<EventTimeline[]>(`/client/events/${id}/timeline/`);
    return response.data;
  },

  // Get accessible documents for an event
  getEventDocuments: async (id: number): Promise<EventFile[]> => {
    const response = await api.get<EventFile[]>(`/client/events/${id}/documents/`);
    return response.data;
  },

  // Update event preferences
  updatePreferences: async (id: number, data: EventPreferencesUpdate): Promise<EventDetail> => {
    const response = await api.patch<EventDetail>(
      `/client/events/${id}/update_preferences/`,
      data
    );
    return response.data;
  },

  // Get notes for an event
  getEventNotes: async (id: number): Promise<EventNote[]> => {
    const response = await api.get<EventNote[]>(`/client/events/${id}/notes/`);
    return response.data;
  },

  // Download file utility (browser-based download)
  downloadFile: async (url: string, filename: string): Promise<void> => {
    try {
      // Use the existing API instance for authenticated requests if the URL is relative
      const isRelativeUrl = !url.startsWith('http://') && !url.startsWith('https://');
      
      if (isRelativeUrl) {
        // For relative URLs, use the api instance to include auth headers
        const response = await api.get<Blob>(url, {
          responseType: 'blob'
        });
        const blob = response.data;
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        setTimeout(() => {
          window.URL.revokeObjectURL(downloadUrl);
        }, 100);
      } else {
        // For absolute URLs, use fetch
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        setTimeout(() => {
          window.URL.revokeObjectURL(downloadUrl);
        }, 100);
      }
    } catch (error) {
      console.error('Download failed:', error);
      throw new Error('Failed to download file. Please try again.');
    }
  },

  // Get events with specific status
  getUpcomingEvents: async (): Promise<Event[]> => {
    return eventsApi.getEvents({ upcoming_only: true });
  },

  // Get events by status
  getEventsByStatus: async (status: string): Promise<Event[]> => {
    return eventsApi.getEvents({ status });
  },

  // Utility to check if an event is upcoming
  isEventUpcoming: (event: Event): boolean => {
    if (!event.start_date) return false;
    const eventDate = new Date(event.start_date);
    const now = new Date();
    return eventDate > now;
  },

  // Utility to check if an event is past
  isEventPast: (event: Event): boolean => {
    if (!event.end_date) return false;
    const eventDate = new Date(event.end_date);
    const now = new Date();
    return eventDate < now;
  },

  // Utility to check if an event is ongoing
  isEventOngoing: (event: Event): boolean => {
    if (!event.start_date || !event.end_date) return false;
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const now = new Date();
    return now >= startDate && now <= endDate;
  },
};