// frontend/client-portal/src/hooks/useEvents.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastActions } from '../contexts/ToastContext';
import { eventsApi } from '../apis/events.api';
import type {
  Event,
  EventDetail,
  EventFilters,
  EventPreferencesUpdate,
  TaskUpdate,
  FileUpload,
  FeedbackSubmission
} from '../types/events.types';

export const useEvents = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // List all events with optional filters
  const useEventsList = (filters?: EventFilters) => {
    return useQuery({
      queryKey: ['events', filters],
      queryFn: () => eventsApi.getEvents(filters),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Get single event detail
  const useEvent = (id: number) => {
    return useQuery({
      queryKey: ['event', id],
      queryFn: () => eventsApi.getEvent(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Get event timeline
  const useEventTimeline = (id: number) => {
    return useQuery({
      queryKey: ['event-timeline', id],
      queryFn: () => eventsApi.getEventTimeline(id),
      enabled: !!id,
      staleTime: 1 * 60 * 1000, // 1 minute - updates more frequently
    });
  };

  // Get event documents
  const useEventDocuments = (id: number) => {
    return useQuery({
      queryKey: ['event-documents', id],
      queryFn: () => eventsApi.getEventDocuments(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Get event notes
  const useEventNotes = (id: number) => {
    return useQuery({
      queryKey: ['event-notes', id],
      queryFn: () => eventsApi.getEventNotes(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Get upcoming events only
  const useUpcomingEvents = () => {
    return useQuery({
      queryKey: ['events', { upcoming_only: true }],
      queryFn: () => eventsApi.getUpcomingEvents(),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Get events by status
  const useEventsByStatus = (status: string) => {
    return useQuery({
      queryKey: ['events', { status }],
      queryFn: () => eventsApi.getEventsByStatus(status),
      enabled: !!status,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Update event preferences mutation
  const useUpdatePreferences = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: EventPreferencesUpdate }) =>
        eventsApi.updatePreferences(id, data),
      onSuccess: (updatedEvent, variables) => {
        showSuccess('Preferences Updated', 'Your event preferences have been saved successfully.');
        
        // Update the specific event in cache
        queryClient.setQueryData(['event', variables.id], updatedEvent);
        
        // Invalidate the events list to reflect any changes
        queryClient.invalidateQueries({ queryKey: ['events'] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string; error?: string } } };
        const message = err.response?.data?.detail || 
                       err.response?.data?.error || 
                       'Failed to update preferences. Please try again.';
        showError('Update Failed', message);
      },
    });
  };

  // Download file mutation
  const useDownloadFile = () => {
    return useMutation({
      mutationFn: ({ url, filename }: { url: string; filename: string }) =>
        eventsApi.downloadFile(url, filename),
      onSuccess: (_, variables) => {
        showSuccess('Download Started', `Downloading ${variables.filename}`);
      },
      onError: (error: unknown) => {
        const err = error as { message?: string };
        const message = err.message || 'Unable to download the file. Please try again.';
        showError('Download Failed', message);
      },
    });
  };

  // Get event tasks
  const useEventTasks = (id: number) => {
    return useQuery({
      queryKey: ['event-tasks', id],
      queryFn: () => eventsApi.getEventTasks(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Update event task mutation
  const useUpdateEventTask = () => {
    return useMutation({
      mutationFn: ({ eventId, taskId, data }: { eventId: number; taskId: number; data: TaskUpdate }) =>
        eventsApi.updateEventTask(eventId, taskId, data),
      onSuccess: (updatedTask, variables) => {
        showSuccess('Task Updated', `Task "${updatedTask.title}" has been updated successfully.`);
        
        // Update tasks in cache
        queryClient.invalidateQueries({ queryKey: ['event-tasks', variables.eventId] });
        
        // Update the event detail to refresh task counts
        queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string; error?: string } } };
        const message = err.response?.data?.detail || 
                       err.response?.data?.error || 
                       'Failed to update task. Please try again.';
        showError('Update Failed', message);
      },
    });
  };

  // Upload event file mutation
  const useUploadEventFile = () => {
    return useMutation({
      mutationFn: ({ eventId, data }: { eventId: number; data: FileUpload }) =>
        eventsApi.uploadEventFile(eventId, data),
      onSuccess: (uploadedFile, variables) => {
        showSuccess('Upload Successful', `File "${uploadedFile.name}" has been uploaded successfully.`);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['event-documents', variables.eventId] });
        queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
        queryClient.invalidateQueries({ queryKey: ['event-timeline', variables.eventId] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string; error?: string } } };
        const message = err.response?.data?.detail || 
                       err.response?.data?.error || 
                       'Failed to upload file. Please try again.';
        showError('Upload Failed', message);
      },
    });
  };

  // Get event feedback
  const useEventFeedback = (id: number) => {
    return useQuery({
      queryKey: ['event-feedback', id],
      queryFn: () => eventsApi.getEventFeedback(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry for 404 errors (no feedback submitted yet)
        const err = error as { response?: { status?: number } };
        if (err?.response?.status === 404) return false;
        return failureCount < 3;
      },
    });
  };

  // Submit event feedback mutation
  const useSubmitEventFeedback = () => {
    return useMutation({
      mutationFn: ({ eventId, data }: { eventId: number; data: FeedbackSubmission }) =>
        eventsApi.submitEventFeedback(eventId, data),
      onSuccess: (feedback, variables) => {
        showSuccess('Feedback Submitted', 'Thank you for your feedback! Your input helps us improve our services.');
        
        // Update feedback in cache
        queryClient.setQueryData(['event-feedback', variables.eventId], feedback);
        
        // Invalidate timeline to show new feedback entry
        queryClient.invalidateQueries({ queryKey: ['event-timeline', variables.eventId] });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string; error?: string } } };
        const message = err.response?.data?.detail || 
                       err.response?.data?.error || 
                       'Failed to submit feedback. Please try again.';
        showError('Submission Failed', message);
      },
    });
  };

  // Update event feedback mutation
  const useUpdateEventFeedback = () => {
    return useMutation({
      mutationFn: ({ eventId, feedbackId, data }: { eventId: number; feedbackId: number; data: Partial<FeedbackSubmission> }) =>
        eventsApi.updateEventFeedback(eventId, feedbackId, data),
      onSuccess: (feedback, variables) => {
        showSuccess('Feedback Updated', 'Your feedback has been updated successfully.');
        
        // Update feedback in cache
        queryClient.setQueryData(['event-feedback', variables.eventId], feedback);
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string; error?: string } } };
        const message = err.response?.data?.detail || 
                       err.response?.data?.error || 
                       'Failed to update feedback. Please try again.';
        showError('Update Failed', message);
      },
    });
  };

  // Prefetch event data (useful for hover effects or preloading)
  const prefetchEvent = async (id: number) => {
    await queryClient.prefetchQuery({
      queryKey: ['event', id],
      queryFn: () => eventsApi.getEvent(id),
      staleTime: 2 * 60 * 1000,
    });
  };

  // Invalidate all event-related queries (useful after major updates)
  const invalidateAllEventQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['event'] });
    queryClient.invalidateQueries({ queryKey: ['event-timeline'] });
    queryClient.invalidateQueries({ queryKey: ['event-documents'] });
    queryClient.invalidateQueries({ queryKey: ['event-notes'] });
  };

  // Invalidate specific event queries
  const invalidateEventQueries = (eventId: number) => {
    queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event-timeline', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event-documents', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event-notes', eventId] });
  };

  // Get cached event data (if available)
  const getCachedEvent = (id: number): EventDetail | undefined => {
    return queryClient.getQueryData(['event', id]);
  };

  // Get cached events list
  const getCachedEvents = (filters?: EventFilters): Event[] | undefined => {
    return queryClient.getQueryData(['events', filters]);
  };

  // Set event data in cache (useful for optimistic updates)
  const setEventInCache = (id: number, event: EventDetail) => {
    queryClient.setQueryData(['event', id], event);
  };

  return {
    // Query hooks
    useEventsList,
    useEvent,
    useEventTimeline,
    useEventDocuments,
    useEventNotes,
    useUpcomingEvents,
    useEventsByStatus,
    useEventTasks,
    useEventFeedback,

    // Mutation hooks
    useUpdatePreferences,
    useDownloadFile,
    useUpdateEventTask,
    useUploadEventFile,
    useSubmitEventFeedback,
    useUpdateEventFeedback,

    // Utility functions
    prefetchEvent,
    invalidateAllEventQueries,
    invalidateEventQueries,
    getCachedEvent,
    getCachedEvents,
    setEventInCache,
  };
};

// Export as default for consistency with other hooks
export default useEvents;