import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingFlowsApi } from '../../apis/bookingflows';
import { useToastActions } from '../../contexts/ToastContext';
import type {
  BookingSessionFilters,
  CreateBookingSessionData,
  UpdateBookingSessionData,
} from '../../types/bookingflows';

export const useBookingSessions = (filters?: BookingSessionFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['booking-sessions', filters],
    queryFn: () => bookingFlowsApi.getBookingSessions(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const useBookingSession = (id: number) => {
    return useQuery({
      queryKey: ['booking-session', id],
      queryFn: () => bookingFlowsApi.getBookingSession(id),
      enabled: !!id,
    });
  };

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: (data: CreateBookingSessionData) => bookingFlowsApi.createBookingSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-sessions'] });
      showSuccess('Session Created', 'Booking session has been created successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create session'
          : 'Failed to create session';
      showError('Create Failed', message);
    },
  });

  const updateSessionDataMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBookingSessionData }) =>
      bookingFlowsApi.updateBookingSessionData(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-sessions'] });
      showSuccess('Session Updated', 'Session data has been updated successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update session'
          : 'Failed to update session';
      showError('Update Failed', message);
    },
  });

  const completeBookingMutation = useMutation({
    mutationFn: (id: number) => bookingFlowsApi.completeBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-sessions'] });
      showSuccess('Booking Completed', 'Booking has been completed successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to complete booking'
          : 'Failed to complete booking';
      showError('Completion Failed', message);
    },
  });

  const abandonSessionMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      bookingFlowsApi.abandonSession(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-sessions'] });
      showSuccess('Session Abandoned', 'Session has been marked as abandoned.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to abandon session'
          : 'Failed to abandon session';
      showError('Action Failed', message);
    },
  });

  return {
    // Data
    sessions,

    // Loading states
    isLoadingSessions,
    isCreatingSession: createSessionMutation.isPending,
    isUpdatingSessionData: updateSessionDataMutation.isPending,
    isCompletingBooking: completeBookingMutation.isPending,
    isAbandoningSession: abandonSessionMutation.isPending,

    // Error states
    sessionsError,
    createSessionError: createSessionMutation.error,
    updateSessionDataError: updateSessionDataMutation.error,
    completeBookingError: completeBookingMutation.error,
    abandonSessionError: abandonSessionMutation.error,

    // Actions
    createSession: createSessionMutation.mutate,
    updateSessionData: updateSessionDataMutation.mutate,
    completeBooking: completeBookingMutation.mutate,
    abandonSession: abandonSessionMutation.mutate,
    refetchSessions,

    // Hooks for specific queries
    useBookingSession,
  };
};
