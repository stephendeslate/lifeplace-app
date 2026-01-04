/**
 * useEvents Hook
 *
 * React Query hooks for event data fetching and mutations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/apis/events.api';
import { useToast } from '@/contexts/ToastContext';
import type {
  Event,
  EventDetail,
  EventFilters,
  EventTimeline,
  EventFile,
  EventTask,
  EventNote,
  EventFeedback,
  TaskUpdate,
  CreateNoteInput,
  FeedbackSubmission,
  EventPreferencesUpdate,
} from '@/types/events.types';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters?: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: number) => [...eventKeys.details(), id] as const,
  timeline: (id: number) => [...eventKeys.all, 'timeline', id] as const,
  documents: (id: number) => [...eventKeys.all, 'documents', id] as const,
  tasks: (id: number) => [...eventKeys.all, 'tasks', id] as const,
  notes: (id: number) => [...eventKeys.all, 'notes', id] as const,
  feedback: (id: number) => [...eventKeys.all, 'feedback', id] as const,
  upcoming: () => [...eventKeys.all, 'upcoming'] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch list of events with optional filters
 */
export function useEventsList(filters?: EventFilters) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => eventsApi.getEvents(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch upcoming events only
 */
export function useUpcomingEvents() {
  return useQuery({
    queryKey: eventKeys.upcoming(),
    queryFn: () => eventsApi.getUpcomingEvents(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch single event detail
 */
export function useEvent(id: number) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsApi.getEvent(id),
    enabled: id > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch event timeline
 */
export function useEventTimeline(id: number) {
  return useQuery({
    queryKey: eventKeys.timeline(id),
    queryFn: () => eventsApi.getEventTimeline(id),
    enabled: id > 0,
    staleTime: 1 * 60 * 1000, // 1 minute - updates more frequently
  });
}

/**
 * Fetch event documents
 */
export function useEventDocuments(id: number) {
  return useQuery({
    queryKey: eventKeys.documents(id),
    queryFn: () => eventsApi.getEventDocuments(id),
    enabled: id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch event tasks
 */
export function useEventTasks(id: number) {
  return useQuery({
    queryKey: eventKeys.tasks(id),
    queryFn: () => eventsApi.getEventTasks(id),
    enabled: id > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch event notes
 */
export function useEventNotes(id: number) {
  return useQuery({
    queryKey: eventKeys.notes(id),
    queryFn: () => eventsApi.getEventNotes(id),
    enabled: id > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch event feedback
 */
export function useEventFeedback(id: number) {
  return useQuery({
    queryKey: eventKeys.feedback(id),
    queryFn: () => eventsApi.getEventFeedback(id),
    enabled: id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry for 404 errors (no feedback submitted yet)
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Update event task
 */
export function useUpdateEventTask() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      eventId,
      taskId,
      data,
    }: {
      eventId: number;
      taskId: number;
      data: TaskUpdate;
    }) => eventsApi.updateEventTask(eventId, taskId, data),
    onSuccess: (updatedTask, variables) => {
      showToast('Task updated successfully', 'success');

      // Update tasks in cache
      queryClient.invalidateQueries({ queryKey: eventKeys.tasks(variables.eventId) });

      // Update the event detail to refresh task counts
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to update task. Please try again.';
      showToast(message, 'error');
    },
  });
}

/**
 * Create event note
 */
export function useCreateEventNote() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: number; data: CreateNoteInput }) =>
      eventsApi.createEventNote(eventId, data),
    onSuccess: (_, variables) => {
      showToast('Note added successfully', 'success');

      // Invalidate notes query to refresh the list
      queryClient.invalidateQueries({ queryKey: eventKeys.notes(variables.eventId) });

      // Invalidate event detail to update has_notes flag
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });

      // Invalidate timeline to show new note entry
      queryClient.invalidateQueries({ queryKey: eventKeys.timeline(variables.eventId) });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to add note. Please try again.';
      showToast(message, 'error');
    },
  });
}

/**
 * Submit event feedback
 */
export function useSubmitEventFeedback() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: number; data: FeedbackSubmission }) =>
      eventsApi.submitEventFeedback(eventId, data),
    onSuccess: (feedback, variables) => {
      showToast('Thank you for your feedback!', 'success');

      // Update feedback in cache
      queryClient.setQueryData(eventKeys.feedback(variables.eventId), feedback);

      // Invalidate timeline to show new feedback entry
      queryClient.invalidateQueries({ queryKey: eventKeys.timeline(variables.eventId) });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to submit feedback. Please try again.';
      showToast(message, 'error');
    },
  });
}

/**
 * Update event feedback
 */
export function useUpdateEventFeedback() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      eventId,
      feedbackId,
      data,
    }: {
      eventId: number;
      feedbackId: number;
      data: Partial<FeedbackSubmission>;
    }) => eventsApi.updateEventFeedback(eventId, feedbackId, data),
    onSuccess: (feedback, variables) => {
      showToast('Feedback updated successfully', 'success');

      // Update feedback in cache
      queryClient.setQueryData(eventKeys.feedback(variables.eventId), feedback);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to update feedback. Please try again.';
      showToast(message, 'error');
    },
  });
}

/**
 * Update event preferences
 */
export function useUpdateEventPreferences() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EventPreferencesUpdate }) =>
      eventsApi.updatePreferences(id, data),
    onSuccess: (updatedEvent, variables) => {
      showToast('Preferences saved successfully', 'success');

      // Update the specific event in cache
      queryClient.setQueryData(eventKeys.detail(variables.id), updatedEvent);

      // Invalidate the events list to reflect any changes
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to update preferences. Please try again.';
      showToast(message, 'error');
    },
  });
}

/**
 * Self check-in for event
 */
export function useSelfCheckIn() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (eventId: number) => eventsApi.selfCheckIn(eventId),
    onSuccess: (updatedEvent, eventId) => {
      showToast('Check-in successful!', 'success');

      // Update the event in cache
      queryClient.setQueryData(eventKeys.detail(eventId), updatedEvent);

      // Invalidate timeline
      queryClient.invalidateQueries({ queryKey: eventKeys.timeline(eventId) });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Check-in failed. Please try again.';
      showToast(message, 'error');
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Prefetch event data
 */
export function usePrefetchEvent() {
  const queryClient = useQueryClient();

  return (id: number) => {
    queryClient.prefetchQuery({
      queryKey: eventKeys.detail(id),
      queryFn: () => eventsApi.getEvent(id),
      staleTime: 2 * 60 * 1000,
    });
  };
}

/**
 * Invalidate all event queries
 */
export function useInvalidateEvents() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: eventKeys.all });
  };
}

/**
 * Get cached event from query client
 */
export function useGetCachedEvent() {
  const queryClient = useQueryClient();

  return (id: number): EventDetail | undefined => {
    return queryClient.getQueryData(eventKeys.detail(id));
  };
}
