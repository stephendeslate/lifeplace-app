/**
 * Events API
 *
 * API calls for the events domain. All endpoints use the /client/events/
 * prefix for authenticated client access.
 */

import api from '@/utils/api';
import type {
  Event,
  EventDetail,
  EventTimeline,
  EventFile,
  EventTask,
  EventNote,
  EventQuestionnaire,
  EventFeedback,
  EventFilters,
  EventPreferencesUpdate,
  EventsListResponse,
  TaskUpdate,
  CreateNoteInput,
  FeedbackSubmission,
  EventAvailabilityResponse,
} from '@/types/events.types';

export const eventsApi = {
  /**
   * List client events with optional filters
   */
  getEvents: async (filters?: EventFilters): Promise<Event[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.upcoming_only) params.append('upcoming_only', 'true');
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const url = queryString ? `/client/events/?${queryString}` : '/client/events/';
    const response = await api.get(url);
    const data = response.data as EventsListResponse | Event[];

    // Handle both paginated and non-paginated responses
    return (data as EventsListResponse).results || (data as Event[]);
  },

  /**
   * Get paginated events list (returns full response with pagination info)
   */
  getEventsPaginated: async (filters?: EventFilters): Promise<EventsListResponse> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.upcoming_only) params.append('upcoming_only', 'true');
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const url = queryString ? `/client/events/?${queryString}` : '/client/events/';
    const response = await api.get<EventsListResponse>(url);
    return response.data;
  },

  /**
   * Get single event details
   */
  getEvent: async (id: number): Promise<EventDetail> => {
    const response = await api.get<EventDetail>(`/client/events/${id}/`);
    return response.data;
  },

  /**
   * Get event timeline (activity log)
   */
  getEventTimeline: async (id: number): Promise<EventTimeline[]> => {
    const response = await api.get<EventTimeline[]>(`/client/events/${id}/timeline/`);
    return response.data;
  },

  /**
   * Get accessible documents for an event
   */
  getEventDocuments: async (id: number): Promise<EventFile[]> => {
    const response = await api.get<EventFile[]>(`/client/events/${id}/documents/`);
    return response.data;
  },

  /**
   * Get tasks for an event
   */
  getEventTasks: async (id: number): Promise<EventTask[]> => {
    const response = await api.get<EventTask[]>(`/client/events/${id}/tasks/`);
    return response.data;
  },

  /**
   * Update an event task
   */
  updateEventTask: async (
    eventId: number,
    taskId: number,
    data: TaskUpdate
  ): Promise<EventTask> => {
    const response = await api.patch<EventTask>(
      `/client/events/${eventId}/tasks/${taskId}/`,
      data
    );
    return response.data;
  },

  /**
   * Get notes for an event
   */
  getEventNotes: async (id: number): Promise<EventNote[]> => {
    const response = await api.get<EventNote[]>(`/client/events/${id}/notes/`);
    return response.data;
  },

  /**
   * Create a note for an event
   */
  createEventNote: async (id: number, data: CreateNoteInput): Promise<EventNote> => {
    const response = await api.post<EventNote>(`/client/events/${id}/notes/`, data);
    return response.data;
  },

  /**
   * Get questionnaire responses for an event
   */
  getEventQuestionnaires: async (id: number): Promise<EventQuestionnaire[]> => {
    const response = await api.get<EventQuestionnaire[]>(`/client/events/${id}/questionnaires/`);
    return response.data;
  },

  /**
   * Get feedback for an event
   */
  getEventFeedback: async (id: number): Promise<EventFeedback | null> => {
    try {
      const response = await api.get<EventFeedback>(`/client/events/${id}/feedback/`);
      return response.data;
    } catch (error: unknown) {
      // Return null if no feedback exists (404)
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * Submit feedback for an event
   */
  submitEventFeedback: async (
    id: number,
    data: FeedbackSubmission
  ): Promise<EventFeedback> => {
    const response = await api.post<EventFeedback>(
      `/client/events/${id}/feedback/`,
      data
    );
    return response.data;
  },

  /**
   * Update feedback for an event
   */
  updateEventFeedback: async (
    eventId: number,
    feedbackId: number,
    data: Partial<FeedbackSubmission>
  ): Promise<EventFeedback> => {
    const response = await api.patch<EventFeedback>(
      `/client/events/${eventId}/feedback/${feedbackId}/`,
      data
    );
    return response.data;
  },

  /**
   * Update event preferences
   */
  updatePreferences: async (
    id: number,
    data: EventPreferencesUpdate
  ): Promise<EventDetail> => {
    const response = await api.patch<EventDetail>(
      `/client/events/${id}/update_preferences/`,
      data
    );
    return response.data;
  },

  /**
   * Self check-in for client on event day
   */
  selfCheckIn: async (id: number): Promise<EventDetail> => {
    const response = await api.post<EventDetail>(`/client/events/${id}/self_check_in/`);
    return response.data;
  },

  /**
   * Get upcoming events only
   */
  getUpcomingEvents: async (): Promise<Event[]> => {
    return eventsApi.getEvents({ upcoming_only: true });
  },

  /**
   * Get events by status
   */
  getEventsByStatus: async (status: string): Promise<Event[]> => {
    return eventsApi.getEvents({ status: status as Event['status'] });
  },

  // ==========================================================================
  // PUBLIC AVAILABILITY ENDPOINTS
  // ==========================================================================

  /**
   * Get public event availability for booking flow calendars.
   *
   * Returns events and blocked dates for the specified date range.
   * Uses the date_blocked field to determine true availability:
   * - date_blocked=true: Date is taken (first-to-pay-wins was won)
   * - date_blocked=false: Date has pending bookings but is still available
   *
   * GET /events/public/availability/
   */
  getPublicEventAvailability: async (params: {
    start_date: string;
    end_date: string;
    event_type_id?: number;
  }): Promise<EventAvailabilityResponse> => {
    const queryParams = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
    });

    if (params.event_type_id) {
      queryParams.append('event_type_id', params.event_type_id.toString());
    }

    const response = await api.get<EventAvailabilityResponse>(
      `/events/public/availability/?${queryParams.toString()}`
    );
    return response.data;
  },

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  /**
   * Check if an event is upcoming
   */
  isEventUpcoming: (event: Event): boolean => {
    if (!event.start_date) return false;
    const eventDate = new Date(event.start_date);
    const now = new Date();
    return eventDate > now;
  },

  /**
   * Check if an event is past
   */
  isEventPast: (event: Event): boolean => {
    if (!event.end_date) return false;
    const eventDate = new Date(event.end_date);
    const now = new Date();
    return eventDate < now;
  },

  /**
   * Check if an event is ongoing
   */
  isEventOngoing: (event: Event): boolean => {
    if (!event.start_date || !event.end_date) return false;
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const now = new Date();
    return now >= startDate && now <= endDate;
  },
};

export default eventsApi;
