// frontend/admin-crm/src/hooks/useEvents.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../apis/events.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  EventTypeFilters,
  EventFilters,
  CreateEventTypeData,
  UpdateEventTypeData,
  CreateEventData,
  UpdateEventData,
} from '../types/events.types';

export const useEventTypes = (filters?: EventTypeFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: eventTypes = [],
    isLoading: isLoadingEventTypes,
    error: eventTypesError,
    refetch: refetchEventTypes
  } = useQuery({
    queryKey: ['event-types', filters],
    queryFn: () => eventsApi.getEventTypes(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const useEventType = (id: number) => {
    return useQuery({
      queryKey: ['event-type', id],
      queryFn: () => eventsApi.getEventType(id),
      enabled: !!id,
    });
  };

  const useActiveEventTypes = () => {
    return useQuery({
      queryKey: ['event-types', { is_active: true }],
      queryFn: () => eventsApi.getEventTypes({ is_active: true }),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Mutations
  const createEventTypeMutation = useMutation({
    mutationFn: (data: CreateEventTypeData) => eventsApi.createEventType(data),
    onSuccess: (newEventType) => {
      // Invalidate all event-types queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      showSuccess('Event Type Created', `${newEventType.name} has been created successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to create event type'
        : 'Failed to create event type';
      showError('Create Failed', message);
    },
  });

  const updateEventTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEventTypeData }) =>
      eventsApi.updateEventType(id, data),
    onSuccess: (updatedEventType) => {
      // Invalidate all event-types queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      queryClient.invalidateQueries({ queryKey: ['event-type', updatedEventType.id] });
      showSuccess('Event Type Updated', `${updatedEventType.name} has been updated successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update event type'
        : 'Failed to update event type';
      showError('Update Failed', message);
    },
  });

  const deleteEventTypeMutation = useMutation({
    mutationFn: (id: number) => eventsApi.deleteEventType(id),
    onSuccess: (result) => {
      // Invalidate all event-types queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      if (result.success) {
        showSuccess('Event Type Deleted', 'Event type has been deleted successfully.');
      } else {
        showSuccess('Event Type Deactivated', result.message || 'Event type has been marked as inactive.');
      }
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to delete event type'
        : 'Failed to delete event type';
      showError('Delete Failed', message);
    },
  });

  return {
    // Data
    eventTypes,
    
    // Loading states
    isLoadingEventTypes,
    isCreatingEventType: createEventTypeMutation.isPending,
    isUpdatingEventType: updateEventTypeMutation.isPending,
    isDeletingEventType: deleteEventTypeMutation.isPending,
    
    // Error states
    eventTypesError,
    createError: createEventTypeMutation.error,
    updateError: updateEventTypeMutation.error,
    deleteError: deleteEventTypeMutation.error,
    
    // Actions
    createEventType: createEventTypeMutation.mutate,
    updateEventType: updateEventTypeMutation.mutate,
    deleteEventType: deleteEventTypeMutation.mutate,
    refetchEventTypes,
    
    // Hooks for specific queries
    useEventType,
    useActiveEventTypes,
  };
};

export const useEvents = (filters?: EventFilters & PaginationParams) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries with pagination
  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    error: eventsError,
    refetch: refetchEvents
  } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventsApi.getEvents(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const useEvent = (id: number) => {
    return useQuery({
      queryKey: ['event', id],
      queryFn: () => eventsApi.getEvent(id),
      enabled: !!id,
    });
  };

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventData) => eventsApi.createEvent(data),
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showSuccess('Event Created', `${newEvent.name} has been created successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to create event'
        : 'Failed to create event';
      showError('Create Failed', message);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEventData }) =>
      eventsApi.updateEvent(id, data),
    onSuccess: (updatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', updatedEvent.id] });
      showSuccess('Event Updated', `${updatedEvent.name} has been updated successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update event'
        : 'Failed to update event';
      showError('Update Failed', message);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => eventsApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showSuccess('Event Deleted', 'Event has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to delete event'
        : 'Failed to delete event';
      showError('Delete Failed', message);
    },
  });

  return {
    // Paginated data
    events: eventsData?.results || [],
    totalEvents: eventsData?.count || 0,
    currentPage: eventsData?.current_page || 1,
    pageCount: eventsData?.page_count || 1,
    pageSize: eventsData?.page_size || 25,
    hasNext: !!eventsData?.next,
    hasPrevious: !!eventsData?.previous,
    
    // Loading states
    isLoadingEvents,
    isCreatingEvent: createEventMutation.isPending,
    isUpdatingEvent: updateEventMutation.isPending,
    isDeletingEvent: deleteEventMutation.isPending,
    
    // Error states
    eventsError,
    createEventError: createEventMutation.error,
    updateEventError: updateEventMutation.error,
    deleteEventError: deleteEventMutation.error,
    
    // Actions
    createEvent: createEventMutation.mutate,
    updateEvent: updateEventMutation.mutate,
    deleteEvent: deleteEventMutation.mutate,
    refetchEvents,
    
    // Hooks for specific queries
    useEvent,
  };
};

import type { EventFile, CreateEventFileData, UpdateEventFileData } from '../types/events.types';
import type { PaginationParams } from '../types/common.types';

export const useEventFiles = (eventId: number, category?: string) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Query to fetch files for an event
  const {
    data: files = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['event', eventId, 'files', category],
    queryFn: () => eventsApi.getEventFiles(eventId, category),
    enabled: !!eventId,
  });

  // Mutation to create file
  const createFileMutation = useMutation({
    mutationFn: ({ data, file }: { data: CreateEventFileData; file: File }) =>
      eventsApi.createEventFile(data, file),
    onSuccess: () => {
      showSuccess('File Uploaded', 'File has been uploaded successfully.');
      queryClient.invalidateQueries({ queryKey: ['event', eventId, 'files'] });
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to upload file'
        : 'Failed to upload file';
      showError('Upload Failed', message);
    },
  });

  // Mutation to update file
  const updateFileMutation = useMutation({
    mutationFn: ({
      id,
      data,
      file,
    }: {
      id: number;
      data: UpdateEventFileData;
      file?: File;
    }) => eventsApi.updateEventFile(id, data, file),
    onSuccess: () => {
      showSuccess('File Updated', 'File has been updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['event', eventId, 'files'] });
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update file'
        : 'Failed to update file';
      showError('Update Failed', message);
    },
  });

  // Mutation to delete file
  const deleteFileMutation = useMutation({
    mutationFn: (id: number) => eventsApi.deleteEventFile(id),
    onSuccess: () => {
      showSuccess('File Deleted', 'File has been deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['event', eventId, 'files'] });
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to delete file'
        : 'Failed to delete file';
      showError('Delete Failed', message);
    },
  });

  // Function to download file
  const downloadFile = async (file: EventFile) => {
    try {
      const blob = await eventsApi.downloadEventFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      showError('Download Failed', 'Failed to download file');
    }
  };

  return {
    files,
    isLoading,
    error,
    refetch,
    createFile: createFileMutation.mutate,
    isCreating: createFileMutation.isPending,
    updateFile: updateFileMutation.mutate,
    isUpdating: updateFileMutation.isPending,
    deleteFile: deleteFileMutation.mutate,
    isDeleting: deleteFileMutation.isPending,
    downloadFile,
  };
};